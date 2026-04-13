-- Fix: iPad /uploader uses the browser anon key + signed URL → INSERT into storage.objects.
-- Without policies on storage.objects, Postgres returns: "new row violates row-level security policy".
--
-- Prerequisites: Storage bucket `question-media` exists (private is fine).
-- Run in Supabase SQL Editor (Storage → Policies alone is not enough if RLS blocks anon).

DROP POLICY IF EXISTS "question_media_walkthrough_insert" ON storage.objects;
CREATE POLICY "question_media_walkthrough_insert"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'question-media');

-- Signed upload uses upsert: true in prepare → needs SELECT + UPDATE on the same bucket.
DROP POLICY IF EXISTS "question_media_walkthrough_select" ON storage.objects;
CREATE POLICY "question_media_walkthrough_select"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'question-media');

DROP POLICY IF EXISTS "question_media_walkthrough_update" ON storage.objects;
CREATE POLICY "question_media_walkthrough_update"
  ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'question-media')
  WITH CHECK (bucket_id = 'question-media');

-- Optional: allow replacing/deleting objects in this bucket from the same roles (review tooling).
DROP POLICY IF EXISTS "question_media_walkthrough_delete" ON storage.objects;
CREATE POLICY "question_media_walkthrough_delete"
  ON storage.objects
  FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'question-media');
