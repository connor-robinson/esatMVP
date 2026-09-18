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
};

/**
 * Persist attempt rows (e.g. exam mode, which does not save per-answer).
 * Empty userAnswer is allowed for unanswered exam items.
 */
export async function persistQuestionBankAttempts(params: {
  attempts: readonly PersistableQuestionBankAttempt[];
  sessionId?: string | null;
}): Promise<{ saved: number; failed: number }> {
  if (params.attempts.length === 0) {
    return { saved: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    params.attempts.map(async (attempt) => {
      const res = await fetch('/api/question-bank/attempts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: attempt.questionId,
          user_answer: attempt.userAnswer,
          is_correct: attempt.isCorrect,
          time_spent_ms: attempt.timeSpentMs,
          viewed_solution: false,
          was_revealed: attempt.wasRevealed ?? false,
          used_hint: attempt.usedHint ?? false,
          wrong_answers_before: attempt.wrongAnswersBefore ?? [],
          time_until_correct_ms: null,
          session_id: params.sessionId ?? null,
        }),
      });
      if (!res.ok) {
        throw new Error(`attempt save failed: ${res.status}`);
      }
    }),
  );

  let saved = 0;
  let failed = 0;
  for (const result of results) {
    if (result.status === 'fulfilled') saved += 1;
    else failed += 1;
  }

  if (saved > 0) {
    clearHomeProgressCache();
  }

  return { saved, failed };
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
      const body = await res.json().catch(() => ({}));
    }
    return res.ok;
  } catch (err) {
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
      const body = await res.json().catch(() => ({}));
    }
    return res.ok;
  } catch (err) {
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
      const body = await res.json().catch(() => ({}));
    }
    return res.ok;
  } catch (err) {
    return false;
  }
}
