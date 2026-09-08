import { randomBytes } from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const REFERRAL_CODE_PREFIX = "CAMP50";

export function normalizeReferralCode(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function isReferralCodeFormat(code: string): boolean {
  const normalized = normalizeReferralCode(code);
  return new RegExp(`^${REFERRAL_CODE_PREFIX}-[A-Z0-9]{6}$`).test(normalized);
}

export function generateReferralCode(): string {
  const bytes = randomBytes(6);
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${REFERRAL_CODE_PREFIX}-${suffix}`;
}

export function referralSharePath(code: string): string {
  return `/pricing?code=${encodeURIComponent(normalizeReferralCode(code))}`;
}
