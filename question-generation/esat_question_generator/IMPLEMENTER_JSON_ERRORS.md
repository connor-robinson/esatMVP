# Implementer JSON — common failures & fixes

All subjects (**M / P / C / B**) share the same `implementer_call` → `normalize_implementer_output` path in `project.py`. Coercions there apply **globally**.

When batch-generating, use this list to interpret console / `runs/<run_id>/logs.jsonl` / `rejected.jsonl` and to decide whether to tighten prompts or extend normalization.

## Canonical shape (pipeline expectation)

Top-level keys (after normalization), used by Verifier / Style / KaTeX / DB sync:

| Key | Role |
|-----|------|
| `question` | Object with at least `stem`, `options` (dict A→text), `correct_option` |
| `solution` | Object with `reasoning`, `key_insight` (strings) |
| `distractor_map` | Dict option letter → short explanation |
| `metadata` | Optional; `question_id` may be merged here |

## Symptoms → causes → mitigation

| Symptom / error substring | Typical cause | Mitigation |
|---------------------------|---------------|------------|
| `missing 'question' field` + keys like `stem`, `options` | **Flat JSON**: MCQ fields at root instead of under `question` | **Auto-fixed** in `normalize_implementer_output` |
| `missing 'question'` + `options` is a list | **List options** (`[{label,text},…]` or `"A) …"`) | **Auto-fixed** via `_coerce_options_to_dict` |
| `correct_answer` but no `correct_option` | Alias used by model | **Auto-fixed** in `_normalize_question_inner_aliases` |
| `missing 'solution' field` | Solution omitted or only `key_insight` at root | Partially auto-fixed from top-level `key_insight` + `reasoning`; else retry / prompt |
| `solution` nested under `question` | Wrong nesting | **Auto-fixed** (promoted to top-level) |
| `distractor_map` nested under `question` | Wrong nesting | **Auto-fixed** (promoted) |
| `EMPTY distractor_map` / `insufficient distractor_map` | Model skipped explanations | Implementer prompt + retry; not auto-filled |
| `failed to parse as JSON` / `JSONDecodeError` | Truncation, prose, markdown fences | `repair_implementer_json_raw` + retry |
| KaTeX errors after structure OK | Delimiters / escapes | Format fixer + KaTeX fixer passes |

## Where to look during batch runs

1. **Console** — `⚠ Implementer attempt` lines show the validation error (often includes `Available keys: [...]`).
2. **`runs/<timestamp>/logs.jsonl`** — `stage` field for `implementer` / `designer` / etc.
3. **`runs/<timestamp>/rejected.jsonl`** — full payload when a stage fails.
4. **`gemini_api_events.jsonl`** (repo root or env `GEMINI_API_EVENT_LOG`) — rate limits / API errors (not schema shape).

## Extending normalization

When you see a **new** repeating pattern:

1. Add a row to the table above (symptom → cause).
2. Implement coercion in `normalize_implementer_output` (or a helper next to `_coerce_options_to_dict`).
3. Add an entry to `implementer_json_catalog.py` (`IMPLEMENTER_JSON_FIXES`) so the catalog stays grep-friendly.

## Related files

- `project.py` — `normalize_implementer_output`, `_coerce_options_to_dict`, `implementer_call`, `implementer_regen_call`
- `implementer_json_catalog.py` — machine-readable list of known fixes
- `simple_generator_ui.py` — batch UI; uses `run_once` (same pipeline)
