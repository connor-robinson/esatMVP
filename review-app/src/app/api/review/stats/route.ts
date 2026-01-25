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
    const subject = searchParams.get('subject') as string | null;

    // Build base query
    let baseQuery = supabase
      .from('ai_generated_questions')
      .select('id, status, paper', { count: 'exact' });

    // Apply paper type filter
    if (paperType === 'ESAT' && subject) {
      const subjectMap: Record<string, string[]> = {
        'Math 1': ['Math 1'],
        'Math 2': ['Math 2'],
        'Physics': ['Physics'],
        'Chemistry': ['Chemistry'],
        'Biology': ['Biology'],
      };
      const papers = subjectMap[subject] || [];
      if (papers.length > 0) {
        baseQuery = baseQuery.in('paper', papers);
      }
    } else if (paperType === 'TMUA' && subject) {
      if (subject === 'Paper 1' || subject === 'Paper 2') {
        baseQuery = baseQuery.eq('paper', subject);
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

    // Get approved count
    const { count: approved, error: approvedError } = await baseQuery
      .eq('status', 'approved');

    if (approvedError) {
      console.error('[Review API] Error fetching approved count:', approvedError);
      return NextResponse.json(
        { error: 'Failed to fetch stats', details: approvedError.message },
        { status: 500 }
      );
    }

    // Get pending count
    const { count: pending, error: pendingError } = await baseQuery
      .eq('status', 'pending_review');

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



