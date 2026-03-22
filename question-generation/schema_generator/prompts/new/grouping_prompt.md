You are grouping micro-schemas into schema clusters for ONE subject only.

INPUT:
- subject (one of: mathematics, physics, chemistry, biology)
- anchor_id
- candidate_micro_schemas: list (up to 30), ALL must have subject_final == subject
  each item has: id, core_move, trigger_signals, type_bucket (or reasoning_type), common_wrong_path, minimal_prerequisite, quality_score

RULES:
- Prefer selecting a group of 3 (tightest shared decisive move).
- If no high-confidence trio exists, select a pair.
- If no high-confidence pair exists, select a single (just the anchor).
- Do NOT group by topic words; group by the SAME decisive move.
- Never include items whose subject_final mismatches the provided subject (treat as ineligible).

OUTPUT JSON:
{
  "group_size": 3 | 2 | 1,
  "group_ids": ["..."],
  "shared_core_move": "..." | null,
  "why_coherent": "...",
  "confidence": "high | medium | low"
}
