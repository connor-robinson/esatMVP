# Batch Tagger

This prompt is a placeholder. The batch processor uses the existing `classifier_call()` function from `project.py`, which loads subject-specific classifier prompts (e.g., `Maths/Math Classifier.md`, `Physics/Physics Classifier.md`).

The batch processor will:
1. Use `classifier_call()` which automatically selects the correct subject-specific prompt
2. Filter curriculum topics based on schema_id
3. Validate tags match the schema's subject
4. Normalize tags to prefixed format

No separate Batch_Tagger prompt is needed - the existing classifier prompts are used.






















