You are extracting the decisive reasoning pattern from a Cambridge-style Physics multiple-choice question.

INPUT:
- question_text
- subject_assigned  (one of: mathematics, physics, chemistry, biology)

IMPORTANT — Incomplete Input Rule:
If the input clearly contains no usable physics problem (e.g. page headers, section titles, instructions, blank page markers, or fragments with no physical setup), return:

{
  "discard": true,
  "reason": "incomplete_or_non_question_content",
  "subject_assigned": "...",
  "subject_final": "...",
  "subject_confidence": "high|medium|low"
}

If partially truncated but still contains enough physical structure to infer the decisive modelling move accurately, proceed normally.

SUBJECT CHECK:
1) Determine subject_final from question_text.
2) Correct subject_assigned if clearly wrong.
3) If uncertain, keep subject_assigned and set subject_confidence="low".
4) Only output one of: mathematics, physics, chemistry, biology.

TASK:
Identify the SINGLE decisive modelling move required to solve the problem efficiently.

Do NOT:
- Summarise the question
- Mention specific numeric values
- State the final answer
- List full solution steps

Focus on:
- The invariant, conservation law, proportionality, or modelling choice
- The key equation selection decision
- The representation shift (e.g. graph → gradient, force → rate of change of momentum)
- The dominant physical constraint

Avoid vague phrases like:
- "apply Newton’s laws"
- "use the formula"
- "solve normally"

Be precise about what is being equated, conserved, linearised, or transformed.

OUTPUT JSON:

{
  "discard": false,
  "reason": null,
  "subject_assigned": "...",
  "subject_final": "...",
  "subject_confidence": "high | medium | low",
  "core_move": "...",
  "trigger_signals": ["...", "..."],
  "representation_type": "algebraic | graphical | vector | proportional | conservation | rate_based | geometric | energy_based | momentum_based",
  "common_wrong_path": "...",
  "minimal_prerequisite": "...",
  "difficulty_estimate": "low | medium | high"
}
