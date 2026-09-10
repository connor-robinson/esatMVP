/**
 * Practice-pool exclusivity for published/approved mock questions.
 */

import {
  MOCK_RESERVING_STATUSES,
  SETTING_EXCLUDE_PUBLISHED_FROM_PRACTICE,
  type MockStatus,
} from "./types";

export function statusReservesQuestions(status: MockStatus): boolean {
  return (MOCK_RESERVING_STATUSES as readonly string[]).includes(status);
}

export function parseExcludeSetting(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === true) return true;
  if (typeof value === "object" && value != null && "enabled" in value) {
    return Boolean((value as { enabled: unknown }).enabled);
  }
  // jsonb true stores as boolean; default ON
  return value !== false && value !== "false";
}

export const EXCLUDE_SETTING_KEY = SETTING_EXCLUDE_PUBLISHED_FROM_PRACTICE;

/**
 * Whether a question should be hidden from ordinary practice.
 * Admins can override practice_eligible directly; setting gates enforcement.
 */
export function shouldExcludeFromPractice(input: {
  excludeSettingEnabled: boolean;
  practiceEligible: boolean;
  reservedForMock: boolean;
}): boolean {
  if (!input.practiceEligible) return true;
  if (!input.excludeSettingEnabled) return false;
  return input.reservedForMock;
}

/** Apply practice exclusion to a Supabase query builder when enabled. */
export function applyPracticeExclusionFilter<
  Q extends {
    eq: (col: string, val: boolean) => Q;
    or?: (filter: string) => Q;
  },
>(query: Q, excludeSettingEnabled: boolean): Q {
  if (!excludeSettingEnabled) {
    // Still honour explicit practice_eligible=false overrides
    return query.eq("practice_eligible", true);
  }
  // Exclude reserved mock questions and any manually marked ineligible.
  return query.eq("practice_eligible", true).eq("reserved_for_mock", false);
}
