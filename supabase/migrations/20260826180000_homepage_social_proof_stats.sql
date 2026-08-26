-- Exact homepage social-proof aggregates for cached marketing stats.
-- Callable only via service_role from the Next.js server.

CREATE OR REPLACE FUNCTION public.homepage_social_proof_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'users',
      (SELECT COUNT(*)::bigint FROM auth.users),
    'practiceQuestions',
      (
        SELECT COUNT(*)::bigint
        FROM public.ai_generated_questions
        WHERE status = 'approved'
      ),
    'questionsAnswered',
      (
        COALESCE(
          (SELECT SUM(question_count)::bigint FROM public.drill_sessions),
          0
        )
        + (SELECT COUNT(*)::bigint FROM public.question_bank_attempts)
        + COALESCE(
          (
            SELECT SUM(
              CASE
                WHEN answers IS NULL THEN 0
                WHEN jsonb_typeof(answers) = 'object' THEN (
                  SELECT COUNT(*)::bigint FROM jsonb_object_keys(answers)
                )
                WHEN jsonb_typeof(answers) = 'array' THEN jsonb_array_length(answers)
                ELSE 0
              END
            )::bigint
            FROM public.paper_sessions
          ),
          0
        )
        + (SELECT COUNT(*)::bigint FROM public.calibration_attempts)
        + (SELECT COUNT(*)::bigint FROM public.fermi_guesses)
      )
  );
$$;

COMMENT ON FUNCTION public.homepage_social_proof_stats() IS
  'Exact counts for homepage social proof: users, approved practice questions, questions answered.';

REVOKE ALL ON FUNCTION public.homepage_social_proof_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.homepage_social_proof_stats() TO service_role;
