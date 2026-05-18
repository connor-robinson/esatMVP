-- Migration: diagram regeneration queue for ai_generated_questions
--
-- The review app exposes a "Regenerate diagram" button. Clicking it does NOT
-- run image generation inline (Imagen/Vision live in the Python pipeline);
-- instead the API writes a queued job onto the row and a worker
-- (`question-generation/esat_question_generator/diagram_regen_worker.py`)
-- picks it up, runs Gemini Vision analysis + Imagen + Supabase upload, and
-- writes the new stem + status back. All columns are additive and nullable
-- so legacy rows stay valid.

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS diagram_regen_status text;

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS diagram_regen_user_note text;

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS diagram_regen_reason text;

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS diagram_regen_new_prompt text;

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS diagram_regen_requested_at timestamptz;

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS diagram_regen_completed_at timestamptz;

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS diagram_regen_attempts integer NOT NULL DEFAULT 0;

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS diagram_regen_last_error text;

-- Enum check; ``NULL`` means "no regen has been requested for this row".
ALTER TABLE ai_generated_questions
  DROP CONSTRAINT IF EXISTS diagram_regen_status_check;
ALTER TABLE ai_generated_questions
  ADD CONSTRAINT diagram_regen_status_check CHECK (
    diagram_regen_status IS NULL OR diagram_regen_status IN (
      'queued',
      'in_progress',
      'done',
      'failed'
    )
  );

-- Worker uses this to fetch the next job efficiently.
CREATE INDEX IF NOT EXISTS idx_ai_questions_diagram_regen_queue
  ON ai_generated_questions(diagram_regen_requested_at)
  WHERE diagram_regen_status IN ('queued', 'in_progress');

COMMENT ON COLUMN ai_generated_questions.diagram_regen_status IS
  'Diagram regeneration state: queued | in_progress | done | failed. NULL if no regen has ever been requested.';
COMMENT ON COLUMN ai_generated_questions.diagram_regen_user_note IS
  'Optional free-text context from the reviewer: "shows extra arrows", "cement bag is too small", etc.';
COMMENT ON COLUMN ai_generated_questions.diagram_regen_reason IS
  'Worker-written explanation of why the current diagram is bad (Gemini Vision analysis).';
COMMENT ON COLUMN ai_generated_questions.diagram_regen_new_prompt IS
  'Worker-written rewritten Imagen prompt used for the regenerated image.';
COMMENT ON COLUMN ai_generated_questions.diagram_regen_requested_at IS
  'When the API enqueued the regen job. Used to order the worker queue.';
COMMENT ON COLUMN ai_generated_questions.diagram_regen_completed_at IS
  'When the worker finished (done or failed). NULL while pending.';
COMMENT ON COLUMN ai_generated_questions.diagram_regen_attempts IS
  'Number of times the worker has attempted this row (bounded by worker config).';
COMMENT ON COLUMN ai_generated_questions.diagram_regen_last_error IS
  'Most recent worker error message; useful for failed rows.';
