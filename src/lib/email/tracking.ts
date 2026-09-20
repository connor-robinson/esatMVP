import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCTION_SITE_URL } from "@/lib/seo/config";

export type ProductEmailTrackKind = "click" | "unsub" | "open";

export type ProductEmailTrackPayload = {
  c: string;
  u: string;
  k: ProductEmailTrackKind;
  d?: string;
};

export type CampaignEngagement = {
  campaignId: string;
  openCount: number;
  uniqueOpeners: number;
  clickCount: number;
  uniqueClickers: number;
  unsubscribeCount: number;
};

export type ProductEmailEngagementStats = {
  emailsSent: number;
  campaignsSent: number;
  openCount: number;
  uniqueOpeners: number;
  clickCount: number;
  uniqueClickers: number;
  unsubscribeCount: number;
};

export type CampaignLinkClickStat = {
  destinationUrl: string;
  clickCount: number;
  uniqueClickers: number;
};

export type CampaignAbVariantStats = {
  variant: "a" | "b";
  subject: string;
  sentCount: number;
  failedCount: number;
  openCount: number;
  uniqueOpeners: number;
  clickCount: number;
  uniqueClickers: number;
  unsubscribeCount: number;
  openRate: number;
  clickRate: number;
};

export type CampaignAbStats = {
  enabled: boolean;
  variants: CampaignAbVariantStats[];
};

const URL_RE = /https?:\/\/[^\s<>"'\)\]]+/gi;
const HREF_RE = /href=(["'])(https?:\/\/[^"']+)\1/gi;

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
      (raw.k !== "click" && raw.k !== "unsub" && raw.k !== "open")
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

export function buildTrackedOpenPixelUrl(
  campaignId: string,
  recipientId: string,
): string {
  const token = createProductEmailTrackToken({
    c: campaignId,
    u: recipientId,
    k: "open",
  });
  return `${PRODUCTION_SITE_URL}/api/email/o?t=${encodeURIComponent(token)}`;
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

export function rewriteHtmlHrefsWithTracking(
  html: string,
  campaignId: string,
  recipientId: string,
): string {
  return html.replace(HREF_RE, (match, quote: string, url: string) => {
    if (
      url.includes("/api/email/c?") ||
      url.includes("/email/unsubscribe?") ||
      url.includes("/api/email/o?") ||
      url.includes("{{{RESEND_UNSUBSCRIBE_URL}}}")
    ) {
      return match;
    }
    const tracked = buildTrackedClickUrl(campaignId, recipientId, url);
    return `href=${quote}${tracked}${quote}`;
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function injectOpenPixel(
  html: string,
  campaignId: string,
  recipientId: string,
): string {
  const pixelUrl = buildTrackedOpenPixelUrl(campaignId, recipientId);
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;outline:none;" />`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${pixel}</body>`);
  }
  return `${html}${pixel}`;
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

/**
 * Build tracked HTML for a campaign send.
 * Always injects an open pixel. Rewrites http(s) hrefs for click tracking.
 * Replaces Resend Broadcast unsubscribe placeholders with our token URL.
 */
export function buildTrackedProductEmailHtml(params: {
  html: string;
  campaignId: string;
  recipientId: string;
  firstName?: string | null;
}): string {
  const unsubUrl = buildTrackedUnsubscribeUrl(
    params.campaignId,
    params.recipientId,
  );
  const firstName =
    params.firstName?.trim() ||
    "there";

  let html = params.html
    .replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", unsubUrl)
    .replaceAll("{{{FIRST_NAME|there}}}", escapeHtml(firstName));

  html = rewriteHtmlHrefsWithTracking(
    html,
    params.campaignId,
    params.recipientId,
  );

  return injectOpenPixel(html, params.campaignId, params.recipientId);
}

/** Minimal HTML wrapper so plain-text campaigns still get open + click tracking. */
export function buildTrackedHtmlFromPlainText(params: {
  body: string;
  campaignId: string;
  recipientId: string;
}): string {
  const text = buildTrackedProductEmailBody(params);
  const withAnchors = text.replace(URL_RE, (match) => {
    const url = normalizeExtractedUrl(match);
    if (!url) return escapeHtml(match);
    const display = escapeHtml(match);
    return `<a href="${escapeHtml(url)}">${display}</a>`;
  });

  const paragraphs = withAnchors
    .split("\n")
    .map((line) => {
      if (!line.trim()) return "<br />";
      return `<p style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#333;">${line}</p>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
  <body style="background:#f4f4f2;margin:0;padding:24px;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:28px 32px;border-radius:14px;">
      ${paragraphs}
    </div>
  </body>
</html>`;

  return buildTrackedProductEmailHtml({
    html,
    campaignId: params.campaignId,
    recipientId: params.recipientId,
  });
}

export async function recordProductEmailEvent(params: {
  service: SupabaseClient;
  campaignId: string;
  recipientId: string;
  eventType: "click" | "unsubscribe" | "open";
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
    service.from("product_email_events").select("event_type, recipient_id"),
  ]);

  let emailsSent = 0;
  for (const row of campaigns ?? []) {
    emailsSent += Number(row.sent_count ?? 0);
  }

  let openCount = 0;
  let clickCount = 0;
  let unsubscribeCount = 0;
  const openers = new Set<string>();
  const clickers = new Set<string>();
  for (const row of events ?? []) {
    if (row.event_type === "open") {
      openCount += 1;
      if (row.recipient_id) openers.add(String(row.recipient_id));
    } else if (row.event_type === "click") {
      clickCount += 1;
      if (row.recipient_id) clickers.add(String(row.recipient_id));
    } else if (row.event_type === "unsubscribe") {
      unsubscribeCount += 1;
    }
  }

  return {
    emailsSent,
    campaignsSent: (campaigns ?? []).length,
    openCount,
    uniqueOpeners: openers.size,
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
      openCount: 0,
      uniqueOpeners: 0,
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

  const openersByCampaign = new Map<string, Set<string>>();
  const clickersByCampaign = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const id = String(row.campaign_id);
    const bucket = empty[id];
    if (!bucket) continue;
    if (row.event_type === "open") {
      bucket.openCount += 1;
      if (row.recipient_id) {
        let set = openersByCampaign.get(id);
        if (!set) {
          set = new Set();
          openersByCampaign.set(id, set);
        }
        set.add(String(row.recipient_id));
      }
    } else if (row.event_type === "click") {
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

  for (const [id, set] of openersByCampaign) {
    if (empty[id]) empty[id].uniqueOpeners = set.size;
  }
  for (const [id, set] of clickersByCampaign) {
    if (empty[id]) empty[id].uniqueClickers = set.size;
  }

  return empty;
}

export async function getCampaignLinkClickStats(
  service: SupabaseClient,
  campaignId: string,
): Promise<CampaignLinkClickStat[]> {
  const { data, error } = await service
    .from("product_email_events")
    .select("destination_url, recipient_id")
    .eq("campaign_id", campaignId)
    .eq("event_type", "click");

  if (error) {
    throw new Error(error.message);
  }

  const byUrl = new Map<
    string,
    { clickCount: number; recipients: Set<string> }
  >();

  for (const row of data ?? []) {
    const url = String(row.destination_url ?? "").trim() || "(unknown)";
    let bucket = byUrl.get(url);
    if (!bucket) {
      bucket = { clickCount: 0, recipients: new Set() };
      byUrl.set(url, bucket);
    }
    bucket.clickCount += 1;
    if (row.recipient_id) bucket.recipients.add(String(row.recipient_id));
  }

  return Array.from(byUrl.entries())
    .map(([destinationUrl, bucket]) => ({
      destinationUrl,
      clickCount: bucket.clickCount,
      uniqueClickers: bucket.recipients.size,
    }))
    .sort((a, b) => b.clickCount - a.clickCount);
}

export async function getCampaignAbStats(
  service: SupabaseClient,
  campaignId: string,
): Promise<CampaignAbStats> {
  const [{ data: campaign }, { data: sends }, { data: events }] =
    await Promise.all([
      service
        .from("product_email_campaigns")
        .select("subject, subject_b")
        .eq("id", campaignId)
        .maybeSingle(),
      service
        .from("product_email_sends")
        .select("recipient_id, variant, subject, status")
        .eq("campaign_id", campaignId),
      service
        .from("product_email_events")
        .select("event_type, recipient_id")
        .eq("campaign_id", campaignId),
    ]);

  if (!campaign?.subject_b) {
    return { enabled: false, variants: [] };
  }

  const subjectA = String(campaign.subject ?? "");
  const subjectB = String(campaign.subject_b);

  const byVariant: Record<
    "a" | "b",
    {
      subject: string;
      sentCount: number;
      failedCount: number;
      recipients: Set<string>;
      openCount: number;
      uniqueOpeners: Set<string>;
      clickCount: number;
      uniqueClickers: Set<string>;
      unsubscribeCount: number;
    }
  > = {
    a: {
      subject: subjectA,
      sentCount: 0,
      failedCount: 0,
      recipients: new Set(),
      openCount: 0,
      uniqueOpeners: new Set(),
      clickCount: 0,
      uniqueClickers: new Set(),
      unsubscribeCount: 0,
    },
    b: {
      subject: subjectB,
      sentCount: 0,
      failedCount: 0,
      recipients: new Set(),
      openCount: 0,
      uniqueOpeners: new Set(),
      clickCount: 0,
      uniqueClickers: new Set(),
      unsubscribeCount: 0,
    },
  };

  const recipientVariant = new Map<string, "a" | "b">();

  for (const row of sends ?? []) {
    const variant = row.variant === "b" ? "b" : "a";
    const bucket = byVariant[variant];
    if (row.subject) bucket.subject = String(row.subject);
    if (row.status === "sent") bucket.sentCount += 1;
    else bucket.failedCount += 1;
    if (row.recipient_id) {
      const id = String(row.recipient_id);
      bucket.recipients.add(id);
      recipientVariant.set(id, variant);
    }
  }

  for (const row of events ?? []) {
    if (!row.recipient_id) continue;
    const id = String(row.recipient_id);
    const variant = recipientVariant.get(id);
    if (!variant) continue;
    const bucket = byVariant[variant];
    if (row.event_type === "open") {
      bucket.openCount += 1;
      bucket.uniqueOpeners.add(id);
    } else if (row.event_type === "click") {
      bucket.clickCount += 1;
      bucket.uniqueClickers.add(id);
    } else if (row.event_type === "unsubscribe") {
      bucket.unsubscribeCount += 1;
    }
  }

  const variants: CampaignAbVariantStats[] = (["a", "b"] as const).map(
    (variant) => {
      const bucket = byVariant[variant];
      return {
        variant,
        subject: bucket.subject,
        sentCount: bucket.sentCount,
        failedCount: bucket.failedCount,
        openCount: bucket.openCount,
        uniqueOpeners: bucket.uniqueOpeners.size,
        clickCount: bucket.clickCount,
        uniqueClickers: bucket.uniqueClickers.size,
        unsubscribeCount: bucket.unsubscribeCount,
        openRate: ratePercent(bucket.uniqueOpeners.size, bucket.sentCount),
        clickRate: ratePercent(bucket.uniqueClickers.size, bucket.sentCount),
      };
    },
  );

  return { enabled: true, variants };
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

export function ratePercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}
