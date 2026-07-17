import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  isReferralSource,
  isTargetUniversity,
} from '@/lib/onboarding/options';

export const dynamic = 'force-dynamic';

const PREFS_SELECT_FULL =
  'username, last_username_change, exam_preference, esat_subjects, is_early_applicant, has_extra_time, extra_time_percentage, has_rest_breaks, font_size, reduced_motion, dark_mode, onboarding_completed, marketing_emails_consent, target_universities, referral_source';

const PREFS_SELECT_CORE =
  'username, last_username_change, exam_preference, esat_subjects, is_early_applicant, has_extra_time, extra_time_percentage, has_rest_breaks, font_size, reduced_motion, dark_mode, onboarding_completed';

const OPTIONAL_DEFAULTS = {
  marketing_emails_consent: null,
  target_universities: [] as string[],
  referral_source: null,
};

async function selectPreferences(supabase: ReturnType<typeof createServerClient>, userId: string) {
  let { data, error } = await (supabase.from('profiles') as any)
    .select(PREFS_SELECT_FULL)
    .eq('id', userId)
    .single();

  if (
    error?.message?.includes('marketing_emails_consent') ||
    error?.message?.includes('target_universities') ||
    error?.message?.includes('referral_source')
  ) {
    const retry = await (supabase.from('profiles') as any)
      .select(PREFS_SELECT_CORE)
      .eq('id', userId)
      .single();
    data = retry.data ? { ...OPTIONAL_DEFAULTS, ...retry.data } : null;
    error = retry.error;
  }

  return { data, error };
}

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

    const { data: profile, error: profileError } = await selectPreferences(
      supabase,
      session.user.id,
    );

    if (profileError) {
      // If profile doesn't exist, return defaults
      if (profileError.code === 'PGRST116') {
        return NextResponse.json({
          username: null,
          last_username_change: null,
          exam_preference: null,
          esat_subjects: [],
          is_early_applicant: true,
          has_extra_time: false,
          extra_time_percentage: 25,
          has_rest_breaks: false,
          font_size: 'medium',
          reduced_motion: false,
          dark_mode: false,
          onboarding_completed: false,
          ...OPTIONAL_DEFAULTS,
        });
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...OPTIONAL_DEFAULTS,
      ...profile,
      target_universities: Array.isArray(profile?.target_universities)
        ? profile.target_universities
        : [],
    });
  } catch (error) {
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
      username,
      exam_preference,
      esat_subjects,
      is_early_applicant,
      has_extra_time,
      extra_time_percentage,
      has_rest_breaks,
      font_size,
      reduced_motion,
      dark_mode,
      onboarding_completed,
      marketing_emails_consent,
      target_universities,
      referral_source,
    } = body;

    // Validate username if it's being updated
    if (username !== undefined && username !== null) {
      // Validate username format first
      const usernameRegex = /^[a-zA-Z0-9_-]{2,20}$/;
      if (!usernameRegex.test(username)) {
        return NextResponse.json(
          { error: 'Username must be 2-20 characters and contain only letters, numbers, underscores, or hyphens' },
          { status: 400 }
        );
      }

      // Check if username is being changed
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('username, last_username_change')
        .eq('id', session.user.id)
        .single() as { data: { username: string | null; last_username_change: string | null } | null };

      // If username is being changed (not first time set), check 14-day restriction
      if (currentProfile?.username && username !== currentProfile.username) {
        if (currentProfile.last_username_change) {
          const lastChange = new Date(currentProfile.last_username_change);
          const daysSinceChange = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysSinceChange < 14) {
            const daysRemaining = Math.ceil(14 - daysSinceChange);
            return NextResponse.json(
              { error: `You can only change your username once every 14 days. Please wait ${daysRemaining} more day${daysRemaining !== 1 ? 's' : ''}.` },
              { status: 400 }
            );
          }
        }
      }

      // Check if new username is available (for both first-time set and changes)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .limit(1)
        .maybeSingle() as { data: { id: string } | null };

      if (existingProfile && existingProfile.id !== session.user.id) {
        return NextResponse.json(
          { error: 'This username is already taken' },
          { status: 400 }
        );
      }
    }

    // Validate exam_preference only if it's being updated
    if (exam_preference !== undefined) {
      if (exam_preference !== null && exam_preference !== 'ESAT' && exam_preference !== 'TMUA') {
        return NextResponse.json(
          { error: 'exam_preference must be ESAT or TMUA' },
          { status: 400 }
        );
      }
    }

    // Validate ESAT subjects when they are being updated
    if (esat_subjects !== undefined) {
      let effectiveExamPreference = exam_preference as string | null | undefined;

      if (effectiveExamPreference === undefined) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('exam_preference')
          .eq('id', session.user.id)
          .single() as { data: { exam_preference: string | null } | null };

        effectiveExamPreference = currentProfile?.exam_preference ?? null;
      }

      if (effectiveExamPreference === 'ESAT') {
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
    }

    // Validate font_size
    if (font_size !== null && font_size !== undefined && !['small', 'medium', 'large'].includes(font_size)) {
      return NextResponse.json(
        { error: 'font_size must be small, medium, or large' },
        { status: 400 }
      );
    }

    if (target_universities !== undefined) {
      if (!Array.isArray(target_universities)) {
        return NextResponse.json(
          { error: 'target_universities must be an array' },
          { status: 400 }
        );
      }
      const invalid = target_universities.filter(
        (u: string) => typeof u !== 'string' || !isTargetUniversity(u),
      );
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Invalid universities: ${invalid.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if (referral_source !== undefined && referral_source !== null) {
      if (typeof referral_source !== 'string' || !isReferralSource(referral_source)) {
        return NextResponse.json(
          { error: 'Invalid referral_source' },
          { status: 400 }
        );
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    if (username !== undefined) {
      updateData.username = username;
      if (username) {
        updateData.display_name = username;
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single() as { data: { username: string | null } | null };
        
        // Update timestamp if username is new or changed
        if (!currentProfile?.username || currentProfile.username !== username) {
          updateData.last_username_change = new Date().toISOString();
        }
      }
    }
    if (exam_preference !== undefined) updateData.exam_preference = exam_preference;
    if (esat_subjects !== undefined) updateData.esat_subjects = esat_subjects;
    if (is_early_applicant !== undefined) updateData.is_early_applicant = is_early_applicant;
    if (has_extra_time !== undefined) updateData.has_extra_time = has_extra_time;
    if (extra_time_percentage !== undefined) updateData.extra_time_percentage = extra_time_percentage;
    if (has_rest_breaks !== undefined) updateData.has_rest_breaks = has_rest_breaks;
    if (font_size !== undefined) updateData.font_size = font_size;
    if (reduced_motion !== undefined) updateData.reduced_motion = reduced_motion;
    if (dark_mode !== undefined) updateData.dark_mode = dark_mode;
    if (onboarding_completed !== undefined) {
      updateData.onboarding_completed = Boolean(onboarding_completed);
    }
    if (marketing_emails_consent !== undefined) {
      if (marketing_emails_consent !== null && typeof marketing_emails_consent !== 'boolean') {
        return NextResponse.json(
          { error: 'marketing_emails_consent must be a boolean or null' },
          { status: 400 }
        );
      }
      updateData.marketing_emails_consent = marketing_emails_consent;
    }
    if (target_universities !== undefined) {
      updateData.target_universities = target_universities;
    }
    if (referral_source !== undefined) {
      updateData.referral_source = referral_source;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update profile
    let { data: profile, error: profileError } = await (supabase
      .from('profiles') as any)
      .update(updateData)
      .eq('id', session.user.id)
      .select(PREFS_SELECT_FULL)
      .single();

    // Newer columns may not exist yet — strip optional fields and retry
    if (
      profileError?.message?.includes('marketing_emails_consent') ||
      profileError?.message?.includes('target_universities') ||
      profileError?.message?.includes('referral_source')
    ) {
      const {
        marketing_emails_consent: _m,
        target_universities: _t,
        referral_source: _r,
        ...safeUpdate
      } = updateData;

      if (Object.keys(safeUpdate).length === 0) {
        const current = await selectPreferences(supabase, session.user.id);
        return NextResponse.json({
          ...OPTIONAL_DEFAULTS,
          ...(current.data ?? {}),
        });
      }

      const retry = await (supabase.from('profiles') as any)
        .update(safeUpdate)
        .eq('id', session.user.id)
        .select(PREFS_SELECT_CORE)
        .single();
      profile = retry.data
        ? { ...OPTIONAL_DEFAULTS, ...retry.data }
        : null;
      profileError = retry.error;
    }

    if (profileError) {
      // Provide more specific error messages
      let errorMessage = 'Failed to update preferences';
      if (profileError.code === '23505') {
        errorMessage = 'This username is already taken';
      } else if (profileError.message) {
        errorMessage = profileError.message;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...OPTIONAL_DEFAULTS,
      ...profile,
      target_universities: Array.isArray(profile?.target_universities)
        ? profile.target_universities
        : [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
