-- Migration: Allow anonymous access for review app
-- Description: Enables anonymous users to read and update ai_generated_questions for the review workflow

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

-- Also ensure authenticated users can still read (if policy doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_generated_questions' 
    AND policyname = 'Users can read all questions'
  ) THEN
    CREATE POLICY "Users can read all questions"
      ON ai_generated_questions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Also ensure authenticated users can still update (if policy doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_generated_questions' 
    AND policyname = 'Users can update question status'
  ) THEN
    CREATE POLICY "Users can update question status"
      ON ai_generated_questions
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

