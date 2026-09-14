/** Strip tracking params (utm_*, gclid, etc.) from source URLs. */

const TRACKING_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
]);

export function stripTrackingParams(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (TRACKING_KEYS.has(lower) || lower.startsWith("utm")) {
        url.searchParams.delete(key);
      }
    }
    const qs = url.searchParams.toString();
    return qs ? `${url.origin}${url.pathname}?${qs}${url.hash}` : `${url.origin}${url.pathname}${url.hash}`;
  } catch {
    // Relative or malformed: drop obvious utm query fragments.
    return trimmed
      .replace(/([?&])utm_[^=&#]+=[^&#]*/gi, "$1")
      .replace(/[?&]$/, "")
      .replace(/\?&/, "?");
  }
}
