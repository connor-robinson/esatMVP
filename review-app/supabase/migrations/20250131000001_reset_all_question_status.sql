-- Migration: Reset all question statistics to 0
-- Description: Resets all questions to pending_review status, clearing reviewed_by and reviewed_at
-- This makes all statistics show 0 processed questions

-- Reset all questions to pending_review status
UPDATE ai_generated_questions
SET 
  status = 'pending_review',
  reviewed_by = NULL,
  reviewed_at = NULL,
  updated_at = NOW()
WHERE status != 'pending_review';

-- Log the number of questions reset
DO $$
DECLARE
  reset_count INTEGER;
BEGIN
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RAISE NOTICE 'Reset % questions to pending_review status', reset_count;
END $$;



