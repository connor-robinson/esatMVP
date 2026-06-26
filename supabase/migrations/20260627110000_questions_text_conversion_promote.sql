-- Allow past-paper text conversion to promote into questions.question_stem / options
-- without opening full table writes.
--
-- Run in Supabase SQL Editor if conversion fails with:
--   "UPDATE operation is not allowed on table questions. This table contains protected data."

-- Replace the guard function (keeps same error message for disallowed updates)
CREATE OR REPLACE FUNCTION public.trg_questions_allow_text_promote()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Only text conversion columns may change; all exam/image metadata must stay identical
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
    AND NEW.answer_letter IS NOT DISTINCT FROM OLD.answer_letter
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'UPDATE operation is not allowed on table questions. This table contains protected data.';
END;
$$;

-- Attach to questions (drop common legacy names first)
DROP TRIGGER IF EXISTS protect_questions_update ON public.questions;
DROP TRIGGER IF EXISTS questions_update_protect ON public.questions;
DROP TRIGGER IF EXISTS trg_questions_protect ON public.questions;
DROP TRIGGER IF EXISTS questions_protect_update ON public.questions;

DROP TRIGGER IF EXISTS trg_questions_allow_text_promote ON public.questions;
CREATE TRIGGER trg_questions_allow_text_promote
  BEFORE UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_questions_allow_text_promote();

-- Optional RPC for service role (PostgREST)
CREATE OR REPLACE FUNCTION public.approve_question_text_conversion(
  p_question_id bigint,
  p_question_stem text,
  p_options jsonb,
  p_diagram_assets jsonb,
  p_content_format text DEFAULT 'text'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.questions
  SET
    question_stem = p_question_stem,
    options = p_options,
    diagram_assets = p_diagram_assets,
    content_format = COALESCE(p_content_format, 'text')
  WHERE id = p_question_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'question not found: %', p_question_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_question_text_conversion(bigint, text, jsonb, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_question_text_conversion(bigint, text, jsonb, jsonb, text) TO service_role;
