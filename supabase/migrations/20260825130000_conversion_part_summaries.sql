-- Aggregated conversion-row parts for the published-tables catalog.
-- Avoids scanning every raw/scaled row into the app on each page load.

CREATE OR REPLACE FUNCTION public.conversion_part_summaries(p_table_ids integer[])
RETURNS TABLE (
  table_id integer,
  part_name text,
  max_raw integer,
  row_count bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    cr.table_id,
    cr.part_name,
    MAX(cr.raw_score)::integer AS max_raw,
    COUNT(*)::bigint AS row_count
  FROM public.conversion_rows cr
  WHERE cr.table_id = ANY (p_table_ids)
  GROUP BY cr.table_id, cr.part_name;
$$;

REVOKE ALL ON FUNCTION public.conversion_part_summaries(integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.conversion_part_summaries(integer[]) TO anon;
GRANT EXECUTE ON FUNCTION public.conversion_part_summaries(integer[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.conversion_part_summaries(integer[]) TO service_role;

COMMENT ON FUNCTION public.conversion_part_summaries(integer[]) IS
  'Returns distinct conversion parts with max raw mark and row count for catalog listing.';
