-- Migration: Add 'old' as a valid status value
-- Description: Allows marking questions as 'old' for archival purposes

-- Drop the existing check constraint
ALTER TABLE ai_generated_questions
DROP CONSTRAINT IF EXISTS ai_generated_questions_status_check;

-- Add the constraint with 'old' included
ALTER TABLE ai_generated_questions
ADD CONSTRAINT ai_generated_questions_status_check 
CHECK (status IN ('pending_review', 'approved', 'rejected', 'needs_revision', 'old'));

-- Update comment
COMMENT ON COLUMN ai_generated_questions.status IS 
  'Review status: pending_review (default), approved, rejected, needs_revision, or old (archived)';

