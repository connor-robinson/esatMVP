-- Allow difficulty = 'Extreme' on ai_generated_questions (review app + generator).
-- Without this, PATCH from the review app fails: CHECK constraint violation.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'ai_generated_questions'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%difficulty%'
  LOOP
    EXECUTE format('ALTER TABLE ai_generated_questions DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE ai_generated_questions
  ADD CONSTRAINT ai_generated_questions_difficulty_check
  CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'Extreme'));
