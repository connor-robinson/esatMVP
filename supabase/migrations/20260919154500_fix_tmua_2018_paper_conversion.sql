-- Fix TMUA 2018 Paper 1 / Paper 2 conversion curves.
--
-- Bug: stored Paper 1 matched the official Paper 2 curve (raw 13 -> 7.7
-- instead of 6.4). Stored Paper 2 was Overall shifted by +20. Overall was
-- already correct.
--
-- Source: official October 2018 grade conversion
-- https://nextstepmaths.com/downloads/tmua-answer-keys/tmua-2018.pdf
--
-- Idempotent: replaces Paper 1 / Paper 2 / Overall rows on every TMUA 2018
-- conversion_tables entry.

DO $$
DECLARE
  table_ids integer[];
  table_count integer;
  p1_13 numeric;
  p2_13 numeric;
BEGIN
  ALTER TABLE public.conversion_rows DISABLE TRIGGER protect_conversion_rows_delete;
  ALTER TABLE public.conversion_rows DISABLE TRIGGER protect_conversion_rows_update;
  ALTER TABLE public.conversion_tables DISABLE TRIGGER protect_conversion_tables_update;
  ALTER TABLE public.conversion_tables DISABLE TRIGGER set_timestamp_conversion_tables;

  SELECT array_agg(ct.id ORDER BY ct.id), COUNT(*)
    INTO table_ids, table_count
  FROM public.conversion_tables ct
  JOIN public.papers p ON p.id = ct.paper_id
  WHERE p.exam_name = 'TMUA'
    AND p.exam_year = 2018;

  IF table_count IS NULL OR table_count < 1 THEN
    RAISE EXCEPTION 'TMUA 2018: expected at least 1 conversion table, found %',
      COALESCE(table_count, 0);
  END IF;

  DELETE FROM public.conversion_rows
  WHERE table_id = ANY(table_ids);

  -- Paper 1 (raw 0-20)
  INSERT INTO public.conversion_rows (table_id, part_name, raw_score, scaled_score)
  SELECT tid, 'Paper 1', raw, scaled
  FROM unnest(table_ids) AS tid
  CROSS JOIN (
    VALUES
      (0, 1.0), (1, 1.0), (2, 1.0), (3, 1.0), (4, 1.0),
      (5, 1.7), (6, 2.4), (7, 3.0), (8, 3.6), (9, 4.1),
      (10, 4.7), (11, 5.3), (12, 5.8), (13, 6.4), (14, 7.0),
      (15, 7.7), (16, 8.5), (17, 9.0), (18, 9.0), (19, 9.0), (20, 9.0)
  ) AS v(raw, scaled);

  -- Paper 2 (raw 0-20)
  INSERT INTO public.conversion_rows (table_id, part_name, raw_score, scaled_score)
  SELECT tid, 'Paper 2', raw, scaled
  FROM unnest(table_ids) AS tid
  CROSS JOIN (
    VALUES
      (0, 1.0), (1, 1.0), (2, 1.0), (3, 1.2), (4, 2.2),
      (5, 3.0), (6, 3.6), (7, 4.3), (8, 4.9), (9, 5.5),
      (10, 6.0), (11, 6.5), (12, 7.1), (13, 7.7), (14, 8.3),
      (15, 9.0), (16, 9.0), (17, 9.0), (18, 9.0), (19, 9.0), (20, 9.0)
  ) AS v(raw, scaled);

  -- Overall (raw 0-40) — already correct; re-insert for a clean full table
  INSERT INTO public.conversion_rows (table_id, part_name, raw_score, scaled_score)
  SELECT tid, 'Overall', raw, scaled
  FROM unnest(table_ids) AS tid
  CROSS JOIN (
    VALUES
      (0, 1.0), (1, 1.0), (2, 1.0), (3, 1.0), (4, 1.0),
      (5, 1.0), (6, 1.0), (7, 1.0), (8, 1.5), (9, 1.9),
      (10, 2.3), (11, 2.6), (12, 3.0), (13, 3.3), (14, 3.6),
      (15, 3.9), (16, 4.2), (17, 4.5), (18, 4.8), (19, 5.1),
      (20, 5.4), (21, 5.6), (22, 5.9), (23, 6.2), (24, 6.5),
      (25, 6.8), (26, 7.1), (27, 7.4), (28, 7.7), (29, 8.0),
      (30, 8.4), (31, 8.8), (32, 9.0), (33, 9.0), (34, 9.0),
      (35, 9.0), (36, 9.0), (37, 9.0), (38, 9.0), (39, 9.0), (40, 9.0)
  ) AS v(raw, scaled);

  SELECT scaled_score INTO p1_13
  FROM public.conversion_rows
  WHERE table_id = table_ids[1]
    AND part_name = 'Paper 1'
    AND raw_score = 13;

  SELECT scaled_score INTO p2_13
  FROM public.conversion_rows
  WHERE table_id = table_ids[1]
    AND part_name = 'Paper 2'
    AND raw_score = 13;

  IF p1_13 IS DISTINCT FROM 6.4 THEN
    RAISE EXCEPTION 'TMUA 2018 Paper 1 raw 13 expected 6.4, got %', p1_13;
  END IF;
  IF p2_13 IS DISTINCT FROM 7.7 THEN
    RAISE EXCEPTION 'TMUA 2018 Paper 2 raw 13 expected 7.7, got %', p2_13;
  END IF;

  UPDATE public.conversion_tables
  SET confidence = 'high',
      format_type = 'standard_mcq',
      reliability_note = null,
      source_pdf_url = coalesce(
        source_pdf_url,
        'https://nextstepmaths.com/downloads/tmua-answer-keys/tmua-2018.pdf'
      )
  WHERE id = ANY(table_ids);

  ALTER TABLE public.conversion_rows ENABLE TRIGGER protect_conversion_rows_delete;
  ALTER TABLE public.conversion_rows ENABLE TRIGGER protect_conversion_rows_update;
  ALTER TABLE public.conversion_tables ENABLE TRIGGER protect_conversion_tables_update;
  ALTER TABLE public.conversion_tables ENABLE TRIGGER set_timestamp_conversion_tables;
END $$;
