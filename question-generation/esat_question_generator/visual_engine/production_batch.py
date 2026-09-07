"""Generate a first production review batch (Math 1 / Math 2 / Physics).

Example:

    python -m visual_engine.production_batch --math1 50 --math2 50 --physics 50
"""

from __future__ import annotations

import argparse
import json
import sys
import traceback
from pathlib import Path
from typing import Any

_PKG_ROOT = Path(__file__).resolve().parent.parent
if str(_PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(_PKG_ROOT))

from visual_engine.auto_checks import has_reject, run_auto_checks
from visual_engine.diagram_designer import DiagramDesignerInput
from visual_engine.eval.question_selector import _is_unsupported_diagram, _looks_like_math_diagram
from visual_engine.generation import generate_diagram, regenerate_diagram
from visual_engine.review_store import ReviewStore

ARTIFACTS = Path(__file__).resolve().parent / "review_data" / "artifacts"
STATUS_PATH = Path(__file__).resolve().parent / "review_data" / "batch_status.json"

DIAGRAM_PLAN_HINTS = (
    "geometry",
    "graph",
    "diagram",
    "figure",
    "axes",
    "sketch",
)


def _load_env(base_dir: str) -> None:
    from project import safe_load_dotenv

    repo_root = Path(base_dir).resolve().parent.parent
    env_path = repo_root / ".env.local"
    if env_path.is_file():
        safe_load_dotenv(str(env_path))
    else:
        safe_load_dotenv(".env.local")


def _extract_fields(item: dict[str, Any]) -> dict[str, Any]:
    pkg = item.get("question_package") or {}
    question = pkg.get("question") or {}
    solution = pkg.get("solution") or {}
    tags = item.get("tags") or {}
    choices = question.get("options") or {}
    if not isinstance(choices, dict):
        choices = {}
    explanation = (
        solution.get("reasoning")
        or solution.get("key_insight")
        or solution.get("final_answer")
        or ""
    )
    topic = tags.get("primary_tag") or item.get("schema_id") or ""
    return {
        "stem": str(question.get("stem") or ""),
        "choices": {str(k): str(v) for k, v in choices.items()},
        "correct_answer": str(question.get("correct_option") or ""),
        "explanation": str(explanation),
        "topic": str(topic),
        "difficulty": str(item.get("difficulty") or ""),
        "idea_plan": item.get("idea_plan") or {},
    }


def question_needs_matplotlib_diagram(stem: str, idea_plan: dict[str, Any] | None) -> bool:
    if _is_unsupported_diagram(stem):
        return False
    plan = idea_plan or {}
    visual_need = str(plan.get("visual_need") or plan.get("visual_brief") or "").lower()
    if any(h in visual_need for h in ("none", "no visual", "not needed")):
        return False
    if any(h in visual_need for h in DIAGRAM_PLAN_HINTS):
        return True
    return _looks_like_math_diagram(stem)


def _physics_image_path(item: dict[str, Any], run_dir: str) -> str:
    for asset in item.get("visual_assets") or []:
        for path in asset.get("image_paths") or []:
            if path and Path(path).is_file():
                return str(path)
    assets_dir = Path(run_dir) / "assets"
    if assets_dir.is_dir():
        pngs = sorted(assets_dir.glob("*.png"))
        if pngs:
            return str(pngs[-1])
        svgs = sorted(assets_dir.glob("*.svg"))
        if svgs:
            return str(svgs[-1])
    return ""


def _write_status(payload: dict[str, Any]) -> None:
    STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATUS_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _enqueue(
    store: ReviewStore,
    *,
    question_id: str,
    subject: str,
    fields: dict[str, Any],
    diagram_required: bool,
    png_path: str = "",
    spec_path: str = "",
    spec: dict[str, Any] | None = None,
    auto_flags: list[dict[str, Any]] | None = None,
    source: dict[str, Any] | None = None,
) -> None:
    flags = auto_flags or run_auto_checks(
        png_path=png_path or None,
        spec=spec,
        choices=fields["choices"],
        correct_answer=fields["correct_answer"],
        diagram_required=diagram_required,
    )
    q_status = "needs_edit" if has_reject(flags) else "pending"
    store.upsert_question(
        question_id=question_id,
        subject=subject,
        topic=fields["topic"],
        difficulty=fields["difficulty"],
        stem=fields["stem"],
        choices=fields["choices"],
        correct_answer=fields["correct_answer"],
        explanation=fields["explanation"],
        diagram_required=diagram_required,
        diagram_status="pending" if diagram_required else "none",
        question_status=q_status,
        auto_flags=flags,
        source=source or {},
    )
    if diagram_required:
        store.add_diagram_attempt(
            question_id=question_id,
            attempt=1,
            image_path=png_path,
            spec_path=spec_path,
            original_spec=spec or {},
            generation_spec=spec or {},
            status="pending",
        )


def _maybe_make_math_diagram(
    store: ReviewStore,
    *,
    question_id: str,
    subject: str,
    fields: dict[str, Any],
    item: dict[str, Any],
) -> None:
    need = question_needs_matplotlib_diagram(fields["stem"], fields.get("idea_plan"))
    if not need:
        _enqueue(
            store,
            question_id=question_id,
            subject=subject,
            fields=fields,
            diagram_required=False,
            source={"item_id": item.get("id"), "schema_id": item.get("schema_id")},
        )
        return

    out_dir = ARTIFACTS / question_id
    inp = DiagramDesignerInput(
        reference_question=fields["stem"],
        idea_plan=fields.get("idea_plan") or None,
        math_paper=subject,
        source_question_id=question_id,
        target_difficulty=fields.get("difficulty") or "Medium",
        variation_mode="sibling",
    )
    result = generate_diagram(
        inp,
        out_dir,
        attempt=1,
        choices=fields["choices"],
        correct_answer=fields["correct_answer"],
    )
    if has_reject(result.auto_flags) and result.spec:
        critique = "\n".join(f"- {f.get('message')}" for f in result.auto_flags)
        result2 = regenerate_diagram(
            inp,
            out_dir,
            critique=critique,
            prior_spec=result.spec,
            attempt=2,
            choices=fields["choices"],
            correct_answer=fields["correct_answer"],
        )
        store.upsert_question(
            question_id=question_id,
            subject=subject,
            topic=fields["topic"],
            difficulty=fields["difficulty"],
            stem=fields["stem"],
            choices=fields["choices"],
            correct_answer=fields["correct_answer"],
            explanation=fields["explanation"],
            diagram_required=True,
            diagram_status="pending",
            question_status="needs_edit" if has_reject(result2.auto_flags) else "pending",
            auto_flags=result2.auto_flags,
            source={"item_id": item.get("id"), "schema_id": item.get("schema_id")},
        )
        first = store.add_diagram_attempt(
            question_id=question_id,
            attempt=1,
            image_path=str(result.png_path or ""),
            spec_path=str(result.spec_path or ""),
            original_spec=result.spec or {},
            generation_spec=result.spec or {},
            status="superseded",
        )
        store.add_diagram_attempt(
            question_id=question_id,
            attempt=2,
            image_path=str(result2.png_path or ""),
            spec_path=str(result2.spec_path or ""),
            original_spec=result.spec or {},
            generation_spec=result2.spec or {},
            status="pending",
            parent_attempt_id=int(first["id"]),
            previous_attempt_ids=[int(first["id"])],
        )
        return

    _enqueue(
        store,
        question_id=question_id,
        subject=subject,
        fields=fields,
        diagram_required=True,
        png_path=str(result.png_path or ""),
        spec_path=str(result.spec_path or ""),
        spec=result.spec,
        auto_flags=result.auto_flags,
        source={"item_id": item.get("id"), "schema_id": item.get("schema_id")},
    )


def _generate_math(store: ReviewStore, *, subject: str, n: int, base_dir: str) -> dict[str, int]:
    from project import RunConfig, get_default_models_config, run_once

    cfg = RunConfig(allow_schema_prefixes=("M",), math_paper=subject, out_dir="runs")
    models = get_default_models_config()
    stats = {"accepted": 0, "rejected": 0, "errors": 0}
    existing = store.subject_counts().get(subject, 0)
    remaining = max(0, n - existing)
    print(f"[{subject}] have {existing}, generating {remaining}", flush=True)
    for i in range(remaining):
        print(f"[{subject}] {i + 1}/{remaining}", flush=True)
        try:
            result = run_once(
                base_dir,
                cfg,
                models,
                math_paper=subject,
                callbacks={
                    "on_stage_start": lambda stage, info: print(f"  [stage] {stage}: {info}", flush=True),
                },
            )
        except Exception as exc:
            stats["errors"] += 1
            print(f"  error: {exc}", flush=True)
            traceback.print_exc()
            continue
        if result.get("status") != "accepted" or not result.get("item"):
            stats["rejected"] += 1
            print(f"  rejected: {result.get('status')}", flush=True)
            continue
        item = result["item"]
        fields = _extract_fields(item)
        qid = str(item.get("id") or f"{subject}-{existing + i + 1}")
        _maybe_make_math_diagram(store, question_id=qid, subject=subject, fields=fields, item=item)
        stats["accepted"] += 1
    return stats


def _generate_physics(store: ReviewStore, *, n: int, base_dir: str) -> dict[str, int]:
    from pipeline_v4 import run_once_v4
    from pipeline_v4.config import V4ModelsConfig, V4RunConfig

    cfg = V4RunConfig.from_env()
    models = V4ModelsConfig.from_env()
    stats = {"accepted": 0, "rejected": 0, "errors": 0}
    existing = store.subject_counts().get("Physics", 0)
    remaining = max(0, n - existing)
    print(f"[Physics] have {existing}, generating {remaining}", flush=True)
    for i in range(remaining):
        print(f"[Physics] {i + 1}/{remaining}", flush=True)
        try:
            result = run_once_v4(
                base_dir=base_dir,
                cfg=cfg,
                models=models,
                callbacks={
                    "on_stage_start": lambda stage, info: print(f"  [stage] {stage}: {info}", flush=True),
                },
            )
        except Exception as exc:
            stats["errors"] += 1
            print(f"  error: {exc}", flush=True)
            traceback.print_exc()
            continue
        if result.get("status") != "accepted" or not result.get("item"):
            stats["rejected"] += 1
            print(f"  rejected: {result.get('status')}", flush=True)
            continue
        item = result["item"]
        fields = _extract_fields(item)
        qid = str(item.get("id") or f"Physics-{existing + i + 1}")
        png = _physics_image_path(item, str(result.get("run_dir") or ""))
        diagram_required = bool(item.get("has_visual") and png)
        _enqueue(
            store,
            question_id=qid,
            subject="Physics",
            fields=fields,
            diagram_required=diagram_required,
            png_path=png,
            source={
                "item_id": item.get("id"),
                "schema_id": item.get("schema_id"),
                "visual_type": item.get("visual_type"),
            },
        )
        stats["accepted"] += 1
    return stats


def run_batch(*, math1: int, math2: int, physics: int, base_dir: str | None = None) -> dict[str, Any]:
    base = base_dir or str(_PKG_ROOT)
    _load_env(base)
    store = ReviewStore()
    summary: dict[str, Any] = {"math1": {}, "math2": {}, "physics": {}}
    _write_status({"status": "running", "summary": summary})
    if math1:
        summary["math1"] = _generate_math(store, subject="Math 1", n=math1, base_dir=base)
        _write_status({"status": "running", "summary": summary, "counts": store.counts(), "by_subject": store.subject_counts()})
    if math2:
        summary["math2"] = _generate_math(store, subject="Math 2", n=math2, base_dir=base)
        _write_status({"status": "running", "summary": summary, "counts": store.counts(), "by_subject": store.subject_counts()})
    if physics:
        summary["physics"] = _generate_physics(store, n=physics, base_dir=base)
    final = {
        "status": "completed",
        "summary": summary,
        "counts": store.counts(),
        "by_subject": store.subject_counts(),
    }
    _write_status(final)
    return final


def main() -> int:
    parser = argparse.ArgumentParser(description="Produce a first review-queue question batch")
    parser.add_argument("--math1", type=int, default=50)
    parser.add_argument("--math2", type=int, default=50)
    parser.add_argument("--physics", type=int, default=50)
    parser.add_argument("--base-dir", default="")
    args = parser.parse_args()
    result = run_batch(
        math1=args.math1,
        math2=args.math2,
        physics=args.physics,
        base_dir=args.base_dir or None,
    )
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
