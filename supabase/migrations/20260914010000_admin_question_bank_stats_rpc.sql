-- Admin Question Bank aggregates (subjects, most-wrong, unique questions).
CREATE OR REPLACE FUNCTION public.admin_question_bank_stats(
  p_since timestamptz DEFAULT NULL,
  p_min_attempts int DEFAULT 5,
  p_wrong_limit int DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH attempts AS (
    SELECT
      a.question_id,
      a.user_id,
      a.is_correct,
      COALESCE(a.attempted_at, a.created_at) AS at
    FROM public.question_bank_attempts a
    JOIN public.profiles p ON p.id = a.user_id
    WHERE (p.email IS NULL OR p.email NOT ILIKE '%@seed.esatcamp.local')
      AND (p_since IS NULL OR COALESCE(a.attempted_at, a.created_at) >= p_since)
  ),
  summary AS (
    SELECT
      COUNT(*)::int AS total_attempts,
      COUNT(DISTINCT question_id)::int AS unique_questions,
      COUNT(DISTINCT user_id)::int AS unique_users,
      COUNT(*) FILTER (WHERE is_correct)::int AS correct_attempts,
      COUNT(*) FILTER (WHERE NOT is_correct)::int AS wrong_attempts
    FROM attempts
  ),
  by_subject AS (
    SELECT
      COALESCE(NULLIF(TRIM(q.subjects), ''), '(unknown)') AS subject,
      COUNT(*)::int AS attempts,
      COUNT(DISTINCT a.user_id)::int AS users,
      COUNT(DISTINCT a.question_id)::int AS unique_questions,
      ROUND(
        100.0 * AVG(CASE WHEN a.is_correct THEN 1 ELSE 0 END),
        1
      ) AS pct_correct
    FROM attempts a
    JOIN public.ai_generated_questions q ON q.id = a.question_id
    GROUP BY 1
  ),
  most_wrong AS (
    SELECT
      a.question_id,
      q.schema_id,
      COALESCE(NULLIF(TRIM(q.subjects), ''), '(unknown)') AS subject,
      q.primary_tag,
      COUNT(*)::int AS attempts,
      COUNT(*) FILTER (WHERE NOT a.is_correct)::int AS wrong,
      COUNT(DISTINCT a.user_id)::int AS users,
      ROUND(
        100.0 * AVG(CASE WHEN a.is_correct THEN 1 ELSE 0 END),
        1
      ) AS pct_correct
    FROM attempts a
    JOIN public.ai_generated_questions q ON q.id = a.question_id
    WHERE q.status IS DISTINCT FROM 'deleted'
    GROUP BY a.question_id, q.schema_id, q.subjects, q.primary_tag
    HAVING COUNT(*) >= GREATEST(p_min_attempts, 1)
    ORDER BY pct_correct ASC, wrong DESC, attempts DESC
    LIMIT GREATEST(p_wrong_limit, 1)
  )
  SELECT jsonb_build_object(
    'since', p_since,
    'generated_at', NOW(),
    'min_attempts', GREATEST(p_min_attempts, 1),
    'summary', COALESCE((SELECT to_jsonb(s) FROM summary s), '{}'::jsonb),
    'subjects', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(s) ORDER BY s.attempts DESC)
        FROM by_subject s
      ),
      '[]'::jsonb
    ),
    'mostWrong', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(m) ORDER BY m.pct_correct ASC, m.wrong DESC, m.attempts DESC)
        FROM most_wrong m
      ),
      '[]'::jsonb
    )
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_question_bank_stats(timestamptz, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_question_bank_stats(timestamptz, int, int) TO service_role;

COMMENT ON FUNCTION public.admin_question_bank_stats(timestamptz, int, int) IS
  'Admin QB stats: subject popularity, most-wrong questions, unique questions attempted.';
