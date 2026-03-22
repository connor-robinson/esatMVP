# Schema Candidate Generation Prompt

You are helping build a compact schema library for {exam_type}-style questions.

A "schema" is a THINKING PATTERN, not a topic.
You must propose CANDIDATES only (title + core move + evidence), not full schema blocks.

## Prefix Assignment

{prefix_instructions}

## Hard Constraints

- IGNORE any question that involves a diagram, graph, sketch, or figure.
- Do NOT create diagram-dependent schemas.
- Candidate title: 3–8 words, not topic-named (avoid "Integration", "Transformers", etc.).
- Candidate core_move: exactly ONE sentence, actionable ("Infer...", "Exploit...", "Constrain...").
- Evidence must cite question IDs from the corpus below. Do not hallucinate.
- **Evidence must include 3-8 question IDs with diversity (at least 2 different years if possible).**
- **For each evidence ID, provide a 1-line justification (why this question exemplifies the schema).**
- If a candidate overlaps strongly with existing schemas, list the overlapping schema IDs in collision_guess.
- Prefer reusable patterns that could appear across multiple papers.
- **For TMUA mode: prefix is always "M" for Paper 1, "R" for Paper 2. Do not mix paper types.**
- **For ESAT mode: ensure a diverse mix of prefixes when the corpus contains questions from multiple subjects.**
- **Aim for patterns that plausibly match ~5-25 questions in the full corpus (granularity check).**

## Existing Schemas

{existing}

## Corpus (questions without diagrams only)

{corpus}

**Note for ESAT/TMUA mode:** When questions include "Solution:" sections, use the solution text to understand:
- What makes the question correct/incorrect
- What reasoning patterns lead to the solution
- What common mistakes students might make (contrast with solution approach)
- The type of answer format expected (algebraic, numerical, logical, etc.)

Solution information helps identify the core thinking move more accurately by showing the actual solution path.

## Output Format

Return ONLY valid JSON with this structure:

```json
{{
  "candidates": [
    {{
      "candidate_id": "C1",
      "prefix": {prefix_json},
      "title": "...",
      "core_move": "...",
      "evidence": ["<qid1>", "<qid2>", "<qid3>"],
      "exemplar_justifications": {{
        "<qid1>": "Shows core move in pure algebra context",
        "<qid2>": "Demonstrates wrong path: assuming linearity",
        "<qid3>": "Illustrates decision point with boundary case"
      }},
      "collision_guess": ["M3", "P5"],
      "confidence": 0.0,
      "trigger_cues": ["cue1", "cue2"],
      "canonical_steps": ["step1", "step2", "step3"],
      "variation_knobs": ["knob1", "knob2"],
      "distractor_archetypes": ["archetype1", "archetype2"],
      "answer_form": "integer|rational|algebraic|logic|multiple_choice_logic|other",
      "scope": "too_broad|good|too_specific"
    }}
  ]
}}
```

Produce exactly {n_candidates} candidates if possible. If not possible, produce fewer.
**For ESAT mode only:** Ensure you generate B and C schemas when biology/chemistry questions are present in the corpus.
**For TMUA mode:** Use prefix "M" for Paper 1, "R" for Paper 2. Do not mix paper types in evidence.


      "confidence": 0.0,
      "trigger_cues": ["cue1", "cue2"],
      "canonical_steps": ["step1", "step2", "step3"],
      "variation_knobs": ["knob1", "knob2"],
      "distractor_archetypes": ["archetype1", "archetype2"],
      "answer_form": "integer|rational|algebraic|logic|multiple_choice_logic|other",
      "scope": "too_broad|good|too_specific"
    }}
  ]
}}
```

Produce exactly {n_candidates} candidates if possible. If not possible, produce fewer.
**For ESAT mode only:** Ensure you generate B and C schemas when biology/chemistry questions are present in the corpus.
**For TMUA mode:** Use prefix "M" for Paper 1, "R" for Paper 2. Do not mix paper types in evidence.


      "confidence": 0.0,
      "trigger_cues": ["cue1", "cue2"],
      "canonical_steps": ["step1", "step2", "step3"],
      "variation_knobs": ["knob1", "knob2"],
      "distractor_archetypes": ["archetype1", "archetype2"],
      "answer_form": "integer|rational|algebraic|logic|multiple_choice_logic|other",
      "scope": "too_broad|good|too_specific"
    }}
  ]
}}
```

Produce exactly {n_candidates} candidates if possible. If not possible, produce fewer.
**For ESAT mode only:** Ensure you generate B and C schemas when biology/chemistry questions are present in the corpus.
**For TMUA mode:** Use prefix "M" for Paper 1, "R" for Paper 2. Do not mix paper types in evidence.
