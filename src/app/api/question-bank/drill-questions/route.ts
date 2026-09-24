import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { QuestionBankQuestion } from '@/types/questionBank';
import { applyPublishedQuestionBankFilter } from '@/lib/questionBank/libraryFilterServer';
import {
  getQuestionIdsWithOpenReports,
  omitReportedQuestions,
} from '@/lib/questionBank/excludeReported';
import {
  normalizeOptionalStringMap,
  normalizeQuestionOptions,
} from '@/lib/questionBank/normalizeOptions';

export const dynamic = 'force-dynamic';

const MAX_DRILL_QUESTIONS = 100;

/**
 * Normalize a raw DB row to QuestionBankQuestion shape (options, distractor_map parsed).
 */
function normalizeQuestionRow(q: Record<string, unknown>): QuestionBankQuestion {
  return {
    ...q,
    options: normalizeQuestionOptions(q.options),
    distractor_map: normalizeOptionalStringMap(q.distractor_map),
  } as QuestionBankQuestion;
}

/**
 * GET /api/question-bank/drill-questions
 * Returns questions the user has answered incorrectly at least once (approved only).
 * Auth required.
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Get distinct question_id from attempts where is_correct = false
    const { data: attempts, error: attemptsError } = await (supabase as any)
      .from('question_bank_attempts')
      .select('question_id')
      .eq('user_id', userId)
      .eq('is_correct', false);

    if (attemptsError) {
      return NextResponse.json({ error: 'Failed to load drill data' }, { status: 500 });
    }

    const wrongIds = [...new Set((attempts || []).map((a: { question_id: string }) => a.question_id))].slice(0, MAX_DRILL_QUESTIONS);

    if (wrongIds.length === 0) {
      return NextResponse.json({ questions: [], count: 0 });
    }

    // 2. Fetch full question rows (approved only)
    const { data: rows, error: questionsError } = await applyPublishedQuestionBankFilter(
      (supabase as any).from('ai_generated_questions').select('*'),
    )
      .in('id', wrongIds);

    if (questionsError) {
      return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 });
    }

    const reportedIds = await getQuestionIdsWithOpenReports();
    const rawQuestions = omitReportedQuestions(
      (rows || []) as Array<Record<string, unknown> & { id: string }>,
      reportedIds,
    );
    const questions = rawQuestions.map((q) => {
      try {
        return normalizeQuestionRow(q);
      } catch (parseError) {
        return q as unknown as QuestionBankQuestion;
      }
    });

    return NextResponse.json({ questions, count: questions.length });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
