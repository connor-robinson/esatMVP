-- Allow users to discard in-progress question bank sessions
DROP POLICY IF EXISTS "Users can delete own question bank sessions" ON question_bank_sessions;
CREATE POLICY "Users can delete own question bank sessions"
  ON question_bank_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
