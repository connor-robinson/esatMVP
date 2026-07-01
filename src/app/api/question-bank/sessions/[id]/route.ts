import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { labelForQuestionBankTag } from '@/lib/questionBank/esatCurriculumTopicLabels';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/question-bank/sessions/[id] — session detail + attempts
 * PATCH /api/question-bank/sessions/[id] — complete session
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = createServerClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: qbSession, error: qbError } = await supabase
      .from('question_bank_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
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
          question_stem,
          correct_option,
          options,
          difficulty,
          subjects,
          primary_tag,
          secondary_tags
        )
      `,
      )
      .eq('session_id', id)
      .eq('user_id', session.user.id)
      .order('attempted_at', { ascending: true });

    if (attemptsError) {
      return NextResponse.json(
        { error: 'Failed to load session attempts' },
        { status: 500 },
      );
    }

    const wrongQuestions = ((attempts ?? []) as Array<{
      question_id: string;
      user_answer: string;
      is_correct: boolean;
      attempted_at: string;
      ai_generated_questions: {
        question_stem?: string;
        correct_option?: string;
        difficulty?: string;
        subjects?: string;
        primary_tag?: string | null;
      } | null;
    }>)
      .filter((a) => !a.is_correct)
      .map((a) => {
        const q = a.ai_generated_questions as {
          question_stem?: string;
          correct_option?: string;
          options?: Record<string, string>;
          difficulty?: string;
          subjects?: string;
          primary_tag?: string | null;
        } | null;
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
      attempts: attempts ?? [],
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
    const supabase = createServerClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
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
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to complete session' },
        { status: 500 },
      );
    }

    return NextResponse.json({ session: data });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = createServerClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('question_bank_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

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
