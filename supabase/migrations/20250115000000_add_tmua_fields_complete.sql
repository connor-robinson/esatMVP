-- Migration: Add all missing TMUA fields to ai_generated_questions table
-- Description: Adds graphs, solution_graphs, tag fields, and test_type for TMUA support

-- Add graph fields (for question graphs)
ALTER TABLE ai_generated_questions 
ADD COLUMN IF NOT EXISTS graphs jsonb;

-- Add solution graph fields (for solution-only graphs)
ALTER TABLE ai_generated_questions 
ADD COLUMN IF NOT EXISTS solution_graphs jsonb;

-- Add tag fields
ALTER TABLE ai_generated_questions 
ADD COLUMN IF NOT EXISTS primary_tag text;

ALTER TABLE ai_generated_questions 
ADD COLUMN IF NOT EXISTS secondary_tags jsonb;

ALTER TABLE ai_generated_questions 
ADD COLUMN IF NOT EXISTS tags_confidence numeric;

ALTER TABLE ai_generated_questions 
ADD COLUMN IF NOT EXISTS tags_labeled_at timestamptz;

ALTER TABLE ai_generated_questions 
ADD COLUMN IF NOT EXISTS tags_labeled_by text;

-- Add test_type field to distinguish TMUA from ESAT
ALTER TABLE ai_generated_questions 
ADD COLUMN IF NOT EXISTS test_type text DEFAULT 'ESAT';

-- Add check constraint for test_type
ALTER TABLE ai_generated_questions
DROP CONSTRAINT IF EXISTS test_type_check;

ALTER TABLE ai_generated_questions
ADD CONSTRAINT test_type_check CHECK (
  test_type IN ('ESAT', 'TMUA')
);

-- Update paper constraint to allow both ESAT and TMUA values
ALTER TABLE ai_generated_questions
DROP CONSTRAINT IF EXISTS paper_check;

ALTER TABLE ai_generated_questions
ADD CONSTRAINT paper_check CHECK (
  paper IS NULL OR 
  paper IN ('Math 1', 'Math 2', 'Paper1', 'Paper2')
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_questions_test_type ON ai_generated_questions(test_type);
CREATE INDEX IF NOT EXISTS idx_ai_questions_primary_tag ON ai_generated_questions(primary_tag) WHERE primary_tag IS NOT NULL;

-- Add comments
COMMENT ON COLUMN ai_generated_questions.graphs IS 
  'JSONB map of graph_id to GraphSpec for question graphs (e.g., {"g1": {...}})';

COMMENT ON COLUMN ai_generated_questions.solution_graphs IS 
  'JSONB map of graph_id to GraphSpec for solution-only graphs (e.g., {"sg1": {...}})';

COMMENT ON COLUMN ai_generated_questions.primary_tag IS 
  'Primary curriculum tag (e.g., "MM4", "Arg2")';

COMMENT ON COLUMN ai_generated_questions.secondary_tags IS 
  'JSONB array of secondary curriculum tags (e.g., ["MM6", "M1"])';

COMMENT ON COLUMN ai_generated_questions.tags_confidence IS 
  'Confidence score for tag assignment (0.0 to 1.0)';

COMMENT ON COLUMN ai_generated_questions.tags_labeled_at IS 
  'Timestamp when tags were assigned';

COMMENT ON COLUMN ai_generated_questions.tags_labeled_by IS 
  'Source of tag assignment (e.g., "classifier", "manual", "curriculum_parser")';

COMMENT ON COLUMN ai_generated_questions.test_type IS 
  'Test type: ESAT (Engineering and Science Admissions Test) or TMUA (Test of Mathematics for University Admission)';

COMMENT ON COLUMN ai_generated_questions.paper IS 
  'Paper classification: For ESAT: "Math 1" or "Math 2". For TMUA: "Paper1" or "Paper2". NULL for non-math questions.';



