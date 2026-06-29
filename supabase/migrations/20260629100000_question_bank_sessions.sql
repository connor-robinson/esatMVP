-- Migration: Question bank sessions + session_id on attempts
-- Run in Supabase SQL editor if not using CLI migrate

CREATE TABLE IF NOT EXISTS question_bank_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  question_count integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  total_time_ms bigint NOT NULL DEFAULT 0,
  time_limit_minutes integer,
  source text NOT NULL DEFAULT 'home',
  subjects text,
  test_type text,
  ui_difficulties jsonb DEFAULT '[]'::jsonb,
  summary jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qb_sessions_user ON question_bank_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_qb_sessions_user_ended ON question_bank_sessions(user_id, ended_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_qb_sessions_started ON question_bank_sessions(started_at DESC);

ALTER TABLE question_bank_attempts
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES question_bank_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qb_attempts_session ON question_bank_attempts(session_id, attempted_at);
CREATE INDEX IF NOT EXISTS idx_qb_attempts_user_session ON question_bank_attempts(user_id, session_id);

ALTER TABLE question_bank_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own question bank sessions" ON question_bank_sessions;
CREATE POLICY "Users can view own question bank sessions"
  ON question_bank_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own question bank sessions" ON question_bank_sessions;
CREATE POLICY "Users can insert own question bank sessions"
  ON question_bank_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own question bank sessions" ON question_bank_sessions;
CREATE POLICY "Users can update own question bank sessions"
  ON question_bank_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_qb_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_qb_sessions_updated_at ON question_bank_sessions;
CREATE TRIGGER trigger_qb_sessions_updated_at
  BEFORE UPDATE ON question_bank_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_qb_session_updated_at();

CREATE OR REPLACE FUNCTION update_daily_metrics_on_qb_session_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_metric_date date;
BEGIN
  IF NEW.ended_at IS NULL OR (OLD.ended_at IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  v_metric_date := DATE(NEW.ended_at);

  INSERT INTO user_daily_metrics (
    user_id,
    metric_date,
    total_questions,
    correct_answers,
    total_time_ms,
    sessions_count
  ) VALUES (
    NEW.user_id,
    v_metric_date,
    0,
    0,
    0,
    1
  )
  ON CONFLICT (user_id, metric_date)
  DO UPDATE SET
    sessions_count = user_daily_metrics.sessions_count + 1,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_daily_metrics_qb_session ON question_bank_sessions;
CREATE TRIGGER trigger_update_daily_metrics_qb_session
  AFTER UPDATE OF ended_at ON question_bank_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_metrics_on_qb_session_complete();

COMMENT ON TABLE question_bank_sessions IS 'Completed question bank practice sessions with rollup summary';
COMMENT ON COLUMN question_bank_attempts.session_id IS 'Optional link to question_bank_sessions for grouped analytics';
