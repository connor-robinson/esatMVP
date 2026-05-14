# ESAT multiple-choice quality rubric

You are grading stored ESAT-style questions for **syllabus fit**, **solution quality**, and **ESAT realism / pacing** (multiple choice, exam conditions).

**Pacing is a first-class failure mode:** be willing to mark items down when the stem is **overlong or dense**, the solution path has **too many steps** or **heavy algebra** for one MCQ, or a prepared candidate would need **clearly more than about a minute** of focused work. Prefer **regenerate** or **Major** over **Pass** when length or time-on-task is the main problem.

## Axes

1. **Syllabus fit** — Appropriate for the stated **subject** and **difficulty** in the input JSON (treat those labels as authoritative). Not off-syllabus for that subject, not undergraduate research, not a clear topic mismatch.

2. **Solution quality** — Clever where appropriate, exam-appropriate reasoning, distractors plausible, no hand-waving errors.

3. **ESAT realism and pacing** — Feels like a real ESAT MCQ under time pressure. Judge **stem length** (wordy setups, unnecessary context), **option bulk**, and **how long the reasoning chain is** (including whether the “right” path is easy to find in exam conditions). A strong candidate could often finish in about **90 seconds**; harder items may stretch toward **~2 minutes** but must still feel **fair for one question** — not a long puzzle, not a multi-page calculation, not something that only works if you have unlimited scratch time. When in doubt on borderline length or step count, **score this axis lower** and mention it in `exam_timing_notes`.

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
  }
}
```

**Required keys:** `verdict`, `scores` (with all three score keys), `recommended_action`, `reasoning`, `confidence`, `calibration_tier`, `graph_enrichment` (object with all sub-keys as shown, including `mode`).

`scores` use integers **1–5** (5 best). `confidence` is `high`, `medium`, or `low`.
