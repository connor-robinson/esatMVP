import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { ReviewStats, PaperType } from '@/types/review';

export const dynamic = 'force-dynamic';

/**
 * Helper function to check if a question matches ESAT subject filters
 * Following hierarchy: test_type (ESAT or NULL) -> schema_id first char -> paper (for Math)
 */
function matchesESATSubject(row: any, subjects: string[]): boolean {
  if (subjects.length === 0) return true;
  
  const testType = row.test_type;
  // Must be ESAT (not TMUA)
  if (testType === 'TMUA') return false;
  
  const schemaId = (row.schema_id || '').toUpperCase();
  const firstChar = schemaId.charAt(0);
  const paper = row.paper;
  
  return subjects.some(subject => {
    if (subject === 'Physics' && firstChar === 'P') return true;
    if (subject === 'Chemistry' && firstChar === 'C') return true;
    if (subject === 'Biology' && firstChar === 'B') return true;
    if (subject === 'Math 1' && firstChar === 'M' && paper === 'Math 1') return true;
    if (subject === 'Math 2' && firstChar === 'M' && paper === 'Math 2') return true;
    return false;
  });
}

/**
 * Helper function to check if a question matches TMUA paper filters
 */
function matchesTMUAPaper(row: any, subjects: string[]): boolean {
  if (subjects.length === 0) return true;
  
  const testType = row.test_type;
  // Must be TMUA
  if (testType !== 'TMUA') return false;
  
  const paper = row.paper;
  return subjects.some(subject => {
    if (subject === 'Paper 1' && paper === 'Paper1') return true;
    if (subject === 'Paper 2' && paper === 'Paper2') return true;
    return false;
  });
}

/**
 * Helper function to count questions using the new hierarchy
 * Fetches all questions and filters in memory for accurate counting
 */
async function countQuestions(supabase: any, paperType: string | null, subjects: string[], statusFilter?: string): Promise<number> {
  // Fetch all questions with the status filter
  let fetchQuery = supabase
    .from('ai_generated_questions')
    .select('test_type, schema_id, paper');
  
  if (statusFilter) {
    fetchQuery = fetchQuery.eq('status', statusFilter);
  }
  
  const { data: allData, error: fetchError } = await fetchQuery;
  
  if (fetchError) {
    console.error('[Review API] Error fetching for count:', fetchError);
    return 0;
  }
  
  const filtered = (allData || []).filter((row: any) => {
    if (paperType === 'All') {
      // Check if question matches any selected subject
      if (row.test_type === 'TMUA') {
        return matchesTMUAPaper(row, subjects);
      } else {
        // ESAT or NULL
        return matchesESATSubject(row, subjects);
      }
    } else if (paperType === 'TMUA') {
      return matchesTMUAPaper(row, subjects);
    } else if (paperType === 'ESAT') {
      return matchesESATSubject(row, subjects);
    }
    
    return true;
  });
  
  return filtered.length;
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

    // Get counts using the new hierarchy
    // Always use in-memory filtering for accurate counts with complex OR conditions
    const total = await countQuestions(supabase, paperType, subjects);
    const approved = await countQuestions(supabase, paperType, subjects, 'approved');
    const pending = await countQuestions(supabase, paperType, subjects, 'pending_review');

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
