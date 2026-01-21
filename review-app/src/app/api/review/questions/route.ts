import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { ReviewQuestion, PaperType, ESATSubject, TMUASubject } from '@/types/review';

export const dynamic = 'force-dynamic';

/**
 * GET /api/review/questions
 * Fetches pending review questions with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const paperType = searchParams.get('paperType') as PaperType | null;
    const subject = searchParams.get('subject') as string | null;
    const questionId = searchParams.get('id') as string | null;
    const limit = parseInt(searchParams.get('limit') || '1', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('ai_generated_questions')
      .select('*', { count: 'exact' });

    // If specific question ID is requested, fetch that one (regardless of status)
    if (questionId) {
      query = query.eq('id', questionId);
    } else {
      // Only fetch pending_review questions if no specific ID requested
      query = query.eq('status', 'pending_review').order('created_at', { ascending: true });
    }

    // Apply paper type filter
    if (paperType === 'ESAT' && subject) {
      // ESAT subjects: Math 1, Math 2, Physics, Chemistry
      const subjectMap: Record<string, string[]> = {
        'Math 1': ['Math 1'],
        'Math 2': ['Math 2'],
        'Physics': ['Physics'],
        'Chemistry': ['Chemistry'],
      };
      const papers = subjectMap[subject] || [];
      if (papers.length > 0) {
        query = query.in('paper', papers);
      }
    } else if (paperType === 'TMUA' && subject) {
      // TMUA subjects: Paper 1, Paper 2
      if (subject === 'Paper 1' || subject === 'Paper 2') {
        query = query.eq('paper', subject);
      }
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[Review API] Error fetching questions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch questions', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      questions: (data || []) as ReviewQuestion[],
      total: count || 0,
    });
  } catch (error: any) {
    console.error('[Review API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}


