-- Migration: Add order_index to builder_attempts
-- Description: Adds order_index column to track question order within sessions for progress tracking

-- Add order_index column
ALTER TABLE builder_attempts 
ADD COLUMN IF NOT EXISTS order_index integer;

-- Create index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_builder_attempts_order ON builder_attempts(session_id, order_index);

-- Add comment
COMMENT ON COLUMN builder_attempts.order_index IS 
  'Order of the question within the session (0-indexed), used for session progress tracking';


