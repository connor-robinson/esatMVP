/**
 * Session outcome stats - one row per question, not per submit attempt.
 * Retries on incorrect answers must not inflate totals (e.g. 6/12 not 12/19).
 */

import type { BuilderSession, GeneratedQuestion, QuestionAttempt } from "@/types/core";
import { resolveDisplayFolderForTopic } from "@/lib/display-folder-registry";
import { SESSION_FALLBACK_TOPIC_ID } from "@/lib/analytics";
import { averageQuestionDifficulty } from "@/lib/session-score";

export type SessionOutcomeStats = {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  averageTimeMs: number;
  totalTimeMs: number;
  fastestTimeMs: number;
  slowestTimeMs: number;
  difficulties: number[];
};

export type AttemptAccuracyStats = {
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  averageTimeMs: number;
  totalTimeMs: number;
  fastestTimeMs: number;
  slowestTimeMs: number;
};

/** Accuracy = correct submits / all submits (retries on the same question count). */
export function computeAttemptAccuracyStats(
  attempts: QuestionAttempt[],
): AttemptAccuracyStats {
  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((a) => a.isCorrect).length;
  const times = attempts.map((a) => a.timeSpent || 0);
  const totalTimeMs = times.reduce((sum, t) => sum + t, 0);
  const positiveTimes = times.filter((t) => t > 0);

  return {
    totalAttempts,
    correctAttempts,
    accuracy:
      totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0,
    averageTimeMs: totalAttempts > 0 ? totalTimeMs / totalAttempts : 0,
    totalTimeMs,
    fastestTimeMs: positiveTimes.length ? Math.min(...positiveTimes) : 0,
    slowestTimeMs: positiveTimes.length ? Math.max(...positiveTimes) : 0,
  };
}

export type TopicAttemptStats = {
  topicId: string;
  correct: number;
  total: number;
  times: number[];
  difficulties: number[];
};

export function computeTopicAttemptStats(
  session: BuilderSession,
  attempts: QuestionAttempt[],
): TopicAttemptStats[] {
  const byFolder = new Map<string, TopicAttemptStats>();

  for (const attempt of attempts) {
    const question = session.questions.find((q) => q.id === attempt.questionId);
    const rawTopicId = question?.topicId?.trim() || SESSION_FALLBACK_TOPIC_ID;
    const { folderId: topicId } = resolveDisplayFolderForTopic(rawTopicId);
    const existing = byFolder.get(topicId) ?? {
      topicId,
      correct: 0,
      total: 0,
      times: [],
      difficulties: [],
    };

    existing.total += 1;
    if (attempt.isCorrect) existing.correct += 1;
    existing.times.push(attempt.timeSpent || 0);
    existing.difficulties.push(question?.difficulty ?? 2);
    byFolder.set(topicId, existing);
  }

  return Array.from(byFolder.values());
}

/** Minimal session shell for stats when only questions + limit are known. */
export function buildSessionForStats(
  questions: GeneratedQuestion[],
  questionLimit: number,
): BuilderSession {
  return {
    id: "",
    questions,
    config: {
      sessionLengthMode: "questions",
      questionLimit,
      timeLimitMinutes: 0,
      topicIds: [],
      variantToLevelMap: {},
      topicVariantSelections: [],
    },
    startedAt: 0,
    attempts: 0,
  };
}

/** Finite cap when the stored question pool covers the run; else open-ended (0). */
export function inferQuestionLimit(
  storedQuestionCount: number,
  attempts: QuestionAttempt[],
): number {
  const uniqueAttempted = new Set(attempts.map((a) => a.questionId)).size;
  if (storedQuestionCount > 1 && storedQuestionCount >= uniqueAttempted) {
    return storedQuestionCount;
  }
  return 0;
}

export type TopicOutcomeStats = {
  topicId: string;
  correct: number;
  total: number;
  times: number[];
  difficulties: number[];
};

/** Questions included in this run (finite cap or attempted pool). */
export function getQuestionsInRun(
  session: BuilderSession,
  attempts: QuestionAttempt[],
): GeneratedQuestion[] {
  const limit = session.config?.questionLimit ?? 0;
  const pool =
    limit > 0 ? session.questions.slice(0, limit) : session.questions;
  const attemptedIds = new Set(attempts.map((a) => a.questionId));
  const poolById = new Map(pool.map((q) => [q.id, q]));

  if (limit > 0) {
    return pool.filter((q) => attemptedIds.has(q.id));
  }

  const seen = new Set<string>();
  const ordered: GeneratedQuestion[] = [];
  for (const attempt of attempts) {
    if (seen.has(attempt.questionId)) continue;
    seen.add(attempt.questionId);
    ordered.push(
      poolById.get(attempt.questionId) ?? {
        id: attempt.questionId,
        question: "",
        answer: "",
        topicId: "",
        difficulty: 2,
      },
    );
  }
  return ordered;
}

export function isQuestionCorrect(
  questionId: string,
  attempts: QuestionAttempt[],
): boolean {
  return attempts.some((a) => a.questionId === questionId && a.isCorrect);
}

/** Total ms spent on a question (all tries). */
export function timeSpentOnQuestion(
  questionId: string,
  attempts: QuestionAttempt[],
): number {
  return attempts
    .filter((a) => a.questionId === questionId)
    .reduce((sum, a) => sum + (a.timeSpent || 0), 0);
}

export function computeSessionOutcomeStats(
  session: BuilderSession,
  attempts: QuestionAttempt[],
): SessionOutcomeStats {
  const questionsInRun = getQuestionsInRun(session, attempts);
  const totalQuestions = questionsInRun.length;

  if (totalQuestions === 0) {
    return {
      totalQuestions: 0,
      correctAnswers: 0,
      accuracy: 0,
      averageTimeMs: 0,
      totalTimeMs: 0,
      fastestTimeMs: 0,
      slowestTimeMs: 0,
      difficulties: [],
    };
  }

  let correctAnswers = 0;
  const perQuestionTimes: number[] = [];
  const difficulties: number[] = [];

  for (const question of questionsInRun) {
    if (isQuestionCorrect(question.id, attempts)) {
      correctAnswers += 1;
    }
    perQuestionTimes.push(timeSpentOnQuestion(question.id, attempts));
    difficulties.push(question.difficulty ?? 2);
  }

  const totalTimeMs = perQuestionTimes.reduce((a, b) => a + b, 0);
  const averageTimeMs = totalTimeMs / totalQuestions;
  const positiveTimes = perQuestionTimes.filter((t) => t > 0);

  return {
    totalQuestions,
    correctAnswers,
    accuracy: (correctAnswers / totalQuestions) * 100,
    averageTimeMs,
    totalTimeMs,
    fastestTimeMs: positiveTimes.length ? Math.min(...positiveTimes) : 0,
    slowestTimeMs: positiveTimes.length ? Math.max(...positiveTimes) : 0,
    difficulties,
  };
}

/** Question pool for this session (finite cap or full list). */
export function getSessionQuestionPool(session: BuilderSession): GeneratedQuestion[] {
  const limit = session.config?.questionLimit ?? 0;
  return limit > 0 ? session.questions.slice(0, limit) : session.questions;
}

/** Topic rows when nothing was answered - still allows DB + leaderboard saves. */
export function buildPlannedTopicOutcomes(session: BuilderSession): TopicOutcomeStats[] {
  const pool = getSessionQuestionPool(session);
  const byFolder = new Map<string, TopicOutcomeStats>();

  for (const question of pool) {
    const rawTopicId = question.topicId?.trim() || SESSION_FALLBACK_TOPIC_ID;
    const { folderId: topicId } = resolveDisplayFolderForTopic(rawTopicId);
    const existing = byFolder.get(topicId);
    if (existing) {
      existing.difficulties.push(question.difficulty ?? 2);
      continue;
    }
    byFolder.set(topicId, {
      topicId,
      correct: 0,
      total: 0,
      times: [],
      difficulties: [question.difficulty ?? 2],
    });
  }

  if (byFolder.size === 0 && session.config?.topicVariantSelections?.length) {
    for (const sel of session.config.topicVariantSelections) {
      const { folderId: topicId } = resolveDisplayFolderForTopic(sel.topicId);
      if (!byFolder.has(topicId)) {
        byFolder.set(topicId, {
          topicId,
          correct: 0,
          total: 0,
          times: [],
          difficulties: [2],
        });
      }
    }
  }

  return Array.from(byFolder.values());
}

export function computeTopicOutcomeStats(
  session: BuilderSession,
  attempts: QuestionAttempt[],
): TopicOutcomeStats[] {
  const questionsInRun = getQuestionsInRun(session, attempts);
  const byFolder = new Map<
    string,
    { correct: number; total: number; times: number[]; difficulties: number[] }
  >();

  for (const question of questionsInRun) {
    const rawTopicId = question.topicId?.trim() || SESSION_FALLBACK_TOPIC_ID;
    const { folderId: topicId } = resolveDisplayFolderForTopic(rawTopicId);
    const existing = byFolder.get(topicId) ?? {
      correct: 0,
      total: 0,
      times: [],
      difficulties: [],
    };

    existing.total += 1;
    if (isQuestionCorrect(question.id, attempts)) {
      existing.correct += 1;
    }
    existing.times.push(timeSpentOnQuestion(question.id, attempts));
    existing.difficulties.push(question.difficulty ?? 2);

    byFolder.set(topicId, existing);
  }

  if (byFolder.size === 0) {
    return buildPlannedTopicOutcomes(session);
  }

  return Array.from(byFolder.entries()).map(([topicId, stats]) => ({
    topicId,
    ...stats,
  }));
}

export function buildSessionProgressByQuestion(
  session: BuilderSession,
  attempts: QuestionAttempt[],
): Array<{ questionNumber: number; accuracy: number; speed: number }> {
  const questionsInRun = getQuestionsInRun(session, attempts);
  let runningCorrect = 0;
  const points: Array<{ questionNumber: number; accuracy: number; speed: number }> =
    [];

  questionsInRun.forEach((question, index) => {
    const questionNumber = index + 1;
    if (isQuestionCorrect(question.id, attempts)) {
      runningCorrect += 1;
    }
    const timeMs = timeSpentOnQuestion(question.id, attempts);
    const speed = timeMs > 0 ? 60000 / timeMs : 0;

    points.push({
      questionNumber,
      accuracy: (runningCorrect / questionNumber) * 100,
      speed,
    });
  });

  return points;
}

export function averageDifficultyForSession(
  session: BuilderSession,
  attempts: QuestionAttempt[],
): number {
  const { difficulties } = computeSessionOutcomeStats(session, attempts);
  return averageQuestionDifficulty(difficulties);
}
