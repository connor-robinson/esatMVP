-- Match production migration history entry 20260826113845.
-- Applied on production via Supabase; local file restored for history parity.
-- Idempotent: ADD COLUMN IF NOT EXISTS.

alter table public.profiles
  add column if not exists target_universities text[] default '{}'::text[],
  add column if not exists referral_source text;

comment on column public.profiles.target_universities is 'Universities selected by the user during onboarding/profile setup.';
comment on column public.profiles.referral_source is 'User-reported referral source captured during onboarding/profile setup.';
