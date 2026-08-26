/**
 * Partner invite / access-code crypto helpers.
 * Raw individual codes are shown only at generation time; DB stores SHA-256 hex.
 */

import { createHash, randomBytes } from "node:crypto";

const LEGACY_TOKEN_BYTES = 32; // 256 bits

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

export function hashPartnerInviteToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

/**
 * Hash for lookup. Short and cohort codes are normalised (case, spaces,
 * hyphens). Legacy long tokens stay case-sensitive after trim only.
 */
export function hashAccessInput(raw: string): string {
  if (isLegacyInviteToken(raw) && !isShortAccessCode(raw)) {
    return hashPartnerInviteToken(raw.trim());
  }
  if (isShortAccessCode(raw) || isCohortCodeFormat(raw)) {
    return hashPartnerInviteToken(stripAccessCode(raw));
  }
  return hashPartnerInviteToken(raw.trim());
}

function randomAlphabetChar(): string {
  const modulus = ACCESS_CODE_ALPHABET.length;
  const limit = 256 - (256 % modulus);
  for (;;) {
    const byte = randomBytes(1)[0];
    if (byte < limit) return ACCESS_CODE_ALPHABET[byte % modulus];
  }
}

export function generateShortAccessCode(): string {
  let code = "";
  for (let i = 0; i < SHORT_ACCESS_CODE_LENGTH; i++) {
    code += randomAlphabetChar();
  }
  return code;
}

export function generatePartnerInviteToken(): {
  rawToken: string;
  tokenHash: string;
  tokenPrefix: string;
} {
  const rawToken = generateShortAccessCode();
  return {
    rawToken,
    tokenHash: hashAccessInput(rawToken),
    tokenPrefix: rawToken.slice(0, 4),
  };
}

/** Legacy long-token generator, kept for tests and any replay tooling. */
export function generateLegacyPartnerInviteToken(): {
  rawToken: string;
  tokenHash: string;
  tokenPrefix: string;
} {
  const rawToken = randomBytes(LEGACY_TOKEN_BYTES).toString("base64url");
  return {
    rawToken,
    tokenHash: hashPartnerInviteToken(rawToken),
    tokenPrefix: rawToken.slice(0, 8),
  };
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
