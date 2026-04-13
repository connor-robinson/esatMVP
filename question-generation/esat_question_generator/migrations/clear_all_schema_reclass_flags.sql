-- One-shot: clear all schema reclassification flags (revert labeling only; does not change schema_id or subjects).
-- Run in Supabase SQL editor if you need a full reset before re-flagging.

UPDATE public.ai_generated_questions
SET
  schema_reclass_review_tier = NULL,
  schema_reclass_old_id = NULL,
  schema_reclass_new_id = NULL
WHERE
  schema_reclass_review_tier IS NOT NULL
  OR schema_reclass_old_id IS NOT NULL
  OR schema_reclass_new_id IS NOT NULL;
