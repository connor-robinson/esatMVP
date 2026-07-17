import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe/config";
import {
  manageSubscriptionStatusChange,
  supabaseAdmin,
} from "@/lib/stripe/supabase-admin";
import { getPriceIdForPlan } from "@/lib/stripe/prices";

export const dynamic = "force-dynamic";

type PlanType = "weekly" | "monthly" | "season_pass";

function formatDate(iso: string | number | null | undefined): string | null {
  if (!iso) return null;
  const d = typeof iso === "number" ? new Date(iso * 1000) : new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Schedule a plan change with no mid-cycle charge or refund.
 * - weekly ↔ monthly: price changes at the next billing cycle (proration_behavior: none)
 * - → season_pass: current sub ends at period end; user buys Season Pass after that
 */
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
    const planType = body.planType as PlanType;
    if (planType !== "weekly" && planType !== "monthly" && planType !== "season_pass") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const { data: subRow } = await supabaseAdmin
      .from("subscriptions")
      .select("id, status, current_period_end, cancel_at_period_end, metadata")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subRow) {
      return NextResponse.json(
        { error: "No active subscription to switch from. Use Upgrade instead." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subRow.id);
    const periodEndUnix = subscription.items.data[0]?.current_period_end;
    const periodEndLabel = formatDate(periodEndUnix);

    if (planType === "season_pass") {
      const updated = await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
        metadata: {
          ...subscription.metadata,
          pending_plan: "season_pass",
        },
      });
      await manageSubscriptionStatusChange(
        updated.id,
        updated.customer as string,
        false
      );

      return NextResponse.json({
        ok: true,
        mode: "end_then_season_pass",
        effectiveAt: periodEndLabel,
        message: periodEndLabel
          ? `Your current plan stays active until ${periodEndLabel}. After that, return here to buy the Exam Season Pass — no overlap charge.`
          : "Your current plan will end at the close of this billing period. Then buy the Exam Season Pass.",
      });
    }

    const newPriceId = getPriceIdForPlan(planType);
    if (!newPriceId) {
      return NextResponse.json(
        { error: "Price not configured for this plan" },
        { status: 400 }
      );
    }

    const item = subscription.items.data[0];
    if (!item) {
      return NextResponse.json({ error: "Subscription has no items" }, { status: 400 });
    }

    const currentPriceId =
      typeof item.price === "string" ? item.price : item.price?.id;
    if (currentPriceId === newPriceId) {
      return NextResponse.json({
        ok: true,
        mode: "unchanged",
        message: "You are already on this plan.",
      });
    }

    const updated = await stripe.subscriptions.update(subscription.id, {
      items: [{ id: item.id, price: newPriceId }],
      proration_behavior: "none",
      cancel_at_period_end: false,
      metadata: {
        ...subscription.metadata,
        planType,
        pending_plan: "",
      },
    });

    await manageSubscriptionStatusChange(
      updated.id,
      updated.customer as string,
      false
    );

    return NextResponse.json({
      ok: true,
      mode: "next_cycle",
      planType,
      effectiveAt: periodEndLabel,
      message: periodEndLabel
        ? `Switched to ${planType}. You keep your current access until ${periodEndLabel}; the new price starts on your next bill — no refund or extra charge today.`
        : `Switched to ${planType}. The new price starts on your next bill — no charge today.`,
    });
  } catch (err) {
    console.error("[switch-plan]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to switch plan" },
      { status: 500 }
    );
  }
}
