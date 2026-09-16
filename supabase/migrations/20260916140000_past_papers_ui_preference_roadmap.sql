-- Allow roadmap as a past papers layout preference (nav still hides it).

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_past_papers_ui_preference_check;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_past_papers_ui_survey_choice_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_past_papers_ui_preference_check
  CHECK (
    past_papers_ui_preference IS NULL
    OR past_papers_ui_preference IN ('home', 'library', 'roadmap')
  );

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_past_papers_ui_survey_choice_check
  CHECK (
    past_papers_ui_survey_choice IS NULL
    OR past_papers_ui_survey_choice IN ('home', 'library', 'roadmap')
  );

COMMENT ON COLUMN public.profiles.past_papers_ui_preference IS
  'Current past papers layout: home, library (legacy), or roadmap (legacy URL)';
