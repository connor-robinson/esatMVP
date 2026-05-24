-- Allow quality_gate_action = move_to_math2 (Math 1 row → operator moves to Math 2 paper).

ALTER TABLE ai_generated_questions
  DROP CONSTRAINT IF EXISTS ai_generated_questions_quality_gate_action_check;

ALTER TABLE ai_generated_questions
  DROP CONSTRAINT IF EXISTS ai_generated_questions_quality_gate_action_check1;

ALTER TABLE ai_generated_questions
  ADD CONSTRAINT ai_generated_questions_quality_gate_action_check
    CHECK (
      quality_gate_action IS NULL
      OR quality_gate_action IN (
        'approve',
        'human_review',
        'regenerate',
        'move_to_math2',
        'delete'
      )
    );

COMMENT ON COLUMN ai_generated_questions.quality_gate_action IS
  'Effective action: approve | human_review | regenerate | move_to_math2 | delete';
