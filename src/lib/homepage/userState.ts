import type { SubscriptionTier } from "@/hooks/useSubscription";
import type { TesterState } from "@/lib/tester/types";
import type { HomepageUserState } from "./types";

const TESTER_EXPIRED_STATUSES = new Set([
  "stage_1_expired",
  "stage_2_expired",
  "final_survey_pending",
  "awaiting_manual_approval",
]);

const TESTER_ACTIVE_STATUSES = new Set([
  "stage_1_survey_pending",
  "stage_1_active",
  "stage_2_active",
  "stage_3_active",
]);

/**
 * Resolve homepage persona for upgrade / tester chrome.
 * Active partner/subscription/season-pass full access is treated as premium
 * even if the user also has a founding-tester membership record.
 */
export function resolveHomepageUserState(input: {
  isLoggedIn: boolean;
  hasFullAccess: boolean;
  tier: SubscriptionTier;
  tester: TesterState | null;
}): HomepageUserState {
  if (!input.isLoggedIn) return "logged_out";

  // Partner / Stripe / season pass: product unlocked like premium.
  // Do not fall through into tester_expired upgrade prompts.
  if (input.hasFullAccess && input.tier !== "tester") {
    return "premium";
  }

  const tester = input.tester;
  if (tester?.isMember) {
    if (
      !tester.premiumActive &&
      TESTER_EXPIRED_STATUSES.has(tester.status)
    ) {
      return "tester_expired";
    }
    if (
      tester.premiumActive ||
      TESTER_ACTIVE_STATUSES.has(tester.status)
    ) {
      return "tester_active";
    }
  }

  if (input.hasFullAccess && input.tier === "tester") {
    return "tester_active";
  }

  return "free";
}
