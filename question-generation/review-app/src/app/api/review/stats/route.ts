import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { ReviewStats, PaperType } from '@/types/review';

export const dynamic = 'force-dynamic';

/**
 * Helper function to check if a question matches subject filters
 * Now uses the subjects column directly
 */
function matchesSubject(row: any, subjects: string[]): boolean {
  if (subjects.length === 0) return true;
  return subjects.includes(row.subjects);
}

/**
 * Helper function to count questions using the new hierarchy
 * Fetches all questions and filters in memory for accurate counting
 */
async function countQuestions(supabase: any, paperType: string | null, subjects: string[], statusFilter?: string): Promise<number> {
  // Build query with filters
  let fetchQuery = supabase
    .from('ai_generated_questions')
    .select('test_type, subjects', { count: 'exact', head: true });
  
  if (statusFilter) {
    fetchQuery = fetchQuery.eq('status', statusFilter);
  }
  
  // Apply test_type filter if specified
  if (paperType === 'TMUA') {
    fetchQuery = fetchQuery.eq('test_type', 'TMUA');
  } else if (paperType === 'ESAT') {
    fetchQuery = fetchQuery.or('test_type.eq.ESAT,test_type.is.null');
  }
  
  // Apply subjects filter
  if (subjects.length > 0) {
    fetchQuery = fetchQuery.in('subjects', subjects);
  }
  
  const { count, error: fetchError } = await fetchQuery;
  
  if (fetchError) {
    console.error('[Review API] Error fetching for count:', fetchError);
    return 0;
  }
  
  return count || 0;
}

/**
 * GET /api/review/stats
 * Returns statistics with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const paperType = searchParams.get('paperType') as PaperType | null;
    const subjectsParam = searchParams.get('subjects');
    const subjects = subjectsParam ? subjectsParam.split(',').filter(s => s.trim()) : [];

    // Get counts using the subjects column
    const total = await countQuestions(supabase, paperType, subjects);
    const approved = await countQuestions(supabase, paperType, subjects, 'approved');
    const pending = await countQuestions(supabase, paperType, subjects, 'pending');

    const stats: ReviewStats = {
      total: total || 0,
      approved: approved || 0,
      pending: pending || 0,
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('[Review API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}
