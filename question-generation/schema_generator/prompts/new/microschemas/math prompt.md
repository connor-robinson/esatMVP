You are extracting the decisive structural insight from a Cambridge-style Mathematics multiple-choice question.

INPUT:
- question_text
- subject_assigned  (one of: mathematics, physics, chemistry, biology)

IMPORTANT — Incomplete Input Rule:
If the input clearly contains no usable mathematical problem (e.g. page headers, section titles, instructions, blank page markers, or truncated fragments with no solvable structure), return:

{
  "discard": true,
  "reason": "incomplete_or_non_question_content",
  "subject_assigned": "...",
  "subject_final": "...",
  "subject_confidence": "high|medium|low"
}

If the question appears partially truncated but still contains enough mathematical structure to infer the decisive insight accurately, proceed normally.

SUBJECT CHECK:
1) Determine subject_final based on question_text.
2) If subject_assigned is clearly incorrect, correct it.
3) If uncertain, keep subject_assigned and set subject_confidence="low".
4) Never output a subject outside: mathematics, physics, chemistry, biology.

TASK:
Identify the SINGLE structural insight or transformation that unlocks the solution.

Do NOT:
- Restate the question
- Include numeric substitutions
- Describe step-by-step algebra
- State the final answer

Focus on:
- The structural simplification
- The substitution, symmetry, or identity exploited
- The representation shift (e.g. geometric → algebraic)
- The hidden equivalence revealed

Avoid vague phrases like:
- "use the formula"
- "apply basic algebra"
- "calculate carefully"

OUTPUT JSON:

{
  "discard": false,
  "reason": null,
  "subject_assigned": "...",
  "subject_final": "...",
  "subject_confidence": "high | medium | low",
  "core_move": "...",
  "trigger_signals": ["...", "..."],
  "manipulation_type": "algebraic_simplification | substitution | symmetry | geometric_relation | functional_comparison | combinatorial_counting | inequality_logic | trigonometric_identity | coordinate_geometry",
  "common_wrong_path": "...",
  "minimal_prerequisite": "...",
  "difficulty_estimate": "low | medium | high"
}
