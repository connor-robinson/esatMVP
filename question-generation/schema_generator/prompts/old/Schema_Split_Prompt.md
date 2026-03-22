# Schema Split Prompt

You are given a candidate that might actually represent TWO distinct thinking patterns.

Your task: split it into two separate candidates if appropriate.

## Original Candidate

- Title: {candidate.title}
- Core move: {candidate.core_move}
- Evidence: {candidate.evidence}
- Prefix: {candidate.prefix}

## Requirements

If this candidate represents two distinct patterns:
- Create two new candidates with different titles and core moves
- Distribute the evidence between them based on which pattern each question uses
- Each candidate should have at least 2 pieces of evidence
- Keep the same prefix for both

If splitting doesn't make sense, return the original candidate unchanged.

## Output Format

Return ONLY valid JSON:

```json
{{
  "split": true,
  "candidates": [
    {{
      "candidate_id": "C1a",
      "prefix": "...",
      "title": "...",
      "core_move": "...",
      "evidence": ["..."],
      "collision_guess": [],
      "confidence": 0.0
    }},
    {{
      "candidate_id": "C1b",
      "prefix": "...",
      "title": "...",
      "core_move": "...",
      "evidence": ["..."],
      "collision_guess": [],
      "confidence": 0.0
    }}
  ]
}}
```

Or if no split is needed:

```json
{{
  "split": false,
  "candidates": [
    {{
      "candidate_id": "C1",
      "prefix": "...",
      "title": "...",
      "core_move": "...",
      "evidence": ["..."],
      "collision_guess": [],
      "confidence": 0.0
    }}
  ]
}}
```

























