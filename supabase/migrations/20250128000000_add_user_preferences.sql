-- Migration: Add user preferences to profiles table
-- Description: Adds columns for exam preferences, practice behavior, and UI settings

-- ============================================================================
-- ADD PREFERENCE COLUMNS TO PROFILES
-- ============================================================================
-- Note: The table might be named 'profiles' or 'user_profiles' depending on setup
-- This migration tries both to handle either case

DO $$
BEGIN
  -- Try to alter profiles table (if it exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS nickname text,
    ADD COLUMN IF NOT EXISTS exam_preference text CHECK (exam_preference IN ('ESAT', 'TMUA')),
    ADD COLUMN IF NOT EXISTS esat_subjects text[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS is_early_applicant boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS has_extra_time boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS extra_time_percentage integer DEFAULT 25 CHECK (extra_time_percentage >= 0 AND extra_time_percentage <= 100),
    ADD COLUMN IF NOT EXISTS has_rest_breaks boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS font_size text DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
    ADD COLUMN IF NOT EXISTS reduced_motion boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS dark_mode boolean DEFAULT false;
  -- Try to alter user_profiles table (if it exists instead)
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS nickname text,
    ADD COLUMN IF NOT EXISTS exam_preference text CHECK (exam_preference IN ('ESAT', 'TMUA')),
    ADD COLUMN IF NOT EXISTS esat_subjects text[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS is_early_applicant boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS has_extra_time boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS extra_time_percentage integer DEFAULT 25 CHECK (extra_time_percentage >= 0 AND extra_time_percentage <= 100),
    ADD COLUMN IF NOT EXISTS has_rest_breaks boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS font_size text DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
    ADD COLUMN IF NOT EXISTS reduced_motion boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS dark_mode boolean DEFAULT false;
  ELSE
    RAISE EXCEPTION 'Neither profiles nor user_profiles table exists';
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    COMMENT ON COLUMN public.profiles.nickname IS 'User display nickname';
    COMMENT ON COLUMN public.profiles.exam_preference IS 'User exam preference: ESAT or TMUA';
    COMMENT ON COLUMN public.profiles.esat_subjects IS 'Array of exactly 3 ESAT subjects selected by user';
    COMMENT ON COLUMN public.profiles.is_early_applicant IS 'Whether user is early applicant (affects countdown dates)';
    COMMENT ON COLUMN public.profiles.has_extra_time IS 'Whether user has extra time accommodation';
    COMMENT ON COLUMN public.profiles.extra_time_percentage IS 'Percentage of extra time (default 25%)';
    COMMENT ON COLUMN public.profiles.has_rest_breaks IS 'Whether user has rest break accommodation';
    COMMENT ON COLUMN public.profiles.font_size IS 'User preferred font size: small, medium, or large';
    COMMENT ON COLUMN public.profiles.reduced_motion IS 'Whether to reduce animations for accessibility';
    COMMENT ON COLUMN public.profiles.dark_mode IS 'Reserved for future dark/light mode toggle';
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    COMMENT ON COLUMN public.user_profiles.nickname IS 'User display nickname';
    COMMENT ON COLUMN public.user_profiles.exam_preference IS 'User exam preference: ESAT or TMUA';
    COMMENT ON COLUMN public.user_profiles.esat_subjects IS 'Array of exactly 3 ESAT subjects selected by user';
    COMMENT ON COLUMN public.user_profiles.is_early_applicant IS 'Whether user is early applicant (affects countdown dates)';
    COMMENT ON COLUMN public.user_profiles.has_extra_time IS 'Whether user has extra time accommodation';
    COMMENT ON COLUMN public.user_profiles.extra_time_percentage IS 'Percentage of extra time (default 25%)';
    COMMENT ON COLUMN public.user_profiles.has_rest_breaks IS 'Whether user has rest break accommodation';
    COMMENT ON COLUMN public.user_profiles.font_size IS 'User preferred font size: small, medium, or large';
    COMMENT ON COLUMN public.user_profiles.reduced_motion IS 'Whether to reduce animations for accessibility';
    COMMENT ON COLUMN public.user_profiles.dark_mode IS 'Reserved for future dark/light mode toggle';
  END IF;
END $$;

