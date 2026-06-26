-- Append-only audit trail for ESAT curriculum-only reassessment runs.

CREATE TABLE IF NOT EXISTS esat_curriculum_reassessment_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES ai_generated_questions(id) ON DELETE CASCADE,
  validator_version text NOT NULL,
  model text NOT NULL,
  reassessed_at timestamptz NOT NULL DEFAULT now(),
  eligibility_bucket text NOT NULL,
  eligibility_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  prior_curriculum_validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  prior_effective_action text,
  new_curriculum_validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_effective_action text NOT NULL,
  raw_model_response text NOT NULL,
  run_id text NOT NULL
);

CREATE INDEX IF NOT EXISTS esat_curriculum_reassessment_audit_question_id_idx
  ON esat_curriculum_reassessment_audit (question_id);

CREATE INDEX IF NOT EXISTS esat_curriculum_reassessment_audit_run_id_idx
  ON esat_curriculum_reassessment_audit (run_id);

CREATE INDEX IF NOT EXISTS esat_curriculum_reassessment_audit_validator_version_idx
  ON esat_curriculum_reassessment_audit (validator_version);

COMMENT ON TABLE esat_curriculum_reassessment_audit IS
  'Append-only audit log for ESAT curriculum-only reassessment (v2_borderline_reassessment).';
