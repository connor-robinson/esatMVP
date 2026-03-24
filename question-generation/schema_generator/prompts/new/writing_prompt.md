You are synthesising a reusable exam schema from a grouped set of micro-schemas.

The purpose of a schema:
- Capture ONE decisive reasoning pattern.
- Be reusable across multiple similar questions.
- Be narrow enough to prevent drift.
- Be clear enough to guide future AI question generation.
- Be structurally precise (not topical).

INPUT:
- subject  (one of: mathematics, physics, chemistry, biology)
- grouped_micro_schemas (size 1–4), each containing:
    id
    core_move
    trigger_signals
    type_bucket (or reasoning_type / manipulation_type / representation_type)
    common_wrong_path
    minimal_prerequisite
    difficulty_estimate
- exemplar_question_texts aligned to the micro-schemas

CRITICAL INTERNAL PROCESS (do NOT output this reasoning):
1) Identify the single decisive move genuinely shared.
2) Ensure the shared pattern is structural, not topical.
3) Determine the boundary: what similar-looking problems are NOT part of this schema?
4) Confirm that one short teachable rule would solve all exemplars.
5) If group size = 1:
      - Do NOT artificially generalise.
      - Produce a narrow proto-schema.
6) If group size >= 2:
      - Only generalise where the decisive move is clearly identical.

HARD RULES:
- The schema must describe a thinking move, not a topic.
- The core_move must be ONE precise sentence.
- Trigger signals must be structural cues, not surface keywords.
- Wrong paths must be realistic and aligned across the group.
- Generation notes must restrict drift and prevent topic-blurring.
- Do NOT mention exam names, years, paper names, or question numbers.
- Do NOT restate full question scenarios.
- Do NOT introduce new ideas not present in the grouped micro-schemas.

SUBJECT-SPECIFIC GUIDANCE:

MATHEMATICS:
- Focus on structural manipulation.
- Identify the key transformation (substitution, symmetry, rearrangement, identity, inequality logic).
- Avoid vague phrases like “apply algebra”.

PHYSICS:
- Identify the modelling decision (what is conserved, equated, linearised, approximated).
- Be precise about what quantities are related.
- Avoid vague phrases like “apply Newton’s laws”.

CHEMISTRY:
- Identify the governing chemical principle.
- Be precise about what is compared, balanced, shifted, or inferred.
- Avoid vague phrases like “use periodic trends”.

BIOLOGY:
- Identify the causal or logical inference.
- Focus on mechanism, control variable, or elimination rule.
- Avoid vague phrases like “apply biological knowledge”.

OUTPUT JSON:

{
  "subject": "...",

  "title": "3–7 words, structural not topical",

  "core_move": "One precise sentence describing the decisive reasoning move.",

  "trigger_signals": [
    "Structural cue 1",
    "Structural cue 2",
    "Structural cue 3"
  ],

  "boundary_definition": "One short sentence explaining what similar-looking problems are NOT part of this schema.",

  "possible_wrong_paths": [
    "Common mistake 1 aligned with this pattern",
    "Common mistake 2 aligned with this pattern",
    "Common mistake 3 aligned with this pattern"
  ],

  "generation_notes": [
    "Constraint 1 to keep generated questions in-family",
    "Constraint 2 limiting drift",
    "Constraint 3 specifying what must remain invariant"
  ],

  "difficulty_profile": {
    "range": "low|medium|high or mixed",
    "comment": "Short note on how difficulty varies within this schema"
  },

  "exemplars": [
    {
      "question_id": "...",
      "why_it_fits": "Short structural explanation"
    }
  ]
}
