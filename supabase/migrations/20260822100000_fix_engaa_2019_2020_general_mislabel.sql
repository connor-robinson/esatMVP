-- ENGAA 2019–2020: replace mislabeled "General" rows (Section 1A data) with
-- correct Section 1A / Section 1B parts on the Section 1 conversion table.
--
-- Scope: ENGAA 2019 and 2020 only.
-- Idempotent: skips a year when General is already absent and S1 carries 1A/1B.
-- Aborts the whole transaction if any pre-change assertion fails.

DO $$
DECLARE
  yr integer;
  s1_paper_id integer;
  s2_paper_id integer;
  s1_table_id integer;
  s2_table_id integer;
  s1_table_count integer;
  s2_table_count integer;
  general_count integer;
  s1a_on_s1 integer;
  s1b_on_s1 integer;
  s1a_on_s2 integer;
  s1b_on_s2 integer;
  mismatch_count integer;
  bad_raw_count integer;
  needs_metadata_refresh boolean := false;
BEGIN
  ALTER TABLE public.conversion_rows DISABLE TRIGGER protect_conversion_rows_delete;
  ALTER TABLE public.conversion_rows DISABLE TRIGGER protect_conversion_rows_update;
  ALTER TABLE public.conversion_tables DISABLE TRIGGER protect_conversion_tables_update;
  ALTER TABLE public.conversion_tables DISABLE TRIGGER set_timestamp_conversion_tables;

  FOREACH yr IN ARRAY ARRAY[2019, 2020]
  LOOP
    -- Exactly one Section 1 paper with a conversion table for this year.
    SELECT COUNT(DISTINCT ct.id), MIN(ct.id), MIN(p.id)
      INTO s1_table_count, s1_table_id, s1_paper_id
    FROM public.conversion_tables ct
    JOIN public.papers p ON p.id = ct.paper_id
    WHERE p.exam_name = 'ENGAA'
      AND p.exam_year = yr
      AND p.paper_name = 'Section 1';

    IF s1_table_count IS DISTINCT FROM 1 THEN
      RAISE EXCEPTION 'ENGAA % Section 1: expected exactly 1 conversion table, found %',
        yr, COALESCE(s1_table_count, 0);
    END IF;

    -- Exactly one Section 2 paper with a conversion table for this year.
    SELECT COUNT(DISTINCT ct.id), MIN(ct.id), MIN(p.id)
      INTO s2_table_count, s2_table_id, s2_paper_id
    FROM public.conversion_tables ct
    JOIN public.papers p ON p.id = ct.paper_id
    WHERE p.exam_name = 'ENGAA'
      AND p.exam_year = yr
      AND p.paper_name = 'Section 2';

    IF s2_table_count IS DISTINCT FROM 1 THEN
      RAISE EXCEPTION 'ENGAA % Section 2: expected exactly 1 conversion table, found %',
        yr, COALESCE(s2_table_count, 0);
    END IF;

    SELECT COUNT(*) INTO general_count
    FROM public.conversion_rows
    WHERE table_id = s1_table_id
      AND part_name = 'General';

    SELECT COUNT(*) INTO s1a_on_s1
    FROM public.conversion_rows
    WHERE table_id = s1_table_id
      AND part_name = 'Section 1A';

    SELECT COUNT(*) INTO s1b_on_s1
    FROM public.conversion_rows
    WHERE table_id = s1_table_id
      AND part_name = 'Section 1B';

    -- Already migrated: no General, S1 already has 1A/1B with full ranges.
    IF general_count = 0 THEN
      IF s1a_on_s1 = 21 AND s1b_on_s1 = 21 THEN
        CONTINUE;
      END IF;
      RAISE EXCEPTION
        'ENGAA % Section 1: General absent but Section 1A/1B not in expected post-migration state (1A=%, 1B=%)',
        yr, s1a_on_s1, s1b_on_s1;
    END IF;

    -- Pre-change assertions (abort before mutating anything).
    IF general_count <> 21 THEN
      RAISE EXCEPTION 'ENGAA % Section 1: General must have exactly 21 rows, found %',
        yr, general_count;
    END IF;

    SELECT COUNT(*) INTO s1a_on_s2
    FROM public.conversion_rows
    WHERE table_id = s2_table_id
      AND part_name = 'Section 1A';

    SELECT COUNT(*) INTO s1b_on_s2
    FROM public.conversion_rows
    WHERE table_id = s2_table_id
      AND part_name = 'Section 1B';

    IF s1a_on_s2 <> 21 OR s1b_on_s2 <> 21 THEN
      RAISE EXCEPTION
        'ENGAA % Section 2: Section 1A/1B must each have 21 rows (1A=%, 1B=%)',
        yr, s1a_on_s2, s1b_on_s2;
    END IF;

    SELECT COUNT(*) INTO bad_raw_count
    FROM public.conversion_rows
    WHERE table_id = s2_table_id
      AND part_name IN ('Section 1A', 'Section 1B')
      AND raw_score NOT BETWEEN 0 AND 20;

    IF bad_raw_count > 0 THEN
      RAISE EXCEPTION 'ENGAA % Section 2: Section 1A/1B raw marks must be 0–20', yr;
    END IF;

    SELECT COUNT(*) INTO mismatch_count
    FROM public.conversion_rows g
    JOIN public.conversion_rows a
      ON a.table_id = s2_table_id
     AND a.part_name = 'Section 1A'
     AND a.raw_score = g.raw_score
    WHERE g.table_id = s1_table_id
      AND g.part_name = 'General'
      AND g.scaled_score IS DISTINCT FROM a.scaled_score;

    IF mismatch_count > 0 THEN
      RAISE EXCEPTION
        'ENGAA % Section 1: General does not match Section 1A on Section 2 table (% mismatches)',
        yr, mismatch_count;
    END IF;

    -- Upsert verified Section 1A / Section 1B onto Section 1 before deleting General.
    DELETE FROM public.conversion_rows
    WHERE table_id = s1_table_id
      AND part_name IN ('Section 1A', 'Section 1B');

    INSERT INTO public.conversion_rows (table_id, part_name, raw_score, scaled_score)
    SELECT s1_table_id, cr.part_name, cr.raw_score, cr.scaled_score
    FROM public.conversion_rows cr
    WHERE cr.table_id = s2_table_id
      AND cr.part_name IN ('Section 1A', 'Section 1B');

    DELETE FROM public.conversion_rows
    WHERE table_id = s1_table_id
      AND part_name = 'General';

    needs_metadata_refresh := true;
  END LOOP;

  IF needs_metadata_refresh THEN
    UPDATE public.conversion_tables ct
    SET format_type = 'standard_mcq',
        confidence = 'high',
        reliability_note = NULL
    FROM public.papers p
    WHERE ct.paper_id = p.id
      AND p.exam_name = 'ENGAA'
      AND p.exam_year IN (2019, 2020)
      AND p.paper_name = 'Section 1';
  END IF;

  ALTER TABLE public.conversion_rows ENABLE TRIGGER protect_conversion_rows_delete;
  ALTER TABLE public.conversion_rows ENABLE TRIGGER protect_conversion_rows_update;
  ALTER TABLE public.conversion_tables ENABLE TRIGGER protect_conversion_tables_update;
  ALTER TABLE public.conversion_tables ENABLE TRIGGER set_timestamp_conversion_tables;
END $$;
