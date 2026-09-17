"""Generate ~20 Physics magnetism diagram questions into the NSAA review queue.

Uses the existing visual_engine NSAA designer/renderer with a Magnetism (P-P2) focus.
Only ~10 NSAA physics diagram sources are magnetism-tagged, so we attempt sibling + far
per source to reach ~20 rendered diagrams.

  cd question-generation/esat_question_generator
  python -m visual_engine.generate_physics_magnetism_diagrams --n 20
"""

from __future__ import annotations

import argparse
import json
import time
import traceback
from typing import Any

from visual_engine.eval.question_selector import select_nsaa_subject_questions
from visual_engine.nsaa_batch import (
    NSAA_DIAGRAM_MODEL,
    _mix_hint,
    already_generated_ids,
    attach_source_options,
    generate_one,
    next_far_question_id,
)
from visual_engine.review_store import ReviewStore

MAGNETISM_KEYS = (
    "magnetic field",
    "magnet",
    "solenoid",
    "flux",
    "induced e",
    "induced current",
    "lorentz",
    "bar magnet",
    "u-shaped",
    "force on a current",
    "current-carrying wire",
    "conducting rails",
    "metal rails",
    "copper ring",
    "primary coil",
    "secondary coil",
    "transformer",
)

EXCLUDE_KEYS = (
    "electromagnetic spectrum",
    "electromagnetic wave",
    "motorway",
    "hydroelectric",
    "wavelength range of visible",
)

TOPIC_FOCUS = (
    "TOPIC FOCUS (required): ESAT Magnetism / curriculum P-P2. "
    "Stay on magnetic fields, forces on currents, electromagnetic induction, "
    "transformers, and motors/generators driven by magnetic force. "
    "Prefer visual_type geometry (exam schematic of magnet/coil/rails/wire) or "
    "visual_type graph (science_xy / cartesian) when the source supports a plot. "
    "Do not drift into pure waves, thermal, or mechanics-only items. "
    "Do not invent dense field-line artwork; keep simple exam-style schematics."
)


def _is_magnetism(stem: str) -> bool:
    low = (stem or "").lower()
    if any(e in low for e in EXCLUDE_KEYS):
        return False
    return any(k in low for k in MAGNETISM_KEYS)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=20, help="Target rendered diagram questions")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--model", default=NSAA_DIAGRAM_MODEL)
    parser.add_argument("--per-source", type=int, default=2, help="Sibling + far attempts per source")
    args = parser.parse_args()

    target = max(1, int(args.n))
    per_source = max(1, min(3, int(args.per_source)))
    store = ReviewStore()
    pool = select_nsaa_subject_questions(
        subject="physics",
        count=None,
        require_diagram=True,
    )
    sources = [eq for eq in pool if _is_magnetism(eq.question_stem)]
    done = set() if args.force else already_generated_ids(store)
    # Prefer unused sources first, then allow far reuse of already-used magnetism sources.
    unused = [eq for eq in sources if eq.question_id not in done]
    used = [eq for eq in sources if eq.question_id in done]
    ordered = unused + used

    print(
        json.dumps(
            {
                "magnetism_sources": len(sources),
                "unused": len(unused),
                "used": len(used),
                "target": target,
                "per_source": per_source,
                "ids": [eq.question_id for eq in ordered],
            },
            indent=2,
        ),
        flush=True,
    )
    if args.dry_run:
        return 0

    options_by_id = attach_source_options(ordered)
    generated = 0
    skipped = 0
    errors = 0
    mix_counts: dict[str, int] = {}
    results: list[dict[str, Any]] = []

    for i, eq in enumerate(ordered, start=1):
        if generated >= target:
            break
        print(
            f"[magnetism {i}/{len(ordered)}] source {eq.question_id} "
            f"({eq.exam_year} Q{eq.question_number})",
            flush=True,
        )
        for var_i in range(per_source):
            if generated >= target:
                break
            prefer_far = var_i > 0 or eq.question_id in done
            qid_override = next_far_question_id(store, int(eq.question_id)) if prefer_far else None
            far_hint = (
                " You MUST set variation_mode to far (not sibling). "
                "Keep Magnetism / P-P2 but change numbers, layout, or scenario enough for a new item."
                if prefer_far
                else ""
            )
            mix = (
                TOPIC_FOCUS
                + " "
                + _mix_hint("physics", mix_counts, diagrams_only=True)
                + far_hint
            ).strip()
            rec: dict[str, Any] | None = None
            for attempt in range(6):
                try:
                    rec = generate_one(
                        eq,
                        store=store,
                        source_options=options_by_id.get(eq.question_id) or {},
                        model=args.model,
                        mix_hint=mix,
                        require_rendered_visual=True,
                        allowed_visual_types={"geometry", "graph"},
                        review_label="Physics",
                        review_question_id=qid_override,
                    )
                    break
                except Exception as exc:
                    msg = str(exc)
                    rate_limited = (
                        "429" in msg
                        or "RESOURCE_EXHAUSTED" in msg
                        or "disconnected" in msg.lower()
                    )
                    if rate_limited and attempt < 5:
                        delay = min(180, 30 * (attempt + 1))
                        print(
                            f"  rate-limit/disconnect; sleep {delay}s then retry "
                            f"({attempt + 1}/6): {exc}",
                            flush=True,
                        )
                        time.sleep(delay)
                        continue
                    rec = {
                        "status": "error",
                        "source_question_id": eq.question_id,
                        "error": f"{type(exc).__name__}: {exc}",
                    }
                    print(f"  error: {exc}", flush=True)
                    traceback.print_exc()
                    break
            if rec is None:
                continue
            results.append(rec)
            status = str(rec.get("status") or "")
            if status == "generated":
                generated += 1
                vtype = str(rec.get("visual_type") or "none")
                mix_counts[vtype] = mix_counts.get(vtype, 0) + 1
                print(
                    f"  {rec.get('variation_mode')} {vtype} -> {rec.get('question_id')} "
                    f"({generated}/{target})",
                    flush=True,
                )
            elif status == "skipped":
                skipped += 1
                print(f"  skip: {rec.get('skip_reason')}", flush=True)
            else:
                errors += 1
            # Slow pacing (~2x) to reduce Vertex 429 storms overnight.
            if status == "generated":
                time.sleep(20)
            elif status == "skipped":
                time.sleep(4)
            else:
                time.sleep(10)

    summary = {
        "status": "completed",
        "generated": generated,
        "skipped": skipped,
        "errors": errors,
        "visual_type_counts": mix_counts,
        "review_counts": store.counts(),
    }
    print(json.dumps(summary, indent=2), flush=True)
    print(
        "Review with: streamlit run visual_engine/review_app.py",
        flush=True,
    )
    return 0 if generated > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
