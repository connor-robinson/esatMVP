import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCTION_SITE_URL } from "@/lib/seo/config";

export type ProductEmailTrackKind = "click" | "unsub";

export type ProductEmailTrackPayload = {
  c: string;
  u: string;
  k: ProductEmailTrackKind;
  d?: string;
};

export type CampaignEngagement = {
  campaignId: string;
  clickCount: number;
  uniqueClickers: number;
  unsubscribeCount: number;
};

export type ProductEmailEngagementStats = {
  emailsSent: number;
  campaignsSent: number;
  clickCount: number;
  uniqueClickers: number;
  unsubscribeCount: number;
};

const URL_RE = /https?:\/\/[^\s<>"'\)\]]+/gi;

function resolveTrackingSecret(): string {
  return (
    process.env.EMAIL_TRACKING_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "dev-email-tracking-secret"
  );
}

function toBase64Url(value: string | Buffer): string {
  const buf = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLen), "base64");
}

function sign(payloadB64: string): string {
  return toBase64Url(
    createHmac("sha256", resolveTrackingSecret())
      .update(payloadB64)
      .digest(),
  );
}

export function createProductEmailTrackToken(
  payload: ProductEmailTrackPayload,
): string {
  const payloadB64 = toBase64Url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyProductEmailTrackToken(
  token: string,
): ProductEmailTrackPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;

  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const raw = JSON.parse(fromBase64Url(payloadB64).toString("utf8")) as Partial<
      ProductEmailTrackPayload
    >;
    if (
      typeof raw.c !== "string" ||
      typeof raw.u !== "string" ||
      (raw.k !== "click" && raw.k !== "unsub")
    ) {
      return null;
    }
    if (raw.k === "click" && typeof raw.d !== "string") return null;
    return {
      c: raw.c,
      u: raw.u,
      k: raw.k,
      d: typeof raw.d === "string" ? raw.d : undefined,
    };
  } catch {
    return null;
  }
}

export function buildTrackedClickUrl(
  campaignId: string,
  recipientId: string,
  destinationUrl: string,
): string {
  const token = createProductEmailTrackToken({
    c: campaignId,
    u: recipientId,
    k: "click",
    d: destinationUrl,
  });
  return `${PRODUCTION_SITE_URL}/api/email/c?t=${encodeURIComponent(token)}`;
}

export function buildTrackedUnsubscribeUrl(
  campaignId: string,
  recipientId: string,
): string {
  const token = createProductEmailTrackToken({
    c: campaignId,
    u: recipientId,
    k: "unsub",
  });
  return `${PRODUCTION_SITE_URL}/email/unsubscribe?t=${encodeURIComponent(token)}`;
}

/** Strip trailing punctuation often glued to plain-text URLs. */
export function normalizeExtractedUrl(raw: string): string {
  return raw.replace(/[.,;:!?)]+$/g, "");
}

export function rewriteUrlsWithTracking(
  body: string,
  campaignId: string,
  recipientId: string,
): string {
  return body.replace(URL_RE, (match) => {
    const url = normalizeExtractedUrl(match);
    if (!url) return match;
    if (url.includes("/api/email/c?") || url.includes("/email/unsubscribe?")) {
      return match;
    }
    const tracked = buildTrackedClickUrl(campaignId, recipientId, url);
    return match.replace(url, tracked);
  });
}

export function buildTrackedProductEmailBody(params: {
  body: string;
  campaignId: string;
  recipientId: string;
}): string {
  const managed = `${PRODUCTION_SITE_URL}/profile`;
  const rewritten = rewriteUrlsWithTracking(
    params.body.trim(),
    params.campaignId,
    params.recipientId,
  );
  const manageUrl = buildTrackedClickUrl(
    params.campaignId,
    params.recipientId,
    managed,
  );
  const unsubUrl = buildTrackedUnsubscribeUrl(
    params.campaignId,
    params.recipientId,
  );

  return [
    rewritten,
    "",
    "---",
    "You're receiving this because you opted in to Tips and Tricks / product emails on ESAT Camp.",
    `Manage preferences: ${manageUrl}`,
    `Unsubscribe: ${unsubUrl}`,
  ].join("\n");
}

export async function recordProductEmailEvent(params: {
  service: SupabaseClient;
  campaignId: string;
  recipientId: string;
  eventType: "click" | "unsubscribe";
  destinationUrl?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const { error } = await params.service.from("product_email_events").insert({
    campaign_id: params.campaignId,
    recipient_id: params.recipientId,
    event_type: params.eventType,
    destination_url: params.destinationUrl ?? null,
    user_agent: params.userAgent?.slice(0, 500) ?? null,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function getProductEmailEngagementStats(
  service: SupabaseClient,
): Promise<ProductEmailEngagementStats> {
  const [{ data: campaigns }, { data: events }] = await Promise.all([
    service
      .from("product_email_campaigns")
      .select("sent_count, status")
      .neq("status", "dry_run"),
    service
      .from("product_email_events")
      .select("event_type, recipient_id"),
  ]);

  let emailsSent = 0;
  for (const row of campaigns ?? []) {
    emailsSent += Number(row.sent_count ?? 0);
  }

  let clickCount = 0;
  let unsubscribeCount = 0;
  const clickers = new Set<string>();
  for (const row of events ?? []) {
    if (row.event_type === "click") {
      clickCount += 1;
      if (row.recipient_id) clickers.add(String(row.recipient_id));
    } else if (row.event_type === "unsubscribe") {
      unsubscribeCount += 1;
    }
  }

  return {
    emailsSent,
    campaignsSent: (campaigns ?? []).length,
    clickCount,
    uniqueClickers: clickers.size,
    unsubscribeCount,
  };
}

export async function getCampaignEngagementByIds(
  service: SupabaseClient,
  campaignIds: string[],
): Promise<Record<string, CampaignEngagement>> {
  const empty: Record<string, CampaignEngagement> = {};
  for (const id of campaignIds) {
    empty[id] = {
      campaignId: id,
      clickCount: 0,
      uniqueClickers: 0,
      unsubscribeCount: 0,
    };
  }
  if (campaignIds.length === 0) return empty;

  const { data, error } = await service
    .from("product_email_events")
    .select("campaign_id, event_type, recipient_id")
    .in("campaign_id", campaignIds);

  if (error) {
    throw new Error(error.message);
  }

  const clickersByCampaign = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const id = String(row.campaign_id);
    const bucket = empty[id];
    if (!bucket) continue;
    if (row.event_type === "click") {
      bucket.clickCount += 1;
      if (row.recipient_id) {
        let set = clickersByCampaign.get(id);
        if (!set) {
          set = new Set();
          clickersByCampaign.set(id, set);
        }
        set.add(String(row.recipient_id));
      }
    } else if (row.event_type === "unsubscribe") {
      bucket.unsubscribeCount += 1;
    }
  }

  for (const [id, set] of clickersByCampaign) {
    if (empty[id]) empty[id].uniqueClickers = set.size;
  }

  return empty;
}

export function isSafeRedirectUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return true;
  } catch {
    return false;
  }
}
