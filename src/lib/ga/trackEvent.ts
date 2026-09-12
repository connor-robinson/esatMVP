/**
 * Google Analytics 4 helpers.
 *
 * Never send emails, names, phone numbers, or free-text answers.
 * Only pass coarse product metadata (destination, plan, placement, etc.).
 * Never call gtag until analytics consent is accepted.
 */

import { hasAnalyticsConsent } from "./consent";
import { flushGaQueue, runWhenGtagReady } from "./queue";

/** Public GA4 measurement ID — safe to embed; consent still gates loading. */
export const DEFAULT_GA_MEASUREMENT_ID = "G-Y7E2CJSKV0";

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ||
  DEFAULT_GA_MEASUREMENT_ID;

export const GA_ENABLED = Boolean(GA_MEASUREMENT_ID);

/** Named events we fire from the product. */
export type GaEventName =
  | "page_view"
  | "cta_clicked"
  | "score_conversion_completed"
  | "converter_cta_click"
  | "converter_offer_viewed"
  | "converter_free_practice_started"
  | "pricing_viewed"
  | "checkout_signup_required"
  | "calibration_started"
  | "sign_up_started"
  /**
   * Canonical completed-signup event. Prefer this over deprecated aliases.
   * Deduped in SupabaseSessionProvider via sessionStorage + trackEventOnce.
   */
  | "sign_up"
  | "begin_checkout"
  /**
   * Canonical purchase event (Stripe success / Measurement Protocol).
   * Keep separate from score_conversion_completed and CTA micro-conversions.
   * Google Ads URL-based conversions (e.g. ads_conversion_Success_Page_1) must
   * not also fire on every success page_view; configure Ads against purchase
   * or a one-time claim, not raw /pricing/success visits.
   */
  | "purchase"
  | "trial_started"
  | "subscription_cancelled"
  | "subscription_renewed"
  | "partner_invite_redeemed"
  | "partner_user_activated"
  | "partner_feedback_submitted"
  | "support_opened"
  | "support_submission_completed"
  | "support_submission_failed"
  /** @deprecated Prefer sign_up. Do not emit from new code. */
  | "signup_completed"
  | "checkout_started"
  | (string & {});

export type GaEventParams = Record<
  string,
  string | number | boolean | null | undefined
>;

const BLOCKED_KEYS =
  /^(email|e-?mail|name|full_?name|first_?name|last_?name|phone|telephone|mobile|address|password|token|invite|invite_?id|invite_?code|claim_?url|authorization|auth|raw|raw_?mark|raw_?score|mark|scaled_?score|exact_?score)$/i;
const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_STRING_LEN = 100;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function isSafeKey(key: string): boolean {
  return !BLOCKED_KEYS.test(key);
}

function sanitizeValue(
  value: string | number | boolean | null | undefined,
): string | number | boolean | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "boolean" || typeof value === "number") {
    if (typeof value === "number" && !Number.isFinite(value)) return undefined;
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed || EMAIL_LIKE.test(trimmed)) return undefined;
  return trimmed.slice(0, MAX_STRING_LEN);
}

/** Strip anything that looks like personal data before it reaches gtag. */
export function sanitizeGaParams(
  params?: GaEventParams,
): Record<string, string | number | boolean> {
  if (!params) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!isSafeKey(key)) continue;
    const safe = sanitizeValue(value);
    if (safe !== undefined) out[key] = safe;
  }
  return out;
}

export { flushGaQueue };

export function trackEvent(
  event: GaEventName,
  params?: GaEventParams,
): void {
  if (!GA_ENABLED || typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;

  runWhenGtagReady(() => {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", event, sanitizeGaParams(params));
  });
}

/**
 * SPA page view. Uses a single page_view event (send_page_view is off in
 * config) so App Router navigations do not double-count.
 */
export function trackPageView(url: string): void {
  if (!GA_ENABLED || typeof window === "undefined") return;
  if (!hasAnalyticsConsent() || !GA_MEASUREMENT_ID) return;

  runWhenGtagReady(() => {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_path: url,
      page_location:
        typeof window.location?.origin === "string"
          ? `${window.location.origin}${url}`
          : url,
      page_title: typeof document !== "undefined" ? document.title : undefined,
    });
  });
}
