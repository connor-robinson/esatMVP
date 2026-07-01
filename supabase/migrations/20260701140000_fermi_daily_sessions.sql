-- Fermi Daily: one session per user per UTC day + per-question guesses

CREATE TABLE IF NOT EXISTS fermi_daily_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  puzzle_number integer NOT NULL,
  played_date date NOT NULL,
  average_score integer NOT NULL CHECK (average_score >= 0 AND average_score <= 100),
  question_count integer NOT NULL DEFAULT 5 CHECK (question_count > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, played_date)
);

CREATE TABLE IF NOT EXISTS fermi_guesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES fermi_daily_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  guess_value double precision NOT NULL CHECK (guess_value > 0),
  log_error double precision NOT NULL CHECK (log_error >= 0),
  closeness_score integer NOT NULL CHECK (closeness_score >= 0 AND closeness_score <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_fermi_sessions_user_date
  ON fermi_daily_sessions(user_id, played_date DESC);

CREATE INDEX IF NOT EXISTS idx_fermi_sessions_played_date
  ON fermi_daily_sessions(played_date, average_score);

CREATE INDEX IF NOT EXISTS idx_fermi_guesses_session
  ON fermi_guesses(session_id);

ALTER TABLE fermi_daily_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fermi_guesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own fermi sessions" ON fermi_daily_sessions;
CREATE POLICY "Users insert own fermi sessions"
  ON fermi_daily_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own fermi sessions" ON fermi_daily_sessions;
CREATE POLICY "Users update own fermi sessions"
  ON fermi_daily_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own fermi sessions" ON fermi_daily_sessions;
CREATE POLICY "Users read own fermi sessions"
  ON fermi_daily_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated read fermi scores for percentile" ON fermi_daily_sessions;
CREATE POLICY "Authenticated read fermi scores for percentile"
  ON fermi_daily_sessions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users insert own fermi guesses" ON fermi_guesses;
CREATE POLICY "Users insert own fermi guesses"
  ON fermi_guesses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own fermi guesses" ON fermi_guesses;
CREATE POLICY "Users read own fermi guesses"
  ON fermi_guesses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own fermi guesses" ON fermi_guesses;
CREATE POLICY "Users delete own fermi guesses"
  ON fermi_guesses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE fermi_daily_sessions IS 'Completed Fermi Daily rounds — one row per user per UTC day';
COMMENT ON TABLE fermi_guesses IS 'Individual Fermi question guesses within a daily session';
