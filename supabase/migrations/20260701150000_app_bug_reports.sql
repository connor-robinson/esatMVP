-- User-submitted bug reports from settings

CREATE TABLE IF NOT EXISTS app_bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL CHECK (char_length(description) >= 3 AND char_length(description) <= 2000),
  page_url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_bug_reports_user_created
  ON app_bug_reports(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_bug_reports_created
  ON app_bug_reports(created_at DESC);

ALTER TABLE app_bug_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own bug reports" ON app_bug_reports;
CREATE POLICY "Users insert own bug reports"
  ON app_bug_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE app_bug_reports IS 'Bug reports submitted from app settings';
