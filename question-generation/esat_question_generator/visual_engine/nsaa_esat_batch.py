"""Systematic NSAA -> ESAT review generation (manual review only; local review.db).

One new review question per unused NSAA Section 1 source. ENGAA and specimen
papers are never used. A source ID is only marked used (ticked) after a
successful kept generation; skips and errors can be retried later.

Per-cycle ratio:
  Math 1 / Math 2 only on odd cycles (halved vs prior 1+1 every cycle)
  Each cycle: 2 Physics + 3 Biology + 3 Chemistry
  Odd cycles also: 1 Math 1 + 1 Math 2

Diagram targets (suitability retry; skip if not honest, never force fake figures):
  - Math 1 / Math 2: ~100% rendered diagram (diagram-source pool only)
  - Physics: ~75% figure (geometry setup sketches or graphs; match source form)
  - Biology: ~90% graph / bio_diagram / pedigree
  - Chemistry: ~80% chem_structure / graph / energy_profile

Example:

    python -m visual_engine.nsaa_esat_batch --cycles 10 --workers 4
    python -m visual_engine.nsaa_esat_batch --cycles 0
    python -m visual_engine.nsaa_esat_batch --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
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
    next_far_question_id,
    source_id_from_review_item,
    _mix_hint,
)
from visual_engine.question_designer import NSAA_DIAGRAM_MODEL
from visual_engine.review_store import ReviewStore

STATUS_PATH = Path(__file__).resolve().parent / "review_data" / "nsaa_esat_batch_status.json"
USED_PATH = Path(__file__).resolve().parent / "review_data" / "nsaa_esat_used_sources.json"

DEFAULT_WORKERS = 4

# Per-cycle slot counts. Math 1 / Math 2 fire only every MATH_SLOT_PERIOD cycles
# (period 2 => half the previous Math throughput).
RATIO = {
    "Math 1": 1,
    "Math 2": 1,
    "Physics": 2,
    "Biology": 3,
    "Chemistry": 3,
}
MATH_SLOT_PERIOD = 2
MATH_LABELS = frozenset({"Math 1", "Math 2"})

PHYSICS_DIAGRAM_RATIO = 0.75
BIOLOGY_DIAGRAM_RATIO = 0.90
CHEMISTRY_DIAGRAM_RATIO = 0.80

DIAGRAM_TYPES = {
    "mathematics": frozenset({"graph", "geometry"}),
    "physics": frozenset({"graph", "geometry"}),
    "biology": frozenset({"graph", "bio_diagram", "pedigree"}),
    "chemistry": frozenset({"graph", "chem_structure", "energy_profile"}),
}

MATH_DIAGRAM_HINT = (
    "MATH: prefer a rendered diagram (geometry or graph) when the source supports one. "
    "Set idea_plan.diagram_type to geometry or graph, needs_diagram true, and provide visual_brief. "
    "Do not use visual_type none or table for this slot. "
    "If the source is not suitable for an honest diagram MCQ, set skip=true and explain why "
    "(do not force a fake figure)."
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _worker_count(requested: int | None = None) -> int:
    if requested is not None:
        n = int(requested)
    else:
        raw = (os.environ.get("NSAA_ESAT_WORKERS") or str(DEFAULT_WORKERS)).strip()
        try:
            n = int(raw)
        except ValueError:
            n = DEFAULT_WORKERS
    return max(1, min(n, 8))


_status_lock = threading.Lock()


def _write_status(payload: dict[str, Any]) -> None:
    STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _status_lock:
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


def _untick(used: set[int], source_id: int) -> None:
    used.discard(int(source_id))
    _save_used(used)


def untick_source(source_id: int) -> bool:
    """Remove a source id from the used-tick file. Returns True if it was present."""
    used = _load_used()
    sid = int(source_id)
    if sid not in used:
        return False
    _untick(used, sid)
    return True


def sync_free_rejected_sources(store: ReviewStore | None = None) -> dict[str, int]:
    """Untick sources whose latest review item is rejected (or missing).

    Failed / skipped generations never tick. Rejected review rows used to stay
    locked forever; this frees them for another generation pass.
    """
    store = store or ReviewStore()
    used = _load_used()
    blocking = already_generated_ids(store)  # excludes rejected by default
    freed_rejected = 0
    freed_orphan_ticks = 0

    for item in store.list_items(status_filter="rejected", latest_only=True, pipeline="nsaa"):
        sid = source_id_from_review_item(item)
        if sid is None:
            continue
        if sid in used:
            used.discard(sid)
            freed_rejected += 1

    # Ticked in JSON but no blocking pending/approved row left.
    for sid in list(used):
        if sid not in blocking:
            used.discard(sid)
            freed_orphan_ticks += 1

    if freed_rejected or freed_orphan_ticks:
        _save_used(used)
    return {
        "freed_rejected": freed_rejected,
        "freed_orphan_ticks": freed_orphan_ticks,
        "used_remaining": len(used),
    }


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


def _diagram_source_queue(pool: list[EvalQuestion], done: set[int]) -> list[EvalQuestion]:
    remaining = [eq for eq in pool if eq.question_id not in done]
    with_d = [eq for eq in remaining if _has_stem_diagram(eq)]
    without = [eq for eq in remaining if not _has_stem_diagram(eq)]
    return _sort_sources(with_d) + _sort_sources(without)


def _diagram_share(
    mix_counts: dict[str, int],
    rendered: frozenset[str],
) -> tuple[float | None, int, int]:
    diagram_n = sum(int(mix_counts.get(k, 0)) for k in rendered)
    text_n = int(mix_counts.get("none", 0)) + int(mix_counts.get("table", 0))
    total = diagram_n + text_n
    if total <= 0:
        return None, diagram_n, text_n
    return diagram_n / total, diagram_n, text_n


def _require_diagram(
    *,
    subject: str,
    mix_counts: dict[str, int],
    eq: EvalQuestion,
    target: float,
    allow_non_diagram: bool = False,
) -> bool:
    if allow_non_diagram:
        return False
    if subject == "mathematics":
        return True
    if _has_stem_diagram(eq):
        return True
    rendered = DIAGRAM_TYPES.get(subject, frozenset({"graph"}))
    share, _d, _t = _diagram_share(mix_counts, rendered)
    if share is None:
        return True
    return share < (target - 0.02)


def _load_env() -> None:
    from visual_engine.llm import _load_env as load_diagram_env

    load_diagram_env()


FAR_REUSE_HINT = (
    "REUSE / FAR MODE: this NSAA source was used before. "
    "You MUST set variation_mode to far (not sibling). "
    "Keep the same underlying skill, but change the situation / cover story substantially."
)

NON_DIAGRAM_HINT = (
    "NON-DIAGRAM OK: a rendered figure is not required for this slot. "
    "You may use visual_type none or table when that is the honest exam form. "
    "Only invent a diagram when it is naturally suited to the skill."
)


def _slot_mix(
    review_label: str,
    designer_subject: str,
    eq: EvalQuestion,
    mix_counts: dict[str, int],
    *,
    allow_non_diagram: bool = False,
    prefer_far: bool = False,
) -> str:
    bits: list[str] = []
    if prefer_far:
        bits.append(FAR_REUSE_HINT)
    if allow_non_diagram:
        bits.append(NON_DIAGRAM_HINT)

    if review_label.startswith("Math"):
        if allow_non_diagram:
            bits.append(
                _mix_hint(designer_subject, mix_counts, diagrams_only=False, diagram_target_ratio=0.5)
            )
        else:
            bits.append(MATH_DIAGRAM_HINT)
            bits.append(_mix_hint(designer_subject, mix_counts, diagrams_only=True))
        return " ".join(b for b in bits if b).strip()

    targets = {
        "physics": (
            PHYSICS_DIAGRAM_RATIO,
            "geometry setup sketches or graphs (match the source; do not invent T-t plots for pulley setups)",
            "geometry/graph",
        ),
        "biology": (BIOLOGY_DIAGRAM_RATIO, "graph, bio_diagram, or pedigree", "graph/bio_diagram/pedigree"),
        "chemistry": (
            CHEMISTRY_DIAGRAM_RATIO,
            "chem_structure, graph, or energy_profile",
            "chem_structure/graph/energy_profile",
        ),
    }
    target, prefer_text, short = targets[designer_subject]
    rendered = DIAGRAM_TYPES[designer_subject]
    share, diagram_n, text_n = _diagram_share(mix_counts, rendered)
    must = (not allow_non_diagram) and _require_diagram(
        subject=designer_subject,
        mix_counts=mix_counts,
        eq=eq,
        target=target,
        allow_non_diagram=False,
    )
    pct = int(target * 100)
    hint = (
        f"{designer_subject.upper()}: aim for about {pct}% rendered diagrams ({prefer_text}) "
        "when sources suit it. "
        "If suitable, use that visual_type with visual_brief / SMILES / pedigree data as required. "
        "If not suitable for an honest diagram, set skip=true and say why "
        "(do not fill with none/table just to avoid a diagram)."
    )
    if allow_non_diagram:
        hint = (
            f"{designer_subject.upper()}: diagram preferred when honest (~{pct}%), "
            "but this slot may keep none/table. "
            f"Prefer {prefer_text} when the source supports it."
        )
    elif must:
        hint += (
            f" This slot prefers a diagram ({short}) if suitable. "
            "If suitable → diagram visual_type. If not → skip=true. "
            "Do not use none/table for this slot."
        )
    if _has_stem_diagram(eq):
        hint += " SOURCE HAS A DIAGRAM: keep a diagram-based sibling/far variation when honest."
    elif must:
        hint += " SOURCE HAS NO FIGURE: only invent a diagram if the skill naturally fits one; otherwise skip."
    if share is not None:
        hint += f" Current {designer_subject} mix: diagrams={diagram_n}, text/table={text_n}, ~{share:.0%} diagram."
    bits.append(hint)
    bits.append(
        _mix_hint(
            designer_subject,
            mix_counts,
            diagrams_only=must and not allow_non_diagram,
            diagram_target_ratio=target,
        )
    )
    return " ".join(b for b in bits if b).strip()


def _accepted_visual(subject: str, vtype: str, require_diagram: bool) -> bool:
    rendered = DIAGRAM_TYPES.get(subject, frozenset())
    if require_diagram:
        return vtype in rendered
    return True


def _process_one(
    *,
    eq: EvalQuestion,
    review_label: str,
    designer_subject: str,
    store: ReviewStore,
    used: set[int],
    model: str,
    mix_by_subject: dict[str, dict[str, int]],
    difficulty_counts: dict[str, int],
    summary: dict[str, Any],
    recent: list[dict[str, Any]],
    remaining_by_label: dict[str, int],
    pool_totals: dict[str, int],
    phase: str,
    cycle: int,
    state_lock: threading.Lock,
    worker_id: int = 1,
    allow_non_diagram: bool = False,
    prefer_far: bool = False,
    review_question_id: str | None = None,
) -> None:
    with state_lock:
        mix_counts = dict(mix_by_subject.setdefault(designer_subject, {}))
        summary["workers_running"] = int(summary.get("workers_running") or 0) + 1
        summary["current"] = {
            "phase": phase,
            "cycle": cycle,
            "review_label": review_label,
            "source_question_id": eq.question_id,
            "has_source_diagram": _has_stem_diagram(eq),
            "exam_year": eq.exam_year,
            "paper_name": eq.paper_name,
            "question_number": eq.question_number,
            "worker_id": worker_id,
            "allow_non_diagram": allow_non_diagram,
            "prefer_far": prefer_far,
            "review_question_id": review_question_id,
        }
        inflight = list(summary.get("in_flight") or [])
        inflight.append(
            {
                "worker_id": worker_id,
                "review_label": review_label,
                "source_question_id": eq.question_id,
                "cycle": cycle,
                "phase": phase,
            }
        )
        summary["in_flight"] = inflight[-16:]
        _write_status(summary)

    targets = {
        "mathematics": 1.0,
        "physics": PHYSICS_DIAGRAM_RATIO,
        "biology": BIOLOGY_DIAGRAM_RATIO,
        "chemistry": CHEMISTRY_DIAGRAM_RATIO,
    }
    require_diagram = _require_diagram(
        subject=designer_subject,
        mix_counts=mix_counts,
        eq=eq,
        target=targets[designer_subject],
        allow_non_diagram=allow_non_diagram,
    )
    print(
        f"  [w{worker_id}] {review_label}: source {eq.question_id} "
        f"({eq.exam_year} {eq.paper_name} Q{eq.question_number})"
        f"{' [diagram]' if _has_stem_diagram(eq) else ' [text]'}"
        f"{' [prefer-diagram]' if require_diagram else ' [non-diagram-ok]'}"
        f"{' [far]' if prefer_far else ''}"
        f" phase={phase}",
        flush=True,
    )
    options = attach_source_options([eq]).get(eq.question_id) or {}
    try:
        local_store = ReviewStore(store.db_path)
        qid_override = review_question_id
        existing = local_store.get_item(f"nsaa-{eq.question_id}")
        existing_status = str((existing or {}).get("question_status") or "").lower()
        # Freed rejected sources should come back as far variations, not near-siblings.
        if existing_status == "rejected":
            prefer_far = True
        if prefer_far and not qid_override:
            # Avoid overwriting an existing keep when reusing a still-active source.
            if existing and existing_status not in {"", "rejected"}:
                qid_override = next_far_question_id(local_store, int(eq.question_id))
        rec = generate_one(
            eq,
            store=local_store,
            source_options=options,
            model=model,
            mix_hint=_slot_mix(
                review_label,
                designer_subject,
                eq,
                mix_counts,
                allow_non_diagram=allow_non_diagram,
                prefer_far=prefer_far,
            ),
            review_label=review_label,
            require_rendered_visual=require_diagram,
            review_question_id=qid_override,
        )
    except Exception as exc:
        rec = {
            "status": "error",
            "source_question_id": eq.question_id,
            "error": f"{type(exc).__name__}: {exc}",
            "review_label": review_label,
        }
        print(f"    [w{worker_id}] error: {exc}", flush=True)

    with state_lock:
        kept = False
        if rec.get("status") == "generated":
            vtype = str(rec.get("visual_type") or "none")
            qid = str(rec.get("question_id") or "")
            if not _accepted_visual(designer_subject, vtype, require_diagram):
                summary["skipped"] += 1
                if qid:
                    ReviewStore(store.db_path).delete_questions([qid])
                print(
                    f"    [w{worker_id}] skip({designer_subject}-no-diagram): "
                    f"visual_type={vtype} (removed from review DB)",
                    flush=True,
                )
                rec = {
                    **rec,
                    "status": "skipped",
                    "skip_reason": f"{review_label} requires diagram, got visual_type={vtype}",
                }
            else:
                kept = True
                _tick(used, eq.question_id)
                summary["generated"][review_label] = int(summary["generated"].get(review_label) or 0) + 1
                summary["generated"]["total"] = int(summary["generated"]["total"]) + 1
                sub_mix = mix_by_subject.setdefault(designer_subject, {})
                sub_mix[vtype] = sub_mix.get(vtype, 0) + 1
                item = ReviewStore(store.db_path).get_item(qid)
                diff = str((item or {}).get("difficulty") or "Unknown")
                difficulty_counts[diff] = difficulty_counts.get(diff, 0) + 1
                print(f"    [w{worker_id}] {rec.get('variation_mode')} {vtype} -> {qid}", flush=True)
        elif rec.get("status") == "skipped":
            summary["skipped"] += 1
            print(f"    [w{worker_id}] skip: {rec.get('skip_reason')}", flush=True)
        elif rec.get("status") == "error":
            summary["errors"] += 1

        if not kept:
            print(f"    [w{worker_id}] source {eq.question_id} not ticked (can retry)", flush=True)

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
                "worker_id": worker_id,
                "at": _now(),
            }
        )
        summary["recent"] = recent[-30:]
        flat_visuals: dict[str, int] = {}
        for sub_counts in mix_by_subject.values():
            for k, v in sub_counts.items():
                flat_visuals[k] = flat_visuals.get(k, 0) + int(v)
        summary["visual_type_counts"] = flat_visuals
        summary["visual_type_counts_by_subject"] = mix_by_subject
        summary["difficulty_counts"] = difficulty_counts
        remaining_by_label[review_label] = max(0, int(remaining_by_label.get(review_label) or 0) - 1)
        summary["pools"] = {
            **{f"{k}_total": pool_totals.get(k, 0) for k in pool_totals},
            "math1_remaining": int(remaining_by_label.get("Math 1") or 0),
            "math2_remaining": int(remaining_by_label.get("Math 2") or 0),
            "physics_remaining": int(remaining_by_label.get("Physics") or 0),
            "biology_remaining": int(remaining_by_label.get("Biology") or 0),
            "chemistry_remaining": int(remaining_by_label.get("Chemistry") or 0),
            "already_ticked": len(used),
            "phase": phase,
            "phase_math1": int(remaining_by_label.get("Math 1") or 0),
            "phase_math2": int(remaining_by_label.get("Math 2") or 0),
            "phase_physics": int(remaining_by_label.get("Physics") or 0),
            "phase_biology": int(remaining_by_label.get("Biology") or 0),
            "phase_chemistry": int(remaining_by_label.get("Chemistry") or 0),
        }
        summary["counts"] = ReviewStore(store.db_path).counts()
        summary["subject_counts"] = ReviewStore(store.db_path).subject_counts()
        summary["workers_running"] = max(0, int(summary.get("workers_running") or 1) - 1)
        summary["in_flight"] = [
            row
            for row in (summary.get("in_flight") or [])
            if not (
                int(row.get("worker_id") or 0) == worker_id
                and int(row.get("source_question_id") or -1) == int(eq.question_id)
            )
        ]
        _write_status(summary)


def _build_slots(queues: dict[str, list[EvalQuestion]]) -> list[tuple[str, str, list[EvalQuestion]]]:
    mapping = {
        "Math 1": "mathematics",
        "Math 2": "mathematics",
        "Physics": "physics",
        "Biology": "biology",
        "Chemistry": "chemistry",
    }
    slots: list[tuple[str, str, list[EvalQuestion]]] = []
    for label, n in RATIO.items():
        for _ in range(n):
            slots.append((label, mapping[label], queues[label]))
    return slots


def _unused_text_math(math_pool: list[EvalQuestion], done: set[int]) -> list[EvalQuestion]:
    return _sort_sources(
        [eq for eq in math_pool if eq.question_id not in done and not _has_stem_diagram(eq)]
    )


def _far_reuse_pool(
    pool: list[EvalQuestion],
    *,
    done: set[int],
    already_queued: set[int],
    diagram_only: bool,
) -> list[EvalQuestion]:
    """Already-used sources eligible for a far variation (new review id)."""
    out: list[EvalQuestion] = []
    for eq in _sort_sources(pool):
        if eq.question_id not in done:
            continue
        if eq.question_id in already_queued:
            continue
        if diagram_only and not _has_stem_diagram(eq):
            continue
        out.append(eq)
    return out


def _take(
    queue: list[EvalQuestion],
    *,
    seen: set[int],
) -> EvalQuestion | None:
    while queue:
        eq = queue.pop(0)
        if eq.question_id in seen:
            continue
        seen.add(eq.question_id)
        return eq
    return None


def _schedule_jobs(
    *,
    queues: dict[str, list[EvalQuestion]],
    text_math_queues: dict[str, list[EvalQuestion]],
    far_queues: dict[str, list[EvalQuestion]],
    target_cycles: int,
) -> list[dict[str, Any]]:
    """Prefer unused diagram, then unused text, then far-reuse of used sources."""
    mapping = {
        "Math 1": "mathematics",
        "Math 2": "mathematics",
        "Physics": "physics",
        "Biology": "biology",
        "Chemistry": "chemistry",
    }
    jobs: list[dict[str, Any]] = []
    seen: set[int] = set()
    for cycle in range(1, target_cycles + 1):
        for label, n in RATIO.items():
            if label in MATH_LABELS and MATH_SLOT_PERIOD > 1 and (cycle % MATH_SLOT_PERIOD) != 1:
                continue
            subject = mapping[label]
            for _ in range(n):
                eq = _take(queues[label], seen=seen)
                phase = "unused-diagram"
                allow_non_diagram = False
                prefer_far = False
                if eq is None and label in text_math_queues:
                    eq = _take(text_math_queues[label], seen=seen)
                    phase = "unused-text"
                    allow_non_diagram = True
                if eq is None:
                    eq = _take(far_queues[label], seen=seen)
                    phase = "far-reuse"
                    prefer_far = True
                    # Far reuse of a diagram source still prefers diagrams; text far allows none.
                    allow_non_diagram = not (_has_stem_diagram(eq) if eq else False)
                if eq is None:
                    continue
                # Science unused queues already include text at the tail.
                if (
                    phase == "unused-diagram"
                    and subject != "mathematics"
                    and not _has_stem_diagram(eq)
                ):
                    phase = "unused-text"
                    allow_non_diagram = True
                jobs.append(
                    {
                        "eq": eq,
                        "review_label": label,
                        "designer_subject": subject,
                        "cycle": cycle,
                        "phase": phase,
                        "allow_non_diagram": allow_non_diagram,
                        "prefer_far": prefer_far,
                    }
                )
    return jobs


def run_esat_batch(
    *,
    cycles: int | None = 10,
    dry_run: bool = False,
    force: bool = False,
    model: str = NSAA_DIAGRAM_MODEL,
    workers: int | None = None,
) -> dict[str, Any]:
    _load_env()
    worker_n = _worker_count(workers)
    store = ReviewStore()
    freed = sync_free_rejected_sources(store)
    print(
        f"[NSAA-ESAT] freed ticks: rejected={freed['freed_rejected']} "
        f"orphan={freed['freed_orphan_ticks']} used_remaining={freed['used_remaining']}",
        flush=True,
    )
    done = set() if force else (already_generated_ids(store) | _load_used())
    used = set(_load_used()) if not force else set()
    # Keep runtime used-set aligned with blocking done for ticks this run.
    if not force:
        used |= already_generated_ids(store)

    math_pool = select_nsaa_subject_questions(subject="mathematics")
    physics_pool = select_nsaa_subject_questions(subject="physics")
    biology_pool = select_nsaa_subject_questions(subject="biology")
    chemistry_pool = select_nsaa_subject_questions(subject="chemistry")

    math_diagram = [eq for eq in math_pool if _has_stem_diagram(eq) and eq.question_id not in done]
    math1_q, math2_q = _split_math(math_diagram)
    text_math = _unused_text_math(math_pool, done)
    text_m1, text_m2 = _split_math(text_math)

    queues: dict[str, list[EvalQuestion]] = {
        "Math 1": list(math1_q),
        "Math 2": list(math2_q),
        "Physics": _diagram_source_queue(physics_pool, done),
        "Biology": _diagram_source_queue(biology_pool, done),
        "Chemistry": _diagram_source_queue(chemistry_pool, done),
    }
    text_math_queues = {"Math 1": list(text_m1), "Math 2": list(text_m2)}

    queued_ids = {eq.question_id for q in queues.values() for eq in q}
    queued_ids |= {eq.question_id for q in text_math_queues.values() for eq in q}
    far_queues: dict[str, list[EvalQuestion]] = {
        "Math 1": _far_reuse_pool(math_pool, done=done, already_queued=queued_ids, diagram_only=False),
        "Math 2": [],
        "Physics": _far_reuse_pool(physics_pool, done=done, already_queued=queued_ids, diagram_only=False),
        "Biology": _far_reuse_pool(biology_pool, done=done, already_queued=queued_ids, diagram_only=False),
        "Chemistry": _far_reuse_pool(chemistry_pool, done=done, already_queued=queued_ids, diagram_only=False),
    }
    # Split math far pool across Math1/Math2 like unused math.
    far_m1, far_m2 = _split_math(far_queues["Math 1"])
    far_queues["Math 1"] = far_m1
    far_queues["Math 2"] = far_m2

    pool_totals = {
        "mathematics": len(math_pool),
        "physics": len(physics_pool),
        "biology": len(biology_pool),
        "chemistry": len(chemistry_pool),
    }

    def _effective_len(label: str) -> int:
        n = len(queues[label])
        if label in text_math_queues:
            n += len(text_math_queues[label])
        n += len(far_queues[label])
        return n

    capacities: list[int] = []
    for label, n in RATIO.items():
        if n <= 0:
            continue
        avail = _effective_len(label) // n
        if label in MATH_LABELS and MATH_SLOT_PERIOD > 1:
            # Math slots only on cycles 1, 1+P, 1+2P, ... so pool lasts ~P times longer.
            avail *= MATH_SLOT_PERIOD
        capacities.append(avail)
    nonzero = [c for c in capacities if c > 0]
    max_cycles = min(nonzero) if nonzero else 0
    if max_cycles == 0 and any(_effective_len(label) > 0 for label in RATIO):
        max_cycles = 1
    if cycles is None or cycles <= 0:
        target_cycles = max_cycles
    else:
        target_cycles = min(int(cycles), max_cycles)

    ratio_text = (
        f"Math1/Math2 every {MATH_SLOT_PERIOD} cycles (half prior rate) · "
        "2 Physics : 3 Biology : 3 Chemistry each cycle"
    )
    diagram_policy = (
        "Prefer unused diagram sources; if exhausted use unused text (non-diagram OK), "
        "then far-reuse already-used sources. Rejected/failed ticks are freed before each run."
    )
    summary: dict[str, Any] = {
        "status": "running",
        "pipeline": "nsaa_esat",
        "model": model,
        "workers": worker_n,
        "workers_running": 0,
        "in_flight": [],
        "ratio": ratio_text,
        "diagram_policy": diagram_policy,
        "exam_filter": "NSAA Section 1 only (no ENGAA, no specimen, no Section 2)",
        "review_note": "Manual review via Streamlit. Publish approved rows with: python -m visual_engine.scripts.publish_approved_to_supabase",
        "freed_ticks": freed,
        "phase_plan": [
            {
                "phase": "diagram-then-text-then-far",
                "math1_diagram": len(queues["Math 1"]),
                "math2_diagram": len(queues["Math 2"]),
                "math1_text": len(text_math_queues["Math 1"]),
                "math2_text": len(text_math_queues["Math 2"]),
                "math1_far": len(far_queues["Math 1"]),
                "math2_far": len(far_queues["Math 2"]),
                "physics": len(queues["Physics"]),
                "biology": len(queues["Biology"]),
                "chemistry": len(queues["Chemistry"]),
                "physics_far": len(far_queues["Physics"]),
                "biology_far": len(far_queues["Biology"]),
                "chemistry_far": len(far_queues["Chemistry"]),
                "max_cycles": max_cycles,
            }
        ],
        "pools": {
            "mathematics_total": len(math_pool),
            "physics_total": len(physics_pool),
            "biology_total": len(biology_pool),
            "chemistry_total": len(chemistry_pool),
            "math1_remaining": _effective_len("Math 1"),
            "math2_remaining": _effective_len("Math 2"),
            "physics_remaining": _effective_len("Physics"),
            "biology_remaining": _effective_len("Biology"),
            "chemistry_remaining": _effective_len("Chemistry"),
            "already_ticked": len(done),
            "phase": "diagram-then-text-then-far",
            "phase_math1": _effective_len("Math 1"),
            "phase_math2": _effective_len("Math 2"),
            "phase_physics": _effective_len("Physics"),
            "phase_biology": _effective_len("Biology"),
            "phase_chemistry": _effective_len("Chemistry"),
        },
        "target_cycles": target_cycles,
        "completed_cycles": 0,
        "generated": {
            "Math 1": 0,
            "Math 2": 0,
            "Physics": 0,
            "Biology": 0,
            "Chemistry": 0,
            "total": 0,
        },
        "skipped": 0,
        "errors": 0,
        "visual_type_counts": {},
        "difficulty_counts": {},
        "current": None,
        "recent": [],
        "started_at": _now(),
        "phase": "diagram-then-text-then-far",
    }
    _write_status(summary)

    if dry_run:
        summary["status"] = "dry_run"
        planned_jobs = _schedule_jobs(
            queues={k: list(v) for k, v in queues.items()},
            text_math_queues={k: list(v) for k, v in text_math_queues.items()},
            far_queues={k: list(v) for k, v in far_queues.items()},
            target_cycles=target_cycles,
        )
        summary["planned"] = [
            {
                "review_label": j["review_label"],
                "source_question_id": j["eq"].question_id,
                "phase": j["phase"],
                "allow_non_diagram": j["allow_non_diagram"],
                "prefer_far": j["prefer_far"],
            }
            for j in planned_jobs
        ]
        _write_status(summary)
        return summary

    mix_by_subject: dict[str, dict[str, int]] = {
        "mathematics": {},
        "physics": {},
        "biology": {},
        "chemistry": {},
    }
    difficulty_counts: dict[str, int] = {}
    recent: list[dict[str, Any]] = []
    state_lock = threading.Lock()

    jobs = _schedule_jobs(
        queues=queues,
        text_math_queues=text_math_queues,
        far_queues=far_queues,
        target_cycles=target_cycles,
    )

    print(
        f"[NSAA-ESAT] cycles={target_cycles} workers={worker_n} jobs={len(jobs)} "
        f"ratio={ratio_text}",
        flush=True,
    )

    remaining_by_label = {
        "Math 1": sum(1 for j in jobs if j["review_label"] == "Math 1"),
        "Math 2": sum(1 for j in jobs if j["review_label"] == "Math 2"),
        "Physics": sum(1 for j in jobs if j["review_label"] == "Physics"),
        "Biology": sum(1 for j in jobs if j["review_label"] == "Biology"),
        "Chemistry": sum(1 for j in jobs if j["review_label"] == "Chemistry"),
    }
    summary["pools"].update(
        {
            "math1_remaining": remaining_by_label["Math 1"],
            "math2_remaining": remaining_by_label["Math 2"],
            "physics_remaining": remaining_by_label["Physics"],
            "biology_remaining": remaining_by_label["Biology"],
            "chemistry_remaining": remaining_by_label["Chemistry"],
            "phase_math1": remaining_by_label["Math 1"],
            "phase_math2": remaining_by_label["Math 2"],
            "phase_physics": remaining_by_label["Physics"],
            "phase_biology": remaining_by_label["Biology"],
            "phase_chemistry": remaining_by_label["Chemistry"],
        }
    )
    _write_status(summary)

    completed_by_cycle: dict[int, int] = {}
    jobs_per_cycle: dict[int, int] = {}
    for j in jobs:
        jobs_per_cycle[j["cycle"]] = jobs_per_cycle.get(j["cycle"], 0) + 1

    def _run_job(job: dict[str, Any], worker_id: int) -> int:
        _process_one(
            eq=job["eq"],
            review_label=job["review_label"],
            designer_subject=job["designer_subject"],
            store=store,
            used=used,
            model=model,
            mix_by_subject=mix_by_subject,
            difficulty_counts=difficulty_counts,
            summary=summary,
            recent=recent,
            remaining_by_label=remaining_by_label,
            pool_totals=pool_totals,
            phase=str(job.get("phase") or "unused-diagram"),
            cycle=int(job["cycle"]),
            state_lock=state_lock,
            worker_id=worker_id,
            allow_non_diagram=bool(job.get("allow_non_diagram")),
            prefer_far=bool(job.get("prefer_far")),
        )
        return int(job["cycle"])

    with ThreadPoolExecutor(max_workers=worker_n, thread_name_prefix="nsaa-gen") as pool:
        future_map = {}
        for idx, job in enumerate(jobs):
            wid = (idx % worker_n) + 1
            future_map[pool.submit(_run_job, job, wid)] = job
        for fut in as_completed(future_map):
            job = future_map[fut]
            try:
                cycle_done = fut.result()
            except Exception as exc:
                print(f"[NSAA-ESAT] worker crash on {job.get('review_label')}: {exc}", flush=True)
                with state_lock:
                    summary["errors"] = int(summary.get("errors") or 0) + 1
                    _write_status(summary)
                continue
            with state_lock:
                completed_by_cycle[cycle_done] = completed_by_cycle.get(cycle_done, 0) + 1
                done_cycles = [
                    c
                    for c, n in completed_by_cycle.items()
                    if n >= jobs_per_cycle.get(c, 0)
                ]
                if done_cycles:
                    summary["completed_cycles"] = max(done_cycles)
                    _write_status(summary)

    summary["status"] = "completed"
    summary["finished_at"] = _now()
    summary["current"] = None
    summary["workers_running"] = 0
    summary["in_flight"] = []
    summary["counts"] = store.counts()
    summary["subject_counts"] = store.subject_counts()
    _write_status(summary)
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate Math1/Math2/Physics/Biology/Chemistry from NSAA at 1:1:2:3:3"
    )
    parser.add_argument(
        "--cycles",
        type=int,
        default=10,
        help="Number of full-ratio cycles. Use 0 until a limiting pool runs out.",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=DEFAULT_WORKERS,
        help=f"Concurrent generate workers (default {DEFAULT_WORKERS}, max 8).",
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
        workers=args.workers,
    )
    print(json.dumps({k: v for k, v in result.items() if k != "recent"}, indent=2))
    if result.get("status") not in {"completed", "dry_run"}:
        return 1
    generated = int((result.get("generated") or {}).get("total") or 0)
    errors = int(result.get("errors") or 0)
    if generated == 0 and errors > 0:
        print(f"ERROR: generated=0 with errors={errors}", flush=True)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
