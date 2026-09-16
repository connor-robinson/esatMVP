/**
 * Marketing snapshot of student-facing question bank size.
 * Counts `ai_generated_questions` with status=approved (soft-deleted Majors,
 * missing-diagram, incomplete statement lists, and missing-table rows excluded).
 * Update manually when the bank changes materially (no runtime DB lookup).
 */
export const QUESTION_BANK_TOTAL_COUNT = 2590;

/** ISO date the snapshot above was last verified against production. */
export const QUESTION_BANK_TOTAL_COUNT_AS_OF = "2026-09-16";
