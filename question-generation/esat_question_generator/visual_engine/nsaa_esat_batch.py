"""Systematic NSAA -> ESAT Math 1 / Math 2 / Physics generation.

One new review question per unused NSAA Section 1 source. ENGAA and specimen
papers are never used. A source ID is only marked used (ticked) after a
successful kept generation; skips and errors can be retried later.

Diagram policy:
  - Math 1 / Math 2: 100% must have a rendered diagram (geometry/graph).
    Only NSAA math sources with a stem diagram are used.
  - Physics: high diagram mix (~85% graph). Diagram sources first; when under
    target, rendered graph is required (plain text/table only when ahead of target).

Ratio per cycle: 1 Math 1 + 1 Math 2 + 3 Physics.

Example:

    python -m visual_engine.nsaa_esat_batch --cycles 10
    python -m visual_engine.nsaa_esat_batch --cycles 0
    python -m visual_engine.nsaa_esat_batch --dry-run
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_PKG_ROOT = Path(__file__).resolve().parent.parent
_QGEN_ROOT = _PKG_ROOT.parent
if str(_PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(_PKG_ROOT))
if str(_QGEN_ROOT) not in sys.path:
    sys.path.insert(0, str(_QGEN_ROOT))

from visual_engine.eval.question_selector import EvalQuestion, select_nsaa_subject_questions
from visual_engine.nsaa_batch import (
    already_generated_ids,
    attach_source_options,
    generate_one,
    _mix_hint,
)
from visual_engine.question_designer import NSAA_DIAGRAM_MODEL
from visual_engine.review_store import ReviewStore

STATUS_PATH = Path(__file__).resolve().parent / "review_data" / "nsaa_esat_batch_status.json"
USED_PATH = Path(__file__).resolve().parent / "review_data" / "nsaa_esat_used_sources.json"

# Physics: soft target with hard enforcement when under ratio or source has a figure.
PHYSICS_DIAGRAM_RATIO = 0.85

MATH_DIAGRAM_HINT = (
    "MATH: prefer a rendered diagram (geometry or graph) when the source supports one. "
    "Set idea_plan.diagram_type to geometry or graph, needs_diagram true, and provide visual_brief. "
    "Do not use visual_type none or table for this slot. "
    "If the source is not suitable for an honest diagram MCQ, set skip=true and explain why "
    "(do not force a fake figure)."
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _write_status(payload: dict[str, Any]) -> None:
    STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATUS_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _load_used() -> set[int]:
    if not USED_PATH.is_file():
        return set()
    try:
        data = json.loads(USED_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return set()
    out: set[int] = set()
    for raw in data if isinstance(data, list) else data.get("ids") or []:
        try:
            out.add(int(raw))
        except (TypeError, ValueError):
            continue
    return out


def _save_used(ids: set[int]) -> None:
    USED_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "ids": sorted(ids),
        "count": len(ids),
        "updated_at": _now(),
    }
    USED_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _tick(used: set[int], source_id: int) -> None:
    used.add(int(source_id))
    _save_used(used)


def _sort_sources(items: list[EvalQuestion]) -> list[EvalQuestion]:
    return sorted(items, key=lambda eq: (eq.exam_year, eq.question_number, eq.question_id))


def _split_math(pool: list[EvalQuestion]) -> tuple[list[EvalQuestion], list[EvalQuestion]]:
    math1: list[EvalQuestion] = []
    math2: list[EvalQuestion] = []
    for i, eq in enumerate(_sort_sources(pool)):
        (math1 if i % 2 == 0 else math2).append(eq)
    return math1, math2


def _has_stem_diagram(eq: EvalQuestion) -> bool:
    return bool(str(eq.diagram_url or "").strip())


def _physics_diagram_share(mix_counts: dict[str, int]) -> tuple[float | None, int, int]:
    diagram_n = int(mix_counts.get("graph", 0)) + int(mix_counts.get("geometry", 0))
    text_n = int(mix_counts.get("none", 0)) + int(mix_counts.get("table", 0))
    total = diagram_n + text_n
    if total <= 0:
        return None, diagram_n, text_n
    return diagram_n / total, diagram_n, text_n


def _physics_require_diagram(mix_counts: dict[str, int], eq: EvalQuestion) -> bool:
    """Require a rendered graph when under target, or when the NSAA source has a figure."""
    if _has_stem_diagram(eq):
        return True
    share, _diagram_n, _text_n = _physics_diagram_share(mix_counts)
    if share is None:
        return True
    return share < (PHYSICS_DIAGRAM_RATIO - 0.02)


def _physics_queue(pool: list[EvalQuestion], done: set[int]) -> list[EvalQuestion]:
    """Diagram-source physics first, then text sources."""
    remaining = [eq for eq in pool if eq.question_id not in done]
    with_d = [eq for eq in remaining if _has_stem_diagram(eq)]
    without = [eq for eq in remaining if not _has_stem_diagram(eq)]
    return _sort_sources(with_d) + _sort_sources(without)


def _load_env() -> None:
    from visual_engine.llm import _load_env as load_diagram_env

    load_diagram_env()


def _slot_mix(review_label: str, designer_subject: str, eq: EvalQuestion, mix_counts: dict[str, int]) -> str:
    if review_label.startswith("Math"):
        return (
            MATH_DIAGRAM_HINT
            + " "
            + _mix_hint(designer_subject, mix_counts, diagrams_only=True)
        ).strip()
    share, diagram_n, text_n = _physics_diagram_share(mix_counts)
    must_diagram = _physics_require_diagram(mix_counts, eq)
    pct = int(PHYSICS_DIAGRAM_RATIO * 100)
    physics_hint = (
        f"PHYSICS: aim for about {pct}% rendered graph diagrams when sources suit it. "
        "Prefer visual_type graph with graph_preset and a clear visual_brief when a graph "
        "honestly carries the reasoning. "
        "Do not invent unsupported circuit/apparatus schematics. "
        "If a rendered diagram is not suitable, set skip=true and say why "
        "(do not fill the slot with none/table just to avoid a graph)."
    )
    if must_diagram:
        physics_hint += (
            " This slot prefers a graph if suitable. "
            "If suitable → visual_type graph. If not suitable for an honest graph → skip=true. "
            "Do not use none/table for this slot."
        )
    if _has_stem_diagram(eq):
        physics_hint += " SOURCE HAS A DIAGRAM: prefer a graph-based sibling/far variation when honest."
    elif must_diagram:
        physics_hint += (
            " SOURCE HAS NO FIGURE: only invent a graph if the skill naturally fits one "
            "(e.g. force/extension, v-t, I-V). Otherwise skip."
        )
    if share is not None:
        physics_hint += (
            f" Current batch mix: diagrams={diagram_n}, text/table={text_n}, ~{share:.0%} diagram."
        )
    return (
        physics_hint
        + " "
        + _mix_hint(
            designer_subject,
            mix_counts,
            diagrams_only=must_diagram,
            diagram_target_ratio=PHYSICS_DIAGRAM_RATIO,
        )
    ).strip()


def _process_one(
    *,
    eq: EvalQuestion,
    review_label: str,
    designer_subject: str,
    store: ReviewStore,
    used: set[int],
    model: str,
    mix_counts: dict[str, int],
    difficulty_counts: dict[str, int],
    summary: dict[str, Any],
    recent: list[dict[str, Any]],
    math_pool_total: int,
    physics_pool_total: int,
    math1_q: list[EvalQuestion],
    math2_q: list[EvalQuestion],
    physics_q: list[EvalQuestion],
    phase: str,
    cycle: int,
) -> None:
    is_math = review_label.startswith("Math")
    is_physics = review_label == "Physics"
    require_diagram = is_math or (is_physics and _physics_require_diagram(mix_counts, eq))
    summary["current"] = {
        "phase": phase,
        "cycle": cycle,
        "review_label": review_label,
        "source_question_id": eq.question_id,
        "has_source_diagram": _has_stem_diagram(eq),
        "exam_year": eq.exam_year,
        "paper_name": eq.paper_name,
        "question_number": eq.question_number,
        "require_diagram": require_diagram,
    }
    _write_status(summary)
    print(
        f"  {review_label}: source {eq.question_id} "
        f"({eq.exam_year} {eq.paper_name} Q{eq.question_number})"
        f"{' [diagram]' if _has_stem_diagram(eq) else ' [text]'}"
        f"{' [must-diagram]' if require_diagram else ''}",
        flush=True,
    )
    options = attach_source_options([eq]).get(eq.question_id) or {}
    try:
        rec = generate_one(
            eq,
            store=store,
            source_options=options,
            model=model,
            mix_hint=_slot_mix(review_label, designer_subject, eq, mix_counts),
            review_label=review_label,
            require_rendered_visual=require_diagram,
        )
    except Exception as exc:
        rec = {
            "status": "error",
            "source_question_id": eq.question_id,
            "error": f"{type(exc).__name__}: {exc}",
            "review_label": review_label,
        }
        print(f"    error: {exc}", flush=True)

    kept = False
    if rec.get("status") == "generated":
        vtype = str(rec.get("visual_type") or "none")
        qid = str(rec.get("question_id") or "")
        if is_math and vtype not in {"graph", "geometry"}:
            summary["skipped"] += 1
            if qid:
                store.delete_questions([qid])
            print(f"    skip(math-no-diagram): visual_type={vtype} (removed from review DB)", flush=True)
            rec = {
                **rec,
                "status": "skipped",
                "skip_reason": f"Math requires diagram, got visual_type={vtype}",
            }
        elif is_physics and require_diagram and vtype != "graph":
            summary["skipped"] += 1
            if qid:
                store.delete_questions([qid])
            print(f"    skip(physics-no-diagram): visual_type={vtype} (removed from review DB)", flush=True)
            rec = {
                **rec,
                "status": "skipped",
                "skip_reason": f"Physics requires graph diagram, got visual_type={vtype}",
            }
        else:
            kept = True
            _tick(used, eq.question_id)
            summary["generated"][review_label] = int(summary["generated"].get(review_label) or 0) + 1
            summary["generated"]["total"] = int(summary["generated"]["total"]) + 1
            mix_counts[vtype] = mix_counts.get(vtype, 0) + 1
            item = store.get_item(qid)
            diff = str((item or {}).get("difficulty") or "Unknown")
            difficulty_counts[diff] = difficulty_counts.get(diff, 0) + 1
            print(f"    {rec.get('variation_mode')} {vtype} -> {qid}", flush=True)
    elif rec.get("status") == "skipped":
        summary["skipped"] += 1
        print(f"    skip: {rec.get('skip_reason')}", flush=True)
    elif rec.get("status") == "error":
        summary["errors"] += 1

    # Only successful kept questions consume a source ID. Skips/errors can be retried later.
    if not kept:
        print(f"    source {eq.question_id} not ticked (can retry)", flush=True)

    recent.append(
        {
            "phase": phase,
            "cycle": cycle,
            "review_label": review_label,
            "status": rec.get("status"),
            "source_question_id": eq.question_id,
            "has_source_diagram": _has_stem_diagram(eq),
            "question_id": rec.get("question_id"),
            "visual_type": rec.get("visual_type"),
            "skip_reason": rec.get("skip_reason"),
            "error": rec.get("error"),
            "at": _now(),
        }
    )
    summary["recent"] = recent[-20:]
    summary["visual_type_counts"] = mix_counts
    summary["difficulty_counts"] = difficulty_counts
    summary["pools"] = {
        "mathematics_total": math_pool_total,
        "math1_remaining": len(math1_q),
        "math2_remaining": len(math2_q),
        "physics_total": physics_pool_total,
        "physics_remaining": len(physics_q),
        "already_ticked": len(used),
        "phase": phase,
        "phase_math1": len(math1_q),
        "phase_math2": len(math2_q),
        "phase_physics": len(physics_q),
    }
    summary["counts"] = store.counts()
    summary["subject_counts"] = store.subject_counts()
    _write_status(summary)


def run_esat_batch(
    *,
    cycles: int | None = 10,
    dry_run: bool = False,
    force: bool = False,
    model: str = NSAA_DIAGRAM_MODEL,
) -> dict[str, Any]:
    _load_env()
    store = ReviewStore()
    done = set() if force else (already_generated_ids(store) | _load_used())
    used = set(done)

    math_pool = select_nsaa_subject_questions(subject="mathematics")
    physics_pool = select_nsaa_subject_questions(subject="physics")

    # Math: ONLY stem-diagram sources (supports 100% diagram outputs).
    math_diagram = [eq for eq in math_pool if _has_stem_diagram(eq) and eq.question_id not in done]
    math1_q, math2_q = _split_math(math_diagram)
    physics_q = _physics_queue(physics_pool, done)

    max_cycles = min(len(math1_q), len(math2_q), len(physics_q) // 3)
    if cycles is None or cycles <= 0:
        target_cycles = max_cycles
    else:
        target_cycles = min(int(cycles), max_cycles)

    summary: dict[str, Any] = {
        "status": "running",
        "pipeline": "nsaa_esat",
        "model": model,
        "ratio": "1 Math1 : 1 Math2 : 3 Physics",
        "diagram_policy": "Math1/Math2=100% diagram; Physics=~85% graph (enforced when under target)",
        "exam_filter": "NSAA Section 1 only (no ENGAA, no specimen, no Section 2)",
        "phase_plan": [
            {
                "phase": "math-diagrams + physics-mix",
                "math1_diagram_sources": len(math1_q),
                "math2_diagram_sources": len(math2_q),
                "physics_remaining": len(physics_q),
                "physics_diagram_sources": sum(1 for eq in physics_q if _has_stem_diagram(eq)),
                "max_cycles": max_cycles,
            }
        ],
        "pools": {
            "mathematics_total": len(math_pool),
            "math_diagram_sources": len(math_diagram),
            "math_text_sources_ignored": sum(
                1 for eq in math_pool if not _has_stem_diagram(eq) and eq.question_id not in done
            ),
            "math1_remaining": len(math1_q),
            "math2_remaining": len(math2_q),
            "physics_total": len(physics_pool),
            "physics_remaining": len(physics_q),
            "already_ticked": len(done),
            "phase": "math-diagrams + physics-mix",
            "phase_math1": len(math1_q),
            "phase_math2": len(math2_q),
            "phase_physics": len(physics_q),
        },
        "target_cycles": target_cycles,
        "completed_cycles": 0,
        "generated": {"Math 1": 0, "Math 2": 0, "Physics": 0, "total": 0},
        "skipped": 0,
        "errors": 0,
        "visual_type_counts": {},
        "difficulty_counts": {},
        "current": None,
        "recent": [],
        "started_at": _now(),
        "phase": "math-diagrams + physics-mix",
    }
    _write_status(summary)

    if dry_run:
        summary["status"] = "dry_run"
        summary["planned"] = {
            "math1_ids": [eq.question_id for eq in math1_q[:target_cycles]],
            "math2_ids": [eq.question_id for eq in math2_q[:target_cycles]],
            "physics_ids": [eq.question_id for eq in physics_q[: target_cycles * 3]],
        }
        _write_status(summary)
        return summary

    mix_counts: dict[str, int] = {}
    difficulty_counts: dict[str, int] = {}
    recent: list[dict[str, Any]] = []
    slots: list[tuple[str, str, list[EvalQuestion]]] = [
        ("Math 1", "mathematics", math1_q),
        ("Math 2", "mathematics", math2_q),
        ("Physics", "physics", physics_q),
        ("Physics", "physics", physics_q),
        ("Physics", "physics", physics_q),
    ]

    print(
        f"[NSAA-ESAT] cycles={target_cycles} "
        f"(math1={len(math1_q)} math2={len(math2_q)} physics={len(physics_q)}; "
        f"math=100% diagram, physics~{int(PHYSICS_DIAGRAM_RATIO*100)}% mix)",
        flush=True,
    )

    for cycle in range(1, target_cycles + 1):
        print(f"[NSAA-ESAT] cycle {cycle}/{target_cycles}", flush=True)
        for review_label, designer_subject, queue in slots:
            if not queue:
                continue
            eq = queue.pop(0)
            _process_one(
                eq=eq,
                review_label=review_label,
                designer_subject=designer_subject,
                store=store,
                used=used,
                model=model,
                mix_counts=mix_counts,
                difficulty_counts=difficulty_counts,
                summary=summary,
                recent=recent,
                math_pool_total=len(math_pool),
                physics_pool_total=len(physics_pool),
                math1_q=math1_q,
                math2_q=math2_q,
                physics_q=physics_q,
                phase="math-diagrams + physics-mix",
                cycle=cycle,
            )
        summary["completed_cycles"] = cycle
        _write_status(summary)

    # Drain leftover math diagram sources (and matching physics) so unused diagram math is not left behind.
    leftover = len(math1_q) + len(math2_q)
    if leftover:
        print(f"[NSAA-ESAT] draining leftover math diagram sources ({leftover}) + physics", flush=True)
        summary["phase"] = "drain-math-diagrams"
        n = 0
        while math1_q or math2_q:
            for review_label, designer_subject, queue in slots:
                if review_label.startswith("Math") and not queue:
                    continue
                if review_label == "Physics" and (not physics_q or not (math1_q or math2_q)):
                    # Only take physics while math leftovers remain, keeping ~3:1 emphasis.
                    continue
                if not queue:
                    continue
                # For physics slots during drain, still consume if math remains.
                if review_label == "Physics" and not physics_q:
                    continue
                n += 1
                eq = queue.pop(0)
                _process_one(
                    eq=eq,
                    review_label=review_label,
                    designer_subject=designer_subject,
                    store=store,
                    used=used,
                    model=model,
                    mix_counts=mix_counts,
                    difficulty_counts=difficulty_counts,
                    summary=summary,
                    recent=recent,
                    math_pool_total=len(math_pool),
                    physics_pool_total=len(physics_pool),
                    math1_q=math1_q,
                    math2_q=math2_q,
                    physics_q=physics_q,
                    phase="drain-math-diagrams",
                    cycle=n,
                )

    summary["status"] = "completed"
    summary["finished_at"] = _now()
    summary["current"] = None
    summary["counts"] = store.counts()
    summary["subject_counts"] = store.subject_counts()
    summary["visual_type_counts"] = mix_counts
    summary["difficulty_counts"] = difficulty_counts
    _write_status(summary)
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate Math 1 / Math 2 / Physics from NSAA sources at 1:1:3"
    )
    parser.add_argument(
        "--cycles",
        type=int,
        default=10,
        help="Number of 1+1+3 cycles. Use 0 until math diagram sources run out.",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true", help="Ignore already-ticked sources")
    parser.add_argument("--model", default=NSAA_DIAGRAM_MODEL)
    args = parser.parse_args()
    result = run_esat_batch(
        cycles=args.cycles,
        dry_run=args.dry_run,
        force=args.force,
        model=args.model,
    )
    print(json.dumps({k: v for k, v in result.items() if k != "recent"}, indent=2))
    if result.get("status") not in {"completed", "dry_run"}:
        return 1
    # Fail CI when every attempt errored (previously looked "successful" with empty artifacts).
    generated = int((result.get("generated") or {}).get("total") or 0)
    errors = int(result.get("errors") or 0)
    if generated == 0 and errors > 0:
        print(f"ERROR: generated=0 with errors={errors}", flush=True)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
