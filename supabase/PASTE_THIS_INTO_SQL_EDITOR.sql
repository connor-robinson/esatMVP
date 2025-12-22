-- ============================================================================
-- COMPLETE ANALYTICS SCHEMA - PASTE THIS INTO SUPABASE SQL EDITOR
-- ============================================================================
-- This file combines all migrations into one script
-- Run this in your Supabase project's SQL Editor
-- ============================================================================

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USER PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);

-- Trigger for user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON user_profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (
    NEW.id,
    'User' || LPAD((FLOOR(RANDOM() * 9999) + 1)::text, 4, '0')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TABLE user_profiles IS 'User profile information including display names and avatars';

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

-- Trigger for user_daily_metrics
DROP TRIGGER IF EXISTS update_user_daily_metrics_updated_at ON user_daily_metrics;
CREATE TRIGGER update_user_daily_metrics_updated_at
  BEFORE UPDATE ON user_daily_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for user_daily_metrics
ALTER TABLE user_daily_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily metrics" ON user_daily_metrics;
CREATE POLICY "Users can view own daily metrics"
  ON user_daily_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily metrics" ON user_daily_metrics;
CREATE POLICY "Users can insert own daily metrics"
  ON user_daily_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily metrics" ON user_daily_metrics;
CREATE POLICY "Users can update own daily metrics"
  ON user_daily_metrics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE user_daily_metrics IS 'Daily aggregated metrics for each user to power analytics and activity heatmap';

-- ============================================================================
-- BUILDER SESSIONS TABLE
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

-- Trigger for builder_sessions
DROP TRIGGER IF EXISTS update_builder_sessions_updated_at ON builder_sessions;
CREATE TRIGGER update_builder_sessions_updated_at
  BEFORE UPDATE ON builder_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for builder_sessions
ALTER TABLE builder_sessions ENABLE ROW LEVEL SECURITY;

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

COMMENT ON TABLE builder_sessions IS 'Mental math and drill sessions created via the builder interface';

-- ============================================================================
-- BUILDER SESSION QUESTIONS TABLE
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

-- RLS for builder_session_questions
ALTER TABLE builder_session_questions ENABLE ROW LEVEL SECURITY;

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

COMMENT ON TABLE builder_session_questions IS 'Questions generated for each builder session';

-- ============================================================================
-- BUILDER ATTEMPTS TABLE
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

-- RLS for builder_attempts
ALTER TABLE builder_attempts ENABLE ROW LEVEL SECURITY;

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

COMMENT ON TABLE builder_attempts IS 'Individual question attempts within builder sessions';

-- ============================================================================
-- DRILL SESSIONS TABLE
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

-- Trigger for drill_sessions
DROP TRIGGER IF EXISTS update_drill_sessions_updated_at ON drill_sessions;
CREATE TRIGGER update_drill_sessions_updated_at
  BEFORE UPDATE ON drill_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for drill_sessions
ALTER TABLE drill_sessions ENABLE ROW LEVEL SECURITY;

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

COMMENT ON TABLE drill_sessions IS 'Legacy drill sessions (topic-specific practice)';

-- ============================================================================
-- DRILL SESSION ATTEMPTS TABLE
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

-- RLS for drill_session_attempts
ALTER TABLE drill_session_attempts ENABLE ROW LEVEL SECURITY;

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

COMMENT ON TABLE drill_session_attempts IS 'Attempts within drill sessions';

-- ============================================================================
-- TOPIC PROGRESS TABLE
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

-- Trigger for topic_progress
DROP TRIGGER IF EXISTS update_topic_progress_updated_at ON topic_progress;
CREATE TRIGGER update_topic_progress_updated_at
  BEFORE UPDATE ON topic_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for topic_progress (users can see others for leaderboard)
ALTER TABLE topic_progress ENABLE ROW LEVEL SECURITY;

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

COMMENT ON TABLE topic_progress IS 'Aggregated progress statistics per topic per user';

-- ============================================================================
-- SESSION PRESETS TABLE
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

-- Trigger for session_presets
DROP TRIGGER IF EXISTS update_session_presets_updated_at ON session_presets;
CREATE TRIGGER update_session_presets_updated_at
  BEFORE UPDATE ON session_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for session_presets
ALTER TABLE session_presets ENABLE ROW LEVEL SECURITY;

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

COMMENT ON TABLE session_presets IS 'Saved session configurations for quick access';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify everything was created successfully

-- Check all tables were created
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_profiles',
    'user_daily_metrics',
    'builder_sessions',
    'builder_session_questions',
    'builder_attempts',
    'drill_sessions',
    'drill_session_attempts',
    'topic_progress',
    'session_presets'
  )
ORDER BY table_name;

-- Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'user_profiles',
    'user_daily_metrics',
    'builder_sessions',
    'builder_session_questions',
    'builder_attempts',
    'drill_sessions',
    'drill_session_attempts',
    'topic_progress',
    'session_presets'
  );

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- All tables, indexes, triggers, RLS policies created successfully.
-- You can now use the analytics system with real data!
-- ============================================================================

