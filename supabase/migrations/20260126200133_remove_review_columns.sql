-- Migration: Remove Review Columns
-- Description: Remove reviewed_by, reviewed_at, and review_notes columns from ai_generated_questions table

-- Drop columns (CASCADE will handle any dependent objects)
ALTER TABLE ai_generated_questions
DROP COLUMN IF EXISTS reviewed_by CASCADE;

ALTER TABLE ai_generated_questions
DROP COLUMN IF EXISTS reviewed_at CASCADE;

ALTER TABLE ai_generated_questions
DROP COLUMN IF EXISTS review_notes CASCADE;

-- Note: Indexes on these columns will be automatically dropped when columns are removed



