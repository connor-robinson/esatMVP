/** Max questions unpaid users can attempt in the question bank. */
export const FREE_TIER_QUESTION_LIMIT = 10;

/**
 * ESAT Math 1 free preview — fixed hook set (order 1–10).
 * DB UUIDs are deterministic from generation_id via hookQuestionDbId().
 */
import {
  ESAT_M1_HOOK_QUESTION_DB_IDS,
} from "@/lib/questionBank/esatM1HookSet";

export const FREE_TIER_QUESTION_IDS: readonly string[] =
  ESAT_M1_HOOK_QUESTION_DB_IDS;

export const FREE_TIER_QUESTION_ID_SET = new Set<string>(FREE_TIER_QUESTION_IDS);
