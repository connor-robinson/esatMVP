-- Question review: iPad (or phone) uploads one screen recording with mic (combined). Run once in Supabase SQL Editor.
--
-- 1) After this migration, create a Storage bucket named: question-media (private).
-- 2) No extra Storage RLS needed if you only use the service role from the laptop/uploader server.

CREATE TABLE IF NOT EXISTS media_upload_codes_registry (
  code text PRIMARY KEY,
  question_id uuid REFERENCES ai_generated_questions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_registry_question_id
  ON media_upload_codes_registry (question_id);

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS media_upload_code text,
  ADD COLUMN IF NOT EXISTS screen_video_storage_path text,
  ADD COLUMN IF NOT EXISTS voice_audio_storage_path text,
  ADD COLUMN IF NOT EXISTS merged_video_storage_path text,
  ADD COLUMN IF NOT EXISTS media_status text NOT NULL DEFAULT 'none';

-- One non-null upload code per question; codes never reused after assignment (registry PK).
CREATE UNIQUE INDEX IF NOT EXISTS ai_generated_questions_media_upload_code_unique
  ON ai_generated_questions (media_upload_code)
  WHERE media_upload_code IS NOT NULL;

COMMENT ON COLUMN ai_generated_questions.media_upload_code IS 'Format: 2 uppercase letters + 2 digits, e.g. AB12. Assigned once; registry row prevents reuse after question delete.';
COMMENT ON COLUMN ai_generated_questions.media_status IS 'none | screen_only (legacy rows may still have voice_only / both / merged)';
