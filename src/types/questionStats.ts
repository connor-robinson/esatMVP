/**
 * Types for question community statistics
 */

import type { QuestionChoiceStatsRow } from "@/lib/supabase/types";

/**
 * Question choice statistics with computed fields
 */
export interface QuestionChoiceStats extends QuestionChoiceStatsRow {
  /**
   * Average time spent in seconds
   */
  avgTimeSeconds: number;
  
  /**
   * Percentage breakdown of answer choices (A-H)
   */
  optionPercentages: Record<string, number>;
  
  /**
   * Whether there's sufficient data to show stats
   */
  hasSufficientData: boolean;
}

/**
 * Computed stats for a single question
 */
export interface QuestionStats {
  questionId: number;
  avgTimeSeconds: number;
  attempts: number;
  correctPercentage: number;
  optionCounts: Record<string, number>;
  optionPercentages: Record<string, number>;
  hasSufficientData: boolean;
}

/**
 * Minimum number of attempts required to show stats
 */
export const MIN_ATTEMPTS_THRESHOLD = 30;

/**
 * Compute stats from raw database row
 */
export function computeQuestionStats(
  row: QuestionChoiceStatsRow,
  minAttempts: number = MIN_ATTEMPTS_THRESHOLD
): QuestionStats {
  const attempts = row.attempts || 0;
  const avgTimeSeconds = attempts > 0 ? (row.time_sum_seconds || 0) / attempts : 0;
  const correctPercentage = attempts > 0 ? ((row.correct || 0) / attempts) * 100 : 0;
  
  const optionCounts: Record<string, number> = {
    A: row.a_count || 0,
    B: row.b_count || 0,
    C: row.c_count || 0,
    D: row.d_count || 0,
    E: row.e_count || 0,
    F: row.f_count || 0,
    G: row.g_count || 0,
    H: row.h_count || 0,
  };
  
  const optionPercentages: Record<string, number> = {};
  for (const [option, count] of Object.entries(optionCounts)) {
    optionPercentages[option] = attempts > 0 ? (count / attempts) * 100 : 0;
  }
  
  return {
    questionId: row.question_id,
    avgTimeSeconds,
    attempts,
    correctPercentage,
    optionCounts,
    optionPercentages,
    hasSufficientData: attempts >= minAttempts,
  };
}




