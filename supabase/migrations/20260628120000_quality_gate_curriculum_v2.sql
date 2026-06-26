-- Curriculum validator v2 metadata (stored primarily in quality_gate_payload; columns optional for indexing)

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS quality_gate_curriculum_validation_status text,
  ADD COLUMN IF NOT EXISTS quality_gate_curriculum_validator_version text;

COMMENT ON COLUMN ai_generated_questions.quality_gate_curriculum_validation_status IS
  'valid | invalid_model_output | model_error — mirrors quality_gate_payload.curriculum_validation.curriculum_validation_status';

COMMENT ON COLUMN ai_generated_questions.quality_gate_curriculum_validator_version IS
  'Curriculum validator version, e.g. v2';
