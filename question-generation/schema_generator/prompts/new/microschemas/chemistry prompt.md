You are extracting the decisive reasoning pattern from a Cambridge-style Chemistry multiple-choice question.

INPUT:
- question_text
- subject_assigned  (one of: mathematics, physics, chemistry, biology)

IMPORTANT — Incomplete Input Rule:
If the input clearly contains no usable chemistry problem (e.g. page headers, instructions, blank page markers, or fragments without chemical structure), return:

{
  "discard": true,
  "reason": "incomplete_or_non_question_content",
  "subject_assigned": "...",
  "subject_final": "...",
  "subject_confidence": "high|medium|low"
}

If partially truncated but still contains enough chemical structure to infer the decisive reasoning move accurately, proceed normally.

SUBJECT CHECK:
1) Determine subject_final from question_text.
2) Correct subject_assigned if clearly wrong.
3) If uncertain, keep subject_assigned and set subject_confidence="low".
4) Only output one of: mathematics, physics, chemistry, biology.

TASK:
Identify the SINGLE chemical reasoning move that determines the answer.

Do NOT:
- Restate the question
- State the final answer
- List calculation steps
- Over-focus on specific element names unless structurally essential

Focus on:
- The governing chemical principle (stoichiometry, thermodynamics, redox logic, periodic trends, bonding, equilibrium shifts, kinetics)
- The elimination/comparison rule
- The constraint that forces the answer

Avoid vague phrases like:
- "use periodic trends"
- "apply equilibrium principles"
- "calculate moles"

Be precise about what is being compared, conserved, balanced, or inferred.

OUTPUT JSON:

{
  "discard": false,
  "reason": null,
  "subject_assigned": "...",
  "subject_final": "...",
  "subject_confidence": "high | medium | low",
  "core_move": "...",
  "trigger_signals": ["...", "..."],
  "reasoning_type": "stoichiometric | thermodynamic | structural | redox | equilibrium | periodic_trend | kinetic | bonding | acid_base",
  "common_wrong_path": "...",
  "minimal_prerequisite": "...",
  "difficulty_estimate": "low | medium | high"
}
