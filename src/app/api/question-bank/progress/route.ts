import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { SubjectFilter } from '@/types/questionBank';

export const dynamic = 'force-dynamic';

/**
 * GET /api/question-bank/progress
 * Returns progress stats: how many questions attempted vs total available for selected subjects
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
    const subjectsParam = searchParams.get('subjects');
    
    if (!subjectsParam) {
      return NextResponse.json(
        { error: 'subjects parameter required' },
        { status: 400 }
      );
    }

    const subjects = subjectsParam.split(',').filter(s => s && s !== 'All') as SubjectFilter[];

    if (subjects.length === 0) {
      return NextResponse.json({
        attempted: 0,
        total: 0,
      });
    }

    // Build query - only fetch approved questions
    // Use the same structure as the questions API: filter by subjects column
    let questionsQuery = supabase
      .from('ai_generated_questions')
      .select('id, subjects, test_type')
      .eq('status', 'approved');

    // Filter by subjects column (same as questions API)
    if (subjects.length === 1) {
      questionsQuery = questionsQuery.eq('subjects', subjects[0]);
    } else {
      questionsQuery = questionsQuery.in('subjects', subjects);
    }

    // OPTIMIZED: Reduced from 5000 to 1000 for egress optimization
    // Note: If you have more than 1000 questions per subject, consider using count queries instead
    const { data: questions, error: questionsError } = await questionsQuery.limit(1000);

    if (questionsError) {
      console.error('[Progress API] Error fetching questions:', questionsError);
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    const questionIds = new Set((questions || []).map((q: any) => q.id));
    const total = questions?.length || 0;

    // Get all attempts for the user
    const { data: attempts, error: attemptsError } = await supabase
      .from('question_bank_attempts')
      .select('question_id')
      .eq('user_id', session.user.id);

    if (attemptsError) {
      console.error('[Progress API] Error fetching attempts:', attemptsError);
      return NextResponse.json(
        { error: 'Failed to fetch attempts' },
        { status: 500 }
      );
    }

    // Count unique questions attempted that match selected subjects
    const attemptedQuestionIds = new Set(
      (attempts || [])
        .filter((a: any) => questionIds.has(a.question_id))
        .map((a: any) => a.question_id)
    );

    const attempted = attemptedQuestionIds.size;

    console.log('[Progress API] Progress stats:', {
      subjects: subjects.join(', '),
      total,
      attempted,
      totalAttemptsInDB: attempts?.length || 0,
      matchingAttempts: attemptedQuestionIds.size,
      questionIdsCount: questionIds.size
    });

    return NextResponse.json({
      attempted,
      total: total || 0,
    });
  } catch (error) {
    console.error('[Progress API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

