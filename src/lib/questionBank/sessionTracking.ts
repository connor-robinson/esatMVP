import type {
  QuestionBankQuestion,
  QuestionBankSessionAttempt,
  QuestionBankSessionSource,
  UiDifficultyLabel,
} from '@/types/questionBank';
import { resolveUiDifficulty } from '@/lib/questionBank/sessionStats';

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
      console.error('[QB Session] register failed:', res.status, body);
    }
    return res.ok;
  } catch (err) {
    console.error('[QB Session] register error:', err);
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
      console.error('[QB Session] complete failed:', res.status, body);
    }
    return res.ok;
  } catch (err) {
    console.error('[QB Session] complete error:', err);
    return false;
  }
}
