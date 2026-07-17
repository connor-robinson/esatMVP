import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe/config";
import {
  manageSubscriptionStatusChange,
  upsertOneTimePurchase,
} from "@/lib/stripe/supabase-admin";

export const dynamic = "force-dynamic";

const EXAM_DATE = new Date("2026-10-01");

/**
 * POST /api/stripe/sync-checkout
 * Body: { sessionId: string }
 *
 * Confirms a completed Checkout Session belongs to the signed-in user,
 * then syncs subscription / one-time purchase into Supabase.
 * Used by the payment success page so access unlocks even if webhooks are delayed.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireRouteUser(request);
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!sessionId.startsWith("cs_")) {
      return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price.product", "subscription"],
    });

    if (session.metadata?.userId && session.metadata.userId !== user.id) {
      return NextResponse.json({ error: "Session does not belong to this user" }, { status: 403 });
    }

    if (session.status !== "complete") {
      return NextResponse.json({
        synced: false,
        paymentStatus: session.payment_status,
        status: session.status,
        message: "Checkout is not complete yet",
      });
    }

    const planType = session.metadata?.planType ?? null;

    if (session.mode === "subscription" && session.subscription) {
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;
      if (!customerId) {
        return NextResponse.json({ error: "Missing customer" }, { status: 400 });
      }
      await manageSubscriptionStatusChange(subscriptionId, customerId, true);
    } else if (session.mode === "payment" && planType === "season_pass") {
      await upsertOneTimePurchase(session, EXAM_DATE);
    }

    return NextResponse.json({
      synced: true,
      paymentStatus: session.payment_status,
      planType,
      mode: session.mode,
      amountTotal: session.amount_total,
      currency: session.currency,
    });
  } catch (err) {
    console.error("[sync-checkout]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
