-- Add graphs and solution_graphs columns to ai_generated_questions table
-- These columns store GraphSpec (Version 2) JSONB for question graphs and solution-only graphs

ALTER TABLE ai_generated_questions
ADD COLUMN IF NOT EXISTS graphs jsonb,
ADD COLUMN IF NOT EXISTS solution_graphs jsonb;

-- Add comments explaining structure
COMMENT ON COLUMN ai_generated_questions.graphs IS 'Map of graph_id to GraphSpec (Version 2) for question graphs. GraphSpec includes objects, regions, derived objects, marks, and auto-placement anchors.';
COMMENT ON COLUMN ai_generated_questions.solution_graphs IS 'Map of graph_id to GraphSpec (Version 2) for solution-only graphs. Used when graphs appear in solutions but not in question stem.';

-- Add indexes for JSONB queries if needed (optional, but can help with graph queries)
CREATE INDEX IF NOT EXISTS idx_ai_questions_has_graphs ON ai_generated_questions ((graphs IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_ai_questions_has_solution_graphs ON ai_generated_questions ((solution_graphs IS NOT NULL));

