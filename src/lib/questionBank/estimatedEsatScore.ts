import { predictEsatCampSectionScore } from "@/lib/papers/esatCampMockPredictedScore";
import { countsAsSessionCorrect } from "@/lib/questionBank/sessionStats";
import type {
  QuestionBankSessionAttempt,
  UiDifficultyLabel,
} from "@/types/questionBank";

const DIFFICULTY_WEIGHT: Record<UiDifficultyLabel, number> = {
  Easy: 0.85,
  Medium: 1,
  Hard: 1.25,
  Extreme: 1.4,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export type EstimatedEsatScoreResult = {
  /** Predicted 1.0–9.0 style score. */
  score: number;
  /** Weighted accuracy as a 0–100 percentage. */
  percentage: number;
  /** Pace adjustment applied to accuracy before scaling (−0.05 to +0.06). */
  paceAdjust: number;
};

/**
 * Beta estimate of an ESAT-style scaled score from a question-bank session.
 * Weights by difficulty, then nudges accuracy by pace vs the session time limit.
 */
export function estimateQuestionBankEsatScore(input: {
  attempts: QuestionBankSessionAttempt[];
  subjectsLabel?: string | null;
  /** Wall-clock session duration in ms. */
  elapsedMs: number;
  /** Session time limit in minutes (0 / missing = no pace nudge). */
  timeLimitMinutes?: number | null;
}): EstimatedEsatScoreResult | null {
  const { attempts } = input;
  if (attempts.length === 0) return null;

  let weightedCorrect = 0;
  let weightedTotal = 0;
  for (const attempt of attempts) {
    const weight = DIFFICULTY_WEIGHT[attempt.uiDifficulty] ?? 1;
    weightedTotal += weight;
    if (countsAsSessionCorrect(attempt)) weightedCorrect += weight;
  }
  if (weightedTotal <= 0) return null;

  const rawPercent = weightedCorrect / weightedTotal;

  let paceAdjust = 0;
  const limitMs =
    input.timeLimitMinutes != null && input.timeLimitMinutes > 0
      ? input.timeLimitMinutes * 60 * 1000
      : 0;
  if (limitMs > 0 && input.elapsedMs > 0) {
    const paceRatio = clamp(input.elapsedMs / limitMs, 0.25, 1.25);
    // Finished early with decent accuracy → small boost.
    if (paceRatio < 0.75 && rawPercent >= 0.45) {
      paceAdjust = 0.04 + (0.75 - paceRatio) * 0.08;
    } else if (paceRatio > 0.98 && rawPercent < 0.4) {
      // Used the full clock with weak accuracy → slight drag.
      paceAdjust = -0.03;
    } else if (paceRatio < 0.55 && rawPercent >= 0.7) {
      paceAdjust = 0.06;
    }
    paceAdjust = clamp(paceAdjust, -0.05, 0.06);
  }

  const adjustedPercent = clamp(rawPercent + paceAdjust, 0, 1);
  const score = predictEsatCampSectionScore({
    section: input.subjectsLabel?.trim() || "Mathematics",
    correct: Math.round(adjustedPercent * 100),
    total: 100,
  });
  if (score == null) return null;

  return {
    score,
    percentage: Math.round(rawPercent * 1000) / 10,
    paceAdjust,
  };
}
