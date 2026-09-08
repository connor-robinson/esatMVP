"""Generate NSAA-sourced sibling/far diagram questions into the review queue.

Example:

    python -m visual_engine.nsaa_batch --n 10
    python -m visual_engine.nsaa_batch --dry-run
"""

from __future__ import annotations

import argparse
import json
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_PKG_ROOT = Path(__file__).resolve().parent.parent
_QGEN_ROOT = _PKG_ROOT.parent
if str(_PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(_PKG_ROOT))
if str(_QGEN_ROOT) not in sys.path:
    sys.path.insert(0, str(_QGEN_ROOT))

from visual_engine.auto_checks import has_reject
from visual_engine.diagram_designer import DiagramDesignerInput
from visual_engine.eval.question_selector import (
    EvalQuestion,
    download_diagram,
    select_nsaa_diagram_questions,
)
from visual_engine.generation import generate_diagram, regenerate_diagram
from visual_engine.question_designer import (
    NSAA_DIAGRAM_MODEL,
    NsaaQuestionDesign,
    NsaaQuestionDesignerInput,
    run_nsaa_question_designer,
)
from visual_engine.review_store import ReviewStore

ARTIFACTS = Path(__file__).resolve().parent / "review_data" / "artifacts"
STATUS_PATH = Path(__file__).resolve().parent / "review_data" / "nsaa_batch_status.json"
PIPELINE = "nsaa"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def nsaa_question_id(source_id: int | str) -> str:
    return f"nsaa-{source_id}"


def _write_status(payload: dict[str, Any]) -> None:
    STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATUS_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _load_env() -> None:
    from visual_engine.llm import _load_env as load_diagram_env

    load_diagram_env()


def _parse_options(raw: Any) -> dict[str, str]:
    if isinstance(raw, dict):
        return {str(k).strip().upper(): str(v) for k, v in raw.items() if str(v).strip()}
    return {}


def attach_source_options(questions: list[EvalQuestion]) -> dict[int, dict[str, str]]:
    """Best-effort options from live questions / conversions. Empty if DB unavailable."""
    if not questions:
        return {}
    try:
        from past_paper_converter.db import make_client
    except Exception:
        return {}
    ids = [eq.question_id for eq in questions]
    by_id: dict[int, dict[str, str]] = {}
    try:
        client = make_client()
        for i in range(0, len(ids), 100):
            chunk = ids[i : i + 100]
            rows = (
                client.table("questions")
                .select("id, options")
                .in_("id", chunk)
                .execute()
                .data
                or []
            )
            for row in rows:
                opts = _parse_options(row.get("options"))
                if opts:
                    by_id[int(row["id"])] = opts
            conv_rows = (
                client.table("question_conversions")
                .select("question_id, options, status")
                .in_("question_id", chunk)
                .eq("status", "auto_approved")
                .execute()
                .data
                or []
            )
            for row in conv_rows:
                qid = int(row["question_id"])
                if qid in by_id:
                    continue
                opts = _parse_options(row.get("options"))
                if opts:
                    by_id[qid] = opts
    except Exception:
        return by_id
    return by_id


def already_generated_ids(store: ReviewStore) -> set[int]:
    found: set[int] = set()
    for item in store.list_items(status_filter="all", latest_only=True, pipeline=PIPELINE):
        qid = str(item.get("question_id") or "")
        if qid.startswith("nsaa-"):
            try:
                found.add(int(qid.split("-", 1)[1]))
            except ValueError:
                continue
        source = {}
        try:
            source = json.loads(item.get("source_json") or "{}")
        except json.JSONDecodeError:
            source = {}
        raw = source.get("source_question_id")
        if raw is not None:
            try:
                found.add(int(raw))
            except (TypeError, ValueError):
                pass
    return found


def _idea_plan_for_diagram(design: NsaaQuestionDesign) -> dict[str, Any]:
    plan = dict(design.idea_plan or {})
    plan["new_question"] = {
        "stem": design.stem,
        "options": design.options,
        "correct_option": design.correct_option,
    }
    plan["variation_mode"] = design.variation_mode
    return plan


def _enqueue(
    store: ReviewStore,
    *,
    question_id: str,
    design: NsaaQuestionDesign,
    source: dict[str, Any],
    png_path: str,
    spec_path: str,
    spec: dict[str, Any] | None,
    source_image_path: str,
    auto_flags: list[dict[str, Any]],
    attempt: int = 1,
    parent_attempt_id: int | None = None,
    previous_attempt_ids: list[int] | None = None,
    original_spec: dict[str, Any] | None = None,
) -> None:
    q_status = "needs_edit" if has_reject(auto_flags) else "pending"
    store.upsert_question(
        question_id=question_id,
        subject="NSAA",
        topic=design.variation_mode,
        variation_mode=design.variation_mode,
        difficulty=design.difficulty,
        stem=design.stem,
        choices=design.options,
        correct_answer=design.correct_option,
        explanation=design.explanation,
        diagram_required=True,
        diagram_status="pending",
        question_status=q_status,
        auto_flags=auto_flags,
        source=source,
    )
    store.add_diagram_attempt(
        question_id=question_id,
        attempt=attempt,
        image_path=png_path,
        spec_path=spec_path,
        source_image_path=source_image_path,
        original_spec=original_spec or spec or {},
        generation_spec=spec or {},
        status="pending",
        parent_attempt_id=parent_attempt_id,
        previous_attempt_ids=previous_attempt_ids,
    )


def generate_one(
    eq: EvalQuestion,
    *,
    store: ReviewStore,
    source_options: dict[str, str] | None = None,
    model: str = NSAA_DIAGRAM_MODEL,
    thinking_level: str = "high",
    repair_feedback: str = "",
    prior_question: dict[str, Any] | None = None,
    parent_attempt_id: int | None = None,
    previous_attempt_ids: list[int] | None = None,
    attempt: int = 1,
) -> dict[str, Any]:
    qid = nsaa_question_id(eq.question_id)
    out_dir = ARTIFACTS / qid
    out_dir.mkdir(parents=True, exist_ok=True)
    source_png = out_dir / "source_diagram.png"
    if not source_png.is_file():
        source_png.write_bytes(download_diagram(eq))

    q_inp = NsaaQuestionDesignerInput(
        source_question_id=str(eq.question_id),
        reference_question=eq.reference_question,
        reference_options=source_options or {},
        diagram_image_path=source_png,
        exam_year=eq.exam_year,
        paper_name=eq.paper_name,
        question_number=eq.question_number,
        repair_feedback=repair_feedback,
        prior_question=prior_question,
    )
    design = run_nsaa_question_designer(q_inp, model=model, thinking_level=thinking_level)
    (out_dir / "question_design.json").write_text(
        json.dumps(design.raw, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    if design.skip:
        return {
            "status": "skipped",
            "question_id": qid,
            "source_question_id": eq.question_id,
            "skip_reason": design.skip_reason,
            "model": design.model,
        }

    idea_plan = _idea_plan_for_diagram(design)
    idea_plan["original_stem"] = eq.reference_question
    d_inp = DiagramDesignerInput(
        reference_question=design.stem,
        diagram_image_path=source_png,
        subject="mathematics",
        math_paper="NSAA",
        target_difficulty=design.difficulty,
        variation_mode=design.variation_mode,
        idea_plan=idea_plan,
        source_question_id=qid,
    )
    result = generate_diagram(
        d_inp,
        out_dir,
        attempt=attempt,
        designer_model=model,
        thinking_level=thinking_level,
        choices=design.options,
        correct_answer=design.correct_option,
        parent_attempt_id=parent_attempt_id,
    )
    if has_reject(result.auto_flags) and result.spec and attempt == 1:
        critique = "\n".join(f"- {f.get('message')}" for f in result.auto_flags)
        result2 = regenerate_diagram(
            d_inp,
            out_dir,
            critique=critique,
            prior_spec=result.spec,
            attempt=2,
            designer_model=model,
            thinking_level=thinking_level,
            choices=design.options,
            correct_answer=design.correct_option,
            parent_attempt_id=parent_attempt_id,
        )
        source = _source_payload(eq, design, str(source_png), model)
        store.upsert_question(
            question_id=qid,
            subject="NSAA",
            topic=design.variation_mode,
            variation_mode=design.variation_mode,
            difficulty=design.difficulty,
            stem=design.stem,
            choices=design.options,
            correct_answer=design.correct_option,
            explanation=design.explanation,
            diagram_required=True,
            diagram_status="pending",
            question_status="needs_edit" if has_reject(result2.auto_flags) else "pending",
            auto_flags=result2.auto_flags,
            source=source,
        )
        first = store.add_diagram_attempt(
            question_id=qid,
            attempt=1,
            image_path=str(result.png_path or ""),
            spec_path=str(result.spec_path or ""),
            source_image_path=str(source_png),
            original_spec=result.spec or {},
            generation_spec=result.spec or {},
            status="superseded",
            parent_attempt_id=parent_attempt_id,
            previous_attempt_ids=previous_attempt_ids,
        )
        store.add_diagram_attempt(
            question_id=qid,
            attempt=2,
            image_path=str(result2.png_path or ""),
            spec_path=str(result2.spec_path or ""),
            source_image_path=str(source_png),
            original_spec=result.spec or {},
            generation_spec=result2.spec or {},
            status="pending",
            parent_attempt_id=int(first["id"]),
            previous_attempt_ids=[int(first["id"])],
        )
        return {
            "status": "generated",
            "question_id": qid,
            "source_question_id": eq.question_id,
            "variation_mode": design.variation_mode,
            "attempt": 2,
            "auto_repair": True,
            "reject": has_reject(result2.auto_flags),
            "model": model,
        }

    source = _source_payload(eq, design, str(source_png), model)
    _enqueue(
        store,
        question_id=qid,
        design=design,
        source=source,
        png_path=str(result.png_path or ""),
        spec_path=str(result.spec_path or ""),
        spec=result.spec,
        source_image_path=str(source_png),
        auto_flags=result.auto_flags,
        attempt=attempt,
        parent_attempt_id=parent_attempt_id,
        previous_attempt_ids=previous_attempt_ids,
        original_spec=result.spec,
    )
    return {
        "status": "generated",
        "question_id": qid,
        "source_question_id": eq.question_id,
        "variation_mode": design.variation_mode,
        "attempt": attempt,
        "reject": has_reject(result.auto_flags),
        "error": result.error,
        "model": model,
    }


def _source_payload(eq: EvalQuestion, design: NsaaQuestionDesign, source_image_path: str, model: str) -> dict[str, Any]:
    return {
        "pipeline": PIPELINE,
        "source_question_id": eq.question_id,
        "exam_name": eq.exam_name,
        "exam_year": eq.exam_year,
        "paper_name": eq.paper_name,
        "question_number": eq.question_number,
        "source_stem": eq.reference_question,
        "variation_mode": design.variation_mode,
        "mode_reason": design.mode_reason,
        "source_image_path": source_image_path,
        "idea_plan": design.idea_plan,
        "diagram_model": model,
        "question_model": design.model or model,
    }


def _eval_from_source_json(source: dict[str, Any], fallback_qid: str) -> EvalQuestion:
    raw_id = source.get("source_question_id") or fallback_qid.replace("nsaa-", "")
    return EvalQuestion(
        question_id=int(raw_id),
        exam_name=str(source.get("exam_name") or "NSAA"),
        exam_year=int(source.get("exam_year") or 0),
        paper_name=str(source.get("paper_name") or ""),
        question_number=int(source.get("question_number") or 0),
        question_stem=str(source.get("source_stem") or ""),
        diagram_url="",
        diagram_asset_id="diagram_0",
        source_image_url="",
    )


def regenerate_nsaa_question(
    store: ReviewStore,
    item: dict[str, Any],
    *,
    feedback: str = "",
    model: str = NSAA_DIAGRAM_MODEL,
) -> dict[str, Any]:
    """Re-run question designer + diagram from the original NSAA source."""
    source = {}
    try:
        source = json.loads(item.get("source_json") or "{}")
    except json.JSONDecodeError:
        source = {}
    if str(source.get("pipeline") or "") != PIPELINE:
        raise ValueError("This item is not an NSAA-sourced question")
    eq = _eval_from_source_json(source, str(item.get("question_id") or ""))
    source_png = Path(source.get("source_image_path") or item.get("diagram", {}).get("source_image_path") or "")
    if source_png.is_file() and not (ARTIFACTS / nsaa_question_id(eq.question_id) / "source_diagram.png").is_file():
        dest = ARTIFACTS / nsaa_question_id(eq.question_id) / "source_diagram.png"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(source_png.read_bytes())
    prior = {
        "stem": item.get("stem") or "",
        "options": json.loads(item.get("choices_json") or "{}") if isinstance(item.get("choices_json"), str) else (item.get("choices") or {}),
        "correct_option": item.get("correct_answer") or "",
        "explanation": item.get("explanation") or "",
        "variation_mode": item.get("variation_mode") or item.get("topic") or "",
    }
    diagram = item.get("diagram") or {}
    attempt = int(diagram.get("attempt") or 1) + 1
    parent_id = diagram.get("id")
    rec = generate_one(
        eq,
        store=store,
        repair_feedback=feedback,
        prior_question=prior,
        model=model,
        parent_attempt_id=int(parent_id) if parent_id else None,
        previous_attempt_ids=[int(parent_id)] if parent_id else None,
        attempt=attempt,
    )
    if rec.get("status") == "skipped":
        raise ValueError(rec.get("skip_reason") or "Designer skipped this source")
    if rec.get("status") == "error":
        raise ValueError(rec.get("error") or "NSAA regenerate failed")
    return rec


def run_batch(
    *,
    n: int | None = None,
    question_ids: list[int] | None = None,
    dry_run: bool = False,
    force: bool = False,
    math_only: bool = True,
    model: str = NSAA_DIAGRAM_MODEL,
) -> dict[str, Any]:
    _load_env()
    store = ReviewStore()
    selected = select_nsaa_diagram_questions(count=None if not question_ids else len(question_ids), question_ids=question_ids, math_only=math_only)
    done = set() if force else already_generated_ids(store)
    remaining = [eq for eq in selected if eq.question_id not in done]
    if n is not None:
        remaining = remaining[: max(0, n)]
    summary: dict[str, Any] = {
        "status": "running",
        "pipeline": PIPELINE,
        "model": model,
        "selected": len(selected),
        "already_done": len(done),
        "queued": len(remaining),
        "ids": [eq.question_id for eq in remaining],
        "generated": 0,
        "skipped": 0,
        "errors": 0,
        "results": [],
        "started_at": _now(),
    }
    _write_status(summary)
    if dry_run:
        summary["status"] = "dry_run"
        _write_status(summary)
        return summary

    options_by_id = attach_source_options(remaining)
    results: list[dict[str, Any]] = []
    for i, eq in enumerate(remaining, start=1):
        print(f"[NSAA] {i}/{len(remaining)} source {eq.question_id} ({eq.exam_year} {eq.paper_name} Q{eq.question_number})", flush=True)
        try:
            rec = generate_one(
                eq,
                store=store,
                source_options=options_by_id.get(eq.question_id) or {},
                model=model,
            )
        except Exception as exc:
            rec = {
                "status": "error",
                "source_question_id": eq.question_id,
                "error": f"{type(exc).__name__}: {exc}",
            }
            print(f"  error: {exc}", flush=True)
            traceback.print_exc()
        results.append(rec)
        if rec.get("status") == "generated":
            summary["generated"] += 1
            print(f"  {rec.get('variation_mode')} -> {rec.get('question_id')}", flush=True)
        elif rec.get("status") == "skipped":
            summary["skipped"] += 1
            print(f"  skip: {rec.get('skip_reason')}", flush=True)
        else:
            summary["errors"] += 1
        summary["results"] = results
        summary["counts"] = store.counts()
        _write_status(summary)

    summary["status"] = "completed"
    summary["finished_at"] = _now()
    summary["counts"] = store.counts()
    _write_status(summary)
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate NSAA sibling/far diagram questions for review")
    parser.add_argument("--n", type=int, default=None, help="Max new questions to generate")
    parser.add_argument("--ids", default="", help="Comma-separated source question IDs")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true", help="Regenerate even if already queued")
    parser.add_argument("--include-non-math", action="store_true", help="Do not prefilter to math-looking stems")
    parser.add_argument("--model", default=NSAA_DIAGRAM_MODEL)
    args = parser.parse_args()
    ids = [int(part.strip()) for part in args.ids.split(",") if part.strip()]
    result = run_batch(
        n=args.n,
        question_ids=ids or None,
        dry_run=args.dry_run,
        force=args.force,
        math_only=not args.include_non_math,
        model=args.model,
    )
    print(json.dumps({k: v for k, v in result.items() if k != "results"}, indent=2))
    if result.get("results"):
        print(json.dumps(result["results"], indent=2))
    return 0 if result.get("status") in {"completed", "dry_run"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
