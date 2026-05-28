/**
 * Pragmatic session score (0–1000) for drill / mental maths.
 *
 * Designed so short sessions cannot post leaderboard-style scores, and harder
 * modes earn more credit for the same accuracy.
 */

/** Question count required for full “volume” credit. */
export const SESSION_SCORE_FULL_VOLUME_QUESTIONS = 15;

/** At or below this avg ms per question, speed bonus is maxed. */
export const SESSION_SCORE_SPEED_BASELINE_MS = 3000;

export type SessionScoreOptions = {
  /** Mean question difficulty (1–6 from generators). Default 2 (easy). */
  avgDifficulty?: number;
};

/**
 * Difficulty multiplier: ~0.80 at difficulty 1, ~1.20 at difficulty 6.
 */
export function difficultyScoreFactor(avgDifficulty: number): number {
  const d = Math.min(6, Math.max(1, avgDifficulty));
  return 0.72 + (d / 6) * 0.48;
}

/**
 * Volume multiplier: linear ramp until FULL_VOLUME_QUESTIONS.
 * 1 question ≈ 6.7% volume credit; 15+ questions = 100%.
 */
export function volumeScoreFactor(totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  return Math.min(1, totalQuestions / SESSION_SCORE_FULL_VOLUME_QUESTIONS);
}

/**
 * Speed multiplier: minor tweak (85%–100% of composite).
 */
export function speedScoreFactor(avgSpeedMs: number): number {
  const ratio = Math.min(1, SESSION_SCORE_SPEED_BASELINE_MS / Math.max(avgSpeedMs, 600));
  return 0.85 + 0.15 * ratio;
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

  const composite = accuracy * volumeFactor * difficultyFactor * speedFactor;
  return Math.round(Math.min(1000, composite * 1000));
}

/** Mean difficulty from per-question values; empty → 2. */
export function averageQuestionDifficulty(difficulties: number[]): number {
  if (difficulties.length === 0) return 2;
  const sum = difficulties.reduce((a, b) => a + b, 0);
  return sum / difficulties.length;
}
