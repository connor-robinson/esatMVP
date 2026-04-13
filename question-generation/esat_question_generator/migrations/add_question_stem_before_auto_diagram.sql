-- Stores the question_stem immediately before quality-gate auto-SVG (or SVG backfill) merged
-- a diagram into the stem. Null when no pending “choose version” snapshot.
-- Run in Supabase SQL editor for the project that owns ai_generated_questions.

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS question_stem_before_auto_diagram text;

COMMENT ON COLUMN ai_generated_questions.question_stem_before_auto_diagram IS
  'Stem before auto diagram merge; reviewer can compare to question_stem and clear after choosing.';
