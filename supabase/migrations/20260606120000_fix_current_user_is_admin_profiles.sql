-- Fix admin check: production uses `profiles`, not `user_profiles`.
-- Broken admin RLS on paper_sessions caused 404/errors for any paper_sessions query.

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
