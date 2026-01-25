-- Add selected_part_ids column to paper_sessions table
-- This column stores granular part IDs for tracking completion at the part level

ALTER TABLE paper_sessions 
ADD COLUMN IF NOT EXISTS selected_part_ids TEXT[];

-- Add comment to explain the column
COMMENT ON COLUMN paper_sessions.selected_part_ids IS 'Array of part IDs for granular tracking (e.g., "NSAA-2023-Section1-Mathematics"). Used to track completion at the smallest component level.';



