/**
 * Set / clear GA4 user_id after consent + login.
 * Never pass email or other PII — only the internal Supabase UUID.
 */

import { hasAnalyticsConsent } from "./consent";
import { GA_MEASUREMENT_ID, GA_ENABLED } from "./trackEvent";
import { runWhenGtagReady } from "./queue";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSupabaseUserUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_RE.test(value));
}

/** Bind GA4 user_id to the authenticated Supabase UUID (consent required). */
export function setGaUserId(userId: string | null | undefined): void {
  if (!GA_ENABLED || typeof window === "undefined") return;
  if (!hasAnalyticsConsent() || !GA_MEASUREMENT_ID) return;
  if (!isSupabaseUserUuid(userId)) return;

  runWhenGtagReady(() => {
    if (typeof window.gtag !== "function") return;
    window.gtag("config", GA_MEASUREMENT_ID, {
      user_id: userId,
      send_page_view: false,
    });
  });
}

/** Clear GA4 user_id (logout or consent rejected). */
export function clearGaUserId(): void {
  if (!GA_ENABLED || typeof window === "undefined") return;
  if (!GA_MEASUREMENT_ID) return;

  runWhenGtagReady(() => {
    if (typeof window.gtag !== "function") return;
    window.gtag("config", GA_MEASUREMENT_ID, {
      user_id: null,
      send_page_view: false,
    });
  });
}
