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
import { isValidGaClientId } from "./session";
import { PRODUCTION_SITE_URL } from "@/lib/seo/config";

export type GaCommerceEventName =
  | "trial_started"
  | "purchase"
  | "subscription_cancelled"
  | "subscription_renewed";

export type GaCommerceSource = "webhook" | "client";

/** Stable production URL so MP events join the same property reports. */
export const COMMERCE_PAGE_LOCATION = `${PRODUCTION_SITE_URL}/pricing/success`;
export const DEFAULT_ENGAGEMENT_TIME_MSEC = 1;

export type SendCommerceOptions = {
  eventName: GaCommerceEventName;
  transactionId: string;
  userId: string | null;
  stripeEventId?: string | null;
  source: GaCommerceSource;
  params?: GaEventParams;
  /** Skip HTTP send to GA (still records dedupe row). Used by client claim. */
  recordOnly?: boolean;
  gaClientId?: string | null;
  gaSessionId?: string | null;
  gaSessionNumber?: number | null;
  pageLocation?: string | null;
  engagementTimeMsec?: number;
};

export type CommerceMpCollectBody = {
  client_id: string;
  user_id?: string;
  events: Array<{
    name: GaCommerceEventName;
    params: Record<string, string | number | boolean>;
  }>;
};

export type SendCommerceDeps = {
  claim?: typeof claimCommerceEvent;
  resolveClientId?: (
    userId: string | null,
    explicit?: string | null,
  ) => Promise<string | null>;
  fetchImpl?: typeof fetch;
  mpSecret?: string | null;
  measurementId?: string;
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

/** Deterministic client_id when we have no real _ga cookie value. Not sent to GA. */
export function fallbackGaClientId(userId: string | null): string {
  if (userId && /^[0-9a-f-]{36}$/i.test(userId)) {
    return `supabase.${userId.replace(/-/g, "").slice(0, 20)}`;
  }
  return `supabase.anonymous.${Date.now()}`;
}

export function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}

/**
 * Build the MP collect JSON, or null when client_id is missing/invalid.
 * Session fields are omitted when absent so we never invent a session.
 */
export function buildCommerceMpCollectBody(opts: {
  clientId: string | null | undefined;
  userId: string | null;
  eventName: GaCommerceEventName;
  params: Record<string, string | number | boolean>;
  gaSessionId?: string | null;
  gaSessionNumber?: number | null;
  pageLocation?: string | null;
  engagementTimeMsec?: number;
}): CommerceMpCollectBody | null {
  if (!isValidGaClientId(opts.clientId)) return null;

  const params: Record<string, string | number | boolean> = {
    ...opts.params,
    engagement_time_msec:
      opts.engagementTimeMsec ?? DEFAULT_ENGAGEMENT_TIME_MSEC,
    page_location: opts.pageLocation ?? COMMERCE_PAGE_LOCATION,
  };
  if (opts.gaSessionId) {
    params.session_id = opts.gaSessionId;
  }
  if (opts.gaSessionNumber != null) {
    params.session_number = opts.gaSessionNumber;
  }

  const body: CommerceMpCollectBody = {
    client_id: opts.clientId,
    events: [{ name: opts.eventName, params }],
  };
  if (opts.userId) {
    body.user_id = opts.userId;
  }
  return body;
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
    if (isUniqueViolation(error)) return false;
    console.error("[ga_commerce] insert failed", error.message);
    return false;
  }
  return true;
}

export async function resolveGaClientId(
  userId: string | null,
  explicit?: string | null,
): Promise<string | null> {
  if (isValidGaClientId(explicit)) return explicit;
  if (!userId) return null;

  const supabase = adminClient();
  if (supabase) {
    const { data } = await supabase
      .from("profiles")
      .select("ga_client_id")
      .eq("id", userId)
      .maybeSingle();
    if (isValidGaClientId(data?.ga_client_id)) {
      return data.ga_client_id;
    }
  }
  return null;
}

/**
 * Claim + optionally send a commerce event via Measurement Protocol.
 * Returns { claimed, sent }. Does not send when client_id is invalid.
 */
export async function sendGaCommerceEvent(
  opts: SendCommerceOptions,
  deps: SendCommerceDeps = {},
): Promise<{ claimed: boolean; sent: boolean }> {
  const safeParams = sanitizeGaParams({
    transaction_id: opts.transactionId,
    ...opts.params,
  });

  const claim = deps.claim ?? claimCommerceEvent;
  const claimed = await claim({
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

  const secret = deps.mpSecret !== undefined ? deps.mpSecret : getMpSecret();
  const measurementId = deps.measurementId ?? getMeasurementId();
  if (!secret) {
    console.error(
      "[ga_commerce] GA4_MEASUREMENT_PROTOCOL_SECRET not set; event claimed but not sent",
      { eventName: opts.eventName, transactionId: opts.transactionId },
    );
    return { claimed: true, sent: false };
  }

  const resolveClientId = deps.resolveClientId ?? resolveGaClientId;
  const clientId = await resolveClientId(opts.userId, opts.gaClientId);
  const body = buildCommerceMpCollectBody({
    clientId,
    userId: opts.userId,
    eventName: opts.eventName,
    params: safeParams,
    gaSessionId: opts.gaSessionId,
    gaSessionNumber: opts.gaSessionNumber,
    pageLocation: opts.pageLocation,
    engagementTimeMsec: opts.engagementTimeMsec,
  });

  if (!body) {
    console.error("[ga_commerce] skip MP: no real GA client_id", {
      eventName: opts.eventName,
      transactionId: opts.transactionId,
    });
    return { claimed: true, sent: false };
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  try {
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(secret)}`;
    const res = await fetchImpl(url, {
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
