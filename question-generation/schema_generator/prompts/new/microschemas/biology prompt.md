You are extracting the decisive reasoning pattern from a Cambridge-style Biology multiple-choice question.

INPUT:
- question_text
- subject_assigned  (one of: mathematics, physics, chemistry, biology)

IMPORTANT — Incomplete Input Rule:
If the input clearly contains no usable biology question content (e.g. page headers, “SECTION X”, blank page markers, instructions, or truncated fragments with no solvable structure), return:

{
  "discard": true,
  "reason": "incomplete_or_non_question_content",
  "subject_assigned": "...",
  "subject_final": "...",
  "subject_confidence": "high|medium|low"
}

If the question appears partially truncated but still contains enough structure to infer the decisive reasoning move accurately, proceed normally.

SUBJECT CHECK (IMPORTANT):
- Decide subject_final from question_text.
- If subject_assigned is clearly wrong, correct it.
- If uncertain, keep subject_assigned and set subject_confidence="low".

TASK:
Identify the SINGLE decisive biology reasoning move required to solve the question efficiently.

Do NOT:
- Restate the question
- Mention specific numeric values
- State the final answer
- Give step-by-step solution

Focus on:
- The key biological principle/constraint (homeostasis, genetics logic, selection pressure, cell transport, enzyme kinetics, immunology logic, etc.)
- The comparison/elimination rule that determines the correct option
- The modelling/interpretation move (e.g. graph interpretation, proportional reasoning, probability/genetics reasoning)

OUTPUT JSON:

{
  "discard": false,
  "reason": null,
  "subject_assigned": "...",
  "subject_final": "...",
  "subject_confidence": "high | medium | low",
  "core_move": "...",
  "trigger_signals": ["...", "..."],
  "reasoning_type": "genetics | physiology | ecology_evolution | cell_transport | enzymes | immunology | microscopy | data_interpretation",
  "common_wrong_path": "...",
  "minimal_prerequisite": "...",
  "difficulty_estimate": "low | medium | high"
}
