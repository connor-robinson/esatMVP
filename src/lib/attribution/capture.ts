/**
 * First-touch attribution capture + sanitize.
 * Never include email or other PII.
 */

const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PATH = 200;
const MAX_REFERRER = 500;
const MAX_UTM = 100;
const MAX_GCLID = 200;
const MAX_GA_CLIENT = 64;

export type FirstTouchPayload = {
  anon_id: string;
  first_landing_page: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  gclid: string | null;
  ga_client_id: string | null;
  first_touch_at: string;
};

function stripQueryHash(path: string): string {
  return path.split("?")[0]?.split("#")[0] ?? path;
}

export function sanitizeLandingPath(
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return null;
  const bare = stripQueryHash(trimmed);
  if (!bare || EMAIL_LIKE.test(bare)) return null;
  return bare.slice(0, MAX_PATH);
}

export function sanitizeReferrer(
  referrer: string | null | undefined,
): string | null {
  if (!referrer) return null;
  const trimmed = referrer.trim();
  if (!trimmed || EMAIL_LIKE.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    const out = `${url.origin}${url.pathname}`.slice(0, MAX_REFERRER);
    return out || null;
  } catch {
    return trimmed.slice(0, MAX_REFERRER);
  }
}

export function sanitizeUtm(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || EMAIL_LIKE.test(trimmed)) return null;
  return trimmed.slice(0, MAX_UTM);
}

export function sanitizeGclid(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || EMAIL_LIKE.test(trimmed)) return null;
  // gclid is typically alphanumeric / URL-safe
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;
  return trimmed.slice(0, MAX_GCLID);
}

export function sanitizeGaClientId(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  // GA client_id looks like "123456789.1234567890"
  if (!/^\d+\.\d+$/.test(trimmed)) return null;
  return trimmed.slice(0, MAX_GA_CLIENT);
}

export function sanitizeAnonId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("anon_") || trimmed.length > 80) return null;
  if (!/^anon_[A-Za-z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

/** Parse `_ga` cookie into GA4 client_id (measurement.clientId form → clientId). */
export function parseGaClientIdFromCookie(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader || typeof document === "undefined") {
    // Allow passing raw cookie string from document.cookie
  }
  const raw = cookieHeader ?? "";
  const match = raw.match(/(?:^|;\s*)_ga=([^;]+)/);
  if (!match?.[1]) return null;
  try {
    const decoded = decodeURIComponent(match[1]);
    // Format: GA1.1.XXXXXXXXXX.YYYYYYYYYY
    const parts = decoded.split(".");
    if (parts.length >= 4) {
      return sanitizeGaClientId(`${parts[parts.length - 2]}.${parts[parts.length - 1]}`);
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function readGaClientIdFromDocument(): string | null {
  if (typeof document === "undefined") return null;
  return parseGaClientIdFromCookie(document.cookie);
}

/**
 * Build a first-touch payload from the current browser location.
 * Caller supplies anon_id and whether consent allows ga_client_id.
 */
export function captureFirstTouchFromBrowser(opts: {
  anonId: string;
  includeGaClientId: boolean;
}): FirstTouchPayload | null {
  if (typeof window === "undefined") return null;
  const anon_id = sanitizeAnonId(opts.anonId);
  const first_landing_page = sanitizeLandingPath(window.location.pathname);
  if (!anon_id || !first_landing_page) return null;

  const params = new URLSearchParams(window.location.search);

  return {
    anon_id,
    first_landing_page,
    referrer: sanitizeReferrer(document.referrer || null),
    utm_source: sanitizeUtm(params.get("utm_source")),
    utm_medium: sanitizeUtm(params.get("utm_medium")),
    utm_campaign: sanitizeUtm(params.get("utm_campaign")),
    gclid: sanitizeGclid(params.get("gclid")),
    ga_client_id: opts.includeGaClientId
      ? readGaClientIdFromDocument()
      : null,
    first_touch_at: new Date().toISOString(),
  };
}

/** Server-side validation of a client-posted first-touch body. */
export function parseFirstTouchBody(body: unknown): FirstTouchPayload | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const anon_id = sanitizeAnonId(
    typeof b.anon_id === "string" ? b.anon_id : null,
  );
  const first_landing_page = sanitizeLandingPath(
    typeof b.first_landing_page === "string" ? b.first_landing_page : null,
  );
  if (!anon_id || !first_landing_page) return null;

  const first_touch_at =
    typeof b.first_touch_at === "string" &&
    Number.isFinite(Date.parse(b.first_touch_at))
      ? new Date(b.first_touch_at).toISOString()
      : new Date().toISOString();

  return {
    anon_id,
    first_landing_page,
    referrer: sanitizeReferrer(
      typeof b.referrer === "string" ? b.referrer : null,
    ),
    utm_source: sanitizeUtm(
      typeof b.utm_source === "string" ? b.utm_source : null,
    ),
    utm_medium: sanitizeUtm(
      typeof b.utm_medium === "string" ? b.utm_medium : null,
    ),
    utm_campaign: sanitizeUtm(
      typeof b.utm_campaign === "string" ? b.utm_campaign : null,
    ),
    gclid: sanitizeGclid(typeof b.gclid === "string" ? b.gclid : null),
    ga_client_id: sanitizeGaClientId(
      typeof b.ga_client_id === "string" ? b.ga_client_id : null,
    ),
    first_touch_at,
  };
}
