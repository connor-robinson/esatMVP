import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/question-bank/sessions — list completed sessions
 * POST /api/question-bank/sessions — create session at start
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get('limit') ?? '100', 10) || 100,
      200,
    );

    const { data, error } = await supabase
      .from('question_bank_sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to load sessions' },
        { status: 500 },
      );
    }

    return NextResponse.json({ sessions: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
      id,
      question_count,
      time_limit_minutes,
      source,
      subjects,
      test_type,
      ui_difficulties,
    } = body;

    const insertRow: Record<string, unknown> = {
      user_id: session.user.id,
      question_count: question_count ?? 0,
      time_limit_minutes: time_limit_minutes ?? null,
      source: source ?? 'home',
      subjects: subjects ?? null,
      test_type: test_type ?? null,
      ui_difficulties: ui_difficulties ?? [],
    };

    if (id) insertRow.id = id;

    const { data, error } = await supabase
      .from('question_bank_sessions')
      .insert(insertRow as never)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create session' },
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
