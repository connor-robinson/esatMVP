-- Allow 'review_needed' for prefix reclass: keep original schema_id/subjects on the row,
-- flag for human review, canonical id in schema_reclass_new_id (see flag_questions_schema_reclass.py).

DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'ai_generated_questions'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%schema_reclass_review_tier%'
  LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.ai_generated_questions DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.ai_generated_questions
  ADD CONSTRAINT ai_generated_questions_schema_reclass_review_tier_check
  CHECK (
    schema_reclass_review_tier IS NULL
    OR schema_reclass_review_tier IN ('urgent', 'secondary', 'review_needed')
  );

COMMENT ON COLUMN public.ai_generated_questions.schema_reclass_review_tier IS
  'urgent|secondary: legacy variation urgency; review_needed: stored schema_id is pre-rename — review keep/delete; canonical id in schema_reclass_new_id';
