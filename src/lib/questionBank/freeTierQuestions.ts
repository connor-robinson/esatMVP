/** Max questions unpaid users can attempt in the question bank per preview cycle. */
export const FREE_TIER_QUESTION_LIMIT = 10;

/**
 * ESAT free preview pool: Math 1 + Math 2 + Physics hook sets (30 questions, order preserved).
 * Legacy gold questions remain in the database for the full bank.
 */
import { ESAT_HOOK_PREVIEW_DB_IDS } from "@/lib/questionBank/esatHookSets";

export const FREE_TIER_QUESTION_IDS: readonly string[] = ESAT_HOOK_PREVIEW_DB_IDS;

export const FREE_TIER_QUESTION_ID_SET = new Set<string>(FREE_TIER_QUESTION_IDS);
