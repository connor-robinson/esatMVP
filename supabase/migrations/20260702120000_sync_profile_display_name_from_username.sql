-- Keep display_name in sync with username for leaderboards and legacy reads.
UPDATE public.profiles
SET display_name = username
WHERE username IS NOT NULL
  AND (display_name IS NULL OR display_name IS DISTINCT FROM username);
