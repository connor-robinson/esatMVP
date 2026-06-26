-- Past paper image-to-text conversion schema (non-breaking: keeps question_image intact)

-- Sidecar table for conversion pipeline output and audit trail
CREATE TABLE IF NOT EXISTS question_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id bigint NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'auto_approved', 'failed', 'superseded')),
  question_stem text,
  options jsonb,
  diagram_assets jsonb,
  detected_question_number int,
  option_letters text[],
  confidence numeric(4, 3),
  conversion_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_image_url text NOT NULL,
  source_image_hash text,
  model_used text,
  token_usage jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, source_image_hash)
);

CREATE INDEX IF NOT EXISTS idx_question_conversions_question_id
  ON question_conversions(question_id);

CREATE INDEX IF NOT EXISTS idx_question_conversions_status
  ON question_conversions(status);

CREATE INDEX IF NOT EXISTS idx_question_conversions_source_hash
  ON question_conversions(source_image_hash);

-- User-reported conversion errors (for requeue)
CREATE TABLE IF NOT EXISTS question_conversion_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id bigint NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  report_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_conversion_reports_question_id
  ON question_conversion_reports(question_id);

-- Nullable text fields on questions (populated when auto-approved)
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_stem text,
  ADD COLUMN IF NOT EXISTS options jsonb,
  ADD COLUMN IF NOT EXISTS diagram_assets jsonb,
  ADD COLUMN IF NOT EXISTS content_format text NOT NULL DEFAULT 'image';

-- Add check constraint only if column was just created without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'questions_content_format_check'
  ) THEN
    ALTER TABLE questions
      ADD CONSTRAINT questions_content_format_check
      CHECK (content_format IN ('image', 'text', 'hybrid'));
  END IF;
END $$;

-- Auto-update updated_at on question_conversions
CREATE OR REPLACE FUNCTION update_question_conversions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_question_conversions_updated_at ON question_conversions;
CREATE TRIGGER trg_question_conversions_updated_at
  BEFORE UPDATE ON question_conversions
  FOR EACH ROW
  EXECUTE FUNCTION update_question_conversions_updated_at();

-- RLS: conversions readable by authenticated users; writes via service role
ALTER TABLE question_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_conversion_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read question_conversions" ON question_conversions;
CREATE POLICY "Authenticated read question_conversions"
  ON question_conversions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full access question_conversions" ON question_conversions;
CREATE POLICY "Service role full access question_conversions"
  ON question_conversions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated insert conversion reports" ON question_conversion_reports;
CREATE POLICY "Authenticated insert conversion reports"
  ON question_conversion_reports FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated read own conversion reports" ON question_conversion_reports;
CREATE POLICY "Authenticated read own conversion reports"
  ON question_conversion_reports FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full access conversion reports" ON question_conversion_reports;
CREATE POLICY "Service role full access conversion reports"
  ON question_conversion_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
