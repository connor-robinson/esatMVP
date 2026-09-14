/**
 * Questions permanently kept out of the mock-builder pool.
 * Free-tier hook sets (first 10 per subject for non-logged-in / free preview).
 */

import { FREE_TIER_QUESTION_ID_SET } from "@/lib/questionBank/freeTierQuestions";
import { ESAT_HOOK_SETS } from "@/lib/questionBank/esatHookSets";
import type { MockCandidateQuestion } from "./types";

const FREE_TIER_GENERATION_ID_SET = new Set<string>(
  ESAT_HOOK_SETS.flatMap((set) => [...set.generationIds]),
);

export function isFreeTierHookQuestionId(questionId: string): boolean {
  return FREE_TIER_QUESTION_ID_SET.has(questionId);
}

export function isFreeTierHookGenerationId(
  generationId: string | null | undefined,
): boolean {
  if (!generationId) return false;
  return FREE_TIER_GENERATION_ID_SET.has(generationId);
}

/** True if this bank row is part of the free preview hook sets. */
export function isFreeTierHookQuestion(q: {
  id: string;
  generationId?: string | null;
}): boolean {
  return (
    isFreeTierHookQuestionId(q.id) ||
    isFreeTierHookGenerationId(q.generationId)
  );
}

export function isDiagramQuestion(
  q: Pick<MockCandidateQuestion, "presentationType" | "hasVisual">,
): boolean {
  return (
    q.hasVisual ||
    q.presentationType === "diagram" ||
    q.presentationType === "graph"
  );
}

/** Filter pool for mock assembly: drop free-tier hooks and reserved IDs. */
export function filterMockPool(
  pool: MockCandidateQuestion[],
  options?: {
    excludeIds?: Set<string>;
    allowIds?: Set<string>;
  },
): MockCandidateQuestion[] {
  const exclude = options?.excludeIds ?? new Set<string>();
  const allow = options?.allowIds ?? new Set<string>();
  return pool.filter((q) => {
    if (allow.has(q.id)) return true;
    if (isFreeTierHookQuestion(q)) return false;
    if (exclude.has(q.id)) return false;
    if (q.reservedForMock) return false;
    return true;
  });
}

/**
 * Selection priority for mock assembly.
 * Prefer questions not in the student practice bank; never-attempted bank
 * questions are a deep fallback; attempted bank questions are last resort.
 */
export type MockPoolTier = "off_bank" | "unattempted_bank" | "attempted_bank";

export function mockPoolTier(q: MockCandidateQuestion): MockPoolTier {
  const offBank =
    q.status === "pending" ||
    q.practiceEligible === false;
  if (offBank) return "off_bank";
  if (!q.hasAttempts) return "unattempted_bank";
  return "attempted_bank";
}

/** Large score deltas so greedy fill exhausts higher tiers first. */
export function mockPoolTierScoreBonus(tier: MockPoolTier): number {
  if (tier === "off_bank") return 80;
  if (tier === "unattempted_bank") return -35;
  return -70;
}

export { FREE_TIER_GENERATION_ID_SET };
