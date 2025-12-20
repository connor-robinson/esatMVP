-- Create user_daily_metrics table for daily aggregated analytics
CREATE TABLE IF NOT EXISTS user_daily_metrics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_time_ms BIGINT NOT NULL DEFAULT 0,
  sessions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, metric_date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_daily_metrics_user_date ON user_daily_metrics(user_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_daily_metrics_date ON user_daily_metrics(metric_date DESC);

-- Enable RLS
ALTER TABLE user_daily_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own daily metrics"
  ON user_daily_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily metrics"
  ON user_daily_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily metrics"
  ON user_daily_metrics FOR UPDATE
  USING (auth.uid() = user_id);

