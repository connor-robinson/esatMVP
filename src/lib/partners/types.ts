/**
 * Partner access types and constants.
 */

export type PartnerStatus = "active" | "paused" | "ended";
export type PartnerInviteStatus = "unused" | "redeemed" | "revoked" | "expired";

export type AccessSource =
  | "subscription"
  | "one_time"
  | "partner"
  | "tester"
  | "none";

export interface UserAccess {
  hasFullAccess: boolean;
  source: AccessSource;
  tier: "free" | "weekly" | "monthly" | "season_pass" | "tester" | "partner";
  partnerId: string | null;
  partnerSlug: string | null;
  partnerDisplayName: string | null;
  partnerBatchLabel: string | null;
  partnerActivated: boolean;
  /** Active partner entitlement end (authoritative for partner UI). */
  partnerEndsAt: string | null;
  expiresAt: string | null;
  subscriptionStatus?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  pendingPlan?: "weekly" | "monthly" | "season_pass" | null;
  tester?: {
    isMember: boolean;
    status: string;
    premiumActive: boolean;
    accessExpiresAt: string | null;
  };
}

export type RedeemErrorCode =
  | "invalid_token"
  | "unauthenticated"
  | "already_claimed"
  | "expired"
  | "unavailable"
  | "partner_inactive"
  | "already_entitled"
  | "already_partner_entitled"
  | "already_paid"
  | "rate_limited";

export interface RedeemSuccess {
  ok: true;
  idempotent: boolean;
  partnerId: string;
  partnerSlug: string;
  partnerName: string;
  partnerDisplayName: string;
  accessLevel: string;
  entitlementId: string;
  startsAt: string;
  endsAt: string;
  batchId: string | null;
  batchLabel: string | null;
}

export interface RedeemFailure {
  ok: false;
  error: RedeemErrorCode;
  partnerDisplayName?: string;
  partnerSlug?: string;
  endsAt?: string;
}

export type RedeemResult = RedeemSuccess | RedeemFailure;

export const PARTNER_CLAIM_COOKIE = "esatcamp_partner_claim";
/** Pending claim cookie lifetime (seconds). */
export const PARTNER_CLAIM_COOKIE_MAX_AGE = 60 * 60; // 1 hour

/** One-shot GA beacon after redeem (no tokens). */
export const PARTNER_REDEEM_TRACK_COOKIE = "esatcamp_partner_redeem_track";

export const PARTNER_FEEDBACK_FEATURES = [
  { id: "question_bank", label: "Question Bank" },
  { id: "past_papers", label: "Past Papers" },
  { id: "calibration", label: "Calibration" },
  { id: "mental_maths", label: "Mental Maths" },
  { id: "score_converter", label: "Score Converter" },
  { id: "solutions", label: "Solutions / explanations" },
  { id: "other", label: "Other" },
] as const;

export type PartnerFeedbackFeatureId =
  (typeof PARTNER_FEEDBACK_FEATURES)[number]["id"];

export function redeemErrorTitle(code: RedeemErrorCode): string {
  switch (code) {
    case "already_claimed":
      return "This code has no remaining claims";
    case "expired":
      return "This code has expired";
    case "partner_inactive":
    case "unavailable":
    case "invalid_token":
      return "This access code isn't valid";
    case "already_partner_entitled":
    case "already_entitled":
      return "You already have programme access";
    case "already_paid":
      return "You already have full access";
    case "rate_limited":
      return "Too many attempts";
    case "unauthenticated":
      return "Sign in to claim access";
    default:
      return "Access unavailable";
  }
}

export function redeemErrorMessage(code: RedeemErrorCode): string {
  switch (code) {
    case "already_claimed":
      return "This access code has already been fully redeemed (or its claim limit has been reached). If you already claimed it, sign in with the same account. Otherwise ask your school or programme for a new code.";
    case "expired":
      return "This access code is past its expiry date. Ask your school or programme for a new code.";
    case "partner_inactive":
      return "This programme is not currently issuing access. Contact your school or programme organiser for help.";
    case "already_partner_entitled":
    case "already_entitled":
      return "Your account already has active access through this organisation, so this code was not needed.";
    case "already_paid":
      return "Your account already has full ESAT Camp access, so you don't need to redeem a complimentary code.";
    case "rate_limited":
      return "Please wait a few minutes, then try again.";
    case "unauthenticated":
      return "Create an account or sign in to claim your complimentary ESAT Camp access.";
    case "unavailable":
    case "invalid_token":
    default:
      return "Check the code and try again. If it still fails, ask your school or programme for a fresh code.";
  }
}
