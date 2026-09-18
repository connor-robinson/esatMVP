import type {
  QuestionBankQuestion,
  QuestionBankSessionAttempt,
  QuestionBankSessionSource,
  UiDifficultyLabel,
} from '@/types/questionBank';
import { resolveUiDifficulty } from '@/lib/questionBank/sessionStats';
import { clearHomeProgressCache } from '@/lib/questionBank/homeProgressCache';

export type PersistableQuestionBankAttempt = {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentMs: number;
  wasRevealed?: boolean;
  usedHint?: boolean;
  wrongAnswersBefore?: string[];
  attemptedAt?: string;
};

/** Compact snapshot stored on session.summary for Mark fallback. */
export type QuestionBankReviewAttemptSnapshot = {
  questionId: string;
  questionNumber: number;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentMs: number;
  wasRevealed: boolean;
  usedHint: boolean;
  wrongAnswersBefore: string[];
  timestamp: number;
};

export function buildReviewAttemptSnapshots(
  attempts: readonly QuestionBankSessionAttempt[],
): QuestionBankReviewAttemptSnapshot[] {
  return attempts.map((a) => ({
    questionId: a.questionId,
    questionNumber: a.questionNumber,
    userAnswer: a.userAnswer,
    isCorrect: a.isCorrect,
    timeSpentMs: a.timeSpentMs,
    wasRevealed: a.wasRevealed,
    usedHint: a.usedHint,
    wrongAnswersBefore: a.wrongAnswersBefore,
    timestamp: a.timestamp,
  }));
}

function toApiBody(
  attempt: PersistableQuestionBankAttempt,
  sessionId?: string | null,
) {
  return {
    question_id: attempt.questionId,
    user_answer: attempt.userAnswer,
    is_correct: attempt.isCorrect,
    time_spent_ms: attempt.timeSpentMs,
    viewed_solution: false,
    was_revealed: attempt.wasRevealed ?? false,
    used_hint: attempt.usedHint ?? false,
    wrong_answers_before: attempt.wrongAnswersBefore ?? [],
    time_until_correct_ms: null,
    session_id: sessionId ?? null,
    attempted_at: attempt.attemptedAt ?? new Date().toISOString(),
  };
}

async function persistViaBatch(
  attempts: readonly PersistableQuestionBankAttempt[],
  sessionId?: string | null,
): Promise<{ saved: number; failed: number }> {
  const res = await fetch('/api/question-bank/attempts/batch', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attempts: attempts.map((a) => toApiBody(a, sessionId)),
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body?.error === 'string'
        ? body.error
        : `batch attempt save failed: ${res.status}`,
    );
  }
  const body = (await res.json().catch(() => ({}))) as { saved?: number };
  const saved = typeof body.saved === 'number' ? body.saved : attempts.length;
  return { saved, failed: Math.max(0, attempts.length - saved) };
}

async function persistViaSequential(
  attempts: readonly PersistableQuestionBankAttempt[],
  sessionId?: string | null,
): Promise<{ saved: number; failed: number }> {
  let saved = 0;
  let failed = 0;
  for (const attempt of attempts) {
    try {
      const res = await fetch('/api/question-bank/attempts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toApiBody(attempt, sessionId)),
      });
      if (!res.ok) {
        failed += 1;
        continue;
      }
      saved += 1;
    } catch {
      failed += 1;
    }
  }
  return { saved, failed };
}

/**
 * Persist attempt rows (e.g. exam mode, which does not save per-answer).
 * Empty userAnswer is allowed for unanswered exam items.
 * Throws if not all attempts were saved (after batch + sequential fallback).
 */
export async function persistQuestionBankAttempts(params: {
  attempts: readonly PersistableQuestionBankAttempt[];
  sessionId?: string | null;
}): Promise<{ saved: number; failed: number }> {
  if (params.attempts.length === 0) {
    return { saved: 0, failed: 0 };
  }

  let result: { saved: number; failed: number };
  try {
    result = await persistViaBatch(params.attempts, params.sessionId);
  } catch (batchErr) {
    console.error('[question-bank] batch attempt persist failed, retrying sequential', batchErr);
    result = await persistViaSequential(params.attempts, params.sessionId);
  }

  if (result.saved > 0) {
    clearHomeProgressCache();
  }

  if (result.failed > 0 || result.saved !== params.attempts.length) {
    throw new Error(
      `Failed to save ${result.failed || params.attempts.length - result.saved} of ${params.attempts.length} attempts`,
    );
  }

  return result;
}

export function createSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `qb-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function subjectsLabelFromList(subjects: string[]): string {
  if (subjects.length === 0) return '';
  if (subjects.length <= 2) return subjects.join(', ');
  return `${subjects.slice(0, 2).join(', ')} +${subjects.length - 2}`;
}

export function inferUiDifficultiesFromQuestions(
  questions: QuestionBankQuestion[],
): UiDifficultyLabel[] {
  const set = new Set<UiDifficultyLabel>();
  for (const q of questions) {
    set.add(q.difficulty);
  }
  return Array.from(set);
}

export function buildSessionAttemptEntry(
  question: QuestionBankQuestion,
  questionNumber: number,
  userAnswer: string,
  isCorrect: boolean,
  timeSpentMs: number,
  uiDifficulties: UiDifficultyLabel[],
  options: {
    wasRevealed: boolean;
    usedHint: boolean;
    wrongAnswersBefore: string[];
  },
): QuestionBankSessionAttempt {
  return {
    questionId: question.id,
    questionNumber,
    userAnswer,
    isCorrect,
    timeSpentMs,
    wasRevealed: options.wasRevealed,
    usedHint: options.usedHint,
    wrongAnswersBefore: options.wrongAnswersBefore,
    difficulty: question.difficulty,
    uiDifficulty: resolveUiDifficulty(question.difficulty, uiDifficulties),
    primaryTag: question.primary_tag,
    secondaryTags: question.secondary_tags,
    subjects: question.subjects,
    questionStem: question.question_stem,
    correctOption: question.correct_option,
    options: question.options,
    timestamp: Date.now(),
  };
}

export async function registerQuestionBankSession(params: {
  id: string;
  questionCount: number;
  timeLimitMinutes?: number | null;
  source: QuestionBankSessionSource;
  subjects?: string | null;
  testType?: string | null;
  uiDifficulties: UiDifficultyLabel[];
}): Promise<boolean> {
  try {
    const res = await fetch('/api/question-bank/sessions', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: params.id,
        question_count: params.questionCount,
        time_limit_minutes: params.timeLimitMinutes ?? null,
        source: params.source,
        subjects: params.subjects ?? null,
        test_type: params.testType ?? null,
        ui_difficulties: params.uiDifficulties,
      }),
    });
    if (!res.ok) {
      await res.json().catch(() => ({}));
    }
    return res.ok;
  } catch {
    return false;
  }
}

export async function completeQuestionBankSession(params: {
  id: string;
  summary: Record<string, unknown>;
  questionCount: number;
  correctCount: number;
  totalTimeMs: number;
}): Promise<boolean> {
  try {
    const res = await fetch(`/api/question-bank/sessions/${params.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_count: params.questionCount,
        correct_count: params.correctCount,
        total_time_ms: params.totalTimeMs,
        summary: params.summary,
        ended_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      await res.json().catch(() => ({}));
    }
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteQuestionBankSession(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/question-bank/sessions/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      await res.json().catch(() => ({}));
    }
    return res.ok;
  } catch {
    return false;
  }
}
