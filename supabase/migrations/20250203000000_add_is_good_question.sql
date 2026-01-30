-- Migration: Add is_good_question column to ai_generated_questions
-- Description: Marks exceptional questions that are challenging, fitting, interesting with elegant solutions

-- Add is_good_question column
ALTER TABLE ai_generated_questions 
ADD COLUMN IF NOT EXISTS is_good_question boolean DEFAULT false NOT NULL;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_questions_is_good_question ON ai_generated_questions(is_good_question) WHERE is_good_question = true;

-- Add comment
COMMENT ON COLUMN ai_generated_questions.is_good_question IS 
  'Marks exceptional questions that are challenging, fitting, interesting with elegant solutions. Should be rare (1 in 10-20 questions).';




