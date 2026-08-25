/**
 * Partner invite token crypto helpers.
 * Raw tokens are only shown at generation time; DB stores SHA-256 hex only.
 */

import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32; // 256 bits

export function generatePartnerInviteToken(): {
  rawToken: string;
  tokenHash: string;
  tokenPrefix: string;
} {
  const rawToken = randomBytes(TOKEN_BYTES).toString("base64url");
  return {
    rawToken,
    tokenHash: hashPartnerInviteToken(rawToken),
    tokenPrefix: rawToken.slice(0, 8),
  };
}

export function hashPartnerInviteToken(rawToken: string): string {
  return createHash("sha256").update(rawToken.trim(), "utf8").digest("hex");
}

export function isPlausiblePartnerToken(rawToken: string): boolean {
  const t = rawToken.trim();
  // base64url of 32 bytes is typically 43 chars; allow reasonable bounds
  return t.length >= 32 && t.length <= 128 && /^[A-Za-z0-9_-]+$/.test(t);
}

export function buildPartnerClaimUrl(origin: string, rawToken: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/access/redeem/${encodeURIComponent(rawToken)}`;
}
