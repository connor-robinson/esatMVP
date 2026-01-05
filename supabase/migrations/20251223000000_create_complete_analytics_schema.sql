-- Migration: Create complete analytics schema
-- Description: Creates all tables needed for drill/mental math sessions and analytics

-- ============================================================================
-- BUILDER SESSIONS (Mental Math / Drill sessions via builder)
-- ============================================================================

CREATE TABLE IF NOT EXISTS builder_sessions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz,
  ended_at timestamptz,
  attempts integer DEFAULT 0,
  settings jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_builder_sessions_user ON builder_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_builder_sessions_created ON builder_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_builder_sessions_ended ON builder_sessions(ended_at DESC) WHERE ended_at IS NOT NULL;

-- ============================================================================
-- BUILDER SESSION QUESTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS builder_session_questions (
  id serial PRIMARY KEY,
  session_id text NOT NULL REFERENCES builder_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  question_id text,
  topic_id text,
  difficulty integer,
  prompt text,
  answer text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_builder_session_questions_session ON builder_session_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_builder_session_questions_user ON builder_session_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_builder_session_questions_topic ON builder_session_questions(topic_id);

-- ============================================================================
-- BUILDER ATTEMPTS (Individual question attempts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS builder_attempts (
  id serial PRIMARY KEY,
  session_id text NOT NULL REFERENCES builder_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id text,
  user_answer text,
  is_correct boolean,
  time_spent_ms integer,
  attempted_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_builder_attempts_session ON builder_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_builder_attempts_user ON builder_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_builder_attempts_attempted ON builder_attempts(attempted_at DESC);

-- ============================================================================
-- DRILL SESSIONS (Legacy drill system)
-- ============================================================================

CREATE TABLE IF NOT EXISTS drill_sessions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id text NOT NULL,
  level integer DEFAULT 1,
  question_count integer,
  started_at timestamptz,
  completed_at timestamptz,
  accuracy numeric(5,2),
  average_time_ms integer,
  summary jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drill_sessions_user ON drill_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_sessions_topic ON drill_sessions(topic_id);
CREATE INDEX IF NOT EXISTS idx_drill_sessions_created ON drill_sessions(created_at DESC);

-- ============================================================================
-- DRILL SESSION ATTEMPTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS drill_session_attempts (
  id serial PRIMARY KEY,
  session_id text NOT NULL REFERENCES drill_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id text,
  prompt text,
  correct_answer text,
  user_answer text,
  is_correct boolean,
  time_spent_ms integer,
  order_index integer NOT NULL,
  attempted_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drill_attempts_session ON drill_session_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_drill_attempts_user ON drill_session_attempts(user_id);

-- ============================================================================
-- TOPIC PROGRESS (Aggregated per-topic stats)
-- ============================================================================

CREATE TABLE IF NOT EXISTS topic_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id text NOT NULL,
  current_level integer DEFAULT 1,
  questions_attempted integer DEFAULT 0,
  questions_correct integer DEFAULT 0,
  average_time_ms integer DEFAULT 0,
  last_practiced timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_progress_user ON topic_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_topic ON topic_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_last_practiced ON topic_progress(last_practiced DESC);

-- ============================================================================
-- SESSION PRESETS (Saved session configurations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_presets (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  topic_ids text[] NOT NULL,
  topic_labels text[],
  question_count integer NOT NULL,
  duration_min integer NOT NULL,
  topic_levels jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_presets_user ON session_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_session_presets_created ON session_presets(created_at DESC);

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATING updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_builder_sessions_updated_at ON builder_sessions;
CREATE TRIGGER update_builder_sessions_updated_at
  BEFORE UPDATE ON builder_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drill_sessions_updated_at ON drill_sessions;
CREATE TRIGGER update_drill_sessions_updated_at
  BEFORE UPDATE ON drill_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_topic_progress_updated_at ON topic_progress;
CREATE TRIGGER update_topic_progress_updated_at
  BEFORE UPDATE ON topic_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_session_presets_updated_at ON session_presets;
CREATE TRIGGER update_session_presets_updated_at
  BEFORE UPDATE ON session_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE builder_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_session_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_presets ENABLE ROW LEVEL SECURITY;

-- Builder sessions policies
DROP POLICY IF EXISTS "Users can view own builder sessions" ON builder_sessions;
CREATE POLICY "Users can view own builder sessions"
  ON builder_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own builder sessions" ON builder_sessions;
CREATE POLICY "Users can insert own builder sessions"
  ON builder_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own builder sessions" ON builder_sessions;
CREATE POLICY "Users can update own builder sessions"
  ON builder_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Builder session questions policies
DROP POLICY IF EXISTS "Users can view own session questions" ON builder_session_questions;
CREATE POLICY "Users can view own session questions"
  ON builder_session_questions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own session questions" ON builder_session_questions;
CREATE POLICY "Users can insert own session questions"
  ON builder_session_questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Builder attempts policies
DROP POLICY IF EXISTS "Users can view own attempts" ON builder_attempts;
CREATE POLICY "Users can view own attempts"
  ON builder_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own attempts" ON builder_attempts;
CREATE POLICY "Users can insert own attempts"
  ON builder_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Drill sessions policies
DROP POLICY IF EXISTS "Users can view own drill sessions" ON drill_sessions;
CREATE POLICY "Users can view own drill sessions"
  ON drill_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own drill sessions" ON drill_sessions;
CREATE POLICY "Users can insert own drill sessions"
  ON drill_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own drill sessions" ON drill_sessions;
CREATE POLICY "Users can update own drill sessions"
  ON drill_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Drill attempts policies
DROP POLICY IF EXISTS "Users can view own drill attempts" ON drill_session_attempts;
CREATE POLICY "Users can view own drill attempts"
  ON drill_session_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own drill attempts" ON drill_session_attempts;
CREATE POLICY "Users can insert own drill attempts"
  ON drill_session_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Topic progress policies (users can see others for leaderboard)
DROP POLICY IF EXISTS "Users can view all topic progress" ON topic_progress;
CREATE POLICY "Users can view all topic progress"
  ON topic_progress FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own topic progress" ON topic_progress;
CREATE POLICY "Users can insert own topic progress"
  ON topic_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own topic progress" ON topic_progress;
CREATE POLICY "Users can update own topic progress"
  ON topic_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Session presets policies
DROP POLICY IF EXISTS "Users can view own presets" ON session_presets;
CREATE POLICY "Users can view own presets"
  ON session_presets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own presets" ON session_presets;
CREATE POLICY "Users can insert own presets"
  ON session_presets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own presets" ON session_presets;
CREATE POLICY "Users can update own presets"
  ON session_presets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own presets" ON session_presets;
CREATE POLICY "Users can delete own presets"
  ON session_presets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE builder_sessions IS 'Mental math and drill sessions created via the builder interface';
COMMENT ON TABLE builder_session_questions IS 'Questions generated for each builder session';
COMMENT ON TABLE builder_attempts IS 'Individual question attempts within builder sessions';
COMMENT ON TABLE drill_sessions IS 'Legacy drill sessions (topic-specific practice)';
COMMENT ON TABLE drill_session_attempts IS 'Attempts within drill sessions';
COMMENT ON TABLE topic_progress IS 'Aggregated progress statistics per topic per user';
COMMENT ON TABLE session_presets IS 'Saved session configurations for quick access';

















