-- Allow users to delete their own drill / builder analytics rows (single session & cascades).

DROP POLICY IF EXISTS "Users can delete own builder sessions" ON builder_sessions;
CREATE POLICY "Users can delete own builder sessions"
  ON builder_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own session questions" ON builder_session_questions;
CREATE POLICY "Users can delete own session questions"
  ON builder_session_questions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own attempts" ON builder_attempts;
CREATE POLICY "Users can delete own attempts"
  ON builder_attempts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own drill sessions" ON drill_sessions;
CREATE POLICY "Users can delete own drill sessions"
  ON drill_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own drill session attempts" ON drill_session_attempts;
CREATE POLICY "Users can delete own drill session attempts"
  ON drill_session_attempts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
