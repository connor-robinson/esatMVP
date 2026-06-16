# ESAT quality rubric (compact — used for API scoring by default)

Grade **standalone** ESAT MCQs for syllabus fit, solution quality, and ESAT pacing (~90s per item). Judge only stem, options, solution, tags, and `curriculum_snapshot` — ignore generation schemas.

## Check order (internal)

1. Solve independently; do not trust stored key/solution/tags.
2. List solve-path concepts; map each to `curriculum_allowed_codes`.
3. Check subject/paper fit (Math 1 vs Math 2, Physics/Chem/Bio rules).
4. Check pacing: stem length, step count, ESAT realism (not GCSE drill unless deliberate Easy).
5. Reconcile deterministic prechecks if present — conflicts → `human_review`, not blind delete/approve.
6. Verify answer key — wrong key → `apply_fix: true` but `recommended_action: human_review` always.

## Verdicts & actions

- **Pass** / **Minor** / **Major** — not disposition outcomes.
- Actions: `approve` | `human_review` | `regenerate` | `move_to_math2` | `delete`.
- Never `approve` if: wrong key, borderline/off syllabus, pacing≤2, formatting≤2, deterministic conflict, or substantive solution gap.
- **move_to_math2**: Math 1 row but solve path fits Math 2; sound item, wrong paper — not `regenerate`.
- **too_easy**: usually `human_review`; approve only if deliberately useful Easy warm-up.

## Curriculum (strict)

- `in_syllabus` only if solve path uses **only** allowed codes for stated subject.
- Math 1 + MM/log laws/formal calculus/binomial/radians/trig rules → off Math 1; check Math 2 relocation before regenerate.
- Chem: no VSEPR/shape angles unless stem supplies rules. Bio: no action potentials/channels unless supplied. Physics: no moments/torque unless in snapshot or stem.
- Borderline → `human_review`, not approve.

## Required JSON blocks

Return **one JSON object only** (no fences). Required top-level keys:

`verdict`, `scores` (syllabus_fit, solution_quality, esat_realism_pacing — integers 1–5), `recommended_action`, `reasoning`, `exam_timing_notes`, `confidence` (high|medium|low), `calibration_tier` (null or `"gold"` ~5% elite only), `calibration_notes`, `graph_enrichment` (mode: none|candidate|missing_expected; is_candidate; suggested_stem_edits; insertion_placeholders; notes_for_human), `curriculum_validation` (syllabus_fit_score, curriculum_match, required_topic_codes, suspicious_topics, curriculum_reason, curriculum_flags), `formatting_validation` (formatting_score, formatting_issues, apply_fix, formatting_reason), `answer_key_validation` (stored_option, true_option, was_wrong, apply_fix, reason), `review_disposition` (outcome: keep|edit|disregard|regenerate|move_paper; labels; notes), `auto_fix_triage` (auto_fixable_issues, human_blocking_issues, recommended_action_after_auto_fix, reason).

Disposition mapping: keep→approve, edit→human_review, disregard→delete, regenerate→regenerate, move_paper→move_to_math2.

Wrong key: `human_review` + label `wrong_answer_key_fixed` if apply_fix. Auto-fix whitespace/key does not remove need for human review when substantive issues remain.

## Graph enrichment

Default `mode: "none"`. Use `candidate` sparingly when a diagram helps without spoiling. Use `missing_expected` when a figure seems required but absent. Not for countable-from-graph MCQs.
