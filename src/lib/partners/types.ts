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

export function redeemErrorMessage(code: RedeemErrorCode): string {
  switch (code) {
    case "already_claimed":
      return "This access code has already been used.";
    case "expired":
      return "This access code has expired.";
    case "partner_inactive":
      return "This access code isn't valid.";
    case "already_partner_entitled":
    case "already_entitled":
      return "You already have access through this organisation.";
    case "already_paid":
      return "Your account already has full ESAT Camp access, so you don't need to redeem this code.";
    case "rate_limited":
      return "Too many attempts. Please try again in a few minutes.";
    case "unauthenticated":
      return "Please sign in to claim this access.";
    case "unavailable":
    case "invalid_token":
    default:
      return "This access code isn't valid.";
  }
}
