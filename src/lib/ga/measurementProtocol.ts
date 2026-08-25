/**
 * GA4 Measurement Protocol helpers for server-side commerce events.
 * Never send email or other PII.
 */

import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_GA_MEASUREMENT_ID,
  sanitizeGaParams,
  type GaEventParams,
} from "./trackEvent";

export type GaCommerceEventName =
  | "trial_started"
  | "purchase"
  | "subscription_cancelled"
  | "subscription_renewed";

export type GaCommerceSource = "webhook" | "client";

type SendCommerceOptions = {
  eventName: GaCommerceEventName;
  transactionId: string;
  userId: string | null;
  stripeEventId?: string | null;
  source: GaCommerceSource;
  params?: GaEventParams;
  /** Skip HTTP send to GA (still records dedupe row). Used by client claim. */
  recordOnly?: boolean;
  gaClientId?: string | null;
};

function getMeasurementId(): string {
  return (
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ||
    DEFAULT_GA_MEASUREMENT_ID
  );
}

function getMpSecret(): string | null {
  return process.env.GA4_MEASUREMENT_PROTOCOL_SECRET?.trim() || null;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Deterministic client_id when we have no real _ga cookie value. */
export function fallbackGaClientId(userId: string | null): string {
  if (userId && /^[0-9a-f-]{36}$/i.test(userId)) {
    return `supabase.${userId.replace(/-/g, "").slice(0, 20)}`;
  }
  return `supabase.anonymous.${Date.now()}`;
}

export async function isCommerceEventSent(
  eventName: GaCommerceEventName,
  transactionId: string,
): Promise<boolean> {
  const supabase = adminClient();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("ga_commerce_events")
    .select("transaction_id")
    .eq("event_name", eventName)
    .eq("transaction_id", transactionId)
    .maybeSingle();
  if (error) {
    console.error("[ga_commerce] lookup failed", error.message);
    return false;
  }
  return Boolean(data);
}

/**
 * Insert dedupe row. Returns true if this caller won the race (should send),
 * false if already recorded.
 */
export async function claimCommerceEvent(opts: {
  eventName: GaCommerceEventName;
  transactionId: string;
  userId: string | null;
  stripeEventId?: string | null;
  source: GaCommerceSource;
  payload?: Record<string, unknown>;
}): Promise<boolean> {
  const supabase = adminClient();
  if (!supabase) {
    console.error("[ga_commerce] missing Supabase env");
    return false;
  }

  const { error } = await supabase.from("ga_commerce_events").insert({
    event_name: opts.eventName,
    transaction_id: opts.transactionId,
    stripe_event_id: opts.stripeEventId ?? null,
    user_id: opts.userId,
    source: opts.source,
    payload: opts.payload ?? {},
  });

  if (error) {
    if (error.code === "23505") return false;
    console.error("[ga_commerce] insert failed", error.message);
    return false;
  }
  return true;
}

async function resolveGaClientId(
  userId: string | null,
  explicit?: string | null,
): Promise<string> {
  if (explicit && /^\d+\.\d+$/.test(explicit)) return explicit;
  if (!userId) return fallbackGaClientId(null);

  const supabase = adminClient();
  if (supabase) {
    const { data } = await supabase
      .from("profiles")
      .select("ga_client_id")
      .eq("id", userId)
      .maybeSingle();
    if (data?.ga_client_id && /^\d+\.\d+$/.test(data.ga_client_id)) {
      return data.ga_client_id;
    }
  }
  return fallbackGaClientId(userId);
}

/**
 * Claim + optionally send a commerce event via Measurement Protocol.
 * Returns { claimed, sent }.
 */
export async function sendGaCommerceEvent(
  opts: SendCommerceOptions,
): Promise<{ claimed: boolean; sent: boolean }> {
  const safeParams = sanitizeGaParams({
    transaction_id: opts.transactionId,
    ...opts.params,
  });

  const claimed = await claimCommerceEvent({
    eventName: opts.eventName,
    transactionId: opts.transactionId,
    userId: opts.userId,
    stripeEventId: opts.stripeEventId,
    source: opts.source,
    payload: safeParams,
  });

  if (!claimed) {
    return { claimed: false, sent: false };
  }

  if (opts.recordOnly) {
    return { claimed: true, sent: false };
  }

  const secret = getMpSecret();
  const measurementId = getMeasurementId();
  if (!secret) {
    console.error(
      "[ga_commerce] GA4_MEASUREMENT_PROTOCOL_SECRET not set; event claimed but not sent",
      { eventName: opts.eventName, transactionId: opts.transactionId },
    );
    return { claimed: true, sent: false };
  }

  const clientId = await resolveGaClientId(opts.userId, opts.gaClientId);
  const body: Record<string, unknown> = {
    client_id: clientId,
    events: [
      {
        name: opts.eventName,
        params: safeParams,
      },
    ],
  };
  if (opts.userId) {
    body.user_id = opts.userId;
  }

  try {
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(secret)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("[ga_commerce] MP send failed", {
        status: res.status,
        eventName: opts.eventName,
        transactionId: opts.transactionId,
      });
      return { claimed: true, sent: false };
    }
    return { claimed: true, sent: true };
  } catch (err) {
    console.error("[ga_commerce] MP send error", err);
    return { claimed: true, sent: false };
  }
}
