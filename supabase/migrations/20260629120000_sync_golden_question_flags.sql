-- Unify reviewer golden (is_good_question) with QG calibration gold (quality_gate_calibration_tier).

-- Backfill: QG gold → reviewer golden
UPDATE ai_generated_questions
SET is_good_question = true
WHERE quality_gate_calibration_tier = 'gold'
  AND is_good_question = false;

-- Backfill: reviewer golden → QG gold
UPDATE ai_generated_questions
SET quality_gate_calibration_tier = 'gold'
WHERE is_good_question = true
  AND quality_gate_calibration_tier IS DISTINCT FROM 'gold';

COMMENT ON COLUMN ai_generated_questions.is_good_question IS
  'Golden / elite question flag. Kept in sync with quality_gate_calibration_tier = gold.';

COMMENT ON COLUMN ai_generated_questions.quality_gate_calibration_tier IS
  'Golden / elite calibration tier (gold). Kept in sync with is_good_question = true.';

CREATE OR REPLACE FUNCTION sync_golden_question_flags()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.quality_gate_calibration_tier = 'gold' OR NEW.is_good_question IS TRUE THEN
      NEW.is_good_question := TRUE;
      NEW.quality_gate_calibration_tier := 'gold';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.quality_gate_calibration_tier IS DISTINCT FROM OLD.quality_gate_calibration_tier THEN
    IF NEW.quality_gate_calibration_tier = 'gold' THEN
      NEW.is_good_question := TRUE;
    ELSE
      NEW.is_good_question := FALSE;
    END IF;
  ELSIF NEW.is_good_question IS DISTINCT FROM OLD.is_good_question THEN
    IF NEW.is_good_question IS TRUE THEN
      NEW.quality_gate_calibration_tier := 'gold';
    ELSE
      NEW.quality_gate_calibration_tier := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_golden_question_flags ON ai_generated_questions;

CREATE TRIGGER trg_sync_golden_question_flags
  BEFORE INSERT OR UPDATE OF is_good_question, quality_gate_calibration_tier
  ON ai_generated_questions
  FOR EACH ROW
  EXECUTE FUNCTION sync_golden_question_flags();
