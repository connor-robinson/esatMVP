import { NextRequest, NextResponse } from 'next/server';
import { getReviewSupabase } from '@/lib/supabaseService';
import {
  expandReviewSubjectFilterValues,
  REVIEW_FILTER_ESAT_POSTGREST_OR,
  REVIEW_FILTER_TMUA_POSTGREST_OR,
} from '@/lib/curriculum';
import type { ReviewStats, PaperType } from '@/types/review';

export const dynamic = 'force-dynamic';

/**
 * Helper function to count questions using the new hierarchy
 * Fetches all questions and filters in memory for accurate counting
 */
async function countQuestions(
  supabase: any,
  paperType: string | null,
  subjects: string[],
  statusFilter?: string | string[],
  schemaReclassOnly?: boolean
): Promise<number> {
  // Build query with filters
  let fetchQuery = supabase
    .from('ai_generated_questions')
    .select('test_type, subjects', { count: 'exact', head: true });
  
  if (schemaReclassOnly) {
    fetchQuery = fetchQuery.not('schema_reclass_review_tier', 'is', null);
  }

  if (statusFilter) {
    if (Array.isArray(statusFilter)) {
      fetchQuery = fetchQuery.in('status', statusFilter);
    } else {
      fetchQuery = fetchQuery.eq('status', statusFilter);
    }
  } else {
    fetchQuery = fetchQuery.neq('status', 'deleted');
  }
  
  // TMUA: `test_type` is often unset/ESAT on legacy rows; TMUA is identified by `subjects` Paper 1/2.
  if (paperType === 'TMUA') {
    fetchQuery = fetchQuery.or(REVIEW_FILTER_TMUA_POSTGREST_OR);
  } else if (paperType === 'ESAT') {
    fetchQuery = fetchQuery.or(REVIEW_FILTER_ESAT_POSTGREST_OR);
  }
  
  // Apply subjects filter
  if (subjects.length > 0) {
    fetchQuery = fetchQuery.in('subjects', expandReviewSubjectFilterValues(subjects));
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
    const supabase = getReviewSupabase();
    const { searchParams } = new URL(request.url);

    const paperType = searchParams.get('paperType') as PaperType | null;
    const subjectsParam = searchParams.get('subjects');
    const subjects = subjectsParam ? subjectsParam.split(',').filter(s => s.trim()) : [];
    const schemaReclassOnly = searchParams.get('schemaReclass') === '1';

    // Get counts using the subjects column
    const total = await countQuestions(supabase, paperType, subjects, undefined, schemaReclassOnly);
    const approved = await countQuestions(supabase, paperType, subjects, 'approved', schemaReclassOnly);
    const pending = await countQuestions(supabase, paperType, subjects, [
      'pending',
      'pending_review',
      'needs_revision',
    ], schemaReclassOnly);

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
