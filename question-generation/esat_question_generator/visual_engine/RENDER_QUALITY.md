# Render quality acceptor

Vision + deterministic accept/reject for whether a generated **question + diagram** rendered properly enough for review.

This is **not** a full answer-key / syllabus grader. It focuses on:
- PNG present, non-blank, readable
- Labels / LaTeX / collisions
- Stem + options complete
- Stem and diagram roughly match

## Run against review.db

From `question-generation/esat_question_generator`:

```bash
# Deterministic baseline (no Gemini)
python -m visual_engine.scripts.eval_render_quality_acceptor --deterministic-only --no-balance --all-types

# Vision model vs manual approved/rejected (balanced, images required)
python -u -m visual_engine.scripts.eval_render_quality_acceptor --require-image --balance --limit 66 --workers 2
```

Reports land under `visual_engine/eval/output/render_quality_*` (`SUMMARY.md`, `report.json`).

## Call from Python

```python
from visual_engine.render_quality_acceptor import evaluate_review_item
from visual_engine.review_store import ReviewStore

store = ReviewStore()
item = store.get_item("nsaa-2355")
result = evaluate_review_item(item)
print(result.decision, result.summary, result.reject_reasons)
```

Model default: `MODEL_RENDER_QUALITY_ACCEPTOR` or `MODEL_DIAGRAM_VERIFIER` or `gemini-3.7-flash`.

## Benchmark vs your manual labels (Sep 2026)

Gold labels: Streamlit `approved` = ACCEPT, `rejected` = REJECT. Free-text reject reasons were empty in the DB, so comparison is label-only.

| Setup | N | Agreement | Reject recall | Notes |
|---|---:|---:|---:|---|
| Deterministic only (all labeled) | 368 | 73% | 15% | Misses most human rejects; many soft layout issues |
| Vision + deterministic (balanced) | 80 | **71%** | **68%** | Best overall vs your rejects |
| Vision calls only (subset of above) | 67 | **76%** | - | Fairer score for the Gemini path |
| Vision, PNG required (balanced) | 66 | 64% | 61% | Many human rejects look render-OK (likely content rejects) |

Interpretation:
- Vision roughly **4x** better than deterministic at catching your rejects (15% → ~68% recall).
- About **1/3** of your historical rejects still look well-rendered to the model. Those are probably content / answer / pedagogy rejects, not render failures.
- A few human **approves** still have real render bugs the model flags (literal `$` LaTeX, severe label collisions, empty flowchart boxes).
