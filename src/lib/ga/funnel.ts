/**
 * Score-converter → calibration → signup → checkout funnel helpers.
 * All events go through trackEvent (consent-gated). Never queue without consent.
 */

import { hasAnalyticsConsent } from "./consent";
import { trackEvent, type GaEventParams } from "./trackEvent";

export const GA_SOURCE_PAGE_KEY = "esatcamp_ga_source_page";
export const GA_CONVERTER_RESULT_KEY = "esatcamp_ga_converter_result_seen";
export const GA_LAST_CONVERTER_EXAM_KEY = "esatcamp_ga_last_converter_exam";

const onceKeys = new Set<string>();

/** In-memory once-per-tab guard (Strict Mode / remount safe when keyed well). */
export function trackEventOnce(
  onceKey: string,
  event: Parameters<typeof trackEvent>[0],
  params?: GaEventParams,
): boolean {
  if (!hasAnalyticsConsent()) return false;
  if (onceKeys.has(onceKey)) return false;
  onceKeys.add(onceKey);
  trackEvent(event, params);
  return true;
}

/** Persist a coarse source path for later funnel steps (no PII). */
export function rememberGaSourcePage(path: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const cleaned = sanitizePath(path);
  if (!cleaned) return;
  try {
    sessionStorage.setItem(GA_SOURCE_PAGE_KEY, cleaned);
  } catch {
    /* ignore */
  }
}

export function readGaSourcePage(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return sessionStorage.getItem(GA_SOURCE_PAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function currentGaPath(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return sanitizePath(window.location.pathname);
}

export function markConverterResultSeen(exam: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(GA_CONVERTER_RESULT_KEY, "1");
    sessionStorage.setItem(GA_LAST_CONVERTER_EXAM_KEY, exam);
  } catch {
    /* ignore */
  }
}

export function hasSeenConverterResult(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(GA_CONVERTER_RESULT_KEY) === "1";
  } catch {
    return false;
  }
}

export function readLastConverterExam(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return sessionStorage.getItem(GA_LAST_CONVERTER_EXAM_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function sanitizePath(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return undefined;
  // Drop query/hash and cap length so we never leak tokens from bad callers.
  const bare = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  return bare.slice(0, 100);
}

/** Test-only reset for in-memory once guards. */
export function __resetFunnelOnceForTests(): void {
  onceKeys.clear();
}
