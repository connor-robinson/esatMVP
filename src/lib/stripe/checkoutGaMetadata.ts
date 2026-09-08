/**
 * Map consent-gated GA ids onto Stripe metadata (strings only, no PII).
 */

import {
  EMPTY_GA_CHECKOUT_ATTRIBUTION,
  sanitizeGaSessionId,
  sanitizeGaSessionNumber,
  type GaCheckoutAttribution,
} from "@/lib/ga/session";
import { sanitizeGaClientId } from "@/lib/attribution/capture";

export const GA_META_CLIENT_ID = "ga_client_id";
export const GA_META_SESSION_ID = "ga_session_id";
export const GA_META_SESSION_NUMBER = "ga_session_number";

export function parseGaCheckoutAttribution(
  input: unknown,
): GaCheckoutAttribution {
  if (!input || typeof input !== "object") {
    return { ...EMPTY_GA_CHECKOUT_ATTRIBUTION };
  }
  const body = input as Record<string, unknown>;
  return {
    ga_client_id: sanitizeGaClientId(
      typeof body.ga_client_id === "string" ? body.ga_client_id : null,
    ),
    ga_session_id: sanitizeGaSessionId(
      typeof body.ga_session_id === "string" ||
        typeof body.ga_session_id === "number"
        ? body.ga_session_id
        : null,
    ),
    ga_session_number: sanitizeGaSessionNumber(
      typeof body.ga_session_number === "string" ||
        typeof body.ga_session_number === "number"
        ? body.ga_session_number
        : null,
    ),
  };
}

/** Stripe metadata values must be strings. Omit empty keys. */
export function toStripeGaMetadata(
  ga: GaCheckoutAttribution,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (ga.ga_client_id) out[GA_META_CLIENT_ID] = ga.ga_client_id;
  if (ga.ga_session_id) out[GA_META_SESSION_ID] = ga.ga_session_id;
  if (ga.ga_session_number != null) {
    out[GA_META_SESSION_NUMBER] = String(ga.ga_session_number);
  }
  return out;
}

export function fromStripeGaMetadata(
  metadata: Record<string, string> | null | undefined,
): GaCheckoutAttribution {
  if (!metadata) return { ...EMPTY_GA_CHECKOUT_ATTRIBUTION };
  return parseGaCheckoutAttribution({
    ga_client_id: metadata[GA_META_CLIENT_ID],
    ga_session_id: metadata[GA_META_SESSION_ID],
    ga_session_number: metadata[GA_META_SESSION_NUMBER],
  });
}

/** Merge GA keys onto existing Stripe metadata without touching userId/planType. */
export function mergeStripeGaMetadata(
  base: Record<string, string>,
  ga: GaCheckoutAttribution,
): Record<string, string> {
  return { ...base, ...toStripeGaMetadata(ga) };
}
