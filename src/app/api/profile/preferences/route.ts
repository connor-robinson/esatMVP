import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profile/preferences
 * Returns the current user's preferences
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

    // Fetch user profile with preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('nickname, exam_preference, esat_subjects, is_early_applicant, has_extra_time, extra_time_percentage, has_rest_breaks, font_size, reduced_motion, dark_mode')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      // If profile doesn't exist, return defaults
      if (profileError.code === 'PGRST116') {
        return NextResponse.json({
          nickname: null,
          exam_preference: null,
          esat_subjects: [],
          is_early_applicant: true,
          has_extra_time: false,
          extra_time_percentage: 25,
          has_rest_breaks: false,
          font_size: 'medium',
          reduced_motion: false,
          dark_mode: false,
        });
      }
      
      console.error('[Preferences API] Error fetching preferences:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('[Preferences API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile/preferences
 * Updates the current user's preferences
 */
export async function PATCH(request: NextRequest) {
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
    const {
      nickname,
      exam_preference,
      esat_subjects,
      is_early_applicant,
      has_extra_time,
      extra_time_percentage,
      has_rest_breaks,
      font_size,
      reduced_motion,
      dark_mode,
    } = body;

    // Validate ESAT subjects if exam_preference is ESAT
    if (exam_preference === 'ESAT' && esat_subjects) {
      if (!Array.isArray(esat_subjects) || esat_subjects.length !== 3) {
        return NextResponse.json(
          { error: 'ESAT requires exactly 3 subjects' },
          { status: 400 }
        );
      }
      
      const validSubjects = ['Math 1', 'Math 2', 'Chemistry', 'Biology', 'Physics'];
      const invalidSubjects = esat_subjects.filter((s: string) => !validSubjects.includes(s));
      if (invalidSubjects.length > 0) {
        return NextResponse.json(
          { error: `Invalid subjects: ${invalidSubjects.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate exam_preference
    if (exam_preference !== null && exam_preference !== 'ESAT' && exam_preference !== 'TMUA') {
      return NextResponse.json(
        { error: 'exam_preference must be ESAT or TMUA' },
        { status: 400 }
      );
    }

    // Validate font_size
    if (font_size !== null && font_size !== undefined && !['small', 'medium', 'large'].includes(font_size)) {
      return NextResponse.json(
        { error: 'font_size must be small, medium, or large' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    if (nickname !== undefined) updateData.nickname = nickname;
    if (exam_preference !== undefined) updateData.exam_preference = exam_preference;
    if (esat_subjects !== undefined) updateData.esat_subjects = esat_subjects;
    if (is_early_applicant !== undefined) updateData.is_early_applicant = is_early_applicant;
    if (has_extra_time !== undefined) updateData.has_extra_time = has_extra_time;
    if (extra_time_percentage !== undefined) updateData.extra_time_percentage = extra_time_percentage;
    if (has_rest_breaks !== undefined) updateData.has_rest_breaks = has_rest_breaks;
    if (font_size !== undefined) updateData.font_size = font_size;
    if (reduced_motion !== undefined) updateData.reduced_motion = reduced_motion;
    if (dark_mode !== undefined) updateData.dark_mode = dark_mode;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update profile
    const { data: profile, error: profileError } = await (supabase
      .from('profiles') as any)
      .update(updateData)
      .eq('id', session.user.id)
      .select('nickname, exam_preference, esat_subjects, is_early_applicant, has_extra_time, extra_time_percentage, has_rest_breaks, font_size, reduced_motion, dark_mode')
      .single();

    if (profileError) {
      console.error('[Preferences API] Error updating preferences:', profileError);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('[Preferences API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

