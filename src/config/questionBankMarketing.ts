/**
 * Marketing snapshot of student-facing question bank size.
 * Counts `ai_generated_questions` with status=approved (soft-deleted Majors
 * and missing-diagram rows are excluded).
 * Update manually when the bank changes materially (no runtime DB lookup).
 */
export const QUESTION_BANK_TOTAL_COUNT = 2605;

/** ISO date the snapshot above was last verified against production. */
export const QUESTION_BANK_TOTAL_COUNT_AS_OF = "2026-09-16";
