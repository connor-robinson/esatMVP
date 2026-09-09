import { NextRequest, NextResponse } from 'next/server';
import { requireRouteUser } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/question-bank/sessions - list completed sessions
 * POST /api/question-bank/sessions - create session at start
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await requireRouteUser(request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get('limit') ?? '100', 10) || 100,
      200,
    );

    const { data, error } = await supabase
      .from('question_bank_sessions')
      .select('*')
      .eq('user_id', user.id)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[question-bank/sessions GET]', error.message, error.code);
      return NextResponse.json(
        { error: 'Failed to load sessions', detail: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ sessions: data ?? [] });
  } catch (err) {
    console.error('[question-bank/sessions GET]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await requireRouteUser(request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      question_count,
      time_limit_minutes,
      source,
      subjects,
      test_type,
      ui_difficulties,
    } = body;

    const insertRow: Record<string, unknown> = {
      user_id: user.id,
      question_count: question_count ?? 0,
      time_limit_minutes: time_limit_minutes ?? null,
      source: source ?? 'home',
      subjects: subjects ?? null,
      test_type: test_type ?? null,
      ui_difficulties: Array.isArray(ui_difficulties) ? ui_difficulties : [],
    };

    if (typeof id === 'string' && id.length > 0) {
      insertRow.id = id;
    }

    const { data, error } = await supabase
      .from('question_bank_sessions')
      .upsert(insertRow as never, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[question-bank/sessions POST]', error.message, error.code);
      return NextResponse.json(
        { error: 'Failed to create session', detail: error.message },
        { status: 500 },
      );
    }

    if (!data) {
      console.error('[question-bank/sessions POST] upsert returned no row');
      return NextResponse.json(
        { error: 'Failed to create session', detail: 'no_row' },
        { status: 500 },
      );
    }

    return NextResponse.json({ session: data });
  } catch (err) {
    console.error('[question-bank/sessions POST]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
