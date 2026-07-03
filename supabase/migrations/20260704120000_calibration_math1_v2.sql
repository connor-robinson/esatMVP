-- Mathematics 1 Calibration Test (v2): full diagnostic product.
--
-- This replaces the earlier lightweight calibration stub (which derived a
-- profile from existing practice stats) with a real 15-question diagnostic.
-- The prior tables (calibration_sessions, calibration_results) and
-- homepage_analytics_events are left intact so no historic data is lost;
-- the new product uses the tables below and reuses homepage_analytics_events
-- for the calibration funnel.
--
-- Design notes:
--   * calibration_tests stores the whole versioned config as JSONB. The app
--     also bundles the config for reliability; the DB row makes the import
--     idempotent and keeps a queryable, versioned record.
--   * calibration_attempts stores the raw attempt (every timing, answer change,
--     confidence event) and the derived result as JSONB, so results are always
--     reproducible from raw data by a future scoring-model version.

CREATE TABLE IF NOT EXISTS calibration_tests (
  id TEXT PRIMARY KEY,
  version INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  module TEXT NOT NULL,
  content_version INT NOT NULL DEFAULT 1,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calibration_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT NOT NULL REFERENCES calibration_tests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anon_id TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  content_version INT NOT NULL DEFAULT 1,
  scoring_version TEXT,
  result_version TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  question_count INT,
  correct_count INT,
  attempted_count INT,
  total_time_seconds INT,
  overall_score NUMERIC(5, 2),
  readiness_band TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibration_attempts_user
  ON calibration_attempts(user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_calibration_attempts_user_status
  ON calibration_attempts(user_id, status);

ALTER TABLE calibration_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_attempts ENABLE ROW LEVEL SECURITY;

-- Test content is public read (config is not sensitive); writes only via service role.
DROP POLICY IF EXISTS calibration_tests_select_all ON calibration_tests;
CREATE POLICY calibration_tests_select_all ON calibration_tests
  FOR SELECT USING (true);

-- Attempts belong to their owner once authenticated. Anonymous attempts live in
-- localStorage and are uploaded through service-role endpoints after sign-in.
DROP POLICY IF EXISTS calibration_attempts_select_own ON calibration_attempts;
CREATE POLICY calibration_attempts_select_own ON calibration_attempts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS calibration_attempts_insert_own ON calibration_attempts;
CREATE POLICY calibration_attempts_insert_own ON calibration_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS calibration_attempts_update_own ON calibration_attempts;
CREATE POLICY calibration_attempts_update_own ON calibration_attempts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS calibration_attempts_delete_own ON calibration_attempts;
CREATE POLICY calibration_attempts_delete_own ON calibration_attempts
  FOR DELETE USING (auth.uid() = user_id);
