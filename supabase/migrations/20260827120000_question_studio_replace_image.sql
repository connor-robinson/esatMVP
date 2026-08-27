-- Allow the past-paper conversion studio to replace a truncated/wrong
-- questions.question_image without opening general writes on questions.
--
-- Mirrors set_question_answer_letter: a SECURITY DEFINER RPC sets a
-- transaction-local flag that the protect trigger checks.

CREATE OR REPLACE FUNCTION public.trg_questions_allow_text_promote()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  answer_letter_override boolean :=
    coalesce(nullif(current_setting('app.allow_answer_letter_update', true), ''), 'off') = 'on';
  question_image_override boolean :=
    coalesce(nullif(current_setting('app.allow_question_image_update', true), ''), 'off') = 'on';
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
    AND NEW.solution_image IS NOT DISTINCT FROM OLD.solution_image
    AND NEW.solution_text IS NOT DISTINCT FROM OLD.solution_text
    AND NEW.solution_type IS NOT DISTINCT FROM OLD.solution_type
    AND (
      answer_letter_override
      OR NEW.answer_letter IS NOT DISTINCT FROM OLD.answer_letter
    )
    AND (
      question_image_override
      OR NEW.question_image IS NOT DISTINCT FROM OLD.question_image
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

CREATE OR REPLACE FUNCTION public.set_question_image(
  p_question_id bigint,
  p_question_image text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := btrim(coalesce(p_question_image, ''));
BEGIN
  IF v_url = '' THEN
    RAISE EXCEPTION 'question image url is required';
  END IF;
  IF v_url !~* '^https?://' THEN
    RAISE EXCEPTION 'question image must be an http(s) url';
  END IF;

  PERFORM set_config('app.allow_question_image_update', 'on', true);
  UPDATE public.questions
  SET question_image = v_url
  WHERE id = p_question_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'question not found: %', p_question_id;
  END IF;

  PERFORM set_config('app.allow_question_image_update', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_question_image(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_question_image(bigint, text) TO service_role;
