ALTER TABLE public.paper_sessions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS paper_sessions_user_active_idx
  ON public.paper_sessions (user_id, started_at DESC)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.paper_sessions.deleted_at IS
  'Soft-delete timestamp. Deleted sittings stay out of history/stats and must not be recreated by client upsert.';
