import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/profile/reset
 * Resets all user data (sessions, attempts, progress)
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { confirmation } = body;

    if (confirmation !== 'RESET') {
      return NextResponse.json(
        { error: 'Confirmation text must be "RESET"' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Delete all user data in order (respecting foreign key constraints)
    // Note: Due to CASCADE, some deletions will automatically delete related records
    
    const deletions = await Promise.allSettled([
      // Delete question bank attempts
      supabase
        .from('question_bank_attempts')
        .delete()
        .eq('user_id', userId),
      
      // Delete builder attempts
      supabase
        .from('builder_attempts')
        .delete()
        .eq('user_id', userId),
      
      // Delete builder sessions (will cascade delete builder_session_questions)
      supabase
        .from('builder_sessions')
        .delete()
        .eq('user_id', userId),
      
      // Delete paper sessions
      supabase
        .from('paper_sessions')
        .delete()
        .eq('user_id', userId),
      
      // Delete daily metrics
      supabase
        .from('user_daily_metrics')
        .delete()
        .eq('user_id', userId),
      
      // Delete drill sessions
      supabase
        .from('drill_sessions')
        .delete()
        .eq('user_id', userId),
    ]);

    // Check for errors
    const errors = deletions
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason);

    if (errors.length > 0) {
      console.error('[Reset API] Errors during deletion:', errors);
      // Continue anyway - some deletions may have succeeded
    }

    // Check for database errors
    const dbErrors = deletions
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(response => response.error)
      .map(response => response.error);

    if (dbErrors.length > 0) {
      console.error('[Reset API] Database errors:', dbErrors);
      return NextResponse.json(
        { error: 'Some data could not be deleted. Please try again or contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'All user data has been reset' });
  } catch (error) {
    console.error('[Reset API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

