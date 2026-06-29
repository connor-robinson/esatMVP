-- Fix ambiguous metric_date in question_bank_sessions complete trigger
-- (blocked PATCH / ended_at updates → analytics showed 0 completed sessions)

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
