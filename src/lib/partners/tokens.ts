/**
 * Partner invite / access-code crypto helpers (server-only).
 * Raw individual codes are shown only at generation time; DB stores SHA-256 hex.
 */

import { createHash, randomBytes } from "node:crypto";
import {
  ACCESS_CODE_ALPHABET,
  SHORT_ACCESS_CODE_LENGTH,
  isCohortCodeFormat,
  isLegacyInviteToken,
  isShortAccessCode,
  stripAccessCode,
} from "./accessCodeFormat";

export {
  ACCESS_CODE_ALPHABET,
  SHORT_ACCESS_CODE_LENGTH,
  COHORT_CODE_MIN_LENGTH,
  COHORT_CODE_MAX_LENGTH,
  stripAccessCode,
  isShortAccessCode,
  isCohortCodeFormat,
  isLegacyInviteToken,
  isPlausiblePartnerToken,
  buildPartnerClaimUrl,
  normalizeCohortCodeInput,
} from "./accessCodeFormat";

const LEGACY_TOKEN_BYTES = 32; // 256 bits

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
