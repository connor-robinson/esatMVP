-- Migration: Allow anonymous users to delete questions
-- Description: Enables anonymous users to delete ai_generated_questions for the review workflow

-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Anonymous users can delete questions" ON ai_generated_questions;

-- Policy: Anonymous users can delete questions (for review app)
CREATE POLICY "Anonymous users can delete questions"
  ON ai_generated_questions
  FOR DELETE
  TO anon
  USING (true);

-- Add comment
COMMENT ON POLICY "Anonymous users can delete questions" ON ai_generated_questions IS 
  'Allows anonymous users to delete questions in the review app. Use with caution.';






