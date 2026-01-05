-- Migration: Add additional tracking fields to question_bank_attempts
-- Description: Adds was_revealed, used_hint, wrong_answers_before, and time_until_correct_ms columns

-- Add new columns to question_bank_attempts table
ALTER TABLE question_bank_attempts 
  ADD COLUMN IF NOT EXISTS was_revealed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS used_hint BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS wrong_answers_before TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS time_until_correct_ms INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN question_bank_attempts.was_revealed IS 'Whether the user clicked "Reveal Answer" button before this attempt';
COMMENT ON COLUMN question_bank_attempts.used_hint IS 'Whether the user viewed the hint before this attempt';
COMMENT ON COLUMN question_bank_attempts.wrong_answers_before IS 'Array of wrong option letters (A-H) that were submitted before this attempt';
COMMENT ON COLUMN question_bank_attempts.time_until_correct_ms IS 'Time in milliseconds from question start until correct answer was submitted (null if attempt is incorrect)';






