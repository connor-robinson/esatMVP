-- ESAT skill calibration sessions and results for personalised homepage recommendations.

CREATE TABLE IF NOT EXISTS calibration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  questions_total INT NOT NULL DEFAULT 15,
  questions_completed INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibration_sessions_user_status
  ON calibration_sessions(user_id, status);

CREATE TABLE IF NOT EXISTS calibration_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES calibration_sessions(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  strongest_skill TEXT,
  weakest_skill TEXT,
  accuracy NUMERIC(5, 2),
  avg_response_ms INT,
  speed_profile TEXT CHECK (speed_profile IN ('speed_focus', 'accuracy_focus', 'balanced')),
  recommended_topic_id TEXT,
  summary_text TEXT,
  questions_total INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homepage_analytics_events_event
  ON homepage_analytics_events(event, created_at DESC);

ALTER TABLE calibration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY calibration_sessions_select_own ON calibration_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY calibration_sessions_insert_own ON calibration_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY calibration_sessions_update_own ON calibration_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY calibration_results_select_own ON calibration_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY calibration_results_insert_own ON calibration_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY calibration_results_update_own ON calibration_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY homepage_analytics_insert ON homepage_analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
