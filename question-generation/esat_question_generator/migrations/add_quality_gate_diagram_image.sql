-- Quality Gate image diagram backfill metadata (Imagen + vision verify).
-- Run in Supabase SQL editor for the project that owns ai_generated_questions.

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS quality_gate_diagram_image_url text,
  ADD COLUMN IF NOT EXISTS quality_gate_diagram_image_model text,
  ADD COLUMN IF NOT EXISTS quality_gate_diagram_image_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS quality_gate_diagram_image_payload jsonb;

COMMENT ON COLUMN ai_generated_questions.quality_gate_diagram_image_url IS
  'Public URL of Imagen diagram uploaded to quality-gate-diagrams bucket.';
COMMENT ON COLUMN ai_generated_questions.quality_gate_diagram_image_model IS
  'Imagen model id used for the merged diagram image.';
COMMENT ON COLUMN ai_generated_questions.quality_gate_diagram_image_verified_at IS
  'When Gemini vision verification passed before stem merge.';
COMMENT ON COLUMN ai_generated_questions.quality_gate_diagram_image_payload IS
  'JSON snapshot: brief + verification result from image backfill pipeline.';
