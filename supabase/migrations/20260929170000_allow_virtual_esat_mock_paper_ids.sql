-- Admin ESAT CAMP mocks use virtual paper ids (920000–920049) that are not
-- rows in public.papers. The FK on paper_sessions.paper_id (and related
-- tables) rejected every ESAT mock save, so no interactive ESAT sitting was
-- ever persisted. Soft-reference paper_id for these virtual ids.

ALTER TABLE public.paper_sessions
  DROP CONSTRAINT IF EXISTS paper_sessions_paper_id_fkey;

ALTER TABLE public.drill_items
  DROP CONSTRAINT IF EXISTS drill_items_paper_id_fkey;

ALTER TABLE public.paper_session_responses
  DROP CONSTRAINT IF EXISTS paper_session_responses_paper_id_fkey;

COMMENT ON COLUMN public.paper_sessions.paper_id IS
  'Paper id from public.papers, or a virtual admin ESAT mock id (920000+). Not FK-enforced so CAMP mocks can persist.';
