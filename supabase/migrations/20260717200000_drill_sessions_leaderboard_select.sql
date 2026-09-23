-- Allow authenticated users to read all drill_sessions for global leaderboards.
-- Writes remain restricted to own rows.

DROP POLICY IF EXISTS "Authenticated users can view all drill sessions" ON public.drill_sessions;
CREATE POLICY "Authenticated users can view all drill sessions"
  ON public.drill_sessions
  FOR SELECT
  TO authenticated
  USING (true);
