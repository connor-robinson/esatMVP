#!/usr/bin/env python3
"""Merge a CI NSAA review artifact into the local Streamlit review DB.

Usage (from question-generation/esat_question_generator):

  python -m visual_engine.scripts.import_ci_review_artifact path/to/nsaa-review-data.tgz

Or point at an extracted review_data directory:

  python -m visual_engine.scripts.import_ci_review_artifact path/to/review_data

This copies PNG/SVG/spec assets into the local review_data/assets tree and upserts
rows into the local review.db so Streamlit can show them.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
import tarfile
import tempfile
from pathlib import Path
from typing import Any

from visual_engine.review_store import DEFAULT_DB_PATH, ReviewStore


def _extract_artifact(src: Path, work: Path) -> Path:
    if src.is_dir():
        # Accept either review_data itself or a parent that contains it.
        if (src / "review.db").is_file():
            return src
        if (src / "review_data" / "review.db").is_file():
            return src / "review_data"
        raise FileNotFoundError(f"No review.db under {src}")
    if not src.is_file():
        raise FileNotFoundError(src)
    with tarfile.open(src, "r:*") as tar:
        tar.extractall(work)
    candidate = work / "review_data"
    if (candidate / "review.db").is_file():
        return candidate
    # Some archives may nest differently.
    matches = list(work.rglob("review.db"))
    if not matches:
        raise FileNotFoundError("Archive did not contain review.db")
    return matches[0].parent


def _load_json(raw: str | None) -> Any:
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def _rewrite_asset(
    src_path: str | None,
    *,
    artifact_root: Path,
    local_assets: Path,
    question_id: str,
    attempt: int,
) -> str:
    if not src_path:
        return ""
    src = Path(src_path)
    # Prefer relative lookup under the artifact assets tree.
    name = src.name
    candidates = [
        artifact_root / "assets" / question_id / f"attempt_{attempt:02d}" / name,
        artifact_root / "assets" / question_id / name,
        src if src.is_file() else None,
    ]
    # Also search by filename under the question folder.
    q_dir = artifact_root / "assets" / question_id
    if q_dir.is_dir():
        for hit in q_dir.rglob(name):
            candidates.append(hit)

    chosen: Path | None = None
    for c in candidates:
        if c and Path(c).is_file():
            chosen = Path(c)
            break
    if chosen is None:
        return ""

    # Preserve attempt folder layout when possible.
    rel_parts = chosen.parts
    attempt_folder = f"attempt_{attempt:02d}"
    if attempt_folder in rel_parts:
        dest = local_assets / question_id / attempt_folder / chosen.name
    elif chosen.parent.name == question_id:
        dest = local_assets / question_id / chosen.name
    else:
        dest = local_assets / question_id / attempt_folder / chosen.name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(chosen, dest)
    # Copy sibling svg if present.
    if chosen.suffix.lower() == ".png":
        svg = chosen.with_suffix(".svg")
        if svg.is_file():
            shutil.copy2(svg, dest.with_suffix(".svg"))
    return str(dest)


def import_review_data(artifact_src: Path, *, local_db: Path | None = None) -> dict[str, Any]:
    local_store = ReviewStore(local_db or DEFAULT_DB_PATH)
    local_root = local_store.db_path.parent
    local_assets = local_root / "assets"
    local_assets.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="nsaa_ci_import_") as tmp:
        artifact_root = _extract_artifact(Path(artifact_src), Path(tmp))
        src_db = artifact_root / "review.db"
        conn = sqlite3.connect(str(src_db))
        conn.row_factory = sqlite3.Row

        questions = conn.execute("SELECT * FROM questions").fetchall()
        imported_q = 0
        imported_d = 0
        skipped = 0

        for q in questions:
            qid = str(q["question_id"])
            # Skip if already present locally unless status is empty/missing.
            existing = local_store.get_item(qid)
            if existing and existing.get("stem"):
                skipped += 1
                continue

            choices = _load_json(q["choices_json"] if "choices_json" in q.keys() else "{}")
            flags = _load_json(q["auto_flags_json"] if "auto_flags_json" in q.keys() else "[]")
            source = _load_json(q["source_json"] if "source_json" in q.keys() else "{}")
            mode = ""
            if "variation_mode" in q.keys():
                mode = str(q["variation_mode"] or "")
            local_store.upsert_question(
                question_id=qid,
                subject=str(q["subject"] or ""),
                topic=str(q["topic"] or mode),
                difficulty=str(q["difficulty"] or ""),
                stem=str(q["stem"] or ""),
                choices=choices if isinstance(choices, dict) else {},
                correct_answer=str(q["correct_answer"] or ""),
                explanation=str(q["explanation"] or ""),
                diagram_required=bool(q["diagram_required"]),
                diagram_status=str(q["diagram_status"] or "none"),
                question_status=str(q["question_status"] or "pending"),
                auto_flags=flags if isinstance(flags, list) else [],
                source=source if isinstance(source, dict) else {},
                variation_mode=mode or str(q["topic"] or ""),
            )
            imported_q += 1

            diagrams = conn.execute(
                "SELECT * FROM diagram_reviews WHERE question_id = ? ORDER BY attempt ASC",
                (qid,),
            ).fetchall()
            for d in diagrams:
                attempt = int(d["attempt"] or 1)
                image_path = _rewrite_asset(
                    d["image_path"],
                    artifact_root=artifact_root,
                    local_assets=local_assets,
                    question_id=qid,
                    attempt=attempt,
                )
                spec_path = _rewrite_asset(
                    d["spec_path"],
                    artifact_root=artifact_root,
                    local_assets=local_assets,
                    question_id=qid,
                    attempt=attempt,
                )
                source_image_path = _rewrite_asset(
                    d["source_image_path"],
                    artifact_root=artifact_root,
                    local_assets=local_assets,
                    question_id=qid,
                    attempt=attempt,
                )
                local_store.add_diagram_attempt(
                    question_id=qid,
                    attempt=attempt,
                    image_path=image_path,
                    spec_path=spec_path,
                    source_image_path=source_image_path,
                    original_spec=_load_json(d["original_spec_json"]),
                    generation_spec=_load_json(d["generation_spec_json"]),
                    status=str(d["status"] or "pending"),
                    feedback=str(d["feedback"] or ""),
                )
                imported_d += 1

        conn.close()

    summary = {
        "local_db": str(local_store.db_path),
        "imported_questions": imported_q,
        "imported_diagrams": imported_d,
        "skipped_existing": skipped,
        "counts": local_store.counts(),
    }
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("artifact", help="Path to nsaa-review-data.tgz or extracted review_data/")
    parser.add_argument(
        "--db",
        default="",
        help="Optional local review.db path (default: visual_engine/review_data/review.db)",
    )
    args = parser.parse_args()
    summary = import_review_data(
        Path(args.artifact),
        local_db=Path(args.db) if args.db else None,
    )
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
