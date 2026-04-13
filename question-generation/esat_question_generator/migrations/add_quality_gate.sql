-- ESAT quality gate: LLM rubric assessments on ai_generated_questions.
-- Run in Supabase SQL editor (or via migration tooling) on the project that owns ai_generated_questions.

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS quality_gate_assessed_at timestamptz;

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS quality_gate_verdict text
    CHECK (
      quality_gate_verdict IS NULL
      OR quality_gate_verdict IN ('Pass', 'Minor', 'Major')
    );

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS quality_gate_action text
    CHECK (
      quality_gate_action IS NULL
      OR quality_gate_action IN ('approve', 'human_review', 'regenerate', 'delete')
    );

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS quality_gate_reason text;

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS quality_gate_payload jsonb;

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS quality_gate_job_id text;

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS quality_gate_model text;

COMMENT ON COLUMN ai_generated_questions.quality_gate_assessed_at IS 'When the quality gate LLM last assessed this row';
COMMENT ON COLUMN ai_generated_questions.quality_gate_verdict IS 'Pass | Minor | Major';
COMMENT ON COLUMN ai_generated_questions.quality_gate_action IS 'Effective action after safety rules (may differ from raw LLM on low confidence)';
COMMENT ON COLUMN ai_generated_questions.quality_gate_reason IS 'Short model reasoning for operators';
COMMENT ON COLUMN ai_generated_questions.quality_gate_payload IS 'Full structured assessment JSON';
COMMENT ON COLUMN ai_generated_questions.quality_gate_job_id IS 'Run id grouping rows from one operator job';
COMMENT ON COLUMN ai_generated_questions.quality_gate_model IS 'Gemini model id used for assessment';

CREATE INDEX IF NOT EXISTS idx_ai_gen_questions_quality_gate_job
  ON ai_generated_questions (quality_gate_job_id)
  WHERE quality_gate_job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_gen_questions_quality_gate_verdict
  ON ai_generated_questions (quality_gate_verdict)
  WHERE quality_gate_verdict IS NOT NULL;

CREATE TABLE IF NOT EXISTS quality_gate_jobs (
  id text PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  stopped_at timestamptz,
  filters jsonb,
  stats jsonb,
  notes text
);

COMMENT ON TABLE quality_gate_jobs IS 'Optional metadata for quality gate runs (counts, filters)';
