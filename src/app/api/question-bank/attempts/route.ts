import { NextRequest, NextResponse } from 'next/server';
import { requireRouteUser } from '@/lib/supabase/auth';
import {
  assertCanWriteAttempts,
  insertQuestionBankAttempts,
  parseAttemptWriteInputs,
} from '@/lib/questionBank/attemptWrite';

export const dynamic = 'force-dynamic';

/**
 * POST /api/question-bank/attempts
 * Saves a single question attempt (practice / instant mode).
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await requireRouteUser(request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = parseAttemptWriteInputs(body);
    if ('code' in parsed) {
      return NextResponse.json(
        { error: parsed.message },
        { status: 400 },
      );
    }
    if (parsed.attempts.length !== 1) {
      return NextResponse.json(
        { error: 'Send exactly one attempt, or use /attempts/batch' },
        { status: 400 },
      );
    }

    const gate = await assertCanWriteAttempts(
      user.id,
      parsed.attempts.map((a) => a.question_id),
    );
    if (gate) {
      const status = gate.code === 'free_limit' ? 403 : 403;
      return NextResponse.json({ error: gate.message }, { status });
    }

    const { data, error: insertError } = await insertQuestionBankAttempts(
      supabase,
      user.id,
      parsed.attempts,
    );

    if (insertError || !data?.[0]) {
      return NextResponse.json(
        {
          error: 'Failed to save attempt',
          details: insertError?.message || 'Unknown error',
        },
        { status: 500 },
      );
    }

    try {
      const { maybeMarkPartnerActivation } = await import(
        '@/lib/partners/analytics'
      );
      const { createPartnerServiceClient } = await import(
        '@/lib/partners/service'
      );
      await maybeMarkPartnerActivation(
        createPartnerServiceClient(),
        user.id,
      );
    } catch {
      /* non-fatal */
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: metrics } = await supabase
      .from('user_daily_metrics')
      .select('total_questions, correct_answers, total_time_ms')
      .eq('user_id', user.id)
      .eq('metric_date', today)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      attempt: data[0],
      stats: metrics || {
        total_questions: 0,
        correct_answers: 0,
        total_time_ms: 0,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/question-bank/attempts
 * Fetch user's attempt history
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await requireRouteUser(request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const question_id = searchParams.get('question_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let query = supabase
      .from('question_bank_attempts')
      .select('*')
      .eq('user_id', user.id)
      .order('attempted_at', { ascending: false })
      .limit(limit);

    if (question_id) {
      query = query.eq('question_id', question_id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch attempts' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      attempts: data || [],
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
