-- Extra fields for creative / sourced Fermi rounds (Did you know + editions)

ALTER TABLE fermi_scheduled_questions
  ADD COLUMN IF NOT EXISTS edition_title text,
  ADD COLUMN IF NOT EXISTS theme_hook text,
  ADD COLUMN IF NOT EXISTS show_did_you_know boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS did_you_know text,
  ADD COLUMN IF NOT EXISTS fact_source_url text,
  ADD COLUMN IF NOT EXISTS fact_source_label text;

COMMENT ON COLUMN fermi_scheduled_questions.edition_title IS
  'Optional full-day brand, e.g. Halloween Edition';
COMMENT ON COLUMN fermi_scheduled_questions.show_did_you_know IS
  'When true, reveal a concise Did you know card after the guess';
