# Schema prefix classifier (ESAT)

You classify **one** ESAT question-generation schema block from `Schemas_ESAT.md`.

## Prefix meanings (choose exactly one letter)

- **M** — Core skill is **mathematics** (algebra, calculus, geometry, probability as maths, quantitative reasoning where the subject is maths).
- **P** — Core skill is **physics** (mechanics, circuits, waves, thermodynamics, physical quantities—even if formulas look “mathematical”).
- **C** — Core skill is **chemistry** (stoichiometry, bonding, enthalpy, kinetics, organic chemistry, etc.).
- **B** — Core skill is **biology** (genetics, evolution, cell biology, ecology, physiology, etc.).

## Misnamed schemas

Many blocks use **M_** because of legacy naming even when the content is clearly **biology, chemistry, or physics**. If the **dominant** subject of the *core move* and *exemplars* is not mathematics, the current prefix is likely wrong.

## Your task

1. Read the schema **heading** (`schema_id` and title) and the full **markdown block** (core move, context, wrong paths, notes, exemplars).
2. Decide the **correct** prefix: `M`, `P`, `B`, or `C`.
3. Set `prefix_change_needed` to `true` if the **first letter of `schema_id`** is not your recommended prefix (e.g. schema says `M_abc…` but should be `B`).
4. If the block is **over-framed as a math exam question** while it should be a science item, set `should_rewrite_block` to `true` and supply `rewritten_block_markdown`: a **complete** replacement block in the same structure as the original (heading `## **PREFIX_id. Title**`, sections, `---` at end). Keep exemplar backtick lines where possible. If only a light touch is needed, you may still rewrite for clarity.
5. If no rewrite is needed, set `should_rewrite_block` to `false` and `rewritten_block_markdown` to `null`.

## Output format

Reply with **only** a single JSON object (no markdown fences, no commentary), with these keys:

- `schema_id` (string, echo the input)
- `current_prefix` (string, one of `M`,`P`,`B`,`C`)
- `recommended_prefix` (string, one of `M`,`P`,`B`,`C`)
- `prefix_change_needed` (boolean)
- `confidence` (number from 0 to 1)
- `reason_short` (string, one or two sentences)
- `should_rewrite_block` (boolean)
- `rewritten_block_markdown` (string or null) — full block if rewriting; otherwise null
- `misnamed` (boolean) — true if `current_prefix !== recommended_prefix`
