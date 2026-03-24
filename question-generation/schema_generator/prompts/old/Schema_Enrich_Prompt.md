# Schema Enrichment Prompt

You are enriching an existing schema by replacing ONE bullet point with better content from a new candidate.

## Target Schema

Schema ID: {target_schema_id}
Section: {section}
Existing bullet: {existing_bullet}

## New Candidate Information

- Title: {candidate.title}
- Core move: {candidate.core_move}
- Evidence: {candidate.evidence}

## Your Task

Write a SINGLE replacement bullet for the "{section}" section that:
- Incorporates insights from the new candidate
- Maintains consistency with the existing schema
- Is concise and actionable
- Does NOT exceed one bullet point
- Follows the style of the original bullet

## Output Format

Return ONLY the replacement bullet text (one line), nothing else.
Do NOT include the bullet point marker (•/-), just the text.

Example output:
```
Questions involving hidden symmetry in algebraic expressions that can be exploited through substitution
```

























