-- Persist question bank session UI preference (new ESAT-style vs classic)
-- so cohort analytics can see Keep new / Prefer classic choices.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS qb_session_ui_variant text,
  ADD COLUMN IF NOT EXISTS qb_session_ui_survey_choice text,
  ADD COLUMN IF NOT EXISTS qb_session_ui_preference_source text,
  ADD COLUMN IF NOT EXISTS qb_session_ui_preference_updated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_qb_session_ui_variant_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_qb_session_ui_variant_check
      CHECK (
        qb_session_ui_variant IS NULL
        OR qb_session_ui_variant IN ('esat', 'classic')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_qb_session_ui_survey_choice_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_qb_session_ui_survey_choice_check
      CHECK (
        qb_session_ui_survey_choice IS NULL
        OR qb_session_ui_survey_choice IN ('esat', 'classic')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_qb_session_ui_preference_source_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_qb_session_ui_preference_source_check
      CHECK (
        qb_session_ui_preference_source IS NULL
        OR qb_session_ui_preference_source IN ('survey', 'toggle')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.qb_session_ui_variant IS
  'Current question bank session chrome: esat (new exam UI) or classic';
COMMENT ON COLUMN public.profiles.qb_session_ui_survey_choice IS
  'Explicit answer from the in-session UI preference modal, if completed';
COMMENT ON COLUMN public.profiles.qb_session_ui_preference_source IS
  'How the latest variant was set: survey modal or header toggle';
COMMENT ON COLUMN public.profiles.qb_session_ui_preference_updated_at IS
  'When qb_session_ui_variant / survey choice was last updated';
