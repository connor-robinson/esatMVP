-- Calibration “gold” labels + graph/diagram enrichment candidates (quality gate extension).
-- Run after add_quality_gate.sql.

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS quality_gate_calibration_tier text
    CHECK (
      quality_gate_calibration_tier IS NULL
      OR quality_gate_calibration_tier = 'gold'
    );

COMMENT ON COLUMN ai_generated_questions.quality_gate_calibration_tier IS
  'gold: elite calibration item (~top few %); null otherwise';

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS quality_gate_calibration_notes text;

COMMENT ON COLUMN ai_generated_questions.quality_gate_calibration_notes IS
  'Short model rationale for gold calibration label (also duplicated in quality_gate_payload)';

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS quality_gate_graph_candidate boolean NOT NULL DEFAULT false;

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS quality_gate_graph_notes text;

COMMENT ON COLUMN ai_generated_questions.quality_gate_graph_candidate IS
  'True if item is a good candidate to add SVG graph/diagram with light rewording; human review';

COMMENT ON COLUMN ai_generated_questions.quality_gate_graph_notes IS
  'Model suggestions: rewording, <insert …> placeholders, diagram intent for human SVG work';

CREATE INDEX IF NOT EXISTS idx_ai_gen_questions_qg_calibration
  ON ai_generated_questions (quality_gate_calibration_tier)
  WHERE quality_gate_calibration_tier = 'gold';

CREATE INDEX IF NOT EXISTS idx_ai_gen_questions_qg_graph
  ON ai_generated_questions (quality_gate_graph_candidate)
  WHERE quality_gate_graph_candidate = true;
