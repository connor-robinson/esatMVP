import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profile/username/check?username=test
 * Checks if a username is available
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');

    if (!username || username.trim().length === 0) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Validate username format (alphanumeric, underscore, hyphen, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { 
          available: false,
          error: 'Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens'
        },
        { status: 200 }
      );
    }

    // Check if username exists (case-insensitive)
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', username)
      .limit(1)
      .maybeSingle() as { data: { id: string; username: string } | null; error: any };

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[Username Check API] Error checking username:', checkError);
      return NextResponse.json(
        { error: 'Failed to check username availability' },
        { status: 500 }
      );
    }

    // If profile exists and it's not the current user's profile, username is taken
    const isTaken = existingProfile !== null && existingProfile.id !== session.user.id;
    const isCurrentUser = existingProfile !== null && existingProfile.id === session.user.id;

    return NextResponse.json({
      available: !isTaken,
      isCurrentUser,
      message: isTaken 
        ? 'This username is already taken' 
        : isCurrentUser
        ? 'This is your current username'
        : 'Username is available'
    });
  } catch (error) {
    console.error('[Username Check API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

