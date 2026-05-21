-- Human-review flags after Quality Gate image/SVG diagram backfill.

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS quality_gate_diagram_backfill_kind text,
  ADD COLUMN IF NOT EXISTS quality_gate_diagram_backfill_at timestamptz;

COMMENT ON COLUMN ai_generated_questions.quality_gate_diagram_backfill_kind IS
  'Set when QG backfill merged a diagram: image (Imagen) or svg (inline SVG). Triggers human review.';
COMMENT ON COLUMN ai_generated_questions.quality_gate_diagram_backfill_at IS
  'When diagram backfill completed and human-review flag was applied.';
