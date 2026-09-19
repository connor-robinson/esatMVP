-- Attribute past-paper sittings to the surface that started them
-- (e.g. past_papers hub vs /esat-mock-tests catalog).

ALTER TABLE public.paper_sessions
  ADD COLUMN IF NOT EXISTS entry_source text;

COMMENT ON COLUMN public.paper_sessions.entry_source IS
  'Client start surface: past_papers | esat_mock_tests | library | compare | plan | other';

CREATE INDEX IF NOT EXISTS paper_sessions_entry_source_idx
  ON public.paper_sessions (entry_source)
  WHERE entry_source IS NOT NULL AND deleted_at IS NULL;
