import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe/config";
import {
  manageSubscriptionStatusChange,
  upsertOneTimePurchase,
} from "@/lib/stripe/supabase-admin";
import { SEASON_PASS_ACCESS_UNTIL } from "@/lib/stripe/seasonPass";
import {
  decideCheckoutSessionCommerce,
  insertCheckoutEvent,
} from "@/lib/stripe/checkoutEvents";
import { isCommerceEventSent } from "@/lib/ga/measurementProtocol";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

const EXAM_DATE = SEASON_PASS_ACCESS_UNTIL;

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

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null;
    const subscriptionObj =
      typeof session.subscription === "object" && session.subscription
        ? (session.subscription as Stripe.Subscription)
        : null;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    // Backfill checkout_events if webhook has not written yet.
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const admin = createClient(url, key);
      const { data: existing } = await admin
        .from("checkout_events")
        .select("id")
        .eq("checkout_session_id", session.id)
        .limit(1)
        .maybeSingle();
      if (!existing) {
        await insertCheckoutEvent({
          stripeEventId: null,
          eventType: "checkout.session.completed.sync",
          userId: user.id,
          checkoutSessionId: session.id,
          subscriptionId,
          amountTotal: session.amount_total,
          currency: session.currency,
          paymentStatus: session.payment_status,
          planType,
          stripeCustomerId: customerId,
          rawSummary: { mode: session.mode, source: "sync-checkout" },
        });
      }
    }
    const decision = decideCheckoutSessionCommerce(session, subscriptionObj);

    // For paid subscription invoices, prefer invoice id as purchase transaction_id.
    let invoiceId: string | null = null;
    let shouldClientTrackPurchase = false;
    let clientPurchaseTransactionId: string | null = null;
    let commerceAlreadySent = false;

    if (
      session.mode === "payment" &&
      session.payment_status === "paid" &&
      planType === "season_pass"
    ) {
      clientPurchaseTransactionId = session.id;
      commerceAlreadySent = await isCommerceEventSent("purchase", session.id);
      shouldClientTrackPurchase = !commerceAlreadySent;
    } else if (
      session.mode === "subscription" &&
      session.payment_status === "paid" &&
      subscriptionId
    ) {
      try {
        const invoices = await getStripe().invoices.list({
          subscription: subscriptionId,
          limit: 5,
        });
        const paid = invoices.data.find((inv) => (inv.amount_paid ?? 0) > 0);
        if (paid) {
          invoiceId = paid.id;
          clientPurchaseTransactionId = paid.id;
          commerceAlreadySent = await isCommerceEventSent("purchase", paid.id);
          shouldClientTrackPurchase = !commerceAlreadySent;
        }
      } catch (err) {
        console.error("[sync-checkout] invoice list failed", err);
      }
    }

    // Trials: never client-track purchase
    if (decision?.eventName === "trial_started") {
      shouldClientTrackPurchase = false;
      commerceAlreadySent =
        commerceAlreadySent ||
        (await isCommerceEventSent("trial_started", session.id));
    }

    return NextResponse.json({
      synced: true,
      paymentStatus: session.payment_status,
      planType,
      mode: session.mode,
      amountTotal: session.amount_total,
      currency: session.currency,
      invoiceId,
      subscriptionId,
      commerceEvent: decision?.eventName ?? null,
      commerceAlreadySent,
      shouldClientTrackPurchase,
      clientPurchaseTransactionId,
    });
  } catch (err) {
    console.error("[sync-checkout]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
