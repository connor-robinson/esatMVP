# ESAT curriculum validation v2

## Root cause

`quality_gate/schemas.py` previously coerced any non-enum `curriculum_validation.curriculum_match`
value to **`borderline`** (and defaulted missing values to **`in_syllabus`**). That mixed genuine
borderline syllabus judgements with malformed model output (Booleans, prose, etc.).

## Fix (validator `v2`)

| Component | Path |
|-----------|------|
| Strict parser | `quality_gate/curriculum_match_parse.py` |
| Parse integration | `quality_gate/schemas.py` → `parse_quality_gate_json` |
| Live retries | `quality_gate/assess.py` (up to 2 retries on invalid match) |
| Rubric | `quality_gate/prompt_compact.md` |
| Backfill | `scripts/backfill_esat_curriculum_validation.py` |
| Manual 100 audit | `esat_manual_curriculum_backfill_100.json` (repo root) |
| Migration | `supabase/migrations/20260628120000_quality_gate_curriculum_v2.sql` |

### Allowed `curriculum_match` values

- `in_syllabus`
- `borderline`
- `out_of_syllabus` (legacy stored `off_syllabus` is accepted when **reading**)

### `curriculum_validation_status`

- `valid` — enum parsed successfully
- `invalid_model_output` — Boolean, prose, null, or unknown string
- `model_error` — reserved for API failures

Malformed output → **`human_review`**, never labelled as borderline.

## Backfill (dry-run first)

From `question-generation/esat_question_generator/`:

```bash
python scripts/backfill_esat_curriculum_validation.py --dry-run --only-human-review
python scripts/backfill_esat_curriculum_validation.py --dry-run --job-id YOUR_JOB_ID
```

Apply manual 100 decisions (after populating `esat_manual_curriculum_backfill_100.json`):

```bash
python scripts/backfill_esat_curriculum_validation.py --apply --use-manual-overrides --limit 100
```

Re-run LLM for invalid/inconsistent rows:

```bash
python scripts/backfill_esat_curriculum_validation.py --apply --only-human-review --rerun-invalid --limit 50
```

**Do not use `--apply` on the full bank until dry-run totals are reviewed.**

## Tests

```bash
python -m unittest quality_gate.tests.test_curriculum_match_parse -v
```
