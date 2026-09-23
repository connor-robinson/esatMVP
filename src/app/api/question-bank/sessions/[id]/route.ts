import { NextRequest, NextResponse } from 'next/server';
import { requireRouteUser } from '@/lib/supabase/auth';
import { labelForQuestionBankTag } from '@/lib/questionBank/esatCurriculumTopicLabels';
import { synthesizeAttemptsFromReviewSnapshot } from '@/lib/questionBank/synthesizeAttemptsFromReviewSnapshot';
import {
  normalizeOptionalStringMap,
  normalizeQuestionOptions,
} from '@/lib/questionBank/normalizeOptions';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

type SessionAttemptApiRow = {
  id?: string;
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  time_spent_ms: number | null;
  attempted_at: string;
  was_revealed?: boolean | null;
  used_hint?: boolean | null;
  wrong_answers_before?: string[] | null;
  ai_generated_questions: {
    question_stem?: string;
    correct_option?: string;
    difficulty?: string;
    subjects?: string;
    primary_tag?: string | null;
  } | null;
};

/**
 * GET /api/question-bank/sessions/[id] - session detail + attempts
 * PATCH /api/question-bank/sessions/[id] - complete session
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, supabase, error: authError } = await requireRouteUser(_request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: qbSession, error: qbError } = await supabase
      .from('question_bank_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (qbError || !qbSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data: attempts, error: attemptsError } = await supabase
      .from('question_bank_attempts')
      .select(
        `
        id,
        question_id,
        user_answer,
        is_correct,
        time_spent_ms,
        attempted_at,
        was_revealed,
        used_hint,
        wrong_answers_before,
        ai_generated_questions (
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
        )
      `,
      )
      .eq('session_id', id)
      .eq('user_id', user.id)
      .order('attempted_at', { ascending: true });

    if (attemptsError) {
      return NextResponse.json(
        { error: 'Failed to load session attempts' },
        { status: 500 },
      );
    }

    let resolvedAttempts: SessionAttemptApiRow[] =
      (attempts as SessionAttemptApiRow[] | null) ?? [];

    if (resolvedAttempts.length === 0) {
      resolvedAttempts = (await synthesizeAttemptsFromReviewSnapshot(
        supabase,
        (qbSession as { summary?: unknown }).summary,
      )) as SessionAttemptApiRow[];
    }

    const wrongQuestions = resolvedAttempts
      .filter((a) => !a.is_correct)
      .map((a) => {
        const q = a.ai_generated_questions;
        return {
          questionId: a.question_id,
          questionStem: q?.question_stem ?? '',
          userAnswer: a.user_answer,
          correctOption: q?.correct_option ?? '',
          topicLabel: q?.primary_tag
            ? labelForQuestionBankTag(q.primary_tag)
            : null,
          subjects: q?.subjects ?? '',
          difficulty: q?.difficulty ?? '',
          attemptedAt: a.attempted_at,
          sessionId: id,
        };
      });

    return NextResponse.json({
      session: qbSession,
      attempts: resolvedAttempts.map((attempt) => {
        const question = attempt.ai_generated_questions;
        if (!question || typeof question !== "object") return attempt;
        const row = question as {
          options?: unknown;
          distractor_map?: unknown;
        };
        return {
          ...attempt,
          ai_generated_questions: {
            ...question,
            options: normalizeQuestionOptions(row.options),
            distractor_map: normalizeOptionalStringMap(row.distractor_map),
          },
        };
      }),
      wrongQuestions,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, supabase, error: authError } = await requireRouteUser(request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      question_count,
      correct_count,
      total_time_ms,
      summary,
      ended_at,
    } = body;

    const { data, error } = await supabase
      .from('question_bank_sessions')
      .update({
        question_count,
        correct_count,
        total_time_ms,
        summary: summary ?? {},
        ended_at: ended_at ?? new Date().toISOString(),
      } as never)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[question-bank/sessions PATCH]', error.message, error.code);
      return NextResponse.json(
        { error: 'Failed to complete session', detail: error.message },
        { status: 500 },
      );
    }

    if (!data) {
      // Session row may never have been created (register failed). Create+complete.
      const { data: created, error: createError } = await supabase
        .from('question_bank_sessions')
        .upsert(
          {
            id,
            user_id: user.id,
            question_count: question_count ?? 0,
            correct_count: correct_count ?? 0,
            total_time_ms: total_time_ms ?? 0,
            summary: summary ?? {},
            ended_at: ended_at ?? new Date().toISOString(),
          } as never,
          { onConflict: 'id' },
        )
        .select()
        .maybeSingle();

      if (createError || !created) {
        console.error(
          '[question-bank/sessions PATCH upsert]',
          createError?.message,
          createError?.code,
        );
        return NextResponse.json(
          {
            error: 'Failed to complete session',
            detail: createError?.message ?? 'no_row',
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ session: created });
    }

    return NextResponse.json({ session: data });
  } catch (err) {
    console.error('[question-bank/sessions PATCH]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, supabase, error: authError } = await requireRouteUser(_request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('question_bank_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete session' },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
