import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { getStripe, getStripeKeyMeta, isStripeConfigured } from "@/lib/stripe/config";
import {
  getStoredStripeCustomerId,
  supabaseAdmin,
} from "@/lib/stripe/supabase-admin";
import { getPriceIdForPlan, resolveMonthlyStripePrice } from "@/lib/stripe/prices";
import { getSeasonPassPrice, SEASON_PASS_ACCESS_UNTIL_LABEL } from "@/lib/stripe/best-value";
import { resolveAppSiteUrl } from "@/lib/seo/config";
import {
  mergeStripeGaMetadata,
  parseGaCheckoutAttribution,
} from "@/lib/stripe/checkoutGaMetadata";
import { buildCheckoutCustomerFields } from "@/lib/stripe/checkoutIdentity";

export const dynamic = "force-dynamic";

type PlanType = "weekly" | "monthly" | "season_pass";

const TRIAL_DAYS = 4;

/** First-time customers only - avoid stacking free trials. */
async function isEligibleForTrial(
  userId: string,
  customerId: string | null,
): Promise<boolean> {
  const { data: priorSubs, error } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  if (error) {
    console.error("[create-checkout-session] trial eligibility lookup failed", error);
    return false;
  }
  if ((priorSubs?.length ?? 0) > 0) return false;

  if (!customerId) return true;

  const existing = await getStripe().subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });
  return existing.data.length === 0;
}

async function userHasActiveSubscription(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[create-checkout-session] active subscription lookup failed", error);
    // Fail closed: do not open another Checkout if we cannot verify.
    return true;
  }
  return Boolean(data);
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireRouteUser(request);
    if (error || !user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const planType = (body.planType ?? "monthly") as PlanType;

    if (planType !== "weekly" && planType !== "monthly" && planType !== "season_pass") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (await userHasActiveSubscription(user.id)) {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 409 },
      );
    }

    // Only reuse a stored Customer. Do not create one until Checkout completes.
    const existingCustomerId = await getStoredStripeCustomerId(user.id);
    const customerFields = buildCheckoutCustomerFields(
      existingCustomerId,
      user.email,
    );
    const siteUrl = resolveAppSiteUrl();
    const successUrl = `${siteUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}/pricing?canceled=true`;
    const gaMeta = mergeStripeGaMetadata(
      {
        userId: user.id,
        user_id: user.id,
        planType,
      },
      parseGaCheckoutAttribution(body),
    );

    // Exam Season Pass - true one-time payment (no yearly subscription)
    if (planType === "season_pass") {
      const amountPence = Math.round(getSeasonPassPrice() * 100);
      const session = await getStripe().checkout.sessions.create({
        mode: "payment",
        ...customerFields,
        client_reference_id: user.id,
        line_items: [
          {
            price_data: {
              currency: "gbp",
              unit_amount: amountPence,
              product_data: {
                name: "Exam Season Pass",
                description: `One-time payment. Full access until ${SEASON_PASS_ACCESS_UNTIL_LABEL}`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        metadata: { ...gaMeta, planType: "season_pass" },
      });
      return NextResponse.json({ url: session.url });
    }

    const stripe = getStripe();
    let priceId =
      planType === "monthly"
        ? await resolveMonthlyStripePrice(stripe)
        : getPriceIdForPlan(planType);
    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured for this plan" },
        { status: 400 }
      );
    }

    try {
      await stripe.prices.retrieve(priceId);
    } catch (err) {
      console.error("[create-checkout-session] price lookup failed", {
        priceId,
        key: getStripeKeyMeta(),
        err,
      });
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    const offerTrial =
      planType === "monthly" &&
      (await isEligibleForTrial(user.id, existingCustomerId));

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      ...customerFields,
      client_reference_id: user.id,
      payment_method_collection: "always",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: gaMeta,
      subscription_data: {
        ...(offerTrial ? { trial_period_days: TRIAL_DAYS } : {}),
        metadata: gaMeta,
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[create-checkout-session]", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
