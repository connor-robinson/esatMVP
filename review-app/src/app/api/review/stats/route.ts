import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { ReviewStats, PaperType } from '@/types/review';

export const dynamic = 'force-dynamic';

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
        baseQuery = baseQuery.in('paper', subjects);
      }
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
      const esatPapers = ['Math 1', 'Math 2', 'Physics', 'Chemistry', 'Biology'];
      if (subjects.length > 0) {
        // Filter by selected ESAT subjects
        baseQuery = baseQuery.in('paper', subjects);
      } else {
        // Show all ESAT subjects
        baseQuery = baseQuery.in('paper', esatPapers);
      }
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
        approvedQuery = approvedQuery.in('paper', subjects);
      }
    } else if (paperType === 'TMUA') {
      if (subjects.length > 0) {
        approvedQuery = approvedQuery.in('paper', subjects);
      } else {
        approvedQuery = approvedQuery.in('paper', ['Paper 1', 'Paper 2']);
      }
    } else if (paperType === 'ESAT') {
      const esatPapers = ['Math 1', 'Math 2', 'Physics', 'Chemistry', 'Biology'];
      if (subjects.length > 0) {
        approvedQuery = approvedQuery.in('paper', subjects);
      } else {
        approvedQuery = approvedQuery.in('paper', esatPapers);
      }
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
        pendingQuery = pendingQuery.in('paper', subjects);
      }
    } else if (paperType === 'TMUA') {
      if (subjects.length > 0) {
        pendingQuery = pendingQuery.in('paper', subjects);
      } else {
        pendingQuery = pendingQuery.in('paper', ['Paper 1', 'Paper 2']);
      }
    } else if (paperType === 'ESAT') {
      const esatPapers = ['Math 1', 'Math 2', 'Physics', 'Chemistry', 'Biology'];
      if (subjects.length > 0) {
        pendingQuery = pendingQuery.in('paper', subjects);
      } else {
        pendingQuery = pendingQuery.in('paper', esatPapers);
      }
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
