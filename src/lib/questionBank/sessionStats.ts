import type { SessionProgressPoint } from '@/types/analytics';
import type {
  QuestionBankSessionAttempt,
  QuestionBankSessionSummary,
  UiDifficultyLabel,
} from '@/types/questionBank';

const PRIMARY_TOPIC_WEIGHT = 1.0;
const SECONDARY_TOPIC_WEIGHT = 0.35;
const MIN_ATTEMPTS_FOR_WEAKNESS = 2;

/** First-try correct only - wrong guesses or reveal disqualify the question. */
export function countsAsSessionCorrect(
  attempt: QuestionBankSessionAttempt,
): boolean {
  if (!attempt.isCorrect) return false;
  if (attempt.wasRevealed) return false;
  if ((attempt.wrongAnswersBefore?.length ?? 0) > 0) return false;
  return true;
}

export function resolveUiDifficulty(
  questionDifficulty: 'Easy' | 'Medium' | 'Hard',
  uiDifficulties: UiDifficultyLabel[],
): UiDifficultyLabel {
  if (
    questionDifficulty === 'Hard' &&
    uiDifficulties.includes('Extreme') &&
    !uiDifficulties.includes('Hard')
  ) {
    return 'Extreme';
  }
  return questionDifficulty;
}

export function buildQuestionBankProgressData(
  attempts: QuestionBankSessionAttempt[],
): SessionProgressPoint[] {
  if (attempts.length === 0) return [];

  let correctSoFar = 0;
  const startMs = attempts[0]?.timestamp ?? Date.now();

  return attempts.map((attempt, index) => {
    if (countsAsSessionCorrect(attempt)) correctSoFar += 1;
    const elapsedMinutes = Math.max(
      (attempt.timestamp - startMs) / 60000,
      0.01,
    );
    const questionsDone = index + 1;
    const accuracy = (correctSoFar / questionsDone) * 100;
    const speed = questionsDone / elapsedMinutes;

    return {
      questionNumber: attempt.questionNumber,
      accuracy,
      speed,
    };
  });
}

export type DifficultyBucketStats = {
  attempted: number;
  correct: number;
};

export type DifficultyBreakdown = Record<
  UiDifficultyLabel,
  DifficultyBucketStats
>;

export function computeDifficultyBreakdown(
  attempts: QuestionBankSessionAttempt[],
): DifficultyBreakdown {
  const empty = (): DifficultyBucketStats => ({ attempted: 0, correct: 0 });
  const breakdown: DifficultyBreakdown = {
    Easy: empty(),
    Medium: empty(),
    Hard: empty(),
    Extreme: empty(),
  };

  for (const attempt of attempts) {
    const bucket = breakdown[attempt.uiDifficulty];
    bucket.attempted += 1;
    if (countsAsSessionCorrect(attempt)) bucket.correct += 1;
  }

  return breakdown;
}

export type TopicStatRow = {
  topicId: string;
  label: string;
  attempted: number;
  correct: number;
  accuracy: number;
  weight: number;
};

export function computeWeightedTopicStats(
  attempts: QuestionBankSessionAttempt[],
  labelForTag: (tag: string, subject?: string) => string,
): TopicStatRow[] {
  const byTopic = new Map<
    string,
    { attempted: number; correct: number; weight: number; subject?: string }
  >();

  for (const attempt of attempts) {
    const contributions: { tag: string; weight: number }[] = [];
    if (attempt.primaryTag) {
      contributions.push({ tag: attempt.primaryTag, weight: PRIMARY_TOPIC_WEIGHT });
    }
    for (const tag of attempt.secondaryTags ?? []) {
      contributions.push({ tag, weight: SECONDARY_TOPIC_WEIGHT });
    }

    for (const { tag, weight } of contributions) {
      const row = byTopic.get(tag) ?? {
        attempted: 0,
        correct: 0,
        weight,
        subject: attempt.subjects || undefined,
      };
      row.attempted += weight;
      if (countsAsSessionCorrect(attempt)) row.correct += weight;
      if (!row.subject && attempt.subjects) row.subject = attempt.subjects;
      byTopic.set(tag, row);
    }
  }

  return Array.from(byTopic.entries())
    .map(([topicId, stats]) => ({
      topicId,
      label: labelForTag(topicId, stats.subject),
      attempted: stats.attempted,
      correct: stats.correct,
      accuracy: stats.attempted > 0 ? (stats.correct / stats.attempted) * 100 : 0,
      weight: stats.weight,
    }))
    .sort((a, b) => b.attempted - a.attempted);
}

export function findWeakestTopic(
  topicStats: TopicStatRow[],
  minAttempts = MIN_ATTEMPTS_FOR_WEAKNESS,
): TopicStatRow | null {
  const eligible = topicStats.filter((t) => t.attempted >= minAttempts);
  if (eligible.length === 0) return null;
  return eligible.reduce((weakest, current) =>
    current.accuracy < weakest.accuracy ? current : weakest,
  );
}

export function buildSessionSummary(
  attempts: QuestionBankSessionAttempt[],
  labelForTag: (tag: string, subject?: string) => string,
): QuestionBankSessionSummary {
  const totalQuestions = attempts.length;
  const correctCount = attempts.filter(countsAsSessionCorrect).length;
  const times = attempts
    .map((a) => a.timeSpentMs)
    .filter((t): t is number => t != null && t > 0);
  const totalTimeMs = times.reduce((sum, t) => sum + t, 0);
  const averageTimeMs = times.length > 0 ? totalTimeMs / times.length : 0;
  const fastestTimeMs = times.length > 0 ? Math.min(...times) : 0;
  const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

  const difficultyBreakdown = computeDifficultyBreakdown(attempts);
  const topicStats = computeWeightedTopicStats(attempts, labelForTag);
  const weakestTopic = findWeakestTopic(topicStats);
  const progressData = buildQuestionBankProgressData(attempts);

  return {
    totalQuestions,
    correctCount,
    accuracy,
    totalTimeMs,
    averageTimeMs,
    fastestTimeMs,
    difficultyBreakdown,
    topicStats,
    weakestTopic,
    progressData,
  };
}

export function mergeDifficultyBreakdowns(
  breakdowns: DifficultyBreakdown[],
): DifficultyBreakdown {
  const empty = (): DifficultyBucketStats => ({ attempted: 0, correct: 0 });
  const merged: DifficultyBreakdown = {
    Easy: empty(),
    Medium: empty(),
    Hard: empty(),
    Extreme: empty(),
  };

  for (const breakdown of breakdowns) {
    for (const key of Object.keys(merged) as UiDifficultyLabel[]) {
      merged[key].attempted += breakdown[key].attempted;
      merged[key].correct += breakdown[key].correct;
    }
  }

  return merged;
}

export function mergeTopicStats(rows: TopicStatRow[]): TopicStatRow[] {
  const byTopic = new Map<string, TopicStatRow>();

  for (const row of rows) {
    const existing = byTopic.get(row.topicId);
    if (!existing) {
      byTopic.set(row.topicId, { ...row });
      continue;
    }
    const attempted = existing.attempted + row.attempted;
    const correct = existing.correct + row.correct;
    byTopic.set(row.topicId, {
      ...existing,
      attempted,
      correct,
      accuracy: attempted > 0 ? (correct / attempted) * 100 : 0,
    });
  }

  return Array.from(byTopic.values()).sort((a, b) => b.attempted - a.attempted);
}
