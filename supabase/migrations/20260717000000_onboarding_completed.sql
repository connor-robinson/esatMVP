-- Post-login personalisation questionnaire completion flag.
-- Existing users are marked complete so they are not forced through onboarding.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

UPDATE public.profiles
SET onboarding_completed = true
WHERE onboarding_completed = false;

COMMENT ON COLUMN public.profiles.onboarding_completed IS
  'True after the user finishes (or skips) the post-signup personalisation questionnaire.';
