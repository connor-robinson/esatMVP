import type { SupabaseClient } from '@supabase/supabase-js';
import type { QuestionBankReviewAttemptSnapshot } from '@/lib/questionBank/sessionTracking';
import type { QuestionBankSessionAttemptApiRow } from '@/lib/questionBank/hydrateSessionForMark';

const QUESTION_JOIN_SELECT = `
  id,
  generation_id,
  schema_id,
  question_stem,
  correct_option,
  options,
  difficulty,
  subjects,
  test_type,
  primary_tag,
  secondary_tags,
  solution_reasoning,
  solution_key_insight,
  distractor_map,
  has_visual,
  status,
  created_at
`;

function readReviewAttempts(
  summary: unknown,
): QuestionBankReviewAttemptSnapshot[] {
  if (!summary || typeof summary !== 'object') return [];
  const raw = (summary as { reviewAttempts?: unknown }).reviewAttempts;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out: QuestionBankReviewAttemptSnapshot[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.questionId !== 'string') continue;
    out.push({
      questionId: row.questionId,
      questionNumber:
        typeof row.questionNumber === 'number' ? row.questionNumber : out.length + 1,
      userAnswer: typeof row.userAnswer === 'string' ? row.userAnswer : '',
      isCorrect: Boolean(row.isCorrect),
      timeSpentMs: typeof row.timeSpentMs === 'number' ? row.timeSpentMs : 0,
      wasRevealed: Boolean(row.wasRevealed),
      usedHint: Boolean(row.usedHint),
      wrongAnswersBefore: Array.isArray(row.wrongAnswersBefore)
        ? (row.wrongAnswersBefore as string[])
        : [],
      timestamp:
        typeof row.timestamp === 'number' ? row.timestamp : Date.now(),
    });
  }
  return out.sort((a, b) => a.questionNumber - b.questionNumber);
}

/**
 * When exam attempt rows failed to persist, rebuild API-shaped rows from the
 * compact summary.reviewAttempts snapshot + live question joins (for solutions).
 */
export async function synthesizeAttemptsFromReviewSnapshot(
  supabase: SupabaseClient,
  summary: unknown,
): Promise<QuestionBankSessionAttemptApiRow[]> {
  const snapshots = readReviewAttempts(summary);
  if (snapshots.length === 0) return [];

  const ids = [...new Set(snapshots.map((s) => s.questionId))];
  const { data: questions, error } = await supabase
    .from('ai_generated_questions')
    .select(QUESTION_JOIN_SELECT)
    .in('id', ids);

  if (error) {
    console.error(
      '[question-bank] synthesizeAttemptsFromReviewSnapshot',
      error.message,
    );
  }

  const byId = new Map<string, Record<string, unknown>>();
  for (const q of questions ?? []) {
    byId.set(String((q as { id: string }).id), q as Record<string, unknown>);
  }

  return snapshots.map((snap) => {
    const joined = byId.get(snap.questionId) ?? null;
    const attemptedAt = new Date(
      Number.isFinite(snap.timestamp) ? snap.timestamp : Date.now(),
    ).toISOString();
    return {
      question_id: snap.questionId,
      user_answer: snap.userAnswer,
      is_correct: snap.isCorrect,
      time_spent_ms: snap.timeSpentMs,
      attempted_at: attemptedAt,
      was_revealed: snap.wasRevealed,
      used_hint: snap.usedHint,
      wrong_answers_before: snap.wrongAnswersBefore,
      ai_generated_questions: joined as QuestionBankSessionAttemptApiRow['ai_generated_questions'],
    };
  });
}
