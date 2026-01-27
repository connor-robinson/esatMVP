import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/profile/delete
 * Deletes the current user's account
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

    if (confirmation !== 'DELETE') {
      return NextResponse.json(
        { error: 'Confirmation text must be "DELETE"' },
        { status: 400 }
      );
    }

    // Delete user account
    // Note: This will cascade delete the profile due to ON DELETE CASCADE
    const { error: deleteError } = await supabase.auth.admin.deleteUser(session.user.id);

    if (deleteError) {
      // If admin API is not available, try alternative method
      // For client-side, we'll need to use a different approach
      console.error('[Delete Account API] Error deleting account:', deleteError);
      
      // Alternative: Sign out and let user know they need to contact support
      // Or use RPC function if available
      return NextResponse.json(
        { error: 'Failed to delete account. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Delete Account API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

