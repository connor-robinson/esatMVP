-- Add predicted_score and section_percentiles columns to paper_sessions table
-- These columns store the predicted ESAT/TMUA score and section percentiles calculated from the overview section

ALTER TABLE paper_sessions 
ADD COLUMN IF NOT EXISTS predicted_score NUMERIC;

ALTER TABLE paper_sessions 
ADD COLUMN IF NOT EXISTS section_percentiles JSONB;

-- Add comments to explain the columns
COMMENT ON COLUMN paper_sessions.predicted_score IS 'Predicted ESAT/TMUA score from the overview section of the entire paper (weighted by section totals)';
COMMENT ON COLUMN paper_sessions.section_percentiles IS 'JSON object mapping section identifiers to percentile values calculated from across all subjects/all parts. Format: {"sectionKey": {"percentile": number, "score": number, "label": string}}';



