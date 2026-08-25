-- Allow the past-paper conversion studio to correct an answer key without
-- opening general writes on questions.
--
-- The protect trigger still rejects every other metadata change. answer_letter
-- may only change inside set_question_answer_letter(), which sets a
-- transaction-local flag the trigger checks.

CREATE OR REPLACE FUNCTION public.trg_questions_allow_text_promote()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  answer_letter_override boolean :=
    coalesce(nullif(current_setting('app.allow_answer_letter_update', true), ''), 'off') = 'on';
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF (
    NEW.id IS NOT DISTINCT FROM OLD.id
    AND NEW.paper_id IS NOT DISTINCT FROM OLD.paper_id
    AND NEW.exam_name IS NOT DISTINCT FROM OLD.exam_name
    AND NEW.exam_year IS NOT DISTINCT FROM OLD.exam_year
    AND NEW.paper_name IS NOT DISTINCT FROM OLD.paper_name
    AND NEW.part_letter IS NOT DISTINCT FROM OLD.part_letter
    AND NEW.part_name IS NOT DISTINCT FROM OLD.part_name
    AND NEW.exam_type IS NOT DISTINCT FROM OLD.exam_type
    AND NEW.question_number IS NOT DISTINCT FROM OLD.question_number
    AND NEW.question_image IS NOT DISTINCT FROM OLD.question_image
    AND NEW.solution_image IS NOT DISTINCT FROM OLD.solution_image
    AND NEW.solution_text IS NOT DISTINCT FROM OLD.solution_text
    AND NEW.solution_type IS NOT DISTINCT FROM OLD.solution_type
    AND (
      answer_letter_override
      OR NEW.answer_letter IS NOT DISTINCT FROM OLD.answer_letter
    )
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'UPDATE operation is not allowed on table questions. This table contains protected data.';
END;
$$;

DROP TRIGGER IF EXISTS trg_questions_allow_text_promote ON public.questions;
CREATE TRIGGER trg_questions_allow_text_promote
  BEFORE UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_questions_allow_text_promote();

CREATE OR REPLACE FUNCTION public.set_question_answer_letter(
  p_question_id bigint,
  p_answer_letter text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_letter text := upper(btrim(coalesce(p_answer_letter, '')));
BEGIN
  IF v_letter !~ '^[A-H]$' THEN
    RAISE EXCEPTION 'invalid answer letter: %', p_answer_letter;
  END IF;

  PERFORM set_config('app.allow_answer_letter_update', 'on', true);
  UPDATE public.questions
  SET answer_letter = v_letter
  WHERE id = p_question_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'question not found: %', p_question_id;
  END IF;

  PERFORM set_config('app.allow_answer_letter_update', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_question_answer_letter(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_question_answer_letter(bigint, text) TO service_role;
