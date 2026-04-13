-- Speed up question-bank list queries (filters + ordering)
CREATE INDEX IF NOT EXISTS idx_ai_gen_questions_status_created
  ON ai_generated_questions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_gen_questions_status_test_type
  ON ai_generated_questions (status, test_type);

CREATE INDEX IF NOT EXISTS idx_ai_gen_questions_status_subjects
  ON ai_generated_questions (status, subjects);
