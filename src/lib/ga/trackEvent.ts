/**
 * Google Analytics 4 helpers.
 *
 * Never send emails, names, phone numbers, or free-text answers.
 * Only pass coarse product metadata (destination, plan, placement, etc.).
 */

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || undefined;

export const GA_ENABLED = Boolean(GA_MEASUREMENT_ID);

/** Named events we fire from the product. */
export type GaEventName =
  | "page_view"
  | "cta_clicked"
  | "calibration_started"
  | "signup_completed"
  | "checkout_started"
  | "purchase"
  | (string & {});

export type GaEventParams = Record<
  string,
  string | number | boolean | null | undefined
>;

const BLOCKED_KEYS = /^(email|e-?mail|name|full_?name|first_?name|last_?name|phone|telephone|mobile|address|password|token|authorization|auth)$/i;
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

export function trackEvent(
  event: GaEventName,
  params?: GaEventParams,
): void {
  if (!GA_ENABLED || typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;

  try {
    window.gtag("event", event, sanitizeGaParams(params));
  } catch {
    /* analytics is non-critical */
  }
}

export function trackPageView(url: string): void {
  if (!GA_ENABLED || typeof window === "undefined") return;
  if (typeof window.gtag !== "function" || !GA_MEASUREMENT_ID) return;

  try {
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: url,
    });
  } catch {
    /* analytics is non-critical */
  }
}
