-- Apply this SQL in your Supabase Dashboard > SQL Editor
-- This allows anonymous users to read and update questions for the review app

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Anonymous users can read all questions" ON ai_generated_questions;
DROP POLICY IF EXISTS "Anonymous users can update questions" ON ai_generated_questions;

-- Policy: Anonymous users can read all questions (for review app)
CREATE POLICY "Anonymous users can read all questions"
  ON ai_generated_questions
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Anonymous users can update questions (for review app)
CREATE POLICY "Anonymous users can update questions"
  ON ai_generated_questions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

