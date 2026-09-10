-- Allow inferred QB UI preference source (mid-session stay-on-new pattern).

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_qb_session_ui_preference_source_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_qb_session_ui_preference_source_check
  CHECK (
    qb_session_ui_preference_source IS NULL
    OR qb_session_ui_preference_source IN ('survey', 'toggle', 'inferred')
  );

COMMENT ON COLUMN public.profiles.qb_session_ui_preference_source IS
  'How preference was set: survey modal, header toggle, or inferred from mid-session usage';
