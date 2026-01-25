import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { ReviewStats, PaperType } from '@/types/review';

export const dynamic = 'force-dynamic';

/**
 * Helper function to apply ESAT filter (checks both paper field and primary_tag prefixes)
 * Physics, Chemistry, Biology questions have paper=NULL, so we check primary_tag prefixes
 */
function applyESATFilter(query: any, subjects: string[]) {
  if (subjects.length > 0) {
    // Filter by selected ESAT subjects
    const paperFilter = subjects.filter(s => ['Math 1', 'Math 2'].includes(s));
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
      return query.or(orConditions.join(','));
    } else if (paperFilter.length > 0) {
      return query.in('paper', paperFilter);
    } else if (tagPrefixes.length > 0) {
      // Use OR with multiple ilike conditions
      const orConditions = tagPrefixes.map(prefix => `primary_tag.ilike.${prefix}%`).join(',');
      return query.or(orConditions);
    }
    return query;
  } else {
    // Show all ESAT subjects - check both paper field and primary_tag prefixes
    return query.or('paper.in.(Math 1,Math 2),primary_tag.ilike.M1-%,primary_tag.ilike.M2-%,primary_tag.ilike.P-%,primary_tag.ilike.C-%,primary_tag.ilike.biology-%');
  }
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
      baseQuery = applyESATFilter(baseQuery, subjects);
    }

    // Get total count
    const { count: total, error: totalError } = await baseQuery;

    if (totalError) {
      console.error('[Review API] Error fetching total count:', totalError);
      return NextResponse.json(
        { error: 'Failed to fetch stats', details: totalError.message },
        { status: 500 }
      );
    }

    // Get approved count (need to rebuild query for each count)
    let approvedQuery = supabase
      .from('ai_generated_questions')
      .select('id, status, paper', { count: 'exact' })
      .eq('status', 'approved');

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
    } else if (paperType === 'ESAT') {
      // ESAT subjects: Math 1, Math 2, Physics, Chemistry, Biology
      // Note: Physics, Chemistry, Biology may have paper=NULL, so check primary_tag prefixes
      approvedQuery = applyESATFilter(approvedQuery, subjects);
    }

    const { count: approved, error: approvedError } = await approvedQuery;

    if (approvedError) {
      console.error('[Review API] Error fetching approved count:', approvedError);
      return NextResponse.json(
        { error: 'Failed to fetch stats', details: approvedError.message },
        { status: 500 }
      );
    }

    // Get pending count
    let pendingQuery = supabase
      .from('ai_generated_questions')
      .select('id, status, paper', { count: 'exact' })
      .eq('status', 'pending_review');

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
    } else if (paperType === 'ESAT') {
      // ESAT subjects: Math 1, Math 2, Physics, Chemistry, Biology
      // Note: Physics, Chemistry, Biology may have paper=NULL, so check primary_tag prefixes
      pendingQuery = applyESATFilter(pendingQuery, subjects);
    }

    const { count: pending, error: pendingError } = await pendingQuery;

    if (pendingError) {
      console.error('[Review API] Error fetching pending count:', pendingError);
      return NextResponse.json(
        { error: 'Failed to fetch stats', details: pendingError.message },
        { status: 500 }
      );
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
