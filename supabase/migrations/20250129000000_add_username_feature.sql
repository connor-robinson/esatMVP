-- Migration: Add username feature with uniqueness and change restrictions
-- Description: Renames nickname to username, adds uniqueness constraint, and tracks last change date

-- ============================================================================
-- ADD USERNAME COLUMN AND MIGRATE DATA
-- ============================================================================

DO $$
BEGIN
  -- Handle profiles table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    -- Add username column if it doesn't exist
    ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS username text,
    ADD COLUMN IF NOT EXISTS last_username_change timestamptz;
    
    -- Migrate nickname to username if username is null
    UPDATE public.profiles
    SET username = nickname
    WHERE username IS NULL AND nickname IS NOT NULL;
    
    -- Add unique constraint on username (case-insensitive)
    -- First, create a unique index for case-insensitive comparison
    CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower 
    ON public.profiles (LOWER(username))
    WHERE username IS NOT NULL;
    
    -- Add constraint to ensure username uniqueness (case-insensitive)
    -- Note: PostgreSQL doesn't support case-insensitive unique constraints directly,
    -- so we'll use a unique index with LOWER() function above
    
  -- Handle user_profiles table
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    -- Add username column if it doesn't exist
    ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS username text,
    ADD COLUMN IF NOT EXISTS last_username_change timestamptz;
    
    -- Migrate nickname to username if username is null
    UPDATE public.user_profiles
    SET username = nickname
    WHERE username IS NULL AND nickname IS NOT NULL;
    
    -- Add unique constraint on username (case-insensitive)
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username_lower 
    ON public.user_profiles (LOWER(username))
    WHERE username IS NOT NULL;
    
  ELSE
    RAISE EXCEPTION 'Neither profiles nor user_profiles table exists';
  END IF;
END $$;

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    COMMENT ON COLUMN public.profiles.username IS 'Unique username (case-insensitive) for the user';
    COMMENT ON COLUMN public.profiles.last_username_change IS 'Timestamp of when username was last changed (used for 14-day restriction)';
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    COMMENT ON COLUMN public.user_profiles.username IS 'Unique username (case-insensitive) for the user';
    COMMENT ON COLUMN public.user_profiles.last_username_change IS 'Timestamp of when username was last changed (used for 14-day restriction)';
  END IF;
END $$;

