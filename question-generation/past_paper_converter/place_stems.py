"""Batch mid-stem diagram placement (no recrop, no live stem rewrite).

Writes sidecar JSON under ``_cache/stem_placements/`` for later apply.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from .batch_place import build_place_batch_request, run_batch_place
from .config import CACHE_DIR, DEFAULT_BATCH_MODEL
from .db import make_client
from .export_questions import download_image, sha256_bytes
from .stem_blocks import (
    split_stem_blocks,
    stem_diagram_assets,
    strip_figures,
    validate_placements,
)

PLACEMENTS_DIR = CACHE_DIR / "stem_placements"
STATUS_FILE = PLACEMENTS_DIR / ".place_status.json"
MANIFEST_FILE = PLACEMENTS_DIR / "run_manifest.json"

PAGE_SIZE = 1000


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _write_json(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def write_place_status(payload: Dict[str, Any]) -> None:
    _write_json(STATUS_FILE, payload)


def sidecar_path(question_id: int) -> Path:
    return PLACEMENTS_DIR / f"q{int(question_id)}.json"


def load_sidecar(question_id: int) -> Optional[Dict[str, Any]]:
    path = sidecar_path(question_id)
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    return data if isinstance(data, dict) else None


def has_ok_sidecar(question_id: int) -> bool:
    data = load_sidecar(question_id)
    return bool(data and data.get("status") == "ok")


def _paginate(build_query) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    offset = 0
    while True:
        page = build_query().range(offset, offset + PAGE_SIZE - 1).execute().data or []
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            return rows
        offset += PAGE_SIZE


def _is_stem_diagram_asset(asset: Dict[str, Any]) -> bool:
    if asset.get("option_letter"):
        return False
    if asset.get("role") == "graphical_option":
        return False
    if asset.get("position") == "option":
        return False
    return bool(str(asset.get("id") or "").strip())


def _assets_have_stem_diagram(assets: Any) -> bool:
    if not isinstance(assets, list):
        return False
    return any(
        isinstance(asset, dict) and _is_stem_diagram_asset(asset) for asset in assets
    )


def load_place_candidates(
    *,
    question_id: Optional[int] = None,
    paper_id: Optional[int] = None,
    exam_name: Optional[str] = None,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Load published questions that have at least one stem diagram asset.

    Prefers live ``questions.diagram_assets`` / stem, falling back to the
    latest auto_approved conversion when the question row has no assets.
    """
    client = make_client()
    question_columns = (
        "id, paper_id, exam_name, exam_year, paper_name, question_number, "
        "question_image, question_stem, diagram_assets, content_format"
    )

    def questions_query():
        q = client.table("questions").select(question_columns).order("id")
        if question_id is not None:
            q = q.eq("id", question_id)
        if paper_id is not None:
            q = q.eq("paper_id", paper_id)
        if exam_name:
            q = q.eq("exam_name", exam_name)
        return q

    questions = _paginate(questions_query)
    by_id = {int(row["id"]): row for row in questions}

    # Pull approved conversions for stems/assets/hash when needed.
    conversion_columns = (
        "question_id, question_stem, diagram_assets, source_image_url, "
        "source_image_hash, status, updated_at"
    )

    def conversions_query():
        q = (
            client.table("question_conversions")
            .select(conversion_columns)
            .eq("status", "auto_approved")
            .order("updated_at", desc=True)
        )
        if question_id is not None:
            q = q.eq("question_id", question_id)
        return q

    conversions = _paginate(conversions_query)
    latest_conversion: Dict[int, Dict[str, Any]] = {}
    for row in conversions:
        qid = int(row["question_id"])
        if qid not in latest_conversion:
            latest_conversion[qid] = row

    candidates: List[Dict[str, Any]] = []
    seen: set[int] = set()

    # Prefer question ids that appear in either table with stem diagrams.
    all_ids = sorted(set(by_id) | set(latest_conversion))
    for qid in all_ids:
        question = by_id.get(qid)
        if paper_id is not None and question is None:
            continue
        if question_id is not None and qid != question_id:
            continue
        question = question or {}
        conversion = latest_conversion.get(qid) or {}
        assets = question.get("diagram_assets")
        if not _assets_have_stem_diagram(assets):
            assets = conversion.get("diagram_assets")
        if not _assets_have_stem_diagram(assets):
            continue
        stem = question.get("question_stem") or conversion.get("question_stem") or ""
        source_url = (
            (conversion.get("source_image_url") or "").strip()
            or str(question.get("question_image") or "").strip()
        )
        if not source_url:
            continue
        exam = str(question.get("exam_name") or conversion.get("exam_name") or "")
        if exam_name and exam != exam_name:
            continue
        candidates.append(
            {
                "questionId": qid,
                "paperId": int(question.get("paper_id") or 0),
                "examName": exam or "Unknown",
                "examYear": int(question.get("exam_year") or 0),
                "paperName": str(question.get("paper_name") or ""),
                "questionNumber": int(question.get("question_number") or 0),
                "questionStem": stem,
                "diagramAssets": assets,
                "sourceImageUrl": source_url,
                "sourceImageHash": conversion.get("source_image_hash") or "",
            }
        )
        seen.add(qid)
        if limit is not None and len(candidates) >= limit:
            break

    # If filtering by question_id and it was missing from pagination joins.
    if question_id is not None and question_id not in seen:
        return []
    return candidates


def build_candidate_record(candidate: Dict[str, Any]) -> Dict[str, Any]:
    """Prepare stem blocks + stem assets for one candidate (no network)."""
    stem_assets = stem_diagram_assets(candidate.get("diagramAssets"))
    blocks = split_stem_blocks(str(candidate.get("questionStem") or ""))
    return {
        "questionId": int(candidate["questionId"]),
        "examName": candidate.get("examName") or "",
        "examYear": int(candidate.get("examYear") or 0),
        "paperName": candidate.get("paperName") or "",
        "questionNumber": int(candidate.get("questionNumber") or 0),
        "stemBlocks": blocks,
        "assets": [
            {
                "id": str(asset.get("id")),
                "alt": str(asset.get("alt") or "diagram not to scale"),
                "role": asset.get("role") or "stem_diagram",
                "url": asset.get("url") or "",
            }
            for asset in stem_assets
        ],
        "sourceImageUrl": candidate.get("sourceImageUrl") or "",
        "sourceImageHash": candidate.get("sourceImageHash") or "",
        "strippedStem": strip_figures(str(candidate.get("questionStem") or "")),
    }


def write_sidecar_record(record: Dict[str, Any]) -> Path:
    path = sidecar_path(int(record["questionId"]))
    _write_json(path, record)
    return path


def _failed_record(prepared: Dict[str, Any], error: str, *, model: str) -> Dict[str, Any]:
    return {
        "questionId": prepared["questionId"],
        "examName": prepared["examName"],
        "examYear": prepared["examYear"],
        "paperName": prepared["paperName"],
        "questionNumber": prepared.get("questionNumber") or 0,
        "stemBlocks": prepared.get("stemBlocks") or [],
        "assets": [
            {"id": a["id"], "alt": a.get("alt"), "role": a.get("role")}
            for a in (prepared.get("assets") or [])
        ],
        "placements": [],
        "model": model,
        "placedAt": _now_iso(),
        "sourceImageHash": prepared.get("sourceImageHash") or "",
        "status": "failed",
        "error": error,
    }


def _ok_record(
    prepared: Dict[str, Any],
    placements: List[Dict[str, Any]],
    *,
    model: str,
    image_hash: str,
) -> Dict[str, Any]:
    return {
        "questionId": prepared["questionId"],
        "examName": prepared["examName"],
        "examYear": prepared["examYear"],
        "paperName": prepared["paperName"],
        "questionNumber": prepared.get("questionNumber") or 0,
        "stemBlocks": prepared.get("stemBlocks") or [],
        "assets": [
            {"id": a["id"], "alt": a.get("alt"), "role": a.get("role")}
            for a in (prepared.get("assets") or [])
        ],
        "placements": placements,
        "model": model,
        "placedAt": _now_iso(),
        "sourceImageHash": image_hash or prepared.get("sourceImageHash") or "",
        "status": "ok",
    }


def place_stems(
    *,
    all_questions: bool = False,
    question_id: Optional[int] = None,
    paper_id: Optional[int] = None,
    exam_name: Optional[str] = None,
    limit: Optional[int] = None,
    dry_run: bool = False,
    resume: bool = False,
    force: bool = False,
    model: Optional[str] = None,
) -> Dict[str, Any]:
    """Run mid-stem placement for matching diagram questions."""
    if not all_questions and question_id is None and paper_id is None and not exam_name:
        raise ValueError("Pass --all, --question-id, --paper-id, or --exam")

    model_name = model or DEFAULT_BATCH_MODEL
    PLACEMENTS_DIR.mkdir(parents=True, exist_ok=True)

    candidates = load_place_candidates(
        question_id=question_id,
        paper_id=paper_id,
        exam_name=exam_name,
        limit=limit,
    )
    if all_questions and question_id is None:
        # load_place_candidates already returns all; limit still applies.
        pass

    prepared_rows: List[Dict[str, Any]] = []
    skipped_resume = 0
    skipped_no_assets = 0

    for candidate in candidates:
        qid = int(candidate["questionId"])
        if resume and not force and has_ok_sidecar(qid):
            skipped_resume += 1
            continue
        prepared = build_candidate_record(candidate)
        if not prepared["assets"]:
            skipped_no_assets += 1
            record = {
                **_failed_record(prepared, "no stem diagram assets", model=model_name),
                "status": "skipped_no_stem_diagram",
                "error": "no stem diagram assets",
            }
            if not dry_run:
                write_sidecar_record(record)
            continue
        prepared_rows.append(prepared)

    status: Dict[str, Any] = {
        "status": "running",
        "total": len(prepared_rows),
        "completed": 0,
        "successful": 0,
        "failed": 0,
        "skippedResume": skipped_resume,
        "skippedNoAssets": skipped_no_assets,
        "dryRun": dry_run,
        "model": model_name,
        "message": f"Placing stems for {len(prepared_rows)} question(s)",
        "startedAt": _now_iso(),
        "batchJobName": None,
        "perId": {},
    }
    write_place_status(status)

    if not prepared_rows:
        status["status"] = "completed"
        status["message"] = (
            f"Nothing to place (resume_skipped={skipped_resume}, "
            f"no_assets={skipped_no_assets})"
        )
        status["finishedAt"] = _now_iso()
        write_place_status(status)
        _write_json(MANIFEST_FILE, status)
        return status

    # Build batch requests (download images).
    requests: List[Dict[str, Any]] = []
    prepared_by_id: Dict[str, Dict[str, Any]] = {}
    hash_by_id: Dict[str, str] = {}
    build_errors: Dict[str, str] = {}

    for prepared in prepared_rows:
        qid = str(prepared["questionId"])
        prepared_by_id[qid] = prepared
        try:
            image_bytes = download_image(prepared["sourceImageUrl"])
            image_hash = sha256_bytes(image_bytes)
            hash_by_id[qid] = image_hash
            asset_crop_bytes: Dict[str, bytes] = {}
            for asset in prepared.get("assets") or []:
                asset_id = str(asset.get("id") or "")
                crop_url = str(asset.get("url") or "").strip()
                if not asset_id or not crop_url:
                    continue
                try:
                    asset_crop_bytes[asset_id] = download_image(crop_url)
                except Exception:
                    continue
            requests.append(
                build_place_batch_request(
                    question_id=prepared["questionId"],
                    image_bytes=image_bytes,
                    exam_name=prepared["examName"],
                    exam_year=prepared["examYear"],
                    paper_name=prepared["paperName"],
                    question_number=prepared["questionNumber"],
                    stem_blocks=prepared["stemBlocks"],
                    assets=prepared["assets"],
                    asset_crop_bytes=asset_crop_bytes,
                )
            )
        except Exception as exc:
            build_errors[qid] = str(exc)

    status["message"] = (
        f"Built {len(requests)} batch request(s); "
        f"{len(build_errors)} download/build error(s)"
    )
    write_place_status(status)

    if dry_run:
        sample = []
        for req in requests[:3]:
            key = req.get("metadata", {}).get("key")
            prepared = prepared_by_id.get(str(key), {})
            sample.append(
                {
                    "questionId": key,
                    "blockCount": len(prepared.get("stemBlocks") or []),
                    "assetIds": [a["id"] for a in prepared.get("assets") or []],
                    "requestBytesApprox": len(json.dumps(req)),
                }
            )
        status["status"] = "dry_run"
        status["message"] = (
            f"Dry run: would submit {len(requests)} placement requests "
            f"(model={model_name})"
        )
        status["sample"] = sample
        status["buildErrors"] = build_errors
        status["finishedAt"] = _now_iso()
        write_place_status(status)
        _write_json(MANIFEST_FILE, status)
        return status

    # Persist build failures immediately.
    for qid, error in build_errors.items():
        prepared = prepared_by_id[qid]
        record = _failed_record(prepared, f"image fetch failed: {error}", model=model_name)
        write_sidecar_record(record)
        status["failed"] += 1
        status["completed"] += 1
        status["perId"][qid] = "failed"
        write_place_status(status)

    batch_results: Dict[str, Dict[str, Any]] = {}
    if requests:

        def on_status(job_name: str, state: str) -> None:
            status["batchJobName"] = job_name
            status["batchState"] = state
            status["message"] = f"Batch {job_name}: {state}"
            write_place_status(status)
            print(status["message"], file=sys.stderr, flush=True)

        batch_results = run_batch_place(
            requests,
            model=model_name,
            on_status=on_status,
        )

    for prepared in prepared_rows:
        qid = str(prepared["questionId"])
        if qid in build_errors:
            continue
        raw = batch_results.get(qid)
        if not raw:
            record = _failed_record(
                prepared, "missing batch response", model=model_name
            )
            write_sidecar_record(record)
            status["failed"] += 1
            status["completed"] += 1
            status["perId"][qid] = "failed"
            write_place_status(status)
            continue

        if raw.get("error") or "batch_parse_error" in str(raw.get("flags") or []):
            record = _failed_record(
                prepared,
                str(raw.get("error") or raw.get("flags") or "batch error"),
                model=model_name,
            )
            write_sidecar_record(record)
            status["failed"] += 1
            status["completed"] += 1
            status["perId"][qid] = "failed"
            write_place_status(status)
            continue

        placements_raw = raw.get("placements")
        asset_ids = [str(a["id"]) for a in prepared["assets"]]
        placements, error = validate_placements(
            placements_raw,
            asset_ids=asset_ids,
            block_count=len(prepared["stemBlocks"]),
        )
        if error:
            record = _failed_record(prepared, error, model=model_name)
            record["rawModelResponse"] = raw
            write_sidecar_record(record)
            status["failed"] += 1
            status["completed"] += 1
            status["perId"][qid] = "failed"
            write_place_status(status)
            continue

        record = _ok_record(
            prepared,
            placements,
            model=model_name,
            image_hash=hash_by_id.get(qid, ""),
        )
        write_sidecar_record(record)
        status["successful"] += 1
        status["completed"] += 1
        status["perId"][qid] = "ok"
        write_place_status(status)

    status["status"] = "completed"
    status["finishedAt"] = _now_iso()
    status["message"] = (
        f"Done: {status['successful']} ok, {status['failed']} failed, "
        f"{skipped_resume} resume-skipped"
    )
    write_place_status(status)
    _write_json(MANIFEST_FILE, status)
    return status
