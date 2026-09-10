/**
 * Calibration stats from attempt rows (no fake ESAT scaled scores).
 */

import type {
  PaperCalibrationStats,
  QuestionCalibrationStats,
} from "./types";

export type AttemptLike = {
  question_id: string;
  user_answer: string | null;
  is_correct: boolean;
  time_spent_ms: number | null;
  was_revealed?: boolean | null;
};

export type MockAttemptLike = {
  completed: boolean;
  score: number | null;
  total_time_ms: number | null;
  answers?: Array<{ questionId: string; isCorrect: boolean }> | null;
};

const MIN_ATTEMPTS_FOR_FLAGS = 30;

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function percentile(nums: number[], p: number): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx];
}

export function computeQuestionCalibration(
  questionId: string,
  attempts: AttemptLike[],
  predictedDifficulty?: number | null,
  predictedTimeSeconds?: number | null,
): QuestionCalibrationStats {
  const rows = attempts.filter((a) => a.question_id === questionId);
  const attemptCount = rows.length;
  const correct = rows.filter((a) => a.is_correct).length;
  const percentCorrect =
    attemptCount > 0 ? (correct / attemptCount) * 100 : null;

  const times = rows
    .map((a) => a.time_spent_ms)
    .filter((t): t is number => t != null && t > 0)
    .map((t) => t / 1000);
  const medianResponseTimeSeconds = median(times);

  const skipped = rows.filter(
    (a) => a.was_revealed === true || !a.user_answer,
  ).length;
  const skipRate = attemptCount > 0 ? skipped / attemptCount : null;

  const optionDistribution: Record<string, number> = {};
  for (const row of rows) {
    const letter = (row.user_answer ?? "").trim().toUpperCase().slice(0, 1);
    if (!letter) continue;
    optionDistribution[letter] = (optionDistribution[letter] ?? 0) + 1;
  }

  const flags = buildQualityFlags({
    attemptCount,
    percentCorrect,
    medianResponseTimeSeconds,
    skipRate,
    optionDistribution,
    predictedDifficulty: predictedDifficulty ?? null,
    predictedTimeSeconds: predictedTimeSeconds ?? null,
  });

  return {
    questionId,
    attemptCount,
    percentCorrect,
    medianResponseTimeSeconds,
    skipRate,
    optionDistribution,
    flags,
  };
}

export function buildQualityFlags(input: {
  attemptCount: number;
  percentCorrect: number | null;
  medianResponseTimeSeconds: number | null;
  skipRate: number | null;
  optionDistribution: Record<string, number>;
  predictedDifficulty: number | null;
  predictedTimeSeconds: number | null;
}): string[] {
  const flags: string[] = [];
  if (input.attemptCount < MIN_ATTEMPTS_FOR_FLAGS) return flags;

  const pc = input.percentCorrect;
  const pred = input.predictedDifficulty;

  if (pc != null && pred != null) {
    // Rough mapping: diff 1≈75%, 3≈45%, 5≈20%
    const expected = Math.max(15, 90 - pred * 15);
    if (pc < expected - 20) {
      flags.push("Question significantly harder than predicted");
    } else if (pc > expected + 20) {
      flags.push("Question significantly easier than predicted");
    }
  }

  if (
    input.medianResponseTimeSeconds != null &&
    input.predictedTimeSeconds != null &&
    input.medianResponseTimeSeconds > input.predictedTimeSeconds * 1.6
  ) {
    flags.push("Median time unusually high");
  }

  if (input.skipRate != null && input.skipRate > 0.35) {
    flags.push("Very high skip rate");
  }

  const total = Object.values(input.optionDistribution).reduce(
    (a, b) => a + b,
    0,
  );
  if (total >= MIN_ATTEMPTS_FOR_FLAGS) {
    for (const [letter, n] of Object.entries(input.optionDistribution)) {
      if (n / total < 0.02) {
        flags.push(`Almost nobody chooses distractor ${letter}`);
      }
    }
  }

  if (pc != null && pc > 15 && pc < 40) {
    const entries = Object.entries(input.optionDistribution).sort(
      (a, b) => b[1] - a[1],
    );
    if (entries.length >= 2 && entries[0][1] > 0 && entries[1][1] / entries[0][1] > 0.85) {
      flags.push("Potentially ambiguous question");
    }
  }

  return flags;
}

export function computePaperCalibration(
  attempts: MockAttemptLike[],
): PaperCalibrationStats {
  const total = attempts.length;
  const completed = attempts.filter((a) => a.completed);
  const scores = completed
    .map((a) => a.score)
    .filter((s): s is number => s != null);
  const times = completed
    .map((a) => a.total_time_ms)
    .filter((t): t is number => t != null && t > 0)
    .map((t) => t / 1000);

  const questionCorrectRates: Record<string, number | null> = {};
  const byQuestion: Record<string, { correct: number; total: number }> = {};
  for (const attempt of completed) {
    for (const ans of attempt.answers ?? []) {
      const bucket = byQuestion[ans.questionId] ?? { correct: 0, total: 0 };
      bucket.total += 1;
      if (ans.isCorrect) bucket.correct += 1;
      byQuestion[ans.questionId] = bucket;
    }
  }
  for (const [id, bucket] of Object.entries(byQuestion)) {
    questionCorrectRates[id] =
      bucket.total > 0 ? (bucket.correct / bucket.total) * 100 : null;
  }

  return {
    completedAttempts: completed.length,
    medianScore: median(scores),
    meanScore:
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null,
    medianCompletionTimeSeconds: median(times),
    completionRate: total > 0 ? completed.length / total : null,
    questionCorrectRates,
    percentiles: {
      p25: percentile(scores, 25),
      p50: percentile(scores, 50),
      p75: percentile(scores, 75),
    },
  };
}

export { MIN_ATTEMPTS_FOR_FLAGS };
