import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  FREE_TIER_QUESTION_ID_SET,
  FREE_TIER_LIMIT_PER_SUBJECT,
  freeTierQuestionIdsForSubject,
  freeTierSubjectForQuestionId,
} from '@/lib/questionBank/freeTierQuestions';
import { userHasFullAccess } from '@/lib/subscription/serverAccess';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type AttemptWriteInput = {
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  time_spent_ms?: number | null;
  viewed_solution?: boolean;
  was_revealed?: boolean;
  used_hint?: boolean;
  wrong_answers_before?: string[];
  time_until_correct_ms?: number | null;
  session_id?: string | null;
  attempted_at?: string;
};

export type AttemptWriteError =
  | { code: 'invalid'; message: string }
  | { code: 'upgrade_required'; message: string }
  | { code: 'free_limit'; message: string };

function normalizeAttempt(
  raw: AttemptWriteInput,
): AttemptWriteInput | AttemptWriteError {
  if (
    !raw.question_id ||
    typeof raw.user_answer !== 'string' ||
    typeof raw.is_correct !== 'boolean'
  ) {
    return {
      code: 'invalid',
      message: 'Missing required fields',
    };
  }
  return {
    question_id: String(raw.question_id),
    user_answer: raw.user_answer,
    is_correct: raw.is_correct,
    time_spent_ms: raw.time_spent_ms ?? null,
    viewed_solution: raw.viewed_solution ?? false,
    was_revealed: raw.was_revealed ?? false,
    used_hint: raw.used_hint ?? false,
    wrong_answers_before: Array.isArray(raw.wrong_answers_before)
      ? raw.wrong_answers_before
      : [],
    time_until_correct_ms: raw.time_until_correct_ms ?? null,
    session_id: raw.session_id ?? null,
    attempted_at: raw.attempted_at ?? new Date().toISOString(),
  };
}

/**
 * Free-tier gate for one or many question ids. Paid/trial users skip this.
 */
export async function assertCanWriteAttempts(
  userId: string,
  questionIds: string[],
): Promise<AttemptWriteError | null> {
  const hasFullAccess = await userHasFullAccess(userId);
  if (hasFullAccess) return null;

  const uniqueIds = [...new Set(questionIds.map(String))];
  for (const questionId of uniqueIds) {
    if (!FREE_TIER_QUESTION_ID_SET.has(questionId)) {
      return {
        code: 'upgrade_required',
        message: 'Upgrade required to attempt this question',
      };
    }
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey);
  const bySubject = new Map<string, string[]>();
  for (const questionId of uniqueIds) {
    const subject = freeTierSubjectForQuestionId(questionId);
    if (!subject) {
      return {
        code: 'upgrade_required',
        message: 'Upgrade required to attempt this question',
      };
    }
    const list = bySubject.get(subject) ?? [];
    list.push(questionId);
    bySubject.set(subject, list);
  }

  for (const [subject, ids] of bySubject) {
    const subjectIds = [...freeTierQuestionIdsForSubject(subject)];
    const { data: priorAttempts } = await admin
      .from('question_bank_attempts')
      .select('question_id')
      .eq('user_id', userId)
      .in('question_id', subjectIds);

    const attemptedIds = new Set(
      (priorAttempts ?? []).map((row) => String(row.question_id)),
    );
    const newIds = ids.filter((id) => !attemptedIds.has(id));
    if (attemptedIds.size + newIds.length > FREE_TIER_LIMIT_PER_SUBJECT) {
      return {
        code: 'free_limit',
        message:
          'Free question limit reached for this subject. Upgrade for unlimited access.',
      };
    }
  }

  return null;
}

export function parseAttemptWriteInputs(
  body: unknown,
): { attempts: AttemptWriteInput[] } | AttemptWriteError {
  if (!body || typeof body !== 'object') {
    return { code: 'invalid', message: 'Invalid body' };
  }

  const record = body as Record<string, unknown>;
  const rawList = Array.isArray(record.attempts)
    ? record.attempts
    : [record];

  if (rawList.length === 0) {
    return { code: 'invalid', message: 'No attempts provided' };
  }
  if (rawList.length > 80) {
    return { code: 'invalid', message: 'Too many attempts in one request' };
  }

  const attempts: AttemptWriteInput[] = [];
  for (const item of rawList) {
    if (!item || typeof item !== 'object') {
      return { code: 'invalid', message: 'Invalid attempt payload' };
    }
    const normalized = normalizeAttempt(item as AttemptWriteInput);
    if ('code' in normalized) return normalized;
    attempts.push(normalized);
  }
  return { attempts };
}

export async function insertQuestionBankAttempts(
  supabase: SupabaseClient,
  userId: string,
  attempts: AttemptWriteInput[],
): Promise<{ data: unknown[] | null; error: { message: string } | null }> {
  const rows = attempts.map((attempt) => ({
    user_id: userId,
    question_id: attempt.question_id,
    user_answer: attempt.user_answer,
    is_correct: attempt.is_correct,
    time_spent_ms: attempt.time_spent_ms || null,
    viewed_solution: attempt.viewed_solution || false,
    was_revealed: attempt.was_revealed ?? false,
    used_hint: attempt.used_hint ?? false,
    wrong_answers_before: attempt.wrong_answers_before ?? [],
    time_until_correct_ms: attempt.time_until_correct_ms ?? null,
    session_id: attempt.session_id ?? null,
    attempted_at: attempt.attempted_at ?? new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('question_bank_attempts')
    .insert(rows as never)
    .select();

  if (error) {
    return { data: null, error: { message: error.message || 'Unknown error' } };
  }
  return { data: (data as unknown[]) ?? [], error: null };
}
