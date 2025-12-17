-- Migration: Create ai_generated_questions table
-- Description: Stores all AI-generated ESAT questions with full metadata and review workflow support

-- Create the main table
CREATE TABLE IF NOT EXISTS ai_generated_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id text NOT NULL UNIQUE,
  schema_id text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'needs_revision')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  question_stem text NOT NULL,
  options jsonb NOT NULL,
  correct_option text NOT NULL CHECK (correct_option ~ '^[A-H]$'),
  solution_reasoning text,
  solution_key_insight text,
  distractor_map jsonb,
  idea_plan jsonb,
  verifier_report jsonb,
  style_report jsonb,
  models_used jsonb,
  generation_attempts integer DEFAULT 0,
  token_usage jsonb,
  run_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_questions_status ON ai_generated_questions(status);
CREATE INDEX IF NOT EXISTS idx_ai_questions_schema ON ai_generated_questions(schema_id);
CREATE INDEX IF NOT EXISTS idx_ai_questions_difficulty ON ai_generated_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_ai_questions_created ON ai_generated_questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_questions_status_created ON ai_generated_questions(status, created_at DESC);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_ai_questions_updated_at ON ai_generated_questions;
CREATE TRIGGER update_ai_questions_updated_at
  BEFORE UPDATE ON ai_generated_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE ai_generated_questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can read all questions" ON ai_generated_questions;
DROP POLICY IF EXISTS "Users can update question status" ON ai_generated_questions;
DROP POLICY IF EXISTS "Service role can insert questions" ON ai_generated_questions;

-- Policy: All authenticated users can read all questions
CREATE POLICY "Users can read all questions"
  ON ai_generated_questions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only authenticated users can update status
CREATE POLICY "Users can update question status"
  ON ai_generated_questions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Service role can insert (for Python workers)
CREATE POLICY "Service role can insert questions"
  ON ai_generated_questions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE ai_generated_questions IS 'Stores all AI-generated ESAT questions with full metadata, review workflow, and audit trail';

-- Add comments to key columns
COMMENT ON COLUMN ai_generated_questions.generation_id IS 'Original ID from generator: {schema_id}-{difficulty}-{fingerprint}';
COMMENT ON COLUMN ai_generated_questions.status IS 'Review status: pending_review, approved, rejected, or needs_revision';
COMMENT ON COLUMN ai_generated_questions.question_stem IS 'Question text with LaTeX math ($ for inline, $$ for display)';
COMMENT ON COLUMN ai_generated_questions.options IS 'JSONB object mapping option letters (A-H) to option text';
COMMENT ON COLUMN ai_generated_questions.distractor_map IS 'JSONB object mapping each option to its reasoning path';

