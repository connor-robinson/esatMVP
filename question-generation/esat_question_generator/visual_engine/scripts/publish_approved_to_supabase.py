#!/usr/bin/env python3
"""Publish approved Streamlit review.db questions into the live question bank.

Local \"Approve\" only writes SQLite. This script uploads diagram PNGs to the
``question-images`` bucket and upserts rows into ``ai_generated_questions`` with
``status='approved'`` so they appear on the site.

Usage (from question-generation/esat_question_generator):

  python -m visual_engine.scripts.publish_approved_to_supabase --dry-run
  python -m visual_engine.scripts.publish_approved_to_supabase --limit 20
  python -m visual_engine.scripts.publish_approved_to_supabase --subject Physics
  python -m visual_engine.scripts.publish_approved_to_supabase --overwrite

Requires repo-root ``.env.local`` with ``SUPABASE_URL`` + ``SUPABASE_SERVICE_ROLE_KEY``.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from visual_engine.review_store import DEFAULT_DB_PATH, ReviewStore

REPO_ROOT = Path(__file__).resolve().parents[4]
ESAT_ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS_DIR = DEFAULT_DB_PATH.parent / "artifacts"

VALID_SUBJECTS = {
    "Math 1",
    "Math 2",
    "Physics",
    "Chemistry",
    "Biology",
    "Paper 1",
    "Paper 2",
}

# NSAA visual engine types -> V4 CHECK-safe values.
# Published PNGs are raster diagrams, so use concept_image (not graph JSON).
VISUAL_TYPE_MAP = {
    "geometry": "concept_image",
    "chem_structure": "concept_image",
    "bio_diagram": "concept_image",
    "pedigree": "concept_image",
    "energy_profile": "concept_image",
    "graph": "concept_image",
    "table": "concept_image",
    "none": "none",
    "": "none",
}


def _load_env() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    for candidate in (
        REPO_ROOT / ".env.local",
        ESAT_ROOT / ".env.local",
        Path.cwd() / ".env.local",
    ):
        if candidate.is_file():
            load_dotenv(candidate, override=False)


def _supabase_client():
    _load_env()
    import os

    try:
        from supabase import create_client
    except ImportError as exc:  # pragma: no cover
        raise SystemExit("pip install supabase") from exc

    url = (os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "").strip()
    key = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    if not url or not key:
        raise SystemExit("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local")
    return create_client(url, key), url


def _parse_json(raw: str | None, default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default


def _embed_diagram(stem: str, image_url: str, *, alt: str = "Exam diagram") -> str:
    safe_alt = (alt or "Exam diagram").replace('"', "&quot;")
    safe_url = image_url.replace('"', "&quot;")
    fig = (
        '<figure class="qg-diagram" style="margin:1em 0;text-align:center;">'
        f'<img src="{safe_url}" alt="{safe_alt}" style="max-width:100%;height:auto;" />'
        "</figure>"
    )
    s = stem or ""
    if "qg-diagram" in s.lower():
        return s
    return s.rstrip() + ("\n\n" if s and not s.endswith("\n") else "") + fig


def _resolve_png(item: dict[str, Any]) -> Path | None:
    """Prefer approved diagram PNG; fall back to any attempt or artifacts tree."""
    qid = str(item.get("question_id") or "")
    attempts = list(item.get("attempts") or [])
    preferred = [
        a
        for a in attempts
        if str(a.get("status") or "") == "approved" and a.get("image_path")
    ]
    candidates = preferred + [a for a in reversed(attempts) if a.get("image_path")]
    for attempt in candidates:
        path = Path(str(attempt.get("image_path") or ""))
        if path.is_file():
            return path

    q_dir = ARTIFACTS_DIR / qid
    if q_dir.is_dir():
        rendered = sorted(q_dir.rglob("rendered.png"))
        if rendered:
            return rendered[-1]
    return None


def _map_visual_type(source: dict[str, Any]) -> str:
    raw = str(source.get("visual_type") or "").strip().lower()
    return VISUAL_TYPE_MAP.get(raw, "concept_image")


def _build_row(
    item: dict[str, Any],
    *,
    image_url: str | None,
    image_key: str | None,
    local_png: Path | None,
) -> dict[str, Any]:
    qid = str(item["question_id"]).strip()
    subject = str(item.get("subject") or "").strip()
    if subject not in VALID_SUBJECTS:
        raise ValueError(f"Invalid subject for {qid}: {subject!r}")

    options = _parse_json(item.get("choices_json"), {})
    if not isinstance(options, dict) or not options:
        raise ValueError(f"Missing options for {qid}")

    correct = str(item.get("correct_answer") or "").strip().upper()[:1]
    if correct not in options:
        raise ValueError(f"correct_answer {correct!r} not in options for {qid}")

    source = _parse_json(item.get("source_json"), {})
    if not isinstance(source, dict):
        source = {}

    stem = str(item.get("stem") or "")
    has_visual = bool(image_url)
    if image_url:
        stem = _embed_diagram(stem, image_url)

    idea_plan = source.get("idea_plan") if isinstance(source.get("idea_plan"), dict) else {}
    idea_plan = {
        **idea_plan,
        "nsaa_visual_type": source.get("visual_type"),
        "variation_mode": item.get("variation_mode") or source.get("variation_mode"),
        "mode_reason": source.get("mode_reason"),
        "source_question_id": source.get("source_question_id"),
        "exam_name": source.get("exam_name"),
        "exam_year": source.get("exam_year"),
        "paper_name": source.get("paper_name"),
        "part_name": source.get("part_name"),
        "question_number": source.get("question_number"),
        "published_from": "visual_engine_review_db",
        "review_question_id": qid,
    }

    visual_assets = None
    if image_url:
        visual_assets = [
            {
                "kind": "diagram",
                "image_paths": [image_url],
                "storage_key": image_key,
                "local_path": str(local_png) if local_png else None,
                "renderer": "visual_engine_matplotlib_v1",
                "qc_status": "pass",
                "answer_bearing": True,
            }
        ]

    explanation = str(item.get("explanation") or "")
    insight = ""
    for line in explanation.splitlines():
        line = line.strip()
        if line:
            insight = line[:240]
            break

    created = str(item.get("created_at") or "").strip() or datetime.now(timezone.utc).isoformat()

    return {
        "generation_id": qid,
        "schema_id": f"nsaa-review-{subject.replace(' ', '').lower()}",
        "difficulty": str(item.get("difficulty") or "Medium").strip() or "Medium",
        "status": "approved",
        "question_stem": stem,
        "options": options,
        "correct_option": correct,
        "solution_reasoning": explanation,
        "solution_key_insight": insight,
        "distractor_map": {},
        "idea_plan": idea_plan,
        "verifier_report": {
            "verdict": "PASS",
            "source": "human_review",
            "pipeline": source.get("pipeline") or "nsaa",
        },
        "style_report": {"verdict": "PASS", "source": "human_review"},
        "models_used": {
            "diagram": source.get("diagram_model"),
            "question": source.get("question_model"),
        },
        "generation_attempts": 1,
        "test_type": "ESAT",
        "subjects": subject,
        "pipeline": "nsaa_visual_review",
        "has_visual": has_visual,
        "visual_type": _map_visual_type(source) if has_visual else "none",
        "visual_renderer": "visual_engine_matplotlib_v1" if has_visual else None,
        "visual_qc_status": "pass" if has_visual else None,
        "visual_assets": visual_assets,
        "practice_eligible": True,
        "reserved_for_mock": False,
        "created_at": created,
    }


def _existing_generation_ids(client, ids: list[str]) -> set[str]:
    found: set[str] = set()
    chunk = 100
    for i in range(0, len(ids), chunk):
        batch = ids[i : i + chunk]
        res = (
            client.table("ai_generated_questions")
            .select("generation_id")
            .in_("generation_id", batch)
            .execute()
        )
        for row in res.data or []:
            gid = row.get("generation_id")
            if gid:
                found.add(str(gid))
    return found


def _source_visual_type(item: dict[str, Any]) -> str:
    source = _parse_json(item.get("source_json"), {})
    if not isinstance(source, dict):
        return "none"
    return str(source.get("visual_type") or "none").strip().lower()


def _allows_text_only(item: dict[str, Any]) -> bool:
    """True when generation intentionally had no rendered diagram PNG.

    Streamlit often sets diagram_required=1 even for visual_type none/table.
    Those were human-approved as text (or markdown table) questions.
    """
    return _source_visual_type(item) in {"none", "table", ""}


def publish(
    *,
    dry_run: bool,
    limit: int | None,
    subject: str | None,
    overwrite: bool,
    allow_missing_diagram: bool,
    question_ids: list[str] | None,
) -> dict[str, Any]:
    store = ReviewStore()
    items = store.list_items(status_filter="approved", latest_only=True)
    # Harden: list_items ORs diagram approval; require question_status approved.
    items = [i for i in items if str(i.get("question_status") or "") == "approved"]
    if subject:
        items = [i for i in items if str(i.get("subject") or "") == subject]
    if question_ids:
        wanted = set(question_ids)
        items = [i for i in items if str(i.get("question_id") or "") in wanted]

    items.sort(key=lambda i: str(i.get("reviewed_at") or i.get("created_at") or ""))
    if limit is not None:
        items = items[: max(0, limit)]

    summary: dict[str, Any] = {
        "dry_run": dry_run,
        "candidates": len(items),
        "published": 0,
        "skipped_existing": 0,
        "skipped_no_diagram": 0,
        "published_text_only": 0,
        "errors": [],
        "published_ids": [],
        "skipped_no_diagram_ids": [],
    }
    if not items:
        return summary

    client, _url = _supabase_client()
    # Import uploader after env load.
    sys.path.insert(0, str(ESAT_ROOT))
    from pipeline_v4.storage.supabase_assets import SupabaseAssetUploader

    uploader = SupabaseAssetUploader(prefix="nsaa_review")
    if not dry_run and not uploader.enabled:
        raise SystemExit("Supabase asset uploader failed to initialize (check credentials)")

    existing = _existing_generation_ids(
        client, [str(i["question_id"]) for i in items]
    )

    for item in items:
        qid = str(item["question_id"])
        try:
            if qid in existing and not overwrite:
                summary["skipped_existing"] += 1
                continue

            png = _resolve_png(item)
            if (
                png is None
                and not _allows_text_only(item)
                and not allow_missing_diagram
            ):
                summary["skipped_no_diagram"] += 1
                summary["skipped_no_diagram_ids"].append(qid)
                continue

            image_url = None
            image_key = None
            if png is not None:
                if dry_run:
                    image_url = f"dry-run://{png.name}"
                    image_key = f"nsaa_review/{qid}/{png.name}"
                else:
                    uploaded = uploader.upload_file(
                        png,
                        generation_id=qid,
                        filename="rendered.png",
                        content_type="image/png",
                        upsert=True,
                    )
                    if not uploaded:
                        raise RuntimeError(f"Failed to upload diagram for {qid}")
                    image_url = uploaded["url"]
                    image_key = uploaded["key"]

            row = _build_row(
                item,
                image_url=image_url,
                image_key=image_key,
                local_png=png,
            )

            if dry_run:
                summary["published"] += 1
                summary["published_ids"].append(qid)
                if png is None:
                    summary["published_text_only"] += 1
                continue

            # Prefer upsert on generation_id unique constraint.
            res = (
                client.table("ai_generated_questions")
                .upsert(row, on_conflict="generation_id")
                .execute()
            )
            if getattr(res, "error", None):
                raise RuntimeError(str(res.error))
            summary["published"] += 1
            summary["published_ids"].append(qid)
            if png is None:
                summary["published_text_only"] += 1
        except Exception as exc:  # noqa: BLE001 - collect and continue batch
            summary["errors"].append({"question_id": qid, "error": str(exc)})

    return summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Publish approved review.db questions to Supabase question bank"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and report without uploading or writing rows",
    )
    parser.add_argument("--limit", type=int, default=None, help="Max questions to publish")
    parser.add_argument(
        "--subject",
        type=str,
        default=None,
        help="Only publish one subject (e.g. Physics)",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Update rows that already exist for the same generation_id",
    )
    parser.add_argument(
        "--allow-missing-diagram",
        action="store_true",
        help="Publish diagram_required questions even when no PNG is on disk",
    )
    parser.add_argument(
        "--ids",
        type=str,
        default=None,
        help="Comma-separated question_id list (e.g. nsaa-2462,nsaa-2422)",
    )
    args = parser.parse_args(argv)

    question_ids = None
    if args.ids:
        question_ids = [x.strip() for x in args.ids.split(",") if x.strip()]

    summary = publish(
        dry_run=args.dry_run,
        limit=args.limit,
        subject=args.subject,
        overwrite=args.overwrite,
        allow_missing_diagram=args.allow_missing_diagram,
        question_ids=question_ids,
    )
    print(json.dumps(summary, indent=2))
    if summary["errors"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
