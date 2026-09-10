/**
 * Questions permanently kept out of the mock-builder pool.
 * Free-tier hook sets (first 10 per subject for non-logged-in / free preview).
 */

import { FREE_TIER_QUESTION_ID_SET } from "@/lib/questionBank/freeTierQuestions";
import type { MockCandidateQuestion } from "./types";

export function isFreeTierHookQuestionId(questionId: string): boolean {
  return FREE_TIER_QUESTION_ID_SET.has(questionId);
}

export function isDiagramQuestion(q: Pick<
  MockCandidateQuestion,
  "presentationType" | "hasVisual"
>): boolean {
  return (
    q.hasVisual ||
    q.presentationType === "diagram" ||
    q.presentationType === "graph"
  );
}

/** Filter pool for mock assembly: drop free-tier hooks and optionally reserved IDs. */
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
    if (isFreeTierHookQuestionId(q.id)) return false;
    if (exclude.has(q.id)) return false;
    if (q.reservedForMock) return false;
    return true;
  });
}
