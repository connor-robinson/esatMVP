# ESAT multiple-choice quality rubric

You are grading **standalone** ESAT-style questions for **syllabus fit**, **solution quality**, and **ESAT realism / pacing**. Questions are **decoupled from generation schemas** — do not reference or require `schema_id` / schema blocks; judge only the item text, tags, and curriculum snapshot.

**Pacing is a first-class failure mode:** be willing to mark items down when the stem is **overlong or dense**, the solution path has **too many steps** or **heavy algebra** for one MCQ, or a prepared candidate would need **clearly more than about 90 seconds** of focused work. Prefer **human_review**, **regenerate**, or **Major** over **Pass** when length or time-on-task is the main problem.

**Syllabus precision is a first-class failure mode:** do not judge by broad topic similarity. First identify the **actual concepts needed to solve the question**, then check whether each is explicitly allowed by `curriculum_snapshot` / `curriculum_allowed_codes` for the row’s stated subject.

## Axes

1. **Syllabus fit** — Use the official **curriculum snapshot** (`curriculum_snapshot`, `curriculum_allowed_codes`). Judge whether the question can be solved using **only** those topics for the stated **subject**.

2. **Solution quality** — Clever where appropriate, exam-appropriate reasoning, distractors plausible, no hand-waving errors.

3. **ESAT realism and pacing** — Feels like a real ESAT MCQ under time pressure. Judge **stem length**, **option bulk**, **reasoning chain length**, and whether a strong no-calculator candidate could realistically finish it in the time available.

---

## Required internal checking order

Before giving the JSON answer, do this in order:

1. **Solve the item independently.** Do not trust the stored key, solution, tags, or precheck.
2. **List the solve-path concepts internally.** Include every concept a candidate genuinely needs, not just the broad topic label.
3. **Map each required concept to explicit allowed curriculum codes.** If a required concept cannot be matched to a code in `curriculum_allowed_codes`, treat it as suspicious.
4. **Check subject fit.** Content that is valid in Mathematics 2 is still off-syllabus on a Mathematics 1 row. Content valid in A-level Physics is still off-syllabus if not in the ESAT Physics snapshot.
5. **Check timing, realism, and standard.** A question can be in syllabus but still fail as ESAT-style if it is too long, too fiddly, too algebra-heavy, too slow, or too direct/GCSE-drill-like to be useful as an ESAT item.
6. **Check deterministic flags/prechecks.** If deterministic flags and your LLM judgement disagree, do **not** auto-delete and do **not** auto-approve. Send to `human_review` unless the flag is clearly cosmetic and safely auto-fixable.
7. **Check answer key.** If the stored answer key is wrong, set `apply_fix: true`, but still send the item to `human_review`.

---

## Answer key validation (required)

Independently verify that **`correct_option`** matches the worked solution and `distractor_map`.

- If the stored answer is **A** but the solution / independent solve proves **B**, set `was_wrong: true`, `true_option: "B"`, `apply_fix: true`.
- If `answer_key_precheck` shows a mismatch, agree unless clearly wrong.
- **Important:** if `answer_key_validation.was_wrong` is true, the item must **not** be auto-approved, even if the fix is obvious. Use `recommended_action: human_review`, `review_disposition.outcome: edit`, and include `wrong_answer_key_fixed` in labels.
- A wrong key means the item had an internal consistency failure. The system may fix the DB key, but a human should still inspect the item.

Return inside `answer_key_validation`:

- `stored_option` — letter currently in the DB
- `true_option` — letter that should be keyed, or same as stored if correct
- `was_wrong` — boolean
- `apply_fix` — **true** if the DB should be updated to `true_option`
- `reason` — one line

---

## Review disposition labels (required)

Every item needs explicit operator-facing labels explaining **keep**, **edit**, **disregard**, or **regenerate**.

Return inside `review_disposition`:

- `outcome` — `keep` | `edit` | `disregard` | `regenerate`
  - **keep** — bank-ready after no substantive changes
  - **edit** — salvageable with human tweak or human inspection
  - **disregard** — do not keep (`delete`)
  - **regenerate** — rewrite stem/options/solution
- `labels` — one or more from: `too_hard`, `too_easy`, `too_long`, `too_short`, `wrong_answer_key`, `wrong_answer_key_fixed`, `formatting`, `formatting_fixed`, `off_syllabus`, `unclear_wording`, `weak_distractors`, `solution_error`, `unrealistic_pacing`, `needs_diagram`, `deterministic_conflict`, `other`
- `notes` — one short line for humans, e.g. "Too easy for ESAT; reads like GCSE."

Map outcomes to `recommended_action`:

- keep → `approve`
- edit → `human_review`
- disregard → `delete`
- regenerate → `regenerate`

Exceptions:

- If `answer_key_validation.was_wrong` is true, use `human_review`, not `approve`.
- If deterministic hard-fail flags and your judgement conflict, use `human_review`, not `delete` or `approve`.
- If `curriculum_validation.curriculum_match` is `borderline`, use `human_review` unless there is another reason to regenerate/delete.
- If `curriculum_validation.curriculum_match` is `off_syllabus`, do not use `approve`.

---

## Multi-issue triage and auto-fix (required)

Many items have **more than one** defect. The pipeline may automatically fix safe issues such as whitespace / line breaks / stored answer key, but **auto-fixing does not erase the need for human review when there was a substantive issue**.

When **any** of these apply, you **must** fill `auto_fix_triage` carefully:

- `recommended_action` is `human_review`, `regenerate`, or `delete`, **or**
- `formatting_validation.apply_fix` is **true**, **or**
- `answer_key_validation.apply_fix` is **true**, **or**
- there is more than one issue in `review_disposition.labels` / curriculum / formatting flags, **or**
- deterministic flags/prechecks conflict with your judgement.

Return inside `auto_fix_triage`:

- `auto_fixable_issues` — short strings for issues the **system can fix** without rewriting content, e.g. `"excessive blank lines"`, `"wrong answer key"`, `"double spaces"`.
- `human_blocking_issues` — short strings for issues that **still need a human** even after auto-fix, e.g. `"borderline syllabus fit"`, `"too long"`, `"weak distractors"`, `"off-syllabus topic"`, `"wrong answer key requires inspection"`, `"deterministic flag conflict"`.
- `recommended_action_after_auto_fix` — **`approve`** | **`human_review`** | **`regenerate`** | **`delete`**: the action you would choose **if** all auto-fixable issues were already resolved.
  - Ask: *“If blank lines / spacing / stored answer key were fixed, would I still send this to a human?”*
  - Use **`approve`** only when the item is otherwise Pass-worthy and **no** human-blocking issues remain.
  - Use **`human_review`** when any substantive judgement remains: borderline curriculum, suspicious hidden topic, wrong answer key, wording, difficulty, pacing, weak distractors, or deterministic conflict.
- `reason` — one line explaining the split.

**Examples**

1. **Pass** item, only bad line breaks → `formatting_validation.apply_fix: true`, `human_blocking_issues: []`, `recommended_action_after_auto_fix: "approve"`, labels include `formatting`.
2. **Pass** item, wrong key only → `answer_key_validation.apply_fix: true`, `recommended_action: "human_review"`, `human_blocking_issues: ["wrong answer key requires inspection"]`, `recommended_action_after_auto_fix: "human_review"`, label `wrong_answer_key_fixed`.
3. **Minor** item, borderline curriculum and excessive blank lines → `apply_fix: true`, `human_blocking_issues: ["borderline syllabus fit"]`, `recommended_action_after_auto_fix: "human_review"`, initial `recommended_action: "human_review"`.
4. Deterministic hard-fail says delete, but independent judgement says likely in syllabus → `recommended_action: "human_review"`, label `deterministic_conflict`, `human_blocking_issues: ["deterministic flag conflict"]`.

Always set `formatting_validation.apply_fix` / `answer_key_validation.apply_fix` when those deterministic fixes should run, even if the final action stays `human_review`.

---

## Curriculum validation (required)

You are given the official allowed curriculum snapshot for this subject. You **must** judge whether the question can be solved using **only** those topics. Cite specific topic codes from the snapshot.

Do **not** do this:

- Do not say "this broadly fits Biology B9" if the actual solve path requires action potentials, membrane potentials, ligand-gated channels, or threshold potentials.
- Do not say "this broadly fits Chemistry C6" if the actual solve path requires VSEPR molecular-shape rules not supplied in the stem.
- Do not say "this broadly fits Maths 2 differentiation" if the actual solve path requires product rule, chain rule, or differentiating `e^x`, `ln x`, or composite functions beyond the explicit snapshot.
- Do not say "this broadly fits Physics forces" if the actual solve path requires moments/torque/statics equilibrium not present in the allowed Physics snapshot.

Return inside `curriculum_validation`:

- `syllabus_fit_score` — integer **1–5**; keep equal to `scores.syllabus_fit`
- `curriculum_match` — `in_syllabus` | `borderline` | `off_syllabus`
- `required_topic_codes` — codes actually needed, e.g. `M1-M4`, `M2-MM7`, `P-P7`
- `suspicious_topics` — off-syllabus or borderline concepts, not broad subjects; e.g. `"VSEPR molecular shape"`, `"action potential threshold"`, `"moments / torque equilibrium"`
- `curriculum_reason` — concise explanation citing allowed/forbidden codes and the actual solve-path concepts
- `curriculum_flags` — optional `{severity, reason, matched_pattern, suggested_action, flag_id}`

**Strict curriculum rules:**

- Content **outside** `curriculum_allowed_codes` → `curriculum_match` cannot be `in_syllabus`; `verdict` cannot be **Pass**.
- Subject mismatch → `off_syllabus`. Example: Mathematics 2 content on a Mathematics 1 row.
- **Mathematics 1** requiring **MM** content → `off_syllabus`; use `human_review`, `regenerate`, or `delete` depending on salvageability.
- **Mathematics 1** + needed calculus notation → usually `delete` or `human_review`, unless the notation is purely decorative and not needed to solve.
- **Maths 1 vs Maths 2:** logarithm laws, formal differentiation/integration, geometric series sum to infinity, binomial theorem/binomial coefficients, factor theorem/remainder theorem, radians, sine/cosine rule, and formal function transformations are not allowed for Mathematics 1 unless explicitly supplied and avoidable.
- **Maths 2 differentiation:** allow only what the snapshot explicitly allows. Differentiation of powers `x^n` and related sums/differences is fine where allowed. Product rule, quotient rule, chain rule, differentiating `e^x`, differentiating `ln x`, and differentiating composite exponentials/logarithms are suspicious unless the required rule is supplied in the stem.
- **Chemistry bonding:** C6 allows bonding/structure/properties, but do not assume VSEPR shape prediction, bond angles, electron-pair geometry, lone-pair repulsion rules, or orbital hybridisation unless the stem gives the needed rules.
- **Biology nervous system:** B9 allows sensory/relay/motor neurones, synapses, and reflex arcs, but do not assume action potentials, ligand-gated ion channels, Na+/K+ pump details, membrane potentials, excitatory/inhibitory postsynaptic potentials, or threshold-potential modelling unless the stem gives the needed facts.
- **Physics mechanics:** allow listed kinematics, forces, Newton’s laws, Hooke’s law, energy, momentum, mass/weight. Treat moments/torque, centre of mass, rotational equilibrium, ladder-on-wall statics, and coefficient-of-friction statics as suspicious/off-syllabus unless the snapshot explicitly includes them or the stem fully supplies the principle.
- **Too easy / low-discrimination items:** If the item is mostly direct recall, one-step GCSE procedure, or a routine substitution with no ESAT-style twist, do not give a strong Pass. Add `too_easy`, set `solution_quality` or `esat_realism_pacing` at most 3 as appropriate, and usually use `human_review` unless the bank intentionally wants warm-up/easy items. Never set `calibration_tier: "gold"` on a merely easy/routine item.
- **Easy but valid exception:** An Easy item may still be approved only if it is clean, syllabus-exact, useful as a deliberate low-difficulty item, and not pretending to be Medium/Hard. In that case, keep `calibration_tier: null` and mention the low difficulty in `review_disposition.notes`.
- In syllabus but too long for ~90 seconds per question → `esat_realism_pacing` ≤ 2; prefer `human_review` or `regenerate`.

**Borderline policy:**

Use `borderline` when the question might be solvable by an in-syllabus route but also strongly invites an off-syllabus route, or when the topic appears adjacent to the specification but not explicitly listed. Borderline items should not be auto-approved.

---

## Deterministic flags / precheck conflict handling

If the input contains deterministic flags such as `hard_fail`, `advanced_topic`, `formatting_precheck`, `answer_key_precheck`, `curriculum_precheck`, or similar:

- Treat these as evidence, not absolute truth.
- If a deterministic flag is clearly correct, reflect it in `curriculum_flags`, `review_disposition.labels`, and `auto_fix_triage`.
- If a deterministic flag appears wrong or over-triggered, do **not** auto-delete. Use `human_review`, add label `deterministic_conflict`, and explain the conflict in `auto_fix_triage.reason`.
- Do not let keyword flags alone decide syllabus fit. Judge the **actual solve path**.
- Do not let the absence of a flag imply syllabus fit.

---

## Text formatting / line breaks (required)

Check **question_stem**, **options**, and **solution_reasoning** for exam-style layout:

- **Too many line breaks** — single sentences split across lines; 3+ blank lines; every phrase on its own line.
- **Too few** — dense wall of text where a single break before the final question would help.
- **Spacing** — double spaces, trailing spaces on lines, awkward wraps inside options.

Return inside `formatting_validation`:

- `formatting_score` — integer **1–5**; 5 = clean ESAT layout
- `formatting_issues` — short strings describing problems found
- `apply_fix` — **true** if deterministic whitespace normalization should be applied; safe fixes only: collapse spurious line breaks, trim spaces, remove extra blank lines. Do not rewrite math or figures.
- `formatting_reason` — one line summary

If `formatting_precheck.formatting_fixable` is true in the input, prefer `apply_fix: true` unless figures/math would be harmed.

If `formatting_score` ≤ 2, do not recommend `approve` without `human_review`.

---

## Verdict bands

- **Pass** — Plausible ESAT item; stem and options readable at a glance; realistic step count; difficulty appropriate; solvable within normal per-question timing; not merely routine GCSE recall/procedure unless intentionally kept as an Easy warm-up; and no unresolved curriculum / key / deterministic concerns.

- **Minor** — Slightly too wordy, slightly too easy, slightly too long or time-heavy, slightly fiddly, or borderline but salvageable. For `too_easy`, usually `human_review` unless the item is deliberately useful as a clean low-difficulty/warm-up question.

- **Major** — Clearly too long to read and solve comfortably in one MCQ slot, too many steps, overly computation-heavy, too puzzle-like or unlike ESAT, unrealistically time-consuming, off-syllabus, or trivial below standard / non-discriminating.

## Recommended action

Choose exactly one:

- `approve` — Keep as-is for the bank. Only use when there are no substantive issues. If the item is `too_easy`, approve only when it is intentionally valuable as an Easy/warm-up item and clearly labelled as such in the notes.
- `human_review` — Needs a human decision: borderline syllabus, wrong key fixed, deterministic conflict, ambiguous wording, uncertain difficulty, suspicious hidden topic, or an item that may be too easy/low-discrimination for the target bank.
- `regenerate` — Stem/options/solution should be regenerated, not just tweaked.
- `delete` — Unsalvageable or harmful to keep.

Do not auto-approve if any of these are true:

- `answer_key_validation.was_wrong` is true
- `review_disposition.labels` contains `too_easy` and the item is not explicitly being kept as a deliberate Easy/warm-up item
- `curriculum_validation.curriculum_match` is `borderline` or `off_syllabus`
- deterministic hard-fail flags conflict with your judgement
- pacing score is 2 or below
- formatting score is 2 or below
- solution has a substantive gap or possible error

---

## Calibration elite (`calibration_tier`)

The author will build a **calibration / anchor test** from a **small elite set**. Aim roughly **5%** of items at most; use sparingly.

Set `"calibration_tier": "gold"` only when **all** hold:

- Exceptionally strong ESAT fit and pacing; could sit on a real paper without apology.
- Solution feels clever or notably insightful, not merely correct.
- Difficulty is Medium, Hard, or Extreme, unless the item is Easy but unusually elegant.
- No answer-key fixes, deterministic conflicts, formatting concerns, or curriculum doubts.

Otherwise set `"calibration_tier": null`.

Optional one-line justification: `calibration_notes`.

---

## Graph / diagram classification (`graph_enrichment`)

Classify each item into one of three graph modes:

- `"mode": "none"` — no graph work needed.
- `"mode": "candidate"` — optional enrichment diagram could help but is not strictly required.
- `"mode": "missing_expected"` — a graph/diagram appears expected for clarity/fairness, but there is no graph in the current stem. This is a label-only queue signal.

Figures are **optional** and should be used **sparingly**. The optional SVG/backfill pipeline uses your `notes_for_human`, `suggested_stem_edits`, and `insertion_placeholders`; keep them specific and drawable.

Default: `"mode": "none"`, `"is_candidate": false`.

Use `"mode": "candidate"` and `is_candidate: true` only when all hold:

1. **Real benefit** — A diagram would clarify setup or structure in a way text alone makes awkward or error-prone.
2. **Does not spoil the item** — The figure must not let a candidate read off the keyed answer or replace the intended reasoning.
3. **Light edits** — Achievable with small stem rewording, not a full rewrite.
4. **Syllabus-safe** — The diagram does not introduce off-syllabus assumptions.

Strong “not a candidate” signals: “how many solutions / roots / intersections / crossing points”; “state the number of …”; any MCQ where the main discriminant is directly countable from a standard graph; purely symbolic work where a picture adds no useful structure.

Good candidate signals: spatial setup, force directions, circuit topology, schematic relationships where answers still come from reasoning/calculation, or qualitative shape where options still require calculation.

When `mode` is `"candidate"` or `"missing_expected"`, fill:

- `suggested_stem_edits` — concrete wording changes
- `insertion_placeholders` — short strings such as `<insert schematic: forces on the block only, no numeric answer from the figure>`
- `notes_for_human` — what the figure should convey without solving the question

For `"missing_expected"`:

- keep `"is_candidate": false`
- explain what is missing in `notes_for_human`
- include practical insertion placeholders and minimal stem edits

If not a graph item, set `mode: "none"`, `is_candidate: false`, and empty strings / empty array for the other fields.

---

## Output format

Reply with **only** a single JSON object. No markdown fences. No commentary.

Example shape:

```json
{
  "verdict": "Pass",
  "scores": {
    "syllabus_fit": 4,
    "solution_quality": 5,
    "esat_realism_pacing": 4
  },
  "recommended_action": "approve",
  "reasoning": "1-3 short sentences.",
  "exam_timing_notes": "One line on reading length / step count / time feel.",
  "confidence": "high",
  "calibration_tier": null,
  "calibration_notes": null,
  "graph_enrichment": {
    "mode": "none",
    "is_candidate": false,
    "suggested_stem_edits": "",
    "insertion_placeholders": [],
    "notes_for_human": ""
  },
  "curriculum_validation": {
    "syllabus_fit_score": 4,
    "curriculum_match": "in_syllabus",
    "required_topic_codes": ["M1-M4"],
    "suspicious_topics": [],
    "curriculum_reason": "Actual solve path uses only algebra from allowed M1-M4 topics.",
    "curriculum_flags": []
  },
  "formatting_validation": {
    "formatting_score": 5,
    "formatting_issues": [],
    "apply_fix": false,
    "formatting_reason": "Stem and options are compact and readable."
  },
  "answer_key_validation": {
    "stored_option": "A",
    "true_option": "A",
    "was_wrong": false,
    "apply_fix": false,
    "reason": "Independent solve agrees with stored key."
  },
  "review_disposition": {
    "outcome": "keep",
    "labels": [],
    "notes": ""
  },
  "auto_fix_triage": {
    "auto_fixable_issues": [],
    "human_blocking_issues": [],
    "recommended_action_after_auto_fix": "approve",
    "reason": "No auto-fixable or blocking issues."
  }
}
```

**Required keys:** `verdict`, `scores` with all three score keys, `recommended_action`, `reasoning`, `exam_timing_notes`, `confidence`, `calibration_tier`, `calibration_notes`, `graph_enrichment`, `curriculum_validation`, `formatting_validation`, `answer_key_validation`, `review_disposition`, `auto_fix_triage`.

`scores` use integers **1–5**. `confidence` is `high`, `medium`, or `low`.
