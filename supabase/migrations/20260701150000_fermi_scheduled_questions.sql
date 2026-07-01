-- Scheduled FermiGuessr questions (batch 01: 2026-07-01 .. 2026-07-10)
-- Answers live here only — not in client bundles or /public.

CREATE TABLE IF NOT EXISTS fermi_scheduled_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_item_id integer NOT NULL UNIQUE,
  scheduled_date date NOT NULL,
  question text NOT NULL,
  answer double precision NOT NULL CHECK (answer > 0),
  unit text,
  category text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('standard', 'surprising', 'hard')),
  is_exact boolean NOT NULL DEFAULT false,
  source_url text,
  source_note text,
  is_seasonal boolean NOT NULL DEFAULT false,
  seasonal_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fermi_scheduled_questions_date
  ON fermi_scheduled_questions (scheduled_date, batch_item_id);

ALTER TABLE fermi_scheduled_questions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE fermi_scheduled_questions IS
  'Curated daily FermiGuessr questions; answers server-only via API routes';
