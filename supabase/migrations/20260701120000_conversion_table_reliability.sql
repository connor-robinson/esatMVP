-- Reliability metadata for conversion_tables.
--
-- The score converter surfaces a confidence indicator per paper. Most official
-- raw→scaled tables are standard discrete-MCQ formats and are directly
-- comparable; a handful of legacy sections used written / scenario-linked
-- formats (or transitional single-aggregate scaling) whose raw-mark base is not
-- comparable to modern ESAT modules, and some records are known to be
-- incomplete. Those are flagged here so the UI can warn rather than silently
-- present a misleading result.

ALTER TABLE public.conversion_tables
  ADD COLUMN IF NOT EXISTS format_type text NOT NULL DEFAULT 'standard_mcq',
  ADD COLUMN IF NOT EXISTS confidence text NOT NULL DEFAULT 'high',
  ADD COLUMN IF NOT EXISTS reliability_note text;

-- Guard the allowed values without blocking future inserts.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversion_tables_format_type_check'
  ) THEN
    ALTER TABLE public.conversion_tables
      ADD CONSTRAINT conversion_tables_format_type_check
      CHECK (format_type IN ('standard_mcq', 'transitional', 'non_standard_written', 'no_data'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversion_tables_confidence_check'
  ) THEN
    ALTER TABLE public.conversion_tables
      ADD CONSTRAINT conversion_tables_confidence_check
      CHECK (confidence IN ('high', 'low', 'unavailable'));
  END IF;
END$$;

-- conversion_tables carries protective triggers that block all row UPDATEs.
-- Disable them only for this backfill transaction, then restore.
ALTER TABLE public.conversion_tables DISABLE TRIGGER protect_conversion_tables_update;
ALTER TABLE public.conversion_tables DISABLE TRIGGER set_timestamp_conversion_tables;

-- Baseline: everything standard / high (explicit, in case defaults change later).
UPDATE public.conversion_tables SET format_type = 'standard_mcq', confidence = 'high'
WHERE format_type IS NULL OR confidence IS NULL;

-- Legacy written / scenario-linked Section 2 formats: non-comparable raw base.
-- (Defensive: these rows may not exist yet in every environment.)
UPDATE public.conversion_tables ct
SET format_type = 'non_standard_written',
    confidence = 'low',
    reliability_note = 'This sitting''s Section 2 used a written / scenario-linked format whose raw-mark base is not directly comparable to a standard discrete-MCQ ESAT module. Treat the scaled figure as a rough proxy only.'
FROM public.papers p
WHERE ct.paper_id = p.id
  AND p.paper_name = 'Section 2'
  AND (
    (p.exam_name = 'ENGAA' AND p.exam_year BETWEEN 2016 AND 2018)
    OR (p.exam_name = 'NSAA' AND p.exam_year BETWEEN 2016 AND 2019)
  );

-- ENGAA 2019 Section 2: sources disagree on the exact MCQ cutover year — flag
-- as transitional so the result is clearly caveated.
UPDATE public.conversion_tables ct
SET format_type = 'transitional',
    confidence = 'low',
    reliability_note = 'ENGAA''s move to a fully standard Section 2 MCQ format around this year is ambiguous in public sources — treat this conversion as transitional / approximate.'
FROM public.papers p
WHERE ct.paper_id = p.id
  AND p.exam_name = 'ENGAA'
  AND p.exam_year = 2019
  AND p.paper_name = 'Section 2';

-- ENGAA 2019–2020 Section 1 used a single aggregate ("General") scaling rather
-- than the later split Section 1A / 1B — transitional.
UPDATE public.conversion_tables ct
SET format_type = 'transitional',
    confidence = 'low',
    reliability_note = 'This sitting scaled Section 1 as a single aggregate rather than the later split parts, so a per-part comparison is approximate.'
FROM public.papers p
WHERE ct.paper_id = p.id
  AND p.exam_name = 'ENGAA'
  AND p.exam_year IN (2019, 2020)
  AND p.paper_name = 'Section 1';

-- TMUA 2023: our stored raw→scaled records for this cycle are known to be
-- incomplete. Flag as low confidence so the UI caveats the result.
UPDATE public.conversion_tables ct
SET confidence = 'low',
    reliability_note = 'Our stored 2023 TMUA conversion data is incomplete — the raw→scaled result for this sitting should be treated as approximate.'
FROM public.papers p
WHERE ct.paper_id = p.id
  AND p.exam_name = 'TMUA'
  AND p.exam_year = 2023;

-- Restore the protective triggers.
ALTER TABLE public.conversion_tables ENABLE TRIGGER protect_conversion_tables_update;
ALTER TABLE public.conversion_tables ENABLE TRIGGER set_timestamp_conversion_tables;

COMMENT ON COLUMN public.conversion_tables.format_type IS 'standard_mcq | transitional | non_standard_written | no_data — describes comparability of the raw-mark base.';
COMMENT ON COLUMN public.conversion_tables.confidence IS 'high | low | unavailable — surfaced by the score converter as a confidence indicator.';
COMMENT ON COLUMN public.conversion_tables.reliability_note IS 'Human-readable caveat shown when confidence is not high.';
