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

    // Build subject filter conditions (same logic as questions API)
    const subjectConditions: string[] = [];
    subjects.forEach(subject => {
      if (subject === 'Math 1') {
        subjectConditions.push('paper.eq.Math 1');
        subjectConditions.push('primary_tag.ilike.M1-%');
        subjectConditions.push('schema_id.eq.M1');
      } else if (subject === 'Math 2') {
        subjectConditions.push('paper.eq.Math 2');
        subjectConditions.push('primary_tag.ilike.M2-%');
        subjectConditions.push('schema_id.in.(M2,M3,M4,M5)');
      } else if (subject === 'Physics') {
        subjectConditions.push('schema_id.ilike.P%');
        subjectConditions.push('primary_tag.ilike.P-%');
      } else if (subject === 'Chemistry') {
        subjectConditions.push('schema_id.ilike.C%');
        subjectConditions.push('primary_tag.ilike.chemistry-%');
      } else if (subject === 'Biology') {
        subjectConditions.push('schema_id.ilike.B%');
        subjectConditions.push('primary_tag.ilike.biology-%');
      }
    });

    // Get total count of questions for selected subjects
    let totalQuery = supabase
      .from('ai_generated_questions')
      .select('id', { count: 'exact', head: true });

    if (subjectConditions.length > 0) {
      totalQuery = totalQuery.or(subjectConditions.join(','));
    }

    const { count: total, error: totalError } = await totalQuery;

    if (totalError) {
      console.error('[Progress API] Error fetching total:', totalError);
      return NextResponse.json(
        { error: 'Failed to fetch total questions' },
        { status: 500 }
      );
    }

    // Get all question IDs for selected subjects (just IDs, no limit needed for counting)
    let questionsQuery = supabase
      .from('ai_generated_questions')
      .select('id');

    if (subjectConditions.length > 0) {
      questionsQuery = questionsQuery.or(subjectConditions.join(','));
    }

    const { data: questions, error: questionsError } = await questionsQuery;

    if (questionsError) {
      console.error('[Progress API] Error fetching questions:', questionsError);
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    const questionIds = new Set((questions || []).map((q: any) => q.id));

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

