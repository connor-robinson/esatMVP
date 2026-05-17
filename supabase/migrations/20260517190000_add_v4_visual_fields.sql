-- Migration: V4 pipeline visual asset metadata for ai_generated_questions
--
-- The V4 Physics pipeline (pipeline_v4/) produces:
--   - deterministic SVG renderings for accurate_graph_json / accurate_schematic_json
--     routes; the SVG is also spliced into ``question_stem`` so the review-app
--     can display it inline today.
--   - Gemini-generated concept image PNGs for ``concept_image_prompt`` routes;
--     the PNG is embedded as a base64 ``<image>`` inside an inline ``<svg>``
--     figure in ``question_stem`` for the same reason.
--
-- This migration adds the side-channel metadata so reviewers and downstream
-- consumers can tell V4 questions apart from legacy ones and inspect the
-- raw spec/asset trail without parsing the stem. Everything here is additive
-- and non-destructive: existing rows stay valid (all new columns default to
-- NULL or the documented neutral default).

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS pipeline text;

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS has_visual boolean NOT NULL DEFAULT false;

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS visual_type text;

ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS answer_depends_on_visual boolean NOT NULL DEFAULT false;

-- Renderer used for accurate_graph_json / accurate_schematic_json. Lets us
-- regenerate / re-audit visuals later if the renderer version changes.
ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS visual_renderer text;

-- Final concept_image_verifier verdict ("pass" / "regenerate" / "delete" /
-- "pending"). Useful for filtering "image attached but QC was iffy" rows.
ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS visual_qc_status text;

-- Structured asset record: array of {kind, spec_path, image_paths, renderer,
-- qc_status, qc_source, answer_bearing} entries as emitted by
-- ``pipeline_v4/schemas.py:VisualAssetRecord``. Stored as JSONB so we can
-- query/index later without another migration.
ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS visual_assets jsonb;

-- Soft check: visual_type must be one of the known V4 routes (or NULL).
-- ``none`` is allowed for non-visual questions; ``concept_image_prompt`` covers
-- cases where the prompt was kept but image generation was skipped or failed.
ALTER TABLE ai_generated_questions
  DROP CONSTRAINT IF EXISTS visual_type_check;
ALTER TABLE ai_generated_questions
  ADD CONSTRAINT visual_type_check CHECK (
    visual_type IS NULL OR visual_type IN (
      'none',
      'accurate_graph_json',
      'accurate_schematic_json',
      'concept_image_prompt',
      'concept_image',
      'unsupported_visual_dependency'
    )
  );

-- Index for the review-app "show me only V4 visual questions" filter.
CREATE INDEX IF NOT EXISTS idx_ai_questions_has_visual
  ON ai_generated_questions(has_visual) WHERE has_visual = true;

CREATE INDEX IF NOT EXISTS idx_ai_questions_pipeline
  ON ai_generated_questions(pipeline) WHERE pipeline IS NOT NULL;

-- Comments
COMMENT ON COLUMN ai_generated_questions.pipeline IS
  'Pipeline version that produced this question (e.g. ''v4''). NULL for legacy run_once outputs.';
COMMENT ON COLUMN ai_generated_questions.has_visual IS
  'True if the question stem carries a rendered diagram / graph / concept image.';
COMMENT ON COLUMN ai_generated_questions.visual_type IS
  'V4 visual_router verdict: accurate_graph_json | accurate_schematic_json | concept_image | concept_image_prompt | none | unsupported_visual_dependency';
COMMENT ON COLUMN ai_generated_questions.answer_depends_on_visual IS
  'True if removing the visual would make the question ambiguous (used by quality gate).';
COMMENT ON COLUMN ai_generated_questions.visual_renderer IS
  'Renderer identifier: deterministic_graph_renderer_v1, deterministic_schematic_renderer_v1, gemini_image_v1, spec_only, image_gen_failed.';
COMMENT ON COLUMN ai_generated_questions.visual_qc_status IS
  'Final concept_image_verifier verdict (pass / regenerate / delete / pending). NULL for non-visual rows.';
COMMENT ON COLUMN ai_generated_questions.visual_assets IS
  'Array of VisualAssetRecord dicts (kind, spec_path, image_paths, renderer, qc_status, qc_source, answer_bearing).';
