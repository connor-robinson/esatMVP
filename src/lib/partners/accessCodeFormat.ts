/**
 * Client-safe access-code format helpers (no Node crypto).
 */

/** Uppercase letters + digits, excluding O/0/I/1/L. */
export const ACCESS_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const SHORT_ACCESS_CODE_LENGTH = 8;
export const COHORT_CODE_MIN_LENGTH = 6;
export const COHORT_CODE_MAX_LENGTH = 24;

const SHORT_CODE_RE = new RegExp(
  `^[${ACCESS_CODE_ALPHABET}]{${SHORT_ACCESS_CODE_LENGTH}}$`,
);
const COHORT_CODE_RE = /^[A-Z0-9]{6,24}$/;

export function stripAccessCode(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

export function isShortAccessCode(raw: string): boolean {
  return SHORT_CODE_RE.test(stripAccessCode(raw));
}

export function isCohortCodeFormat(raw: string): boolean {
  return COHORT_CODE_RE.test(stripAccessCode(raw));
}

export function isLegacyInviteToken(raw: string): boolean {
  const t = raw.trim();
  return t.length >= 32 && t.length <= 128 && /^[A-Za-z0-9_-]+$/.test(t);
}

export function isPlausiblePartnerToken(raw: string): boolean {
  return (
    isShortAccessCode(raw) || isLegacyInviteToken(raw) || isCohortCodeFormat(raw)
  );
}

export function buildPartnerClaimUrl(origin: string, rawToken: string): string {
  const base = origin.replace(/\/$/, "");
  if (isShortAccessCode(rawToken) || isCohortCodeFormat(rawToken)) {
    return `${base}/access/${encodeURIComponent(stripAccessCode(rawToken))}`;
  }
  return `${base}/access/redeem/${encodeURIComponent(rawToken)}`;
}

export function normalizeCohortCodeInput(raw: string): string {
  return stripAccessCode(raw);
}
