/**
 * GA4 client_id / session_id capture for Measurement Protocol.
 * Never include email or other PII. Consent-gated on the client.
 */

import { hasAnalyticsConsent } from "./consent";
import { GA_MEASUREMENT_ID } from "./trackEvent";
import { sanitizeGaClientId } from "@/lib/attribution/capture";

export type GaCheckoutAttribution = {
  ga_client_id: string | null;
  ga_session_id: string | null;
  ga_session_number: number | null;
};

export const EMPTY_GA_CHECKOUT_ATTRIBUTION: GaCheckoutAttribution = {
  ga_client_id: null,
  ga_session_id: null,
  ga_session_number: null,
};

const GA_CLIENT_ID_RE = /^\d+\.\d+$/;
const GA_SESSION_ID_RE = /^\d{1,20}$/;
const MAX_SESSION_NUMBER = 1_000_000;

export function isValidGaClientId(
  value: string | null | undefined,
): value is string {
  return Boolean(value && GA_CLIENT_ID_RE.test(value));
}

export function sanitizeGaSessionId(
  value: string | number | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!GA_SESSION_ID_RE.test(trimmed)) return null;
  return trimmed;
}

export function sanitizeGaSessionNumber(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseInt(String(value).trim(), 10);
  if (!Number.isInteger(n) || n < 1 || n > MAX_SESSION_NUMBER) return null;
  return n;
}

export function gaSessionCookieName(measurementId: string): string {
  const suffix = measurementId.trim().replace(/^G-/, "");
  return `_ga_${suffix}`;
}

/**
 * Parse `_ga_<MEASUREMENT>` into session_id + session_number.
 * Supports GS1.1.sId.n.… and GS2.1.s{id}$o{n}$… cookie shapes.
 */
export function parseGaSessionCookie(
  cookieHeader: string | null | undefined,
  measurementId: string,
): Pick<GaCheckoutAttribution, "ga_session_id" | "ga_session_number"> {
  const empty = { ga_session_id: null, ga_session_number: null };
  if (!cookieHeader || !measurementId) return empty;
  const name = gaSessionCookieName(measurementId);
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`));
  if (!match?.[1]) return empty;
  try {
    const decoded = decodeURIComponent(match[1]);
    return parseGaSessionCookieValue(decoded);
  } catch {
    return empty;
  }
}

export function parseGaSessionCookieValue(
  raw: string,
): Pick<GaCheckoutAttribution, "ga_session_id" | "ga_session_number"> {
  const empty = { ga_session_id: null, ga_session_number: null };
  const value = raw.trim();
  if (!value) return empty;

  const gs2Id = value.match(/(?:^|[.$])s(\d{1,20})(?:\$|$)/);
  const gs2Num = value.match(/(?:^|[.$])o(\d{1,7})(?:\$|$)/);
  if (gs2Id) {
    return {
      ga_session_id: sanitizeGaSessionId(gs2Id[1]),
      ga_session_number: sanitizeGaSessionNumber(gs2Num?.[1] ?? null),
    };
  }

  const parts = value.split(".");
  if (parts[0]?.startsWith("GS1") && parts.length >= 4) {
    return {
      ga_session_id: sanitizeGaSessionId(parts[2]),
      ga_session_number: sanitizeGaSessionNumber(parts[3]),
    };
  }

  return empty;
}

export function captureGaCheckoutAttributionFromCookies(
  cookieHeader: string | null | undefined,
  measurementId: string,
): GaCheckoutAttribution {
  const session = parseGaSessionCookie(cookieHeader, measurementId);
  return {
    ga_client_id: sanitizeGaClientId(
      parseGaClientIdFromCookieHeader(cookieHeader),
    ),
    ga_session_id: session.ga_session_id,
    ga_session_number: session.ga_session_number,
  };
}

function parseGaClientIdFromCookieHeader(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)_ga=([^;]+)/);
  if (!match?.[1]) return null;
  try {
    const decoded = decodeURIComponent(match[1]);
    const parts = decoded.split(".");
    if (parts.length >= 4) {
      return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function gtagGet(
  measurementId: string,
  field: "client_id" | "session_id" | "session_number",
): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") {
      resolve(null);
      return;
    }
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, 400);
    try {
      window.gtag("get", measurementId, field, (value: unknown) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        if (typeof value === "string" || typeof value === "number") {
          resolve(String(value));
          return;
        }
        resolve(null);
      });
    } catch {
      if (!settled) {
        settled = true;
        window.clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

/**
 * Consent-gated IDs for Stripe Checkout metadata.
 * Prefers gtag('get'), falls back to first-party cookies.
 */
export async function captureGaCheckoutAttribution(): Promise<GaCheckoutAttribution> {
  if (typeof document === "undefined" || !hasAnalyticsConsent() || !GA_MEASUREMENT_ID) {
    return { ...EMPTY_GA_CHECKOUT_ATTRIBUTION };
  }

  const fromCookies = captureGaCheckoutAttributionFromCookies(
    document.cookie,
    GA_MEASUREMENT_ID,
  );

  const [gtagClient, gtagSession, gtagNumber] = await Promise.all([
    gtagGet(GA_MEASUREMENT_ID, "client_id"),
    gtagGet(GA_MEASUREMENT_ID, "session_id"),
    gtagGet(GA_MEASUREMENT_ID, "session_number"),
  ]);

  return {
    ga_client_id:
      sanitizeGaClientId(gtagClient) ?? fromCookies.ga_client_id,
    ga_session_id:
      sanitizeGaSessionId(gtagSession) ?? fromCookies.ga_session_id,
    ga_session_number:
      sanitizeGaSessionNumber(gtagNumber) ?? fromCookies.ga_session_number,
  };
}
