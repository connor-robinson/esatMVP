-- Migration: Update all AI generated questions to pending_review status
-- Description: Sets all existing questions to pending_review status for review workflow

UPDATE ai_generated_questions
SET status = 'pending_review',
    updated_at = now()
WHERE status != 'pending_review';

-- Add comment
COMMENT ON COLUMN ai_generated_questions.status IS 'Review status: pending_review (default), approved, rejected, or needs_revision. All questions start as pending_review.';















