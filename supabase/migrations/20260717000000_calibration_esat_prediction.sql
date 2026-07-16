-- ESAT prediction (math1_calibration_score_v1) score components.
--
-- Adds queryable columns for the versioned prediction model so we can compute
-- platform percentiles from the ranking index without scanning the result JSONB.
-- The full prediction remains inside calibration_attempts.result for exact
-- reproducibility; these columns are a denormalised projection for ranking.

ALTER TABLE calibration_attempts
  ADD COLUMN IF NOT EXISTS scoring_model_version TEXT,
  ADD COLUMN IF NOT EXISTS ranking_index NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS estimated_esat_score NUMERIC(3, 1),
  ADD COLUMN IF NOT EXISTS projected_raw_27 NUMERIC(4, 1),
  ADD COLUMN IF NOT EXISTS raw_correct_15 INT;

-- Percentile queries filter to completed attempts of a given test/content
-- version and compare ranking_index; index that access path.
CREATE INDEX IF NOT EXISTS idx_calibration_attempts_ranking
  ON calibration_attempts(test_id, content_version, status, ranking_index)
  WHERE ranking_index IS NOT NULL;
