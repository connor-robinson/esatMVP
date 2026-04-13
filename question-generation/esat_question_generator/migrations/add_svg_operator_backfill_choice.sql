-- Operator intent for SVG backfill (Streamlit / manual queue). Null = not decided yet.
-- Run in Supabase SQL editor for the project that owns ai_generated_questions.

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS svg_operator_backfill_choice text;

COMMENT ON COLUMN ai_generated_questions.svg_operator_backfill_choice IS
  'null = undecided; queue = operator wants SVG generation/backfill; skip = no diagram needed for this row.';

-- Optional: enforce allowed values (uncomment if your Postgres version supports it cleanly)
-- ALTER TABLE ai_generated_questions
--   ADD CONSTRAINT ai_generated_questions_svg_operator_backfill_choice_check
--   CHECK (svg_operator_backfill_choice IS NULL OR svg_operator_backfill_choice IN ('queue', 'skip'));
