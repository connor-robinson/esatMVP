-- Schema reclassification review flags (ESAT): questions generated under an old schema_id
-- whose subject prefix was later corrected (e.g. M_* → B_*) need human review on the web app.
-- Run in Supabase SQL editor against the project that owns ai_generated_questions.

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS schema_reclass_review_tier text
    CHECK (schema_reclass_review_tier IS NULL OR schema_reclass_review_tier IN ('urgent', 'secondary'));

COMMENT ON COLUMN ai_generated_questions.schema_reclass_review_tier IS
  'urgent: sibling-style variation — prioritize review; secondary: far variation — still review, lower urgency';

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS schema_reclass_old_id text;

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS schema_reclass_new_id text;

COMMENT ON COLUMN ai_generated_questions.schema_reclass_old_id IS 'Schema id stored on the question row before reclass awareness';
COMMENT ON COLUMN ai_generated_questions.schema_reclass_new_id IS 'Canonical id after prefix correction from Schemas_ESAT';

CREATE INDEX IF NOT EXISTS idx_ai_gen_questions_reclass_tier
  ON ai_generated_questions (schema_reclass_review_tier)
  WHERE schema_reclass_review_tier IS NOT NULL;
