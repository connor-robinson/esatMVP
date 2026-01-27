-- Migration: Restructure AI Questions - Status Reset and Constraint Update
-- Description: Reset all statuses to 'pending' and update constraint to only allow pending/approved/deleted

-- First, update all existing statuses to 'pending'
-- Map old statuses to new ones:
-- 'pending_review' -> 'pending'
-- 'approved' -> 'pending' (reset for review)
-- 'rejected' -> 'pending' (reset for review)
-- 'needs_revision' -> 'pending' (reset for review)
UPDATE ai_generated_questions
SET status = 'pending',
    updated_at = now()
WHERE status IN ('pending_review', 'approved', 'rejected', 'needs_revision');

-- Drop the old status constraint
ALTER TABLE ai_generated_questions
DROP CONSTRAINT IF EXISTS ai_generated_questions_status_check;

-- Add new status constraint (pending, approved, deleted)
ALTER TABLE ai_generated_questions
ADD CONSTRAINT ai_generated_questions_status_check CHECK (
  status IN ('pending', 'approved', 'deleted')
);

-- Update default status
ALTER TABLE ai_generated_questions
ALTER COLUMN status SET DEFAULT 'pending';

-- Update comment
COMMENT ON COLUMN ai_generated_questions.status IS 
  'Review status: pending (default, awaiting review), approved (passed review), or deleted (rejected/removed)';


