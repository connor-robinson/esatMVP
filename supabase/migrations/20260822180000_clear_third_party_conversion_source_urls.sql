-- Remove third-party source PDF URLs from conversion tables.
-- ESAT CAMP serves branded PDFs from /downloads/conversion-tables/ instead.

BEGIN;

ALTER TABLE public.conversion_tables DISABLE TRIGGER protect_conversion_tables_update;
ALTER TABLE public.conversion_tables DISABLE TRIGGER set_timestamp_conversion_tables;

UPDATE public.conversion_tables
SET source_pdf_url = NULL
WHERE source_pdf_url IS NOT NULL
  AND (
    source_pdf_url ILIKE '%website-files.com%'
    OR source_pdf_url ILIKE '%vantageadmissions%'
    OR source_pdf_url ILIKE '%whatdotheyknow.com%'
  );

ALTER TABLE public.conversion_tables ENABLE TRIGGER protect_conversion_tables_update;
ALTER TABLE public.conversion_tables ENABLE TRIGGER set_timestamp_conversion_tables;

COMMIT;
