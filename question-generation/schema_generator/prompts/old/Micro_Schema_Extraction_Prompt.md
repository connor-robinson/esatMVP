# Micro-Schema Extraction Prompt

You are analyzing a single exam question to extract its core thinking pattern.

## Question

**Question ID:** {qid}
**Question Text:**
```
{question_text}
```

**Solution Text (if available):**
```
{solution_text}
```

## Your Task

Extract the micro-schema for this question. A micro-schema captures the essential thinking pattern, not the topic.

## Output Format

Return ONLY valid JSON with this structure:

```json
{{
  "core_move": "Single decisive step in imperative form (e.g., 'Apply conservation of energy', 'Set up and solve inequality', 'Differentiate then substitute')",
  "secondary_moves": ["Optional secondary step 1", "Optional secondary step 2"],
  "key_triggers": ["trigger phrase 1", "trigger phrase 2", "trigger phrase 3"],
  "representation": "algebraic|diagram|graph|probability|data_table|pure_text|other",
  "difficulty": "Easy|Medium|Hard",
  "prerequisites": ["prerequisite concept 1", "prerequisite concept 2"],
  "wrong_paths": ["Common mistake 1", "Common mistake 2", "Common mistake 3"],
  "answer_form": "integer|rational|algebraic|logic|multiple_choice_logic|proof|explanation|other",
  "object_type": "function|geometry|reaction|energy|probability_distribution|other",
  "prefix_hint": "M|P|B|C|R"
}}
```

## Guidelines

- **core_move**: One imperative sentence describing the decisive step. Must be actionable.
- **key_triggers**: 2-5 concrete phrases in the question wording that signal this move
- **representation**: How the problem is presented (even if no diagram, might be "graph-like wording")
- **wrong_paths**: 2-3 common mistakes students make (contrast with solution approach)
- **object_type**: The mathematical/physical object being manipulated
- **prefix_hint**: Your best guess at schema prefix (M/P/B/C for ESAT, M/R for TMUA)

## Important

- Focus on the THINKING PATTERN, not the topic name
- If solution is available, use it to understand the reasoning path
- Be specific about triggers - these help detect similar questions later
