-- Migration: Create user daily metrics table
-- Description: Aggregates daily activity metrics for analytics and heatmap

-- ============================================================================
-- USER DAILY METRICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_daily_metrics (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  total_questions integer DEFAULT 0,
  correct_answers integer DEFAULT 0,
  total_time_ms bigint DEFAULT 0,
  sessions_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_metrics_user ON user_daily_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_metrics_date ON user_daily_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_daily_metrics_user_date ON user_daily_metrics(user_id, metric_date DESC);

-- ============================================================================
-- AUTO-UPDATE TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS update_user_daily_metrics_updated_at ON user_daily_metrics;
CREATE TRIGGER update_user_daily_metrics_updated_at
  BEFORE UPDATE ON user_daily_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_daily_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view their own metrics
DROP POLICY IF EXISTS "Users can view own daily metrics" ON user_daily_metrics;
CREATE POLICY "Users can view own daily metrics"
  ON user_daily_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own metrics
DROP POLICY IF EXISTS "Users can insert own daily metrics" ON user_daily_metrics;
CREATE POLICY "Users can insert own daily metrics"
  ON user_daily_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own metrics
DROP POLICY IF EXISTS "Users can update own daily metrics" ON user_daily_metrics;
CREATE POLICY "Users can update own daily metrics"
  ON user_daily_metrics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_daily_metrics IS 'Daily aggregated metrics for each user to power analytics and activity heatmap';
COMMENT ON COLUMN user_daily_metrics.metric_date IS 'Date of the metrics (YYYY-MM-DD)';
COMMENT ON COLUMN user_daily_metrics.total_questions IS 'Total questions answered on this date';
COMMENT ON COLUMN user_daily_metrics.correct_answers IS 'Total correct answers on this date';
COMMENT ON COLUMN user_daily_metrics.total_time_ms IS 'Total time spent on questions in milliseconds';
COMMENT ON COLUMN user_daily_metrics.sessions_count IS 'Number of sessions completed on this date';




























