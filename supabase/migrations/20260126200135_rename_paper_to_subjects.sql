-- Migration: Rename Paper Column to Subjects
-- Description: Rename paper column to subjects, update constraints, and populate subjects for all existing questions

-- First, add the new subjects column
ALTER TABLE ai_generated_questions
ADD COLUMN IF NOT EXISTS subjects text;

-- Populate subjects for existing questions
-- TMUA: Map Paper1/Paper2 to Paper 1/Paper 2
UPDATE ai_generated_questions
SET subjects = CASE 
  WHEN paper = 'Paper1' THEN 'Paper 1'
  WHEN paper = 'Paper2' THEN 'Paper 2'
  ELSE paper
END
WHERE test_type = 'TMUA' AND paper IS NOT NULL;

-- ESAT: Map based on schema_id first character and paper value
UPDATE ai_generated_questions
SET subjects = CASE
  -- Math questions: use paper value if set, otherwise infer from schema
  WHEN schema_id LIKE 'M%' AND paper = 'Math 1' THEN 'Math 1'
  WHEN schema_id LIKE 'M%' AND paper = 'Math 2' THEN 'Math 2'
  WHEN schema_id LIKE 'M%' AND paper IS NULL THEN 'Math 1'  -- Default to Math 1
  -- Physics
  WHEN schema_id LIKE 'P%' THEN 'Physics'
  -- Chemistry
  WHEN schema_id LIKE 'C%' THEN 'Chemistry'
  -- Biology
  WHEN schema_id LIKE 'B%' THEN 'Biology'
  ELSE paper
END
WHERE test_type = 'ESAT';

-- Set subjects for any remaining NULL values (fallback)
UPDATE ai_generated_questions
SET subjects = CASE
  WHEN test_type = 'TMUA' AND paper = 'Paper1' THEN 'Paper 1'
  WHEN test_type = 'TMUA' AND paper = 'Paper2' THEN 'Paper 2'
  WHEN test_type = 'ESAT' AND schema_id LIKE 'M%' THEN 'Math 1'
  WHEN test_type = 'ESAT' AND schema_id LIKE 'P%' THEN 'Physics'
  WHEN test_type = 'ESAT' AND schema_id LIKE 'C%' THEN 'Chemistry'
  WHEN test_type = 'ESAT' AND schema_id LIKE 'B%' THEN 'Biology'
  ELSE 'Unknown'
END
WHERE subjects IS NULL;

-- Make subjects NOT NULL (after populating all values)
ALTER TABLE ai_generated_questions
ALTER COLUMN subjects SET NOT NULL;

-- Drop old paper constraint
ALTER TABLE ai_generated_questions
DROP CONSTRAINT IF EXISTS paper_check;

-- Add new subjects constraint
ALTER TABLE ai_generated_questions
ADD CONSTRAINT subjects_check CHECK (
  subjects IN (
    'Math 1', 'Math 2', 'Physics', 'Chemistry', 'Biology',
    'Paper 1', 'Paper 2'
  )
);

-- Rename the column (PostgreSQL doesn't support direct rename with data migration, so we'll copy and drop)
-- Actually, we can use ALTER TABLE ... RENAME COLUMN
ALTER TABLE ai_generated_questions
RENAME COLUMN paper TO paper_old;

-- Drop the old paper column
ALTER TABLE ai_generated_questions
DROP COLUMN paper_old;

-- Rename index
DROP INDEX IF EXISTS idx_ai_questions_paper;
CREATE INDEX IF NOT EXISTS idx_ai_questions_subjects ON ai_generated_questions(subjects);

-- Update comment
COMMENT ON COLUMN ai_generated_questions.subjects IS 
  'Subject classification: For ESAT: Math 1, Math 2, Physics, Chemistry, or Biology. For TMUA: Paper 1 or Paper 2.';

