/**
 * Session score (0–1000) for drill / mental maths.
 *
 * Calibrated so short perfect easy runs score modestly, long accurate runs
 * score highly, and 1000 is possible but only on exceptional sessions.
 */

/** At or below this avg ms per question, speed bonus is effectively maxed. */
export const SESSION_SCORE_SPEED_BASELINE_MS = 2500;

/** Shown as the score scale denominator in UI (e.g. 842 / 1000). */
export const SESSION_SCORE_DISPLAY_MAX = 1000;

/** Maximum score the formula can return. */
export const SESSION_SCORE_ABSOLUTE_MAX = 1000;

/** @deprecated Kept for imports; volume is anchor-based now. */
export const SESSION_SCORE_FULL_VOLUME_QUESTIONS = 40;

/** @deprecated Kept for imports; scoring no longer uses an exponential curve. */
export const SESSION_SCORE_CURVE_K = 2.4;

/**
 * Base score at 100% accuracy, typical speed, difficulty ≈2 (easy).
 * Log-interpolated between calibration anchors.
 */
const VOLUME_BASE_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [1, 180],
  [5, 370],
  [10, 500],
  [20, 700],
  [40, 880],
  [60, 930],
];

/** Missed questions reduce score sharply (e.g. 9/10 ≈ 350–400 on a 10-question run). */
const ACCURACY_MISS_EXPONENT = 2.2;

export type SessionScoreOptions = {
  /** Mean question difficulty (1–6 from generators). Default 2 (easy). */
  avgDifficulty?: number;
};

/** Base points from session length before accuracy / difficulty / speed. */
export function volumeBaseScore(totalQuestions: number): number {
  const n = Math.max(1, totalQuestions);
  const anchors = VOLUME_BASE_ANCHORS;

  if (n <= anchors[0][0]) return anchors[0][1];

  const last = anchors[anchors.length - 1];
  if (n >= last[0]) {
    const prev = anchors[anchors.length - 2];
    const span = last[0] - prev[0];
    const t = span > 0 ? (n - last[0]) / span : 0;
    return Math.min(960, last[1] + t * (last[1] - prev[1]) * 0.45);
  }

  for (let i = 0; i < anchors.length - 1; i++) {
    const [n0, s0] = anchors[i];
    const [n1, s1] = anchors[i + 1];
    if (n >= n0 && n <= n1) {
      const t =
        (Math.log(n) - Math.log(n0)) / (Math.log(n1) - Math.log(n0));
      return s0 + t * (s1 - s0);
    }
  }

  return last[1];
}

/** 100% → 1; each missed question matters (not linear in accuracy). */
export function accuracyScoreFactor(accuracy: number): number {
  const a = Math.min(1, Math.max(0, accuracy));
  if (a >= 1) return 1;
  return Math.pow(a, ACCURACY_MISS_EXPONENT);
}

/** Easy (≈2) = 1.0×; hardest (6) ≈ 1.18×. */
export function difficultyScoreFactor(avgDifficulty: number): number {
  const d = Math.min(6, Math.max(1, avgDifficulty));
  if (d <= 2) return 1;
  return 1 + ((d - 2) / 4) * 0.18;
}

/**
 * Speed multiplier: small bonus for quick averages (~4% at elite pace).
 */
export function speedScoreFactor(avgSpeedMs: number): number {
  const ms = Math.max(avgSpeedMs, 400);
  const neutralMs = 4200;
  const quickMs = SESSION_SCORE_SPEED_BASELINE_MS;
  if (ms >= neutralMs) return 0.98;
  const t = Math.min(1, (neutralMs - ms) / (neutralMs - quickMs));
  return 0.98 + 0.06 * t;
}

/** @deprecated Volume is anchor-based; returns normalized 0–1 for legacy callers. */
export function volumeScoreFactor(totalQuestions: number): number {
  return volumeBaseScore(totalQuestions) / VOLUME_BASE_ANCHORS[3][1];
}

/** @deprecated */
export function scoreFromComposite(composite: number): number {
  if (composite <= 0) return 0;
  return Math.min(
    SESSION_SCORE_ABSOLUTE_MAX,
    Math.round(SESSION_SCORE_ABSOLUTE_MAX * Math.min(1, composite)),
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
  const base = volumeBaseScore(totalQuestions);
  const raw =
    base *
    accuracyScoreFactor(accuracy) *
    difficultyScoreFactor(options?.avgDifficulty ?? 2) *
    speedScoreFactor(avgSpeedMs);

  return Math.min(SESSION_SCORE_ABSOLUTE_MAX, Math.max(0, Math.round(raw)));
}

/** Mean difficulty from per-question values; empty → 2. */
export function averageQuestionDifficulty(difficulties: number[]): number {
  if (difficulties.length === 0) return 2;
  const sum = difficulties.reduce((a, b) => a + b, 0);
  return sum / difficulties.length;
}
