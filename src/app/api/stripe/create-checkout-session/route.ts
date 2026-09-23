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
import {
  FeedbackReferralError,
  resolveCheckoutReferralDiscount,
} from "@/lib/feedbackReferral/service";
import { hardenPublicReferralPromotionCodes } from "@/lib/feedbackReferral/stripe";

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

    // Best-effort: deactivate any still-public CAMP50 promotion codes so they
    // cannot be typed into Stripe surfaces. Safe to call repeatedly.
    void hardenPublicReferralPromotionCodes().catch((err) => {
      console.error("[create-checkout-session] referral promo harden failed", err);
    });

    const body = await request.json().catch(() => ({}));
    const planType = (body.planType ?? "monthly") as PlanType;
    const isExpressDeal = Boolean(body.isExpressDeal);
    const referralCodeRaw =
      typeof body.referralCode === "string" ? body.referralCode : null;

    if (planType !== "weekly" && planType !== "monthly" && planType !== "season_pass") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (await userHasActiveSubscription(user.id)) {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 409 },
      );
    }

    let referralDiscount: { code: string; couponId: string } | null =
      null;
    try {
      referralDiscount = await resolveCheckoutReferralDiscount({
        rawCode: referralCodeRaw,
        redeemerUserId: user.id,
      });
    } catch (err) {
      if (err instanceof FeedbackReferralError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }

    // Only reuse a stored Customer. Do not create one until Checkout completes.
    const existingCustomerId = await getStoredStripeCustomerId(user.id);

    // Express Deal: £9.49 instant buy (no trial)
    // Regular Monthly: £14.99 with trial (if eligible, no referral code)
    // Coupon and free trial are mutually exclusive: any applied discount means charge immediately.
    const offerTrial =
      !isExpressDeal &&
      !referralDiscount &&
      planType === "monthly" &&
      (await isEligibleForTrial(user.id, existingCustomerId));

    // Friend codes are only applied via our validated `referralCode` path using
    // the shared coupon (not a public Stripe promotion code). Never enable
    // Checkout's promo field, or people could type their own CAMP50 code.
    const promoFields = referralDiscount
      ? {
          discounts: [{ coupon: referralDiscount.couponId }],
        }
      : {};

    const customerFields = buildCheckoutCustomerFields(
      existingCustomerId,
      user.email,
    );
    const siteUrl = resolveAppSiteUrl();
    const successUrl = `${siteUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelQuery = new URLSearchParams({ canceled: "true" });
    if (referralDiscount?.code) {
      cancelQuery.set("code", referralDiscount.code);
    }
    const cancelUrl = `${siteUrl}/pricing?${cancelQuery.toString()}`;
    const gaMeta = mergeStripeGaMetadata(
      {
        userId: user.id,
        user_id: user.id,
        planType,
        isExpressDeal: isExpressDeal ? "true" : "false",
        ...(referralDiscount
          ? { referralCode: referralDiscount.code }
          : {}),
      },
      parseGaCheckoutAttribution(body),
    );

    // Exam Season Pass - true one-time payment (no yearly subscription)
    if (planType === "season_pass") {
      const amountPence = Math.round(getSeasonPassPrice() * 100);
      // payment mode does not create a Customer by default. Force creation when
      // we only have customer_email so webhooks can link the buyer.
      const session = await getStripe().checkout.sessions.create({
        mode: "payment",
        ...customerFields,
        ...(!("customer" in customerFields)
          ? { customer_creation: "always" as const }
          : {}),
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
        ...promoFields,
        metadata: { ...gaMeta, planType: "season_pass" },
      });
      return NextResponse.json({ url: session.url });
    }

    const stripe = getStripe();
    
    // Express Deal uses a custom price of £9.49 instead of the standard monthly price
    let priceId: string | null = null;
    if (planType === "monthly" && isExpressDeal) {
      // Create a custom price for Express Deal at £9.49
      const existingPrices = await stripe.prices.search({
        query: `product:"${process.env.STRIPE_MONTHLY_PRODUCT_ID ?? ""}" AND metadata["express_deal"]:"true"`,
        limit: 1,
      });
      
      if (existingPrices.data.length > 0) {
        priceId = existingPrices.data[0].id;
      } else {
        // Create new Express Deal price
        const newPrice = await stripe.prices.create({
          currency: "gbp",
          unit_amount: 949, // £9.49
          recurring: { interval: "month" },
          product: process.env.STRIPE_MONTHLY_PRODUCT_ID ?? "",
          metadata: { express_deal: "true" },
        });
        priceId = newPrice.id;
      }
    } else {
      priceId =
        planType === "monthly"
          ? await resolveMonthlyStripePrice(stripe)
          : getPriceIdForPlan(planType);
    }
    
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

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      ...customerFields,
      client_reference_id: user.id,
      payment_method_collection: "always",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...promoFields,
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
