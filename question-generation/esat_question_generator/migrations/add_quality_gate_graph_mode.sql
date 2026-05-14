-- Graph mode extension for quality gate.
-- Run after add_quality_gate.sql (and ideally after add_quality_gate_calibration_graph.sql).

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS quality_gate_graph_mode text
    CHECK (
      quality_gate_graph_mode IS NULL
      OR quality_gate_graph_mode IN ('none', 'candidate', 'missing_expected')
    );

COMMENT ON COLUMN ai_generated_questions.quality_gate_graph_mode IS
  'Graph classification from quality gate: none | candidate | missing_expected';

CREATE INDEX IF NOT EXISTS idx_ai_gen_questions_qg_graph_mode_missing
  ON ai_generated_questions (quality_gate_graph_mode)
  WHERE quality_gate_graph_mode = 'missing_expected';

