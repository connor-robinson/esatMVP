-- Cohort usage dashboard RPC for local Streamlit (service_role only).
-- Returns a JSON snapshot keyed by segment metrics since p_since.

CREATE OR REPLACE FUNCTION public.cohort_usage_dashboard(p_since timestamptz DEFAULT '2026-08-24')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH partner_users AS (
    SELECT DISTINCT e.user_id, p.slug
    FROM partner_entitlements e
    JOIN partners p ON p.id = e.partner_id
    WHERE e.revoked_at IS NULL
  ),
  seg AS (
    SELECT u.id AS user_id,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM partner_users pu
          WHERE pu.user_id = u.id AND pu.slug = 'arkwright-2026'
        ) THEN 'arkwright'
        WHEN EXISTS (
          SELECT 1 FROM partner_users pu
          WHERE pu.user_id = u.id AND pu.slug = 'elephant26'
        ) THEN 'elephant'
        ELSE 'other'
      END AS segment
    FROM auth.users u
  ),
  head AS (
    SELECT s.segment,
      COUNT(*)::int AS users,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM partner_entitlements e
          JOIN partners p ON p.id = e.partner_id
          WHERE e.user_id = s.user_id
            AND e.revoked_at IS NULL
            AND e.activated_at IS NOT NULL
            AND (
              (s.segment = 'arkwright' AND p.slug = 'arkwright-2026')
              OR (s.segment = 'elephant' AND p.slug = 'elephant26')
            )
        )
      )::int AS activated,
      (
        SELECT COUNT(DISTINCT x.user_id)::int
        FROM (
          SELECT user_id FROM question_bank_attempts
            WHERE COALESCE(attempted_at, created_at) >= p_since
          UNION
          SELECT user_id FROM paper_sessions WHERE created_at >= p_since
          UNION
          SELECT user_id FROM drill_sessions WHERE created_at >= p_since
          UNION
          SELECT user_id FROM calibration_attempts WHERE created_at >= p_since
          UNION
          SELECT user_id FROM fermi_daily_sessions WHERE created_at >= p_since
        ) x
        WHERE x.user_id = ANY (ARRAY_AGG(s.user_id))
      ) AS active_in_window
    FROM seg s
    GROUP BY s.segment
  ),
  feat AS (
    SELECT s.segment,
      (SELECT COUNT(*)::int FROM question_bank_attempts q
        WHERE q.user_id = ANY (ARRAY_AGG(s.user_id))
          AND COALESCE(q.attempted_at, q.created_at) >= p_since) AS qb_attempts,
      (SELECT COUNT(DISTINCT q.user_id)::int FROM question_bank_attempts q
        WHERE q.user_id = ANY (ARRAY_AGG(s.user_id))
          AND COALESCE(q.attempted_at, q.created_at) >= p_since) AS qb_users,
      (SELECT COUNT(*)::int FROM paper_sessions p
        WHERE p.user_id = ANY (ARRAY_AGG(s.user_id))
          AND p.created_at >= p_since) AS paper_sessions,
      (SELECT COUNT(DISTINCT p.user_id)::int FROM paper_sessions p
        WHERE p.user_id = ANY (ARRAY_AGG(s.user_id))
          AND p.created_at >= p_since) AS paper_users,
      (SELECT COUNT(*)::int FROM drill_sessions d
        WHERE d.user_id = ANY (ARRAY_AGG(s.user_id))
          AND d.created_at >= p_since) AS drill_sessions,
      (SELECT COUNT(DISTINCT d.user_id)::int FROM drill_sessions d
        WHERE d.user_id = ANY (ARRAY_AGG(s.user_id))
          AND d.created_at >= p_since) AS drill_users,
      (SELECT COUNT(*)::int FROM calibration_attempts c
        WHERE c.user_id = ANY (ARRAY_AGG(s.user_id))
          AND c.created_at >= p_since) AS cal_attempts,
      (SELECT COUNT(DISTINCT c.user_id)::int FROM calibration_attempts c
        WHERE c.user_id = ANY (ARRAY_AGG(s.user_id))
          AND c.created_at >= p_since) AS cal_users,
      (SELECT COUNT(*)::int FROM fermi_daily_sessions f
        WHERE f.user_id = ANY (ARRAY_AGG(s.user_id))
          AND f.created_at >= p_since) AS fermi_sessions,
      (SELECT COUNT(DISTINCT f.user_id)::int FROM fermi_daily_sessions f
        WHERE f.user_id = ANY (ARRAY_AGG(s.user_id))
          AND f.created_at >= p_since) AS fermi_users,
      (SELECT COUNT(*)::int FROM app_bug_reports b
        WHERE b.user_id = ANY (ARRAY_AGG(s.user_id))) AS bug_reports,
      (SELECT COUNT(*)::int FROM support_requests r
        WHERE r.user_id = ANY (ARRAY_AGG(s.user_id))) AS support_requests
    FROM seg s
    GROUP BY s.segment
  ),
  seats AS (
    SELECT p.slug, p.display_name,
      (SELECT COUNT(*)::int FROM partner_entitlements e
        WHERE e.partner_id = p.id AND e.revoked_at IS NULL) AS entitled,
      (SELECT COUNT(*)::int FROM partner_entitlements e
        WHERE e.partner_id = p.id AND e.revoked_at IS NULL
          AND e.activated_at IS NOT NULL) AS activated,
      (SELECT COALESCE(SUM(c.redemption_count), 0)::int
        FROM partner_cohort_codes c WHERE c.partner_id = p.id) AS cohort_used,
      (SELECT COALESCE(SUM(c.max_redemptions), 0)::int
        FROM partner_cohort_codes c WHERE c.partner_id = p.id) AS cohort_cap
    FROM partners p
    WHERE p.slug IN ('arkwright-2026', 'elephant26', 'abingdon26')
  ),
  prefs AS (
    SELECT s.segment, subj AS subject, COUNT(*)::int AS n
    FROM seg s
    JOIN profiles pr ON pr.id = s.user_id
    CROSS JOIN LATERAL UNNEST(COALESCE(pr.esat_subjects, ARRAY[]::text[])) AS subj
    WHERE subj IS NOT NULL AND subj <> ''
    GROUP BY 1, 2
  ),
  pract AS (
    SELECT s.segment, q.subjects AS subject, COUNT(*)::int AS attempts
    FROM question_bank_attempts a
    JOIN seg s ON s.user_id = a.user_id
    JOIN ai_generated_questions q ON q.id = a.question_id
    WHERE COALESCE(a.attempted_at, a.created_at) >= p_since
      AND q.subjects IS NOT NULL AND q.subjects <> ''
    GROUP BY 1, 2
  ),
  mm AS (
    SELECT s.segment, d.topic_id,
      COUNT(*)::int AS sessions,
      COUNT(DISTINCT d.user_id)::int AS users,
      COALESCE(SUM(d.question_count), 0)::bigint AS questions
    FROM drill_sessions d
    JOIN seg s ON s.user_id = d.user_id
    WHERE d.created_at >= p_since
    GROUP BY 1, 2
  ),
  daily AS (
    SELECT s.segment,
      date_trunc('day', COALESCE(q.attempted_at, q.created_at))::date AS day,
      COUNT(*)::int AS qb_attempts
    FROM question_bank_attempts q
    JOIN seg s ON s.user_id = q.user_id
    WHERE COALESCE(q.attempted_at, q.created_at) >= p_since
    GROUP BY 1, 2
  ),
  papers AS (
    SELECT s.segment, p.paper_name,
      COUNT(*)::int AS sessions,
      COUNT(DISTINCT p.user_id)::int AS users
    FROM paper_sessions p
    JOIN seg s ON s.user_id = p.user_id
    WHERE p.created_at >= p_since
    GROUP BY 1, 2
  ),
  exam AS (
    SELECT s.segment, COALESCE(pr.exam_preference, '(none)') AS exam, COUNT(*)::int AS n
    FROM seg s
    LEFT JOIN profiles pr ON pr.id = s.user_id
    GROUP BY 1, 2
  ),
  joins AS (
    SELECT date_trunc('week', e.created_at)::date AS week,
      p.slug,
      COUNT(*)::int AS joins
    FROM partner_entitlements e
    JOIN partners p ON p.id = e.partner_id
    WHERE e.revoked_at IS NULL
    GROUP BY 1, 2
  )
  SELECT jsonb_build_object(
    'since', p_since,
    'generated_at', NOW(),
    'head', COALESCE((SELECT jsonb_agg(to_jsonb(h) ORDER BY h.segment) FROM head h), '[]'::jsonb),
    'feat', COALESCE((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.segment) FROM feat f), '[]'::jsonb),
    'seats', COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.entitled DESC) FROM seats s), '[]'::jsonb),
    'prefs', COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.segment, p.n DESC) FROM prefs p), '[]'::jsonb),
    'pract', COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.segment, p.attempts DESC) FROM pract p), '[]'::jsonb),
    'mm', COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.segment, m.sessions DESC) FROM mm m), '[]'::jsonb),
    'daily', COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.day, d.segment) FROM daily d), '[]'::jsonb),
    'papers', COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.segment, p.sessions DESC) FROM papers p), '[]'::jsonb),
    'exam', COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.segment, e.n DESC) FROM exam e), '[]'::jsonb),
    'joins', COALESCE((SELECT jsonb_agg(to_jsonb(j) ORDER BY j.week, j.slug) FROM joins j), '[]'::jsonb)
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.cohort_usage_dashboard(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cohort_usage_dashboard(timestamptz) TO service_role;
