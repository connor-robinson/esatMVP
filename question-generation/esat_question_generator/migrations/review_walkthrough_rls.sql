-- Optional: RLS so the review app can use NEXT_PUBLIC_SUPABASE_ANON_KEY + user session
-- (or anon) for walkthrough codes and uploads — without SUPABASE_SERVICE_ROLE_KEY.
--
-- Run in Supabase SQL Editor after add_question_media.sql.
-- Tighten policies in production (e.g. restrict to authenticated only).
--
-- If RLS is ON for ai_generated_questions but there is no SELECT policy for anon/authenticated,
-- the dashboard will show zero questions (PostgREST returns empty rows, not always an error).
-- Enabling RLS is applied immediately before the policies below (same section) so a
-- half-applied run does not leave the table locked down without SELECT policies.

-- Registry table
ALTER TABLE media_upload_codes_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_walkthrough_registry_all" ON media_upload_codes_registry;
CREATE POLICY "review_walkthrough_registry_all"
  ON media_upload_codes_registry
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- iPad hits /api/upload-walkthrough/* without auth cookies → Supabase sees role `anon`.
-- prepare must SELECT by media_upload_code; complete must UPDATE storage path.

BEGIN;
ALTER TABLE ai_generated_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_walkthrough_anon_select_questions" ON ai_generated_questions;
CREATE POLICY "review_walkthrough_anon_select_questions"
  ON ai_generated_questions
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "review_walkthrough_question_media_update" ON ai_generated_questions;
CREATE POLICY "review_walkthrough_question_media_update"
  ON ai_generated_questions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
COMMIT;

-- Storage: iPad upload uses anon + signed URL → must add storage.objects policies.
-- Run question_media_storage_rls.sql (or add equivalent policies in Dashboard → Storage).
