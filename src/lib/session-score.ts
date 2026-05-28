/**
 * Pragmatic session score (0–999) for drill / mental maths.
 *
 * 1000 is intentionally unreachable; ~900 is an excellent run. Longer, harder,
 * accurate sessions score higher via a curved scale (not a flat cap at 1000).
 */

/** Questions for full linear volume credit (longer runs needed). */
export const SESSION_SCORE_FULL_VOLUME_QUESTIONS = 28;

/** At or below this avg ms per question, speed bonus is maxed. */
export const SESSION_SCORE_SPEED_BASELINE_MS = 3000;

/** Highest score the formula can return (1000 is reserved / unreachable). */
export const SESSION_SCORE_ABSOLUTE_MAX = 999;

/** Shown as the score scale denominator in UI (e.g. 842 / 1000). */
export const SESSION_SCORE_DISPLAY_MAX = 1000;

/**
 * Steepness of the score curve. Higher = harder to approach 999.
 * ~900 typically needs a long, hard, accurate session.
 */
export const SESSION_SCORE_CURVE_K = 3.15;

export type SessionScoreOptions = {
  /** Mean question difficulty (1–6 from generators). Default 2 (easy). */
  avgDifficulty?: number;
};

/**
 * Difficulty multiplier: ~0.78 at difficulty 1, ~1.28 at difficulty 6.
 */
export function difficultyScoreFactor(avgDifficulty: number): number {
  const d = Math.min(6, Math.max(1, avgDifficulty));
  return 0.68 + (d / 6) * 0.6;
}

/**
 * Volume bonus: small lift for longer sessions (88%–100%), not a cap on accuracy.
 */
export function volumeScoreFactor(totalQuestions: number): number {
  if (totalQuestions <= 0) return 0.88;
  const ramp = Math.min(1, totalQuestions / SESSION_SCORE_FULL_VOLUME_QUESTIONS);
  return 0.88 + 0.12 * ramp;
}

/**
 * Speed multiplier: minor tweak (90%–100% of composite).
 */
export function speedScoreFactor(avgSpeedMs: number): number {
  const ratio = Math.min(1, SESSION_SCORE_SPEED_BASELINE_MS / Math.max(avgSpeedMs, 600));
  return 0.9 + 0.1 * ratio;
}

/**
 * Maps raw performance (0–~1.3+) onto 0–999 with an asymptotic curve.
 */
export function scoreFromComposite(composite: number): number {
  if (composite <= 0) return 0;
  const curved = 1 - Math.exp(-SESSION_SCORE_CURVE_K * composite);
  return Math.min(
    SESSION_SCORE_ABSOLUTE_MAX,
    Math.round(1000 * curved),
  );
}

/**
 * Session score from accuracy, volume, mode difficulty, and speed.
 */
export function calculateSessionScore(
  correctAnswers: number,
  totalQuestions: number,
  avgSpeedMs: number,
  options?: SessionScoreOptions,
): number {
  if (totalQuestions <= 0) return 0;

  const correct = Math.min(Math.max(0, correctAnswers), totalQuestions);
  const accuracy = correct / totalQuestions;
  const volumeFactor = volumeScoreFactor(totalQuestions);
  const difficultyFactor = difficultyScoreFactor(options?.avgDifficulty ?? 2);
  const speedFactor = speedScoreFactor(avgSpeedMs);

  // Accuracy is primary; volume/speed/difficulty are modest multipliers (~±12–28%).
  const composite =
    accuracy * volumeFactor * difficultyFactor * speedFactor;
  return scoreFromComposite(composite);
}

/** Mean difficulty from per-question values; empty → 2. */
export function averageQuestionDifficulty(difficulties: number[]): number {
  if (difficulties.length === 0) return 2;
  const sum = difficulties.reduce((a, b) => a + b, 0);
  return sum / difficulties.length;
}
