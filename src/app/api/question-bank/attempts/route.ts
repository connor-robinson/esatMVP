import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { userHasFullAccess } from '@/lib/subscription/serverAccess';
import {
  FREE_TIER_QUESTION_ID_SET,
  FREE_TIER_QUESTION_IDS,
  FREE_TIER_QUESTION_LIMIT,
} from '@/lib/questionBank/freeTierQuestions';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/question-bank/attempts
 * Saves a question attempt and updates daily metrics
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      question_id,
      user_answer,
      is_correct,
      time_spent_ms,
      viewed_solution,
      was_revealed,
      used_hint,
      wrong_answers_before,
      time_until_correct_ms,
      session_id,
    } = body;

    // Validate input
    if (!question_id || !user_answer || typeof is_correct !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const hasFullAccess = await userHasFullAccess(session.user.id);
    if (!hasFullAccess) {
      if (!FREE_TIER_QUESTION_ID_SET.has(question_id)) {
        return NextResponse.json(
          { error: 'Upgrade required to attempt this question' },
          { status: 403 },
        );
      }

      const admin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: priorAttempts } = await admin
        .from('question_bank_attempts')
        .select('question_id')
        .eq('user_id', session.user.id)
        .in('question_id', [...FREE_TIER_QUESTION_IDS]);

      const attemptedIds = new Set(
        (priorAttempts ?? []).map((row) => row.question_id as string),
      );

      if (
        !attemptedIds.has(question_id) &&
        attemptedIds.size >= FREE_TIER_QUESTION_LIMIT
      ) {
        return NextResponse.json(
          { error: 'Free question limit reached. Upgrade for unlimited access.' },
          { status: 403 },
        );
      }
    }

    // Insert the attempt
    console.log('[Attempt API] Saving attempt:', {
      userId: session.user.id,
      questionId: question_id,
      userAnswer: user_answer,
      isCorrect: is_correct,
      timeSpentMs: time_spent_ms,
      wasRevealed: was_revealed,
      usedHint: used_hint,
      wrongAnswersBefore: wrong_answers_before
    });
    
    const { data: attempt, error: insertError } = await supabase
      .from('question_bank_attempts')
      .insert({
        user_id: session.user.id,
        question_id,
        user_answer: user_answer,
        is_correct,
        time_spent_ms: time_spent_ms || null,
        viewed_solution: viewed_solution || false,
        was_revealed: was_revealed ?? false,
        used_hint: used_hint ?? false,
        wrong_answers_before: wrong_answers_before ?? [],
        time_until_correct_ms: time_until_correct_ms ?? null,
        session_id: session_id ?? null,
        attempted_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (insertError) {
      console.error('[Attempt API] Error inserting attempt:', {
        error: insertError,
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        userId: session.user.id,
        questionId: question_id
      });
      return NextResponse.json(
        { 
          error: 'Failed to save attempt',
          details: insertError.message || 'Unknown error'
        },
        { status: 500 }
      );
    }

    console.log('[Attempt API] Successfully saved attempt:', {
      attemptId: attempt ? (attempt as any).id : null,
      questionId: question_id,
      userId: session.user.id
    });

    // Fetch updated stats for today
    const today = new Date().toISOString().split('T')[0];
    const { data: metrics, error: metricsError } = await supabase
      .from('user_daily_metrics')
      .select('total_questions, correct_answers, total_time_ms')
      .eq('user_id', session.user.id)
      .eq('metric_date', today)
      .single();

    if (metricsError && metricsError.code !== 'PGRST116') {
      console.error('[Attempt API] Error fetching metrics:', metricsError);
    }

    return NextResponse.json({
      success: true,
      attempt,
      stats: metrics || {
        total_questions: 0,
        correct_answers: 0,
        total_time_ms: 0,
      },
    });
  } catch (error) {
    console.error('[Attempt API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/question-bank/attempts
 * Fetch user's attempt history
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const question_id = searchParams.get('question_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let query = supabase
      .from('question_bank_attempts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('attempted_at', { ascending: false })
      .limit(limit);

    if (question_id) {
      query = query.eq('question_id', question_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Attempt API] Error fetching attempts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch attempts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      attempts: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('[Attempt API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

