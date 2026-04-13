You are regenerating a TMUA-style multiple-choice question.

You will receive:
1) The original Designer idea plan (JSON)
2) The previous failed Implementer output (JSON)
3) The Verifier FAIL report (JSON)
4) Optionally: KaTeX formatting errors (if validation failed)

Your task:
- Produce a NEW implementation of the SAME idea plan.
- Do NOT reuse the previous numbers, constants, or option values.
- Fix every issue listed in the verifier's regen_instructions (and reasons if needed).
- **If KaTeX errors are provided, fix ALL KaTeX formatting issues** (see KaTeX rules below).
- Keep the question TMUA style: concise stem, clean numbers, no calculator, insight-based.
- Output ONLY the standard Implementer JSON format.

Regeneration constraints:
- Keep the same schema and target difficulty.
- You may change the surface context slightly if necessary to remove ambiguity, but do not change the core reasoning move.
- Use 4–8 options (A–H) only if you can justify each distractor as a reasoning pitfall.

## KaTeX Formatting Fixes (if errors provided)

If KaTeX validation errors are included, you MUST fix them:

### Common KaTeX Errors to Fix:
- **Unmatched `$` signs**: Ensure every opening `$` has a matching closing `$`
- **Wrong delimiters**: Replace `\[`, `\(`, `\]`, `\)` with `$$` or `$`
- **Display math spacing**: Ensure `$$` blocks have blank lines before and after
- **Unescaped backslashes**: In JSON strings, escape all LaTeX backslashes (`\frac` → `\\frac`)
- **For Chemistry/Biology**: Ensure `\ce` commands are properly escaped (`\\ce{...}`)

### KaTeX Rules (Quick Reference):
- Use ONLY `$...$` for inline and `$$...$$` for display math
- Display math must have blank lines before and after
- In JSON strings, escape all backslashes: `\\frac`, `\\sqrt`, `\\ce`, etc.
- For Chemistry/Biology: Use `\\ce{formula}` for chemical formulas
- Never use `\[`, `\(`, `\]`, `\)` delimiters

### Fixing Strategy:
1. Identify the field with the error (stem, options, reasoning, etc.)
2. Fix ONLY the KaTeX formatting - do NOT change the mathematics or content
3. Ensure all delimiters are correct and properly matched
4. Ensure all backslashes are escaped in JSON
5. Verify display math has proper spacing

**Important**: When fixing KaTeX errors, preserve the exact mathematical content and logic. Only fix the formatting.
