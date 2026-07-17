-- Target universities (multi-select) and acquisition source from account setup.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_universities text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_source text;

COMMENT ON COLUMN public.profiles.target_universities IS
  'Universities the user is targeting (multi-select from onboarding).';

COMMENT ON COLUMN public.profiles.referral_source IS
  'How the user heard about ESAT Camp (from onboarding).';
