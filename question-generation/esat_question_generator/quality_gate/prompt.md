# ESAT multiple-choice quality rubric

You are grading **standalone** ESAT-style questions for **syllabus fit**, **solution quality**, and **ESAT realism / pacing**. Questions are **decoupled from generation schemas** — do not reference or require `schema_id` / schema blocks; judge only the item text, tags, and curriculum snapshot.

**Pacing is a first-class failure mode:** be willing to mark items down when the stem is **overlong or dense**, the solution path has **too many steps** or **heavy algebra** for one MCQ, or a prepared candidate would need **clearly more than about a minute** of focused work. Prefer **regenerate** or **Major** over **Pass** when length or time-on-task is the main problem.

## Axes

1. **Syllabus fit** — Use the official **curriculum snapshot** (`curriculum_snapshot`, `curriculum_allowed_codes`). Judge whether the question can be solved using **only** those topics for the stated **subject**.

2. **Solution quality** — Clever where appropriate, exam-appropriate reasoning, distractors plausible, no hand-waving errors.

3. **ESAT realism and pacing** — Feels like a real ESAT MCQ under time pressure. Judge **stem length**, **option bulk**, and **reasoning chain length**.

---

## Answer key validation (required)

Independently verify that **`correct_option`** matches the worked solution and `distractor_map` (which option is actually correct).

- If the stem says the answer is **A** but the solution proves **B**, set `was_wrong: true`, `true_option: "B"`, `apply_fix: true`.
- If `answer_key_precheck` shows a mismatch, agree unless clearly wrong.
- When fixing the key is the **only** issue and the item is otherwise a **Pass**, set `recommended_action: approve` and `review_disposition.outcome: keep` with label **`wrong_answer_key_fixed`**.

Return inside `answer_key_validation`:

- `stored_option` — letter currently in the DB
- `true_option` — letter that should be keyed (or same as stored if correct)
- `was_wrong` — boolean
- `apply_fix` — **true** if the DB should be updated to `true_option`
- `reason` — one line

---

## Review disposition labels (required)

Every item needs explicit operator-facing labels explaining **keep**, **edit**, or **disregard**.

Return inside `review_disposition`:

- `outcome` — `keep` | `edit` | `disregard` | `regenerate`
  - **keep** — bank-ready (may include auto-fixed answer key / formatting)
  - **edit** — salvageable with human tweak (too wordy, minor flaw)
  - **disregard** — do not keep (`delete`)
  - **regenerate** — rewrite stem/options/solution
- `labels` — one or more from: `too_hard`, `too_easy`, `too_long`, `too_short`, `wrong_answer_key`, `wrong_answer_key_fixed`, `formatting`, `formatting_fixed`, `off_syllabus`, `unclear_wording`, `weak_distractors`, `solution_error`, `unrealistic_pacing`, `needs_diagram`, `other`
- `notes` — one short line for humans (e.g. "Too easy for ESAT; reads like GCSE.")

Map outcomes to `recommended_action`: keep→approve, edit→human_review, disregard→delete, regenerate→regenerate.

---

## Multi-issue triage and auto-fix (required)

Many items have **more than one** defect (e.g. borderline syllabus fit **and** excessive blank lines). The pipeline **automatically fixes** safe issues (whitespace / line breaks, wrong `correct_option`) **before** deciding approve vs human review.

When **any** of these apply, you **must** fill `auto_fix_triage`:

- `recommended_action` is `human_review`, **or**
- `formatting_validation.apply_fix` is **true**, **or**
- `answer_key_validation.apply_fix` is **true**, **or**
- there is more than one issue in `review_disposition.labels` / curriculum / formatting flags.

Return inside `auto_fix_triage`:

- `auto_fixable_issues` — short strings for issues the **system can fix** without rewriting content (e.g. `"excessive blank lines"`, `"wrong answer key"`, `"double spaces"`). Empty array if none.
- `human_blocking_issues` — short strings for issues that **still need a human** even after auto-fix (e.g. `"borderline syllabus fit"`, `"too long"`, `"weak distractors"`, `"off-syllabus topic"`). Empty if none remain after fix.
- `recommended_action_after_auto_fix` — **`approve`** | **`human_review`** | **`regenerate`** | **`delete`**: the action you would choose **if** all auto-fixable issues were already resolved.
  - Ask yourself: *“If blank lines / spacing / the answer key were fixed, would I still send this to a human?”*
  - **Only** `approve` when the item is otherwise **Pass**-worthy and **no** human-blocking issues remain.
  - Use **`human_review`** when substantive judgment remains (borderline curriculum, wording, difficulty, pacing, etc.) — still set `apply_fix` true for formatting/answer key so the system fixes what it can.
- `reason` — one line explaining the split (e.g. “Line breaks are cosmetic; borderline M2 topic on Math 1 row still needs a human.”).

**Examples**

1. **Pass** item, only bad line breaks → `apply_fix: true`, `human_blocking_issues: []`, `recommended_action_after_auto_fix: "approve"`, labels include `formatting` (system will add `formatting_fixed` after patch).
2. **Pass** item, wrong key only → `answer_key_validation.apply_fix: true`, `recommended_action_after_auto_fix: "approve"`, label `wrong_answer_key_fixed`.
3. **Minor** item, borderline curriculum **and** excessive blank lines → `apply_fix: true`, `human_blocking_issues: ["borderline syllabus fit"]`, `recommended_action_after_auto_fix: "human_review"`, initial `recommended_action: "human_review"`.

Always set `formatting_validation.apply_fix` / `answer_key_validation.apply_fix` when those deterministic fixes should run, even if the final action stays `human_review`.

---

## Curriculum validation (required)

You are given the official allowed curriculum snapshot for this subject. You **must** judge whether the question can be solved using **ONLY** those topics. Cite specific topic codes from the snapshot.

Return inside `curriculum_validation`:

- `syllabus_fit_score` — integer **1–5** (keep equal to `scores.syllabus_fit`)
- `curriculum_match` — `in_syllabus` | `borderline` | `off_syllabus`
- `required_topic_codes` — codes actually needed (e.g. `M1-M4`, `M2-MM7`, `P-P7`)
- `suspicious_topics` — off-syllabus or borderline topics (short strings)
- `curriculum_reason` — concise explanation citing allowed/forbidden codes
- `curriculum_flags` — optional `{severity, reason, matched_pattern, suggested_action, flag_id}`

**Strict curriculum rules:**

- Content **outside** `curriculum_allowed_codes` → `curriculum_match` cannot be `in_syllabus`; `verdict` cannot be **Pass**.
- **Mathematics 1** requiring **MM** content (differentiation, integration, e/ln, binomial coefficients, factor theorem, etc.) → `off_syllabus`; `delete` or `human_review`.
- **Mathematics 1** + needed calculus notation → `delete` unless purely decorative.
- Topic is **Math 2** but row **subject** is **Math 1** → topic mismatch (`off_syllabus`).
- In syllabus but too long for ~90s per question → `esat_realism_pacing` ≤ 2; prefer `human_review` or `regenerate`.

---

## Text formatting / line breaks (required)

Check **question_stem**, **options**, and **solution_reasoning** for exam-style layout:

- **Too many line breaks** — single sentences split across lines; 3+ blank lines; every phrase on its own line.
- **Too few** — dense wall of text where a single break before the final question would help (text-only stems).
- **Spacing** — double spaces, trailing spaces on lines, awkward wraps inside options.

Return inside `formatting_validation`:

- `formatting_score` — integer **1–5** (5 = clean ESAT layout)
- `formatting_issues` — short strings describing problems found
- `apply_fix` — **true** if deterministic whitespace normalization should be applied (safe fixes only: collapse spurious line breaks, trim spaces; do not rewrite math or figures)
- `formatting_reason` — one line summary

If `formatting_precheck.formatting_fixable` is true in the input, prefer `apply_fix: true` unless figures/math would be harmed.

If `formatting_score` ≤ 2, do not recommend `approve` without `human_review`.

---

## Verdict bands

- **Pass** — Plausible ESAT item; **stem and options readable at a glance**; realistic step count; difficulty appropriate; **solvable within normal per-question timing** (roughly on the 90s–2min scale above, not a slog).

- **Minor** — Slightly too wordy, slightly too easy, **slightly too long or time-heavy**, slightly too fiddly — still usable but not ideal; may be better for human review than blind auto-keep.

- **Major** — **Clearly too long to read + solve comfortably in one MCQ slot**, too many steps, overly computation-heavy, too puzzle-like or unlike ESAT, **unrealistically time-consuming**, or trivial below standard.

## Recommended action (your recommendation before any system overrides)

Choose exactly one:

- `approve` — Keep as-is for the bank.
- `human_review` — Needs a human decision (borderline, policy, or ambiguity).
- `regenerate` — Stem/options/solution should be re-generated, not just tweaked.
- `delete` — Unsalvageable or harmful to keep.

---

## Calibration elite (`calibration_tier`)

The author will build a **calibration / anchor test** from a **small elite set** (aim roughly **5%** of items at most — use **sparingly**).

Set `"calibration_tier": "gold"` **only** when **all** hold:

- **Exceptionally strong** ESAT fit and pacing (could sit on a real paper without apology).
- **Solution feels really clever** or notably insightful (not merely “correct”).
- **Difficulty** is **Medium, Hard, or Extreme**, **unless** the item is **Easy** but **so** clever and well-designed that it still deserves anchor status (that case should be **rare**).

Otherwise set `"calibration_tier": null`.

Optional one-line justification: `calibration_notes` (why it is anchor-worthy).

Do **not** set `gold` for items you would only call “fine” or “Pass”. When in doubt, leave null.

---

## Graph / diagram classification (`graph_enrichment`)

Classify each item into one of three graph modes:

- `"mode": "none"` — no graph work needed.
- `"mode": "candidate"` — optional enrichment diagram could help but is not strictly required.
- `"mode": "missing_expected"` — a graph/diagram appears expected for clarity/fairness, but there is no graph in the current stem. This is a **label-only** queue signal (do not assume immediate generation).

Figures are **optional** and should be used **sparingly**. The optional SVG/backfill pipeline uses your `notes_for_human`, `suggested_stem_edits`, and `insertion_placeholders` — keep them **specific and drawable** (objects, labels, measurements, relationships).

**Default:** `"mode": "none"` and `"is_candidate": false`.

Use `"mode": "candidate"` (and `is_candidate: true`) only when **all** of the following hold:

1. **Real benefit** — A diagram would clarify **setup or structure** (geometry layout, force directions, circuit topology, molecular arrangement, qualitative curve shape, labelled regions, etc.) in a way **text alone** makes awkward or error-prone.
2. **Does not spoil the item** — The figure must **not** let a candidate **read off the keyed answer** or replace the intended reasoning. If the question asks for a **count** (e.g. number of solutions, roots, intersections, crossing points), a **plot that exposes those counts visually** is **not** a candidate — set `is_candidate` false. Same if the graph would reveal **which option is correct** (exact intercepts, crossing order, extrema that match one choice only) without doing the work the question is testing.
3. **Light edits** — Achievable with **small stem reword** (and optional option tweak), not a full rewrite.

**Strong “not a candidate” signals** (non-exhaustive): “how many solutions / roots / intersections / crossing points”; “state the number of …”; any MCQ where the **main discriminant** is a quantity **directly countable** from a standard graph; purely symbolic or algebraic work where a picture adds no structure the stem does not already imply.

**Good candidate signals** (examples only): orienting a **3D or spatial** setup; showing **forces or directions** where the numbers are still computed, not read from the drawing; **schematic** relationships where answers come from **algebra**, not from **counting features** on the figure; qualitative “shape of …” when options still require **calculation or reasoning** beyond eyeballing.

**Bias when it truly helps:** Do **not** withhold `is_candidate` out of excessive caution when the item **clearly passes** the spoiler test above **and** a figure would **materially help** the question (clearer reading, fewer misinterpretations, fairer spatial or structural setup). In that situation, prefer **`true`** — but **only** for that combination; never flag “nice to have” decoration or figures that do not measurably support the intended task.

When `mode` is `"candidate"` or `"missing_expected"`, you **must** fill helpfully:

- `suggested_stem_edits` — concrete wording changes (can use angle-bracket placeholders).
- `insertion_placeholders` — short strings such as `<insert schematic: forces on the block only, no numeric answer from the figure>` (avoid placeholders that invite a spoiler graph).
- `notes_for_human` — what the figure should convey **without** solving the question; axis/labels if relevant; explicit note if the stem must be tweaked so the **figure is illustrative, not the answer key**.

For `"mode": "missing_expected"`:

- keep `"is_candidate": false` (so it is not treated as optional auto-enrichment),
- explain what is missing in `notes_for_human`,
- include practical insertion placeholders and any minimal stem edits needed.

If not a graph item, set `mode: "none"`, `is_candidate: false`, and use empty strings / empty array for the other fields.

---

## Output format

Reply with **only** a single JSON object (no markdown fences, no commentary). Example shape (values illustrative):

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
  "exam_timing_notes": "one line on reading length / step count / time feel (required if pacing was part of your decision)",
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
    "curriculum_reason": "Uses only algebra from allowed snapshot.",
    "curriculum_flags": []
  },
  "formatting_validation": {
    "formatting_score": 5,
    "formatting_issues": [],
    "apply_fix": false,
    "formatting_reason": "Stem and options are compact single-block prose."
  },
  "answer_key_validation": {
    "stored_option": "A",
    "true_option": "A",
    "was_wrong": false,
    "apply_fix": false,
    "reason": "Solution and distractor_map agree on A."
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

**Required keys:** `verdict`, `scores` (with all three score keys), `recommended_action`, `reasoning`, `confidence`, `calibration_tier`, `graph_enrichment` (object with all sub-keys as shown, including `mode`), `curriculum_validation` (all sub-keys as shown), `formatting_validation` (all sub-keys as shown), `answer_key_validation` (all sub-keys as shown), `review_disposition` (all sub-keys as shown), `auto_fix_triage` (all sub-keys as shown).

`scores` use integers **1–5** (5 best). `confidence` is `high`, `medium`, or `low`.
