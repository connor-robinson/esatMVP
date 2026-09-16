-- Persist past papers layout preference (Home vs Library) for admin analytics.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS past_papers_ui_preference text,
  ADD COLUMN IF NOT EXISTS past_papers_ui_survey_choice text,
  ADD COLUMN IF NOT EXISTS past_papers_ui_preference_source text,
  ADD COLUMN IF NOT EXISTS past_papers_ui_preference_updated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_past_papers_ui_preference_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_past_papers_ui_preference_check
      CHECK (
        past_papers_ui_preference IS NULL
        OR past_papers_ui_preference IN ('home', 'library')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_past_papers_ui_survey_choice_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_past_papers_ui_survey_choice_check
      CHECK (
        past_papers_ui_survey_choice IS NULL
        OR past_papers_ui_survey_choice IN ('home', 'library')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_past_papers_ui_preference_source_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_past_papers_ui_preference_source_check
      CHECK (
        past_papers_ui_preference_source IS NULL
        OR past_papers_ui_preference_source IN ('survey', 'toggle', 'default')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.past_papers_ui_preference IS
  'Current past papers layout: home (practice table) or library (legacy)';
COMMENT ON COLUMN public.profiles.past_papers_ui_survey_choice IS
  'Explicit answer from the delayed Home vs Library preference questionnaire';
COMMENT ON COLUMN public.profiles.past_papers_ui_preference_source IS
  'How the latest preference was set: survey, toggle, or default';
COMMENT ON COLUMN public.profiles.past_papers_ui_preference_updated_at IS
  'When past_papers_ui_preference / survey choice was last updated';
