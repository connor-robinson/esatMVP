-- Migration: Create question_bank_attempts table
-- Description: Tracks user attempts on questions from the question bank

-- Create the question_bank_attempts table
CREATE TABLE IF NOT EXISTS question_bank_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES ai_generated_questions(id) ON DELETE CASCADE,
  user_answer text NOT NULL,
  is_correct boolean NOT NULL,
  time_spent_ms integer,
  viewed_solution boolean DEFAULT false,
  attempted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_qb_attempts_user ON question_bank_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_qb_attempts_question ON question_bank_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_qb_attempts_attempted ON question_bank_attempts(attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_qb_attempts_user_attempted ON question_bank_attempts(user_id, attempted_at DESC);

-- Enable Row Level Security
ALTER TABLE question_bank_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own question bank attempts" ON question_bank_attempts;
CREATE POLICY "Users can view own question bank attempts"
  ON question_bank_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own question bank attempts" ON question_bank_attempts;
CREATE POLICY "Users can insert own question bank attempts"
  ON question_bank_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to update user_daily_metrics when question bank attempt is recorded
CREATE OR REPLACE FUNCTION update_daily_metrics_on_qb_attempt()
RETURNS TRIGGER AS $$
DECLARE
  metric_date date;
  time_ms bigint;
BEGIN
  -- Extract date from attempted_at
  metric_date := DATE(NEW.attempted_at);
  time_ms := COALESCE(NEW.time_spent_ms, 0);

  -- Insert or update user_daily_metrics
  INSERT INTO user_daily_metrics (
    user_id,
    metric_date,
    total_questions,
    correct_answers,
    total_time_ms,
    sessions_count
  ) VALUES (
    NEW.user_id,
    metric_date,
    1,
    CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
    time_ms,
    0  -- Question bank attempts don't count as sessions
  )
  ON CONFLICT (user_id, metric_date)
  DO UPDATE SET
    total_questions = user_daily_metrics.total_questions + 1,
    correct_answers = user_daily_metrics.correct_answers + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
    total_time_ms = user_daily_metrics.total_time_ms + time_ms,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update daily metrics
DROP TRIGGER IF EXISTS trigger_update_daily_metrics_qb ON question_bank_attempts;
CREATE TRIGGER trigger_update_daily_metrics_qb
  AFTER INSERT ON question_bank_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_metrics_on_qb_attempt();

-- Add subject extraction helper function
CREATE OR REPLACE FUNCTION extract_subject_from_schema_id(schema_id text)
RETURNS text AS $$
BEGIN
  -- Extract subject prefix from schema_id
  -- Examples: "MATH1-001" -> "Math 1", "PHYS-002" -> "Physics"
  CASE
    WHEN schema_id LIKE 'MATH1-%' THEN RETURN 'Math 1';
    WHEN schema_id LIKE 'MATH2-%' THEN RETURN 'Math 2';
    WHEN schema_id LIKE 'PHYS-%' THEN RETURN 'Physics';
    WHEN schema_id LIKE 'CHEM-%' THEN RETURN 'Chemistry';
    WHEN schema_id LIKE 'BIO-%' THEN RETURN 'Biology';
    ELSE RETURN 'Unknown';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comments
COMMENT ON TABLE question_bank_attempts IS 'Tracks user attempts on questions from the AI-generated question bank';
COMMENT ON COLUMN question_bank_attempts.question_id IS 'References ai_generated_questions.id';
COMMENT ON COLUMN question_bank_attempts.user_answer IS 'The option letter the user selected (A-H)';
COMMENT ON COLUMN question_bank_attempts.viewed_solution IS 'Whether the user viewed the solution after answering';




























