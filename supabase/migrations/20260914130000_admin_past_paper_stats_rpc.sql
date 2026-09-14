-- Admin past-paper aggregates from paper_sessions (unnest answers) + questions.
CREATE OR REPLACE FUNCTION public.admin_past_paper_stats(
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
  WITH sessions AS (
    SELECT
      s.id,
      s.user_id,
      s.paper_id,
      s.paper_name,
      s.paper_variant,
      s.selected_sections,
      s.question_order,
      s.answers,
      s.correct_flags,
      s.score,
      s.ended_at,
      COALESCE(s.ended_at, s.created_at) AS at
    FROM public.paper_sessions s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE (p.email IS NULL OR p.email NOT ILIKE '%@seed.esatcamp.local')
      AND (p_since IS NULL OR COALESCE(s.ended_at, s.created_at) >= p_since)
  ),
  summary AS (
    SELECT
      COUNT(*)::int AS total_sessions,
      COUNT(*) FILTER (WHERE ended_at IS NOT NULL)::int AS completed_sessions,
      COUNT(DISTINCT user_id)::int AS unique_users,
      COALESCE(
        SUM(NULLIF((score->>'correct')::numeric, 0)),
        0
      )::numeric AS score_correct_sum,
      COALESCE(
        SUM(NULLIF((score->>'total')::numeric, 0)),
        0
      )::numeric AS score_total_sum,
      COALESCE(
        ROUND(
          AVG(
            CASE
              WHEN ended_at IS NOT NULL
                AND NULLIF((score->>'total')::numeric, 0) IS NOT NULL
              THEN 100.0 * (score->>'correct')::numeric
                / NULLIF((score->>'total')::numeric, 0)
              ELSE NULL
            END
          ),
          1
        ),
        0
      ) AS avg_pct_correct
    FROM sessions
  ),
  by_paper AS (
    SELECT
      s.paper_id,
      COALESCE(NULLIF(TRIM(s.paper_name), ''), '(unknown)') AS exam_name,
      COALESCE(NULLIF(TRIM(s.paper_variant), ''), '(unknown)') AS paper_variant,
      COUNT(*)::int AS sessions,
      COUNT(*) FILTER (WHERE s.ended_at IS NOT NULL)::int AS completed,
      COUNT(DISTINCT s.user_id)::int AS users,
      ROUND(
        AVG(
          CASE
            WHEN s.ended_at IS NOT NULL
              AND NULLIF((s.score->>'total')::numeric, 0) IS NOT NULL
            THEN 100.0 * (s.score->>'correct')::numeric
              / NULLIF((s.score->>'total')::numeric, 0)
            ELSE NULL
          END
        ),
        1
      ) AS avg_pct_correct
    FROM sessions s
    GROUP BY s.paper_id, s.paper_name, s.paper_variant
  ),
  section_rows AS (
    SELECT
      s.user_id,
      s.id AS session_id,
      COALESCE(NULLIF(TRIM(sec), ''), '(unknown)') AS section
    FROM sessions s
    CROSS JOIN LATERAL unnest(COALESCE(s.selected_sections, ARRAY[]::text[])) AS sec
  ),
  by_section AS (
    SELECT
      section,
      COUNT(*)::int AS sessions,
      COUNT(DISTINCT user_id)::int AS users
    FROM section_rows
    GROUP BY section
  ),
  attempt_rows AS (
    SELECT
      s.user_id,
      s.id AS session_id,
      s.paper_id,
      s.at,
      q.id AS question_id,
      q.question_number,
      COALESCE(NULLIF(TRIM(q.part_name), ''), COALESCE(NULLIF(TRIM(q.part_letter), ''), '(unknown)')) AS section,
      COALESCE(NULLIF(TRIM(q.exam_name), ''), COALESCE(NULLIF(TRIM(s.paper_name), ''), '(unknown)')) AS exam_name,
      q.exam_year,
      COALESCE(NULLIF(TRIM(q.paper_name), ''), COALESCE(NULLIF(TRIM(s.paper_variant), ''), '(unknown)')) AS paper_label,
      UPPER(TRIM(COALESCE(q.answer_letter, ''))) AS correct_option,
      NULLIF(UPPER(TRIM(COALESCE(ans.elem->>'choice', ''))), '') AS choice,
      CASE
        WHEN cardinality(COALESCE(s.correct_flags, ARRAY[]::boolean[])) >= ans.ord
          AND s.correct_flags[ans.ord] IS TRUE THEN TRUE
        WHEN cardinality(COALESCE(s.correct_flags, ARRAY[]::boolean[])) >= ans.ord
          AND s.correct_flags[ans.ord] IS FALSE THEN FALSE
        WHEN NULLIF(UPPER(TRIM(COALESCE(ans.elem->>'choice', ''))), '') IS NOT NULL
          AND NULLIF(UPPER(TRIM(COALESCE(q.answer_letter, ''))), '') IS NOT NULL
          THEN UPPER(TRIM(ans.elem->>'choice')) = UPPER(TRIM(q.answer_letter))
        ELSE NULL
      END AS is_correct
    FROM sessions s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.answers, '[]'::jsonb))
      WITH ORDINALITY AS ans(elem, ord)
    INNER JOIN LATERAL (
      SELECT
        CASE
          WHEN s.question_order IS NOT NULL
            AND cardinality(s.question_order) >= ans.ord
          THEN s.question_order[ans.ord]
          ELSE NULL
        END AS qnum
    ) qo ON qo.qnum IS NOT NULL
    JOIN public.questions q
      ON q.paper_id = s.paper_id
     AND q.question_number = qo.qnum
    WHERE s.paper_id IS NOT NULL
      AND s.ended_at IS NOT NULL
  ),
  answered AS (
    SELECT *
    FROM attempt_rows
    WHERE choice IS NOT NULL
      AND is_correct IS NOT NULL
  ),
  answer_summary AS (
    SELECT
      COUNT(*)::int AS answered_attempts,
      COUNT(DISTINCT question_id)::int AS unique_questions,
      COUNT(*) FILTER (WHERE is_correct)::int AS correct_attempts,
      COUNT(*) FILTER (WHERE NOT is_correct)::int AS wrong_attempts
    FROM answered
  ),
  most_wrong_raw AS (
    SELECT
      a.question_id,
      a.exam_name,
      a.exam_year,
      a.paper_label,
      a.section,
      a.question_number,
      a.correct_option,
      COUNT(*)::int AS attempts,
      COUNT(*) FILTER (WHERE NOT a.is_correct)::int AS wrong,
      COUNT(*) FILTER (WHERE a.is_correct)::int AS correct,
      COUNT(DISTINCT a.user_id)::int AS users,
      ROUND(100.0 * AVG(CASE WHEN a.is_correct THEN 1 ELSE 0 END), 1) AS pct_correct,
      ROUND(100.0 * AVG(CASE WHEN NOT a.is_correct THEN 1 ELSE 0 END), 1) AS pct_wrong,
      ROUND(
        100.0 * ((COUNT(*) FILTER (WHERE NOT a.is_correct)) + 2.0)
          / (COUNT(*) + 4.0),
        2
      ) AS plus_four_wrong_pct
    FROM answered a
    GROUP BY
      a.question_id,
      a.exam_name,
      a.exam_year,
      a.paper_label,
      a.section,
      a.question_number,
      a.correct_option
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
      a.choice AS option_letter,
      COUNT(*)::int AS count
    FROM answered a
    WHERE a.question_id IN (SELECT question_id FROM most_wrong)
    GROUP BY a.question_id, a.choice
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
          'pct', ROUND(100.0 * oc.count / NULLIF(ot.answered, 0), 1)
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
      m.exam_name,
      m.exam_year,
      m.paper_label,
      m.section,
      m.question_number,
      m.correct_option,
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
    'summary', COALESCE(
      (
        SELECT to_jsonb(s) || to_jsonb(a)
        FROM summary s, answer_summary a
      ),
      '{}'::jsonb
    ),
    'papers', COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(p)
          ORDER BY p.sessions DESC, p.users DESC
        )
        FROM by_paper p
      ),
      '[]'::jsonb
    ),
    'sections', COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(s)
          ORDER BY s.sessions DESC, s.users DESC
        )
        FROM by_section s
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

REVOKE ALL ON FUNCTION public.admin_past_paper_stats(timestamptz, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_past_paper_stats(timestamptz, int, int) TO service_role;

COMMENT ON FUNCTION public.admin_past_paper_stats(timestamptz, int, int) IS
  'Admin past-paper stats: papers, sections, plus-four hardest questions with option breakdowns.';
