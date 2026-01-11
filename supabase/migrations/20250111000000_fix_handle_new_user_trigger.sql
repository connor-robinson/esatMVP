-- Migration: Fix handle_new_user trigger function
-- Description: Adds error handling and proper search_path to fix "Database error saving new user"
-- This ensures the trigger function works correctly with RLS and handles edge cases

-- ============================================================================
-- FIXED FUNCTION TO AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile, ignoring if it already exists (idempotent)
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (
    NEW.id,
    'User' || LPAD((FLOOR(RANDOM() * 9999) + 1)::text, 4, '0')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    -- This allows users to be created even if profile creation fails
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- The trigger should already exist, but ensure it's set up correctly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

