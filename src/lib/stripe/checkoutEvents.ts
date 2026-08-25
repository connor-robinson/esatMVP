/**
 * Persist checkout_events and emit GA commerce events from Stripe webhooks.
 */

import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/config";
import {
  sendGaCommerceEvent,
  isCommerceEventSent,
  type GaCommerceEventName,
} from "@/lib/ga/measurementProtocol";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export type CheckoutEventInsert = {
  stripeEventId?: string | null;
  eventType: string;
  userId?: string | null;
  checkoutSessionId?: string | null;
  subscriptionId?: string | null;
  invoiceId?: string | null;
  amountTotal?: number | null;
  currency?: string | null;
  paymentStatus?: string | null;
  planType?: string | null;
  billingReason?: string | null;
  stripeCustomerId?: string | null;
  rawSummary?: Record<string, unknown>;
};

export async function resolveUserIdFromStripeCustomer(
  customerId: string | null | undefined,
): Promise<string | null> {
  if (!customerId) return null;
  const supabase = adminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) {
    console.error("[checkout_events] customer lookup failed", error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function insertCheckoutEvent(
  row: CheckoutEventInsert,
): Promise<void> {
  const supabase = adminClient();
  if (!supabase) {
    console.error("[checkout_events] missing Supabase env");
    return;
  }

  const { error } = await supabase.from("checkout_events").insert({
    stripe_event_id: row.stripeEventId ?? null,
    event_type: row.eventType,
    user_id: row.userId ?? null,
    checkout_session_id: row.checkoutSessionId ?? null,
    subscription_id: row.subscriptionId ?? null,
    invoice_id: row.invoiceId ?? null,
    amount_total: row.amountTotal ?? null,
    currency: row.currency ?? null,
    payment_status: row.paymentStatus ?? null,
    plan_type: row.planType ?? null,
    billing_reason: row.billingReason ?? null,
    stripe_customer_id: row.stripeCustomerId ?? null,
    raw_summary: row.rawSummary ?? {},
  });

  if (error) {
    if (error.code === "23505") return; // duplicate stripe_event_id
    console.error("[checkout_events] insert failed", {
      eventType: row.eventType,
      message: error.message,
    });
  }
}

export type CommerceDecision =
  | { eventName: GaCommerceEventName; transactionId: string; params: Record<string, string | number | boolean> }
  | null;

/** Stripe API 2024+: subscription lives under parent.subscription_details. */
export function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice,
): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

/** Decide GA commerce event for a completed Checkout Session. */
export function decideCheckoutSessionCommerce(
  session: Stripe.Checkout.Session,
  subscription?: Stripe.Subscription | null,
): CommerceDecision {
  const planType = session.metadata?.planType ?? undefined;
  const currency = (session.currency ?? "gbp").toUpperCase();
  const amount =
    typeof session.amount_total === "number" ? session.amount_total / 100 : undefined;

  // Season pass one-time paid purchase
  if (
    session.mode === "payment" &&
    session.payment_status === "paid" &&
    planType === "season_pass"
  ) {
    return {
      eventName: "purchase",
      transactionId: session.id,
      params: {
        transaction_id: session.id,
        currency,
        ...(amount != null ? { value: amount } : {}),
        plan_type: "season_pass",
      },
    };
  }

  // Trial start (subscription with trial, typically no_payment_required)
  const hasTrial =
    Boolean(subscription?.trial_start) ||
    Boolean(subscription?.status === "trialing") ||
    (session.payment_status === "no_payment_required" &&
      session.mode === "subscription");

  if (session.mode === "subscription" && hasTrial) {
    return {
      eventName: "trial_started",
      transactionId: session.id,
      params: {
        transaction_id: session.id,
        currency,
        plan_type: planType ?? "monthly",
      },
    };
  }

  return null;
}

/** Decide GA commerce event for invoice.paid. */
export function decideInvoicePaidCommerce(
  invoice: Stripe.Invoice,
): CommerceDecision {
  const amountPaid = invoice.amount_paid ?? 0;
  if (amountPaid <= 0) return null;

  const currency = (invoice.currency ?? "gbp").toUpperCase();
  const value = amountPaid / 100;
  const billingReason = invoice.billing_reason ?? undefined;
  const transactionId = invoice.id;

  if (billingReason === "subscription_cycle") {
    return {
      eventName: "subscription_renewed",
      transactionId,
      params: {
        transaction_id: transactionId,
        currency,
        value,
        billing_reason: billingReason,
      },
    };
  }

  // First charge after trial, immediate subscription charge, or other paid invoice
  return {
    eventName: "purchase",
    transactionId,
    params: {
      transaction_id: transactionId,
      currency,
      value,
      ...(billingReason ? { billing_reason: billingReason } : {}),
    },
  };
}

export async function handleCheckoutSessionCompletedCommerce(
  session: Stripe.Checkout.Session,
  stripeEventId: string,
): Promise<void> {
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;
  const userId =
    session.metadata?.userId ??
    (await resolveUserIdFromStripeCustomer(customerId));

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  let subscription: Stripe.Subscription | null = null;
  if (subscriptionId) {
    try {
      subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    } catch (err) {
      console.error("[checkout_events] subscription retrieve failed", err);
    }
  }

  await insertCheckoutEvent({
    stripeEventId,
    eventType: "checkout.session.completed",
    userId,
    checkoutSessionId: session.id,
    subscriptionId,
    amountTotal: session.amount_total,
    currency: session.currency,
    paymentStatus: session.payment_status,
    planType: session.metadata?.planType ?? null,
    stripeCustomerId: customerId,
    rawSummary: {
      mode: session.mode,
      status: session.status,
    },
  });

  const decision = decideCheckoutSessionCommerce(session, subscription);
  if (!decision) return;

  await sendGaCommerceEvent({
    eventName: decision.eventName,
    transactionId: decision.transactionId,
    userId,
    stripeEventId,
    source: "webhook",
    params: decision.params,
  });
}

export async function handleInvoicePaidCommerce(
  invoice: Stripe.Invoice,
  stripeEventId: string,
): Promise<void> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? null;
  const userId = await resolveUserIdFromStripeCustomer(customerId);
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  await insertCheckoutEvent({
    stripeEventId,
    eventType: "invoice.paid",
    userId,
    subscriptionId,
    invoiceId: invoice.id,
    amountTotal: invoice.amount_paid,
    currency: invoice.currency,
    paymentStatus: invoice.status,
    billingReason: invoice.billing_reason,
    stripeCustomerId: customerId,
    rawSummary: {
      billing_reason: invoice.billing_reason,
      amount_due: invoice.amount_due,
    },
  });

  const decision = decideInvoicePaidCommerce(invoice);
  if (!decision) return;

  await sendGaCommerceEvent({
    eventName: decision.eventName,
    transactionId: decision.transactionId,
    userId,
    stripeEventId,
    source: "webhook",
    params: decision.params,
  });
}

export async function handleSubscriptionDeletedCommerce(
  subscription: Stripe.Subscription,
  stripeEventId: string,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;
  const userId =
    subscription.metadata?.userId ??
    (await resolveUserIdFromStripeCustomer(customerId));

  await insertCheckoutEvent({
    stripeEventId,
    eventType: "customer.subscription.deleted",
    userId,
    subscriptionId: subscription.id,
    paymentStatus: subscription.status,
    planType: subscription.metadata?.planType ?? null,
    stripeCustomerId: customerId,
    rawSummary: {
      status: subscription.status,
      canceled_at: subscription.canceled_at,
    },
  });

  await sendGaCommerceEvent({
    eventName: "subscription_cancelled",
    transactionId: subscription.id,
    userId,
    stripeEventId,
    source: "webhook",
    params: {
      transaction_id: subscription.id,
      plan_type: subscription.metadata?.planType ?? undefined,
    },
  });
}

export { isCommerceEventSent };
