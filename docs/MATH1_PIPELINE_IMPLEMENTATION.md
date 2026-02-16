# ESAT Math 1 Question Generation Pipeline Implementation

## Overview

The codebase has been updated to implement the new ESAT Math 1 question generation pipeline as specified. The pipeline follows a strict flow with clear separation of concerns and proper handling of mode injection, format fixing, and post-acceptance tagging.

## Pipeline Flow

```
1. Designer → 2. Mode Injection (if sibling/far) → 3. Implementer → 
4. Verifier → 5. Style_checker → 6. Retry_controller (if needed) → 
7. Format Fixer (if needed) → 8. Tag_Labeler (post-acceptance) → 9. Save
```

## Key Changes Made

### 1. Prompt Loading (`load_prompts`)

- **Updated** to check for new Math1 structure at `by_subject_prompts/new/Math1/`
- **Added** support for loading:
  - Math1 Designer.md
  - Math1 Implementer.md
  - Math1 Sibling Mode.md
  - Math1 Far Mode.md
  - Math1 Verifier.md
  - Math1 Style_checker.md
  - Math1 Retry_controller.md
  - Math1 Format Fixer.md
  - Math1 Tag_Labeler.md
- **Stores** Math1-specific prompts as attributes on Prompts class for later use
- **Falls back** to old structure if new Math1 prompts not found

### 2. Mode Injection (`apply_mode_injection`)

- **New function** that applies Sibling or Far mode to designer idea_plan
- **Preserves** schema invariant while adjusting surface
- **Uses** Math1 Sibling Mode.md or Math1 Far Mode.md prompts
- **Applied** automatically after Designer stage if variation_mode is "sibling" or "far"

### 3. Designer (`designer_call`)

- **Updated** to accept `variation_mode` parameter (default: "base")
- **Outputs** idea_plan with required fields:
  - schema_id
  - variation_mode
  - task_signature
  - primary_tag
  - secondary_tags
  - intended_wrong_paths
  - constraints_used
  - idea_summary
  - tool_footprint
  - difficulty_rationale
  - mcq_viability
- **Includes** 1-2 NSAA Section 1 reference questions for calibration
- **Applies** mode injection automatically if variation_mode is "sibling" or "far"

### 4. Implementer (`implementer_call`)

- **Updated** to accept `exemplar_ids` parameter
- **Passes** 1-2 NSAA Section 1 references to Implementer prompt
- **Calibration rule**: References used ONLY for stem compactness, tone, step-count, no-calc engineering, distractor structure
- **Prohibits** copying distinctive numbers, structural fingerprints, wording, constants, transformation chains

### 5. Verifier (`verifier_call`)

- **Updated** to accept `designer_plan` and `exemplar_ids` parameters
- **Uses** Math1 Verifier.md prompt if available
- **New pipeline**: Passes designer_plan and implemented_question separately
- **Includes** optional NSAA references for syllabus sanity-checking (not difficulty calibration)

### 6. Style Checker (`style_call`)

- **Updated** to accept `designer_plan` and `exemplar_ids` parameters
- **Uses** Math1 Style_checker.md prompt if available
- **New pipeline**: Passes designer_plan, implemented_question, and references separately
- **Checks** authenticity and difficulty calibration against NSAA references

### 7. Retry Controller (`implementer_regen_call`)

- **Updated** to use Math1 Retry_controller.md prompt if available
- **Loads** Math1 regen header.md for Math1 questions
- **Routes** based on failure type:
  - Format only → Format Fixer
  - Math error → full Implementer regen
  - Ambiguity → regen with clearer constraints
  - Off-syllabus → simpler on-spec rewrite
  - Style fail → recalibrate difficulty only
- **Preserves** schema_id, invariant, task_signature
- **Must change** numbers/surface

### 8. Format Fixer (`format_fixer_call`)

- **New function** for YAML + KaTeX formatting fixes only
- **Uses** Math1 Format Fixer.md prompt
- **Strict prohibitions**: No math changes, no logic changes, no structure changes
- **Returns** blocked flag if non-format issue detected
- **Called** automatically when KaTeX errors are format-only

### 9. Tag Labeler (`tag_labeler_call`)

- **Updated** to use Math1 Tag_Labeler.md prompt for Math1 questions
- **Post-acceptance**: Runs AFTER question is accepted (non-blocking)
- **Outputs** primary_tag (1-7 for Math1), secondary_tags (0-2), confidence, reasoning
- **Never blocks** acceptance

### 10. Pipeline Flow (`run_once`)

- **Updated** to support variation_mode (base/sibling/far) via config or env var
- **Flow**:
  1. Designer (with variation_mode support)
  2. Mode Injection (if sibling/far) - automatic
  3. Implementer (with NSAA references)
  4. Verifier (with designer_plan)
  5. Style_checker (with designer_plan and references)
  6. Retry_controller (if needed, with proper routing)
  7. Format Fixer (if format-only errors detected)
  8. Tag_Labeler (post-acceptance, non-blocking)
  9. Save

## Configuration

### Environment Variables

- `VARIATION_MODE`: Set to "base", "sibling", or "far" (default: "base")
- All existing environment variables still work

### RunConfig

- Can add `variation_mode` attribute to RunConfig for programmatic control

## Backward Compatibility

- **Maintained**: Old pipeline still works for non-Math1 subjects
- **Fallback**: If Math1 prompts not found, falls back to old prompts
- **Gradual migration**: Can enable new pipeline per-subject

## Key Architectural Principles Implemented

1. ✅ **Invariant defined first**: Designer defines invariant before implementation
2. ✅ **One dominant idea per question**: Enforced by Designer prompt
3. ✅ **Implementer never changes invariant**: Implementer follows idea_plan exactly
4. ✅ **Verifier is strict**: Independent re-solve, strict checks
5. ✅ **Style is separate from validity**: Style_checker runs after Verifier
6. ✅ **Tagging never blocks**: Tag_Labeler runs post-acceptance
7. ✅ **Regeneration is controlled**: Retry_controller routes based on failure type
8. ✅ **Format-only fixes**: Format Fixer handles YAML/KaTeX only

## Testing Recommendations

1. Test with `VARIATION_MODE=base` (default)
2. Test with `VARIATION_MODE=sibling`
3. Test with `VARIATION_MODE=far`
4. Verify format_fixer_call is used for format-only errors
5. Verify tag_labeler runs post-acceptance
6. Verify NSAA references are passed correctly to all stages
7. Verify Math1 prompts are loaded correctly

## Files Modified

- `scripts/esat_question_generator/project.py`:
  - `load_prompts()` - Updated to load Math1 prompts
  - `apply_mode_injection()` - New function
  - `designer_call()` - Updated for variation_mode and idea_plan structure
  - `format_fixer_call()` - New function
  - `implementer_call()` - Updated for NSAA references
  - `verifier_call()` - Updated for designer_plan
  - `style_call()` - Updated for designer_plan and references
  - `implementer_regen_call()` - Updated for Math1 Retry_controller
  - `tag_labeler_call()` - Updated for Math1 Tag_Labeler
  - `run_once()` - Updated pipeline flow

## Next Steps

1. Test the pipeline with actual Math1 schemas
2. Verify all prompts are being loaded correctly
3. Monitor for any issues with mode injection
4. Ensure format_fixer_call is working correctly
5. Verify tag_labeler is running post-acceptance
