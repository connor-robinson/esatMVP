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
    // IMPORTANT: For Math 1, we need to ensure it doesn't overlap with Math 2
    // Math 1 should ONLY match questions that are explicitly Math 1, not Math 2
    const subjectConditions: string[] = [];
    subjects.forEach(subject => {
      if (subject === 'Math 1') {
        // Math 1: Must have paper="Math 1" OR (primary_tag starts with M1- AND NOT paper="Math 2") OR schema_id is exactly M1
        // We use AND NOT to exclude Math 2 questions
        subjectConditions.push('paper.eq."Math 1"');
        // For primary_tag, we need to ensure it's M1- and not M2-
        subjectConditions.push('primary_tag.ilike.M1-%');
        // Schema_id must be exactly M1 (not M2, M3, etc.)
        subjectConditions.push('schema_id.eq.M1');
      } else if (subject === 'Math 2') {
        // Math 2: paper="Math 2" OR primary_tag starts with M2- OR schema_id is M2, M3, M4, M5 (but not M1)
        subjectConditions.push('paper.eq."Math 2"');
        subjectConditions.push('primary_tag.ilike.M2-%');
        // For .in() inside .or(), wrap the values in parentheses and comma-separate them
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

    // We'll calculate total from the filtered questions below
    // This ensures Math 1 and Math 2 don't overlap in the count

    // Get all question IDs for selected subjects (just IDs, no limit needed for counting)
    // We need to fetch paper, primary_tag, and schema_id to properly filter Math 1 vs Math 2
    let questionsQuery = supabase
      .from('ai_generated_questions')
      .select('id, paper, primary_tag, schema_id');

    if (subjectConditions.length > 0) {
      questionsQuery = questionsQuery.or(subjectConditions.join(','));
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

    // Filter questions client-side to ensure Math 1 and Math 2 don't overlap
    const filteredQuestions = (questions || []).filter((q: any) => {
      // If Math 1 is selected, exclude any Math 2 questions
      if (subjects.includes('Math 1')) {
        // Exclude if it's explicitly Math 2
        if (q.paper === 'Math 2') return false;
        if (q.primary_tag?.startsWith('M2-')) return false;
        if (['M2', 'M3', 'M4', 'M5'].includes(q.schema_id)) return false;
      }
      // If Math 2 is selected, exclude any Math 1 questions
      if (subjects.includes('Math 2')) {
        // Exclude if it's explicitly Math 1
        if (q.paper === 'Math 1') return false;
        if (q.primary_tag?.startsWith('M1-')) return false;
        if (q.schema_id === 'M1') return false;
      }
      return true;
    });

    const questionIds = new Set(filteredQuestions.map((q: any) => q.id));
    const total = filteredQuestions.length;

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

