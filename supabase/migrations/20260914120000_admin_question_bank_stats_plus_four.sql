-- Rank hardest QB questions with Agresti–Coull ("plus four") wrong-rate,
-- and attach per-option answer breakdowns for admin export/detail.
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
      NULLIF(UPPER(TRIM(COALESCE(a.user_answer, ''))), '') AS user_answer,
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
  most_wrong_raw AS (
    SELECT
      a.question_id,
      q.schema_id,
      COALESCE(NULLIF(TRIM(q.subjects), ''), '(unknown)') AS subject,
      q.primary_tag,
      q.correct_option,
      LEFT(COALESCE(q.question_stem, ''), 280) AS stem_preview,
      COUNT(*)::int AS attempts,
      COUNT(*) FILTER (WHERE NOT a.is_correct)::int AS wrong,
      COUNT(*) FILTER (WHERE a.is_correct)::int AS correct,
      COUNT(DISTINCT a.user_id)::int AS users,
      ROUND(
        100.0 * AVG(CASE WHEN a.is_correct THEN 1 ELSE 0 END),
        1
      ) AS pct_correct,
      ROUND(
        100.0 * AVG(CASE WHEN NOT a.is_correct THEN 1 ELSE 0 END),
        1
      ) AS pct_wrong,
      -- Plus-four (Agresti–Coull) estimate of wrong rate: (wrong + 2) / (n + 4)
      ROUND(
        100.0 * ((COUNT(*) FILTER (WHERE NOT a.is_correct)) + 2.0)
          / (COUNT(*) + 4.0),
        2
      ) AS plus_four_wrong_pct
    FROM attempts a
    JOIN public.ai_generated_questions q ON q.id = a.question_id
    WHERE q.status IS DISTINCT FROM 'deleted'
    GROUP BY
      a.question_id,
      q.schema_id,
      q.subjects,
      q.primary_tag,
      q.correct_option,
      q.question_stem
    HAVING COUNT(*) >= GREATEST(p_min_attempts, 1)
  ),
  most_wrong AS (
    SELECT *
    FROM most_wrong_raw
    ORDER BY plus_four_wrong_pct DESC, wrong DESC, attempts DESC
    LIMIT GREATEST(p_wrong_limit, 1)
  ),
  option_counts AS (
    SELECT
      a.question_id,
      a.user_answer AS option_letter,
      COUNT(*)::int AS count
    FROM attempts a
    WHERE a.question_id IN (SELECT question_id FROM most_wrong)
      AND a.user_answer IS NOT NULL
    GROUP BY a.question_id, a.user_answer
  ),
  option_totals AS (
    SELECT question_id, SUM(count)::int AS answered
    FROM option_counts
    GROUP BY question_id
  ),
  option_breakdown AS (
    SELECT
      oc.question_id,
      jsonb_agg(
        jsonb_build_object(
          'option', oc.option_letter,
          'count', oc.count,
          'pct', ROUND(
            100.0 * oc.count / NULLIF(ot.answered, 0),
            1
          )
        )
        ORDER BY oc.count DESC, oc.option_letter
      ) AS options
    FROM option_counts oc
    JOIN option_totals ot ON ot.question_id = oc.question_id
    GROUP BY oc.question_id
  ),
  most_wrong_enriched AS (
    SELECT
      m.question_id,
      m.schema_id,
      m.subject,
      m.primary_tag,
      m.correct_option,
      m.stem_preview,
      m.attempts,
      m.wrong,
      m.correct,
      m.users,
      m.pct_correct,
      m.pct_wrong,
      m.plus_four_wrong_pct,
      COALESCE(ob.options, '[]'::jsonb) AS option_breakdown
    FROM most_wrong m
    LEFT JOIN option_breakdown ob ON ob.question_id = m.question_id
  )
  SELECT jsonb_build_object(
    'since', p_since,
    'generated_at', NOW(),
    'min_attempts', GREATEST(p_min_attempts, 1),
    'ranking', 'plus_four_wrong',
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
        SELECT jsonb_agg(
          to_jsonb(m)
          ORDER BY m.plus_four_wrong_pct DESC, m.wrong DESC, m.attempts DESC
        )
        FROM most_wrong_enriched m
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
  'Admin QB stats: subjects, plus-four hardest questions with option breakdowns.';
