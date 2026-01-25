-- Add paper column for Math 1 / Math 2 classification
ALTER TABLE ai_generated_questions 
ADD COLUMN paper text;

-- Add check constraint for valid values
ALTER TABLE ai_generated_questions
ADD CONSTRAINT paper_check CHECK (
  paper IS NULL OR paper IN ('Math 1', 'Math 2')
);

-- Create index for filtering by paper
CREATE INDEX idx_ai_questions_paper ON ai_generated_questions(paper);

-- Add comment
COMMENT ON COLUMN ai_generated_questions.paper IS 
  'For mathematics questions only: indicates whether question belongs to Math 1 or Math 2 paper. NULL for non-math questions.';































