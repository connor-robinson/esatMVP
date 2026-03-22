# Full Schema Generation Prompt

You are writing a single schema block for {schema_file}.

## Candidate Information

- Prefix: {candidate.prefix}  ({prefix_desc})
- Title: {candidate.title}
- Core move: {candidate.core_move}
- Evidence: {candidate.evidence}

{tmua_note}

## Schema Structure

Write a complete schema in this exact format:

**CRITICAL: Use the literal text "{ID}" in the header - DO NOT replace it with a number like M1, M2, etc. The system will replace {ID} with the correct unique identifier automatically.**

```markdown
## **{ID}. {{TITLE}}**

**Core move:** {{ONE_SENTENCE_ACTIONABLE_DESCRIPTION}}

**Seen in / context:**
- {{BULLET_POINT}}
- {{BULLET_POINT}}
- {{BULLET_POINT}}

**Possible wrong paths:**
- {{BULLET_POINT}}
- {{BULLET_POINT}}
- {{BULLET_POINT}}

**Notes for generation:**
- {{BULLET_POINT}}
- {{BULLET_POINT}}

**Exemplar questions:**
- `{question_id_1}`: {justification_1}
- `{question_id_2}`: {justification_2}
- `{question_id_3}`: {justification_3}

---
```

{limit_text}

## Guidelines

- Write concisely and actionably.
- Focus on the THINKING PATTERN, not the topic.
- "Seen in / context" should describe where this pattern appears (not just topic names).
- "Possible wrong paths" should list common mistakes or tempting but incorrect approaches.
- "Notes for generation" should give concrete guidance for creating new questions using this schema.
- Do NOT reference diagrams, graphs, or visual elements.
- Keep language clear and direct.

Return ONLY the markdown schema block, nothing else.

