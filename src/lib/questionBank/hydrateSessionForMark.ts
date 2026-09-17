import { resolveUiDifficulty } from '@/lib/questionBank/sessionStats';
import type {
  QuestionBankQuestion,
  QuestionBankSessionAttempt,
  QuestionBankSessionRecord,
  UiDifficultyLabel,
} from '@/types/questionBank';

export type QuestionBankSessionAttemptApiRow = {
  id?: string;
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  time_spent_ms: number | null;
  attempted_at: string;
  was_revealed?: boolean | null;
  used_hint?: boolean | null;
  wrong_answers_before?: string[] | null;
  ai_generated_questions?: QuestionBankJoinedQuestion | null;
};

export type QuestionBankJoinedQuestion = {
  id?: string;
  generation_id?: string | null;
  schema_id?: string | null;
  question_stem?: string | null;
  correct_option?: string | null;
  options?: Record<string, string> | null;
  difficulty?: string | null;
  subjects?: string | null;
  primary_tag?: string | null;
  secondary_tags?: string[] | null;
  solution_reasoning?: string | null;
  solution_key_insight?: string | null;
  distractor_map?: Record<string, string> | null;
  graph_spec?: QuestionBankQuestion['graph_spec'];
  graph_specs?: QuestionBankQuestion['graph_specs'];
  has_visual?: boolean | null;
  status?: QuestionBankQuestion['status'] | null;
  test_type?: QuestionBankQuestion['test_type'];
  created_at?: string | null;
};

export type HydratedQuestionBankMarkSession = {
  session: QuestionBankSessionRecord;
  attempts: QuestionBankSessionAttempt[];
  questions: QuestionBankQuestion[];
};

function asDifficulty(value: string | null | undefined): 'Easy' | 'Medium' | 'Hard' {
  if (value === 'Easy' || value === 'Medium' || value === 'Hard') return value;
  return 'Medium';
}

function asOptions(
  value: Record<string, string> | null | undefined,
): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  return value;
}

function buildQuestionFromJoin(
  questionId: string,
  joined: QuestionBankJoinedQuestion | null | undefined,
): QuestionBankQuestion {
  const q = joined ?? {};
  return {
    id: q.id ?? questionId,
    generation_id: q.generation_id ?? '',
    schema_id: q.schema_id ?? '',
    difficulty: asDifficulty(q.difficulty),
    question_stem: q.question_stem ?? '',
    options: asOptions(q.options),
    correct_option: q.correct_option ?? '',
    solution_reasoning: q.solution_reasoning ?? null,
    solution_key_insight: q.solution_key_insight ?? null,
    distractor_map: q.distractor_map ?? null,
    subjects: q.subjects ?? '',
    test_type: q.test_type ?? null,
    primary_tag: q.primary_tag ?? null,
    secondary_tags: q.secondary_tags ?? null,
    status: q.status ?? 'approved',
    created_at: q.created_at ?? new Date(0).toISOString(),
    graph_spec: q.graph_spec ?? null,
    graph_specs: q.graph_specs ?? null,
    has_visual: q.has_visual ?? null,
  };
}

/**
 * Rebuild client session attempts + question objects from the sessions/[id] API
 * so analytics can reopen the full mark / review experience.
 */
export function hydrateQuestionBankSessionForMark(
  session: QuestionBankSessionRecord,
  attemptRows: QuestionBankSessionAttemptApiRow[],
): HydratedQuestionBankMarkSession {
  const uiDifficulties: UiDifficultyLabel[] = Array.isArray(
    session.ui_difficulties,
  )
    ? session.ui_difficulties
    : [];

  const attempts: QuestionBankSessionAttempt[] = attemptRows.map((row, index) => {
    const question = buildQuestionFromJoin(row.question_id, row.ai_generated_questions);
    const timestamp = Date.parse(row.attempted_at);
    return {
      questionId: row.question_id,
      questionNumber: index + 1,
      userAnswer: row.user_answer ?? '',
      isCorrect: Boolean(row.is_correct),
      timeSpentMs: row.time_spent_ms ?? 0,
      wasRevealed: Boolean(row.was_revealed),
      usedHint: Boolean(row.used_hint),
      wrongAnswersBefore: Array.isArray(row.wrong_answers_before)
        ? row.wrong_answers_before
        : [],
      difficulty: question.difficulty,
      uiDifficulty: resolveUiDifficulty(question.difficulty, uiDifficulties),
      primaryTag: question.primary_tag,
      secondaryTags: question.secondary_tags,
      subjects: question.subjects,
      questionStem: question.question_stem,
      correctOption: question.correct_option,
      options: question.options,
      timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
    };
  });

  const questions = attempts.map((attempt, index) => {
    const row = attemptRows[index];
    return buildQuestionFromJoin(
      attempt.questionId,
      row?.ai_generated_questions,
    );
  });

  return { session, attempts, questions };
}
