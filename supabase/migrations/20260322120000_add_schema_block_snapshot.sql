-- Snapshot of the ESAT schema markdown block shown to the Designer for this question (per-run).
ALTER TABLE ai_generated_questions
ADD COLUMN IF NOT EXISTS schema_block_snapshot text;

COMMENT ON COLUMN ai_generated_questions.schema_block_snapshot IS
  'Markdown schema section from Schemas_ESAT.md for schema_id at generation time. Null for rows inserted before this column or non-ESAT paths.';
