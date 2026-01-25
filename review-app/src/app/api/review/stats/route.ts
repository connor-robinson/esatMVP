import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { ReviewStats, PaperType } from '@/types/review';

export const dynamic = 'force-dynamic';

/**
 * Helper function to count ESAT questions (checks both paper field and primary_tag prefixes)
 * Physics, Chemistry, Biology questions have paper=NULL, so we check primary_tag prefixes
 * Since Supabase .or() with complex conditions is unreliable, we fetch and filter in memory
 */
async function countESATQuestions(supabase: any, subjects: string[], statusFilter?: string): Promise<number> {
  // Fetch all questions with the status filter
  let fetchQuery = supabase
    .from('ai_generated_questions')
    .select('paper, primary_tag');
  
  if (statusFilter) {
    fetchQuery = fetchQuery.eq('status', statusFilter);
  }
  
  const { data: allData, error: fetchError } = await fetchQuery;
  
  if (fetchError) {
    console.error('[Review API] Error fetching for ESAT count:', fetchError);
    return 0;
  }
  
  const paperFilter = subjects.length > 0 ? subjects.filter(s => ['Math 1', 'Math 2'].includes(s)) : ['Math 1', 'Math 2'];
  const tagPrefixes: string[] = [];
  if (subjects.length === 0 || subjects.includes('Physics')) tagPrefixes.push('P-');
  if (subjects.length === 0 || subjects.includes('Chemistry')) tagPrefixes.push('C-');
  if (subjects.length === 0 || subjects.includes('Biology')) tagPrefixes.push('biology-');
  if (subjects.length === 0 || subjects.includes('Math 1')) tagPrefixes.push('M1-');
  if (subjects.length === 0 || subjects.includes('Math 2')) tagPrefixes.push('M2-');
  
  const filtered = (allData || []).filter((row: any) => {
    if (paperFilter.includes(row.paper)) return true;
    if (row.primary_tag) {
      return tagPrefixes.some(prefix => row.primary_tag.startsWith(prefix));
    }
    return false;
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

    // Build base query
    let baseQuery = supabase
      .from('ai_generated_questions')
      .select('id, status, paper', { count: 'exact' });

    // Apply filters based on paper type
    if (paperType === 'All') {
      // Show all questions, optionally filter by subjects
      if (subjects.length > 0) {
        // Need to check both paper field and primary_tag prefixes for ESAT subjects
        const paperFilter = subjects.filter(s => ['Math 1', 'Math 2', 'Paper 1', 'Paper 2'].includes(s));
        const tagPrefixes: string[] = [];
        if (subjects.includes('Physics')) tagPrefixes.push('P-');
        if (subjects.includes('Chemistry')) tagPrefixes.push('C-');
        if (subjects.includes('Biology')) tagPrefixes.push('biology-');
        if (subjects.includes('Math 1')) tagPrefixes.push('M1-');
        if (subjects.includes('Math 2')) tagPrefixes.push('M2-');
        
        if (paperFilter.length > 0 && tagPrefixes.length > 0) {
          // Build OR condition: paper IN (...) OR primary_tag starts with any prefix
          const orConditions = [
            `paper.in.(${paperFilter.join(',')})`,
            ...tagPrefixes.map(prefix => `primary_tag.ilike.${prefix}%`)
          ];
          baseQuery = baseQuery.or(orConditions.join(','));
        } else if (paperFilter.length > 0) {
          baseQuery = baseQuery.in('paper', paperFilter);
        } else if (tagPrefixes.length > 0) {
          // Use OR with multiple ilike conditions
          const orConditions = tagPrefixes.map(prefix => `primary_tag.ilike.${prefix}%`).join(',');
          baseQuery = baseQuery.or(orConditions);
        }
      }
      // If no subjects selected, show all questions (no filter needed)
    } else if (paperType === 'TMUA') {
      // TMUA: Show Paper 1 and Paper 2
      if (subjects.length > 0) {
        // Filter by selected TMUA subjects
        baseQuery = baseQuery.in('paper', subjects);
      } else {
        // Show all TMUA (Paper 1 and Paper 2)
        baseQuery = baseQuery.in('paper', ['Paper 1', 'Paper 2']);
      }
    } else if (paperType === 'ESAT') {
      // ESAT subjects: Math 1, Math 2, Physics, Chemistry, Biology
      // Note: Physics, Chemistry, Biology may have paper=NULL, so check primary_tag prefixes
      // We'll handle ESAT filtering separately using countESATQuestions
      // For now, don't apply filter to baseQuery - we'll count separately
    }

    // Get total count
    let total: number;
    if (paperType === 'ESAT') {
      total = await countESATQuestions(supabase, subjects);
    } else {
      const { count, error: totalError } = await baseQuery;
      if (totalError) {
        console.error('[Review API] Error fetching total count:', totalError);
        return NextResponse.json(
          { error: 'Failed to fetch stats', details: totalError.message },
          { status: 500 }
        );
      }
      total = count || 0;
    }

    // Get approved count (need to rebuild query for each count)
    let approvedQuery = supabase
      .from('ai_generated_questions')
      .select('id, status, paper', { count: 'exact' })
      .eq('status', 'approved');

    let approved: number;
    if (paperType === 'ESAT') {
      approved = await countESATQuestions(supabase, subjects, 'approved');
    } else {
      if (paperType === 'All') {
        if (subjects.length > 0) {
          // Need to check both paper field and primary_tag prefixes for ESAT subjects
          const paperFilter = subjects.filter(s => ['Math 1', 'Math 2', 'Paper 1', 'Paper 2'].includes(s));
          const tagPrefixes: string[] = [];
          if (subjects.includes('Physics')) tagPrefixes.push('P-');
          if (subjects.includes('Chemistry')) tagPrefixes.push('C-');
          if (subjects.includes('Biology')) tagPrefixes.push('biology-');
          if (subjects.includes('Math 1')) tagPrefixes.push('M1-');
          if (subjects.includes('Math 2')) tagPrefixes.push('M2-');
          
          if (paperFilter.length > 0 && tagPrefixes.length > 0) {
            const orConditions = [
              `paper.in.(${paperFilter.join(',')})`,
              ...tagPrefixes.map(prefix => `primary_tag.ilike.${prefix}%`)
            ];
            approvedQuery = approvedQuery.or(orConditions.join(','));
          } else if (paperFilter.length > 0) {
            approvedQuery = approvedQuery.in('paper', paperFilter);
          } else if (tagPrefixes.length > 0) {
            const orConditions = tagPrefixes.map(prefix => `primary_tag.ilike.${prefix}%`).join(',');
            approvedQuery = approvedQuery.or(orConditions);
          }
        }
      } else if (paperType === 'TMUA') {
        if (subjects.length > 0) {
          approvedQuery = approvedQuery.in('paper', subjects);
        } else {
          approvedQuery = approvedQuery.in('paper', ['Paper 1', 'Paper 2']);
        }
      }

      const { count, error: approvedError } = await approvedQuery;
      
      if (approvedError) {
        console.error('[Review API] Error fetching approved count:', approvedError);
        return NextResponse.json(
          { error: 'Failed to fetch stats', details: approvedError.message },
          { status: 500 }
        );
      }
      approved = count || 0;
    }

    // Get pending count
    let pendingQuery = supabase
      .from('ai_generated_questions')
      .select('id, status, paper', { count: 'exact' })
      .eq('status', 'pending_review');

    let pending: number;
    if (paperType === 'ESAT') {
      pending = await countESATQuestions(supabase, subjects, 'pending_review');
    } else {
      if (paperType === 'All') {
        if (subjects.length > 0) {
          // Need to check both paper field and primary_tag prefixes for ESAT subjects
          const paperFilter = subjects.filter(s => ['Math 1', 'Math 2', 'Paper 1', 'Paper 2'].includes(s));
          const tagPrefixes: string[] = [];
          if (subjects.includes('Physics')) tagPrefixes.push('P-');
          if (subjects.includes('Chemistry')) tagPrefixes.push('C-');
          if (subjects.includes('Biology')) tagPrefixes.push('biology-');
          if (subjects.includes('Math 1')) tagPrefixes.push('M1-');
          if (subjects.includes('Math 2')) tagPrefixes.push('M2-');
          
          if (paperFilter.length > 0 && tagPrefixes.length > 0) {
            const orConditions = [
              `paper.in.(${paperFilter.join(',')})`,
              ...tagPrefixes.map(prefix => `primary_tag.ilike.${prefix}%`)
            ];
            pendingQuery = pendingQuery.or(orConditions.join(','));
          } else if (paperFilter.length > 0) {
            pendingQuery = pendingQuery.in('paper', paperFilter);
          } else if (tagPrefixes.length > 0) {
            const orConditions = tagPrefixes.map(prefix => `primary_tag.ilike.${prefix}%`).join(',');
            pendingQuery = pendingQuery.or(orConditions);
          }
        }
      } else if (paperType === 'TMUA') {
        if (subjects.length > 0) {
          pendingQuery = pendingQuery.in('paper', subjects);
        } else {
          pendingQuery = pendingQuery.in('paper', ['Paper 1', 'Paper 2']);
        }
      }

      const { count, error: pendingError } = await pendingQuery;
      
      if (pendingError) {
        console.error('[Review API] Error fetching pending count:', pendingError);
        return NextResponse.json(
          { error: 'Failed to fetch stats', details: pendingError.message },
          { status: 500 }
        );
      }
      pending = count || 0;
    }

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
