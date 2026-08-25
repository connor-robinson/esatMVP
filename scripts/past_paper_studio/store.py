"""Supabase reads, progress aggregation, and studio saves."""

from __future__ import annotations

import concurrent.futures
import json
import re
import threading
import time
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple

from past_paper_converter.config import CACHE_DIR, expected_option_letters
from past_paper_converter.db import approve_question_text, make_client
from past_paper_converter.diagram import build_diagram_stem_embed
from past_paper_converter.katex_validate import validate_question_content
from past_paper_converter.validate import normalize_latex_delimiters, normalize_options

from . import imaging

STATUS_FILE = CACHE_DIR.parent / ".conversion_status.json"
PAPER_REVIEWS_FILE = CACHE_DIR / "studio_paper_reviews.json"
FIGURE_RE = re.compile(r"<figure[^>]*>[\s\S]*?<\/figure>", re.IGNORECASE)
PAGE_SIZE = 1000
_PAPER_REVIEWS_LOCK = threading.Lock()

QUESTION_COLUMNS = (
    "id, paper_id, exam_name, exam_year, paper_name, part_letter, part_name, "
    "exam_type, question_number, answer_letter, question_image, question_stem, "
    "options, diagram_assets, content_format, solution_image, solution_text"
)

REPORT_FLAG_KEYS = (
    "image_fetch_failed",
    "blurry",
    "diagram_crop_failed",
    "table_processing_failed",
    "wrong_question_number",
    "missing_options",
    "extra_options",
    "katex_errors",
    "low_confidence",
    "answer_letter_missing",
    "graphical_options_incomplete",
    "diagram_detection_mismatch",
    "diagram_classification_uncertain",
    "human_crop_required",
    "questions_promote_failed",
)

ACTIVE_STATUS_RANK = {"auto_approved": 3, "pending": 2, "processing": 2, "failed": 1}


_LOCAL = threading.local()

# Threads are reused across requests so the per-thread Supabase clients (and
# their connection pools) survive: building a client per request cost seconds.
_POOL = concurrent.futures.ThreadPoolExecutor(max_workers=6, thread_name_prefix="studio")


def _client() -> Any:
    """A Supabase client per thread; the underlying client is not thread-safe."""
    existing = getattr(_LOCAL, "client", None)
    if existing is None:
        existing = make_client()
        _LOCAL.client = existing
    return existing


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


_CACHE: Dict[str, Tuple[float, Any]] = {}


def cached(key: str, ttl: float, producer: Callable[[], Any], *, refresh: bool = False) -> Any:
    """Round trips to Supabase cost seconds, so short-lived reads are reused."""
    hit = _CACHE.get(key)
    if not refresh and hit is not None and time.monotonic() - hit[0] < ttl:
        return hit[1]
    value = producer()
    _CACHE[key] = (time.monotonic(), value)
    return value


def invalidate(*keys: str) -> None:
    for key in keys:
        _CACHE.pop(key, None)


def with_retry(operation: Callable[[], Any], *, attempts: int = 3, delay: float = 0.5) -> Any:
    """Supabase occasionally drops a connection while the converter is running."""
    last: Optional[BaseException] = None
    for attempt in range(attempts):
        try:
            return operation()
        except Exception as exc:
            last = exc
            if attempt + 1 == attempts:
                break
            time.sleep(delay * (attempt + 1))
    raise last if last else RuntimeError("query failed")


def _paginate(build_query) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    offset = 0
    while True:
        start = offset
        page = with_retry(
            lambda: build_query().range(start, start + PAGE_SIZE - 1).execute().data or []
        )
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            return rows
        offset += PAGE_SIZE


def _is_converted(question: Dict[str, Any]) -> bool:
    return str(question.get("content_format") or "") == "text"


def _report_flags(report: Dict[str, Any]) -> List[str]:
    flags: List[str] = []
    for key in REPORT_FLAG_KEYS:
        value = report.get(key)
        if value is True or (isinstance(value, (list, tuple)) and len(value) > 0):
            flags.append(key)
    return flags


def _pick_active(conversions: Iterable[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Prefer an approved row, then the most recently touched one."""
    best: Optional[Dict[str, Any]] = None
    best_key: Tuple[int, str] = (-1, "")
    for row in conversions:
        status = str(row.get("status") or "")
        if status == "superseded":
            continue
        key = (
            ACTIVE_STATUS_RANK.get(status, 0),
            str(row.get("updated_at") or row.get("created_at") or ""),
        )
        if key > best_key:
            best, best_key = row, key
    return best


def _conversions_by_question(columns: str) -> Dict[int, Dict[str, Any]]:
    rows = _paginate(
        lambda: _client().table("question_conversions").select(columns).order("question_id")
    )
    grouped: Dict[int, List[Dict[str, Any]]] = {}
    for row in rows:
        grouped.setdefault(int(row["question_id"]), []).append(row)
    active: Dict[int, Dict[str, Any]] = {}
    for question_id, group in grouped.items():
        chosen = _pick_active(group)
        if chosen is not None:
            active[question_id] = chosen
    return active


def _blank_stats() -> Dict[str, int]:
    return {
        "total": 0,
        "converted": 0,
        "failed": 0,
        "needsReview": 0,
        "humanCrop": 0,
        "reviewed": 0,
        "edited": 0,
        "unprocessed": 0,
        "withDiagram": 0,
    }


def _apply_stats(
    stats: Dict[str, int], question: Dict[str, Any], conversion: Optional[Dict[str, Any]]
) -> None:
    stats["total"] += 1
    converted = _is_converted(question)
    if converted:
        stats["converted"] += 1

    report = (conversion or {}).get("conversion_report") or {}
    status = str((conversion or {}).get("status") or "")

    if status == "failed":
        stats["failed"] += 1
    if report.get("diagram_review_status") == "needs_review":
        stats["needsReview"] += 1
    if report.get("human_crop_required") is True:
        stats["humanCrop"] += 1
    if report.get("studio_reviewed") is True:
        stats["reviewed"] += 1
    if report.get("studio_edited") is True:
        stats["edited"] += 1
    if report.get("has_diagram") is True or report.get("has_table") is True:
        stats["withDiagram"] += 1
    if not converted and status != "failed":
        stats["unprocessed"] += 1


def _paper_state(stats: Dict[str, int]) -> str:
    if stats["total"] == 0:
        return "empty"
    if stats["converted"] >= stats["total"]:
        return "complete"
    if stats["converted"] == 0:
        return "not_started"
    return "partial"


def load_overview(*, refresh: bool = False) -> Dict[str, Any]:
    data = cached("overview", 30.0, _build_overview, refresh=refresh)
    return {**data, "converterStatus": converter_status()}


def _all_papers() -> List[Dict[str, Any]]:
    return _paginate(
        lambda: _client().table("papers").select("id, exam_name, exam_year, paper_name").order("id")
    )


def _all_questions_lite() -> List[Dict[str, Any]]:
    return _paginate(
        lambda: _client().table("questions").select("id, paper_id, content_format").order("id")
    )


def _build_overview() -> Dict[str, Any]:
    # Each task resolves its own thread-local client, so these run in parallel
    # without sharing a connection.
    papers_future = _POOL.submit(_all_papers)
    questions_future = _POOL.submit(_all_questions_lite)
    conversions_future = _POOL.submit(
        _conversions_by_question,
        "question_id, status, conversion_report, updated_at, created_at",
    )
    papers = papers_future.result()
    questions = questions_future.result()
    conversions = conversions_future.result()

    paper_stats: Dict[int, Dict[str, int]] = {}
    for question in questions:
        paper_id = int(question["paper_id"])
        stats = paper_stats.setdefault(paper_id, _blank_stats())
        _apply_stats(stats, question, conversions.get(int(question["id"])))

    totals = _blank_stats()
    paper_reviews = paper_human_reviewed_map()
    papers_human_reviewed = 0
    exams: Dict[str, Dict[int, List[Dict[str, Any]]]] = {}
    for paper in papers:
        paper_id = int(paper["id"])
        stats = paper_stats.get(paper_id, _blank_stats())
        for key, value in stats.items():
            totals[key] += value
        review = paper_reviews.get(paper_id) or {}
        human_reviewed = review.get("reviewed") is True
        if human_reviewed:
            papers_human_reviewed += 1
        entry = {
            "paperId": paper_id,
            "examName": paper.get("exam_name") or "Unknown",
            "examYear": int(paper.get("exam_year") or 0),
            "paperName": paper.get("paper_name") or "",
            "stats": stats,
            "state": _paper_state(stats),
            "humanReviewed": human_reviewed,
            "humanReviewedAt": review.get("reviewedAt") or "",
        }
        exams.setdefault(entry["examName"], {}).setdefault(entry["examYear"], []).append(entry)

    exam_list = []
    for exam_name in sorted(exams):
        years = []
        for year in sorted(exams[exam_name], reverse=True):
            papers_for_year = sorted(
                exams[exam_name][year], key=lambda item: item["paperName"]
            )
            year_stats = _blank_stats()
            year_human = 0
            for item in papers_for_year:
                for key, value in item["stats"].items():
                    year_stats[key] += value
                if item.get("humanReviewed"):
                    year_human += 1
            years.append(
                {
                    "examYear": year,
                    "stats": year_stats,
                    "papers": papers_for_year,
                    "papersHumanReviewed": year_human,
                }
            )
        exam_stats = _blank_stats()
        exam_human = 0
        for year_entry in years:
            for key, value in year_entry["stats"].items():
                exam_stats[key] += value
            exam_human += int(year_entry.get("papersHumanReviewed") or 0)
        exam_list.append(
            {
                "examName": exam_name,
                "stats": exam_stats,
                "years": years,
                "papersHumanReviewed": exam_human,
            }
        )

    return {
        "totals": {
            **totals,
            "papers": len(papers),
            "papersHumanReviewed": papers_human_reviewed,
        },
        "exams": exam_list,
    }


def converter_status() -> Dict[str, Any]:
    if not STATUS_FILE.is_file():
        return {"status": "idle"}
    try:
        return json.loads(STATUS_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"status": "unknown"}


def _load_paper_reviews() -> Dict[str, Dict[str, Any]]:
    if not PAPER_REVIEWS_FILE.is_file():
        return {}
    try:
        data = json.loads(PAPER_REVIEWS_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    return data if isinstance(data, dict) else {}


def _save_paper_reviews(data: Dict[str, Dict[str, Any]]) -> None:
    PAPER_REVIEWS_FILE.parent.mkdir(parents=True, exist_ok=True)
    PAPER_REVIEWS_FILE.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")


def paper_human_reviewed_map() -> Dict[int, Dict[str, Any]]:
    """paper_id -> {reviewed, reviewedAt} for homepage tracking."""
    out: Dict[int, Dict[str, Any]] = {}
    for key, value in _load_paper_reviews().items():
        try:
            paper_id = int(key)
        except (TypeError, ValueError):
            continue
        if not isinstance(value, dict):
            continue
        if value.get("reviewed") is True:
            out[paper_id] = {
                "reviewed": True,
                "reviewedAt": value.get("reviewedAt") or "",
            }
    return out


def set_paper_human_reviewed(paper_id: int, reviewed: bool) -> Dict[str, Any]:
    """Mark or clear a whole paper as human-reviewed for studio tracking."""
    paper_id = int(paper_id)
    with _PAPER_REVIEWS_LOCK:
        data = _load_paper_reviews()
        key = str(paper_id)
        if reviewed:
            data[key] = {"reviewed": True, "reviewedAt": _now_iso()}
        else:
            data.pop(key, None)
        _save_paper_reviews(data)
    invalidate("overview", f"paper:{paper_id}")
    entry = paper_human_reviewed_map().get(paper_id) or {
        "reviewed": False,
        "reviewedAt": "",
    }
    return {"paperId": paper_id, **entry}


PAPER_CONVERSION_COLUMNS = (
    "question_id, status, conversion_report, confidence, diagram_assets, updated_at, created_at"
)


def _paper_conversions_by_embed(paper_id: int) -> List[Dict[str, Any]]:
    return _paginate(
        lambda: _client()
        .table("question_conversions")
        .select(f"{PAPER_CONVERSION_COLUMNS}, questions!inner(paper_id)")
        .eq("questions.paper_id", paper_id)
        .order("question_id")
    )


def _paper_conversions_by_ids(question_ids: List[int]) -> List[Dict[str, Any]]:
    if not question_ids:
        return []
    return _paginate(
        lambda: _client()
        .table("question_conversions")
        .select(PAPER_CONVERSION_COLUMNS)
        .in_("question_id", question_ids)
        .order("question_id")
    )


def _paper_row(paper_id: int) -> List[Dict[str, Any]]:
    return with_retry(
        lambda: _client()
        .table("papers")
        .select("id, exam_name, exam_year, paper_name")
        .eq("id", paper_id)
        .limit(1)
        .execute()
        .data
        or []
    )


def _paper_questions(paper_id: int) -> List[Dict[str, Any]]:
    return _paginate(
        lambda: _client()
        .table("questions")
        .select(
            "id, paper_id, question_number, part_letter, part_name, answer_letter, "
            "question_image, content_format"
        )
        .eq("paper_id", paper_id)
        .order("question_number")
        .order("id")
    )


def load_paper(paper_id: int, *, refresh: bool = False) -> Dict[str, Any]:
    return cached(f"paper:{paper_id}", 20.0, lambda: _build_paper(paper_id), refresh=refresh)


def _build_paper(paper_id: int) -> Dict[str, Any]:
    paper_future = _POOL.submit(_paper_row, paper_id)
    questions_future = _POOL.submit(_paper_questions, paper_id)
    conversions_future = _POOL.submit(_paper_conversions_by_embed, paper_id)

    paper_rows = paper_future.result()
    questions = questions_future.result()
    try:
        conversion_rows = conversions_future.result()
    except Exception:
        # Older PostgREST versions reject filters on embedded resources.
        conversion_rows = _paper_conversions_by_ids([int(row["id"]) for row in questions])

    if not paper_rows:
        raise LookupError(f"paper {paper_id} not found")
    paper = paper_rows[0]

    grouped: Dict[int, List[Dict[str, Any]]] = {}
    for row in conversion_rows:
        grouped.setdefault(int(row["question_id"]), []).append(row)
    active: Dict[int, Dict[str, Any]] = {}
    for question_id, group in grouped.items():
        chosen = _pick_active(group)
        if chosen is not None:
            active[question_id] = chosen

    stats = _blank_stats()
    items: List[Dict[str, Any]] = []
    for question in questions:
        conversion = active.get(int(question["id"]))
        _apply_stats(stats, question, conversion)
        report = (conversion or {}).get("conversion_report") or {}
        assets = (conversion or {}).get("diagram_assets")
        asset_count = len(assets) if isinstance(assets, list) else 0
        has_diagram = report.get("has_diagram") is True or asset_count > 0
        items.append(
            {
                "questionId": int(question["id"]),
                "questionNumber": int(question.get("question_number") or 0),
                "partLetter": question.get("part_letter") or "",
                "partName": question.get("part_name") or "",
                "answerLetter": (question.get("answer_letter") or "").upper(),
                "contentFormat": question.get("content_format") or "image",
                "converted": _is_converted(question),
                "conversionStatus": (conversion or {}).get("status"),
                "confidence": (conversion or {}).get("confidence"),
                "hasDiagram": has_diagram,
                "diagramCount": asset_count,
                "hasTable": report.get("has_table") is True,
                "needsReview": report.get("diagram_review_status") == "needs_review",
                "studioReviewed": report.get("studio_reviewed") is True,
                "studioEdited": report.get("studio_edited") is True,
                "flags": _report_flags(report),
            }
        )

    review = paper_human_reviewed_map().get(paper_id) or {}
    return {
        "paper": {
            "paperId": int(paper["id"]),
            "examName": paper.get("exam_name") or "",
            "examYear": int(paper.get("exam_year") or 0),
            "paperName": paper.get("paper_name") or "",
            "stats": stats,
            "state": _paper_state(stats),
            "humanReviewed": review.get("reviewed") is True,
            "humanReviewedAt": review.get("reviewedAt") or "",
        },
        "questions": items,
    }


def _fetch_question(question_id: int) -> Dict[str, Any]:
    client = _client()
    rows = with_retry(
        lambda: client.table("questions")
        .select(QUESTION_COLUMNS)
        .eq("id", question_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        raise LookupError(f"question {question_id} not found")
    return rows[0]


CONVERSION_COLUMNS = (
    "id, status, question_stem, options, diagram_assets, conversion_report, confidence, "
    "model_used, source_image_url, source_image_hash, option_letters, updated_at, created_at"
)


def _fetch_active_conversion(question_id: int) -> Optional[Dict[str, Any]]:
    client = _client()
    rows = with_retry(
        lambda: client.table("question_conversions")
        .select(CONVERSION_COLUMNS)
        .eq("question_id", question_id)
        .order("updated_at", desc=True)
        .execute()
        .data
        or []
    )
    return _pick_active(rows)


def _sibling_ids(paper_id: int) -> List[int]:
    client = _client()

    def fetch() -> List[int]:
        rows = _paginate(
            lambda: client.table("questions")
            .select("id, question_number")
            .eq("paper_id", paper_id)
            .order("question_number")
            .order("id")
        )
        return [int(row["id"]) for row in rows]

    return cached(f"siblings:{paper_id}", 600.0, fetch)


def _neighbors(question: Dict[str, Any]) -> Dict[str, Optional[int]]:
    ordered = _sibling_ids(int(question["paper_id"]))
    try:
        index = ordered.index(int(question["id"]))
    except ValueError:
        return {"prevId": None, "nextId": None, "position": None, "count": len(ordered)}
    return {
        "prevId": ordered[index - 1] if index > 0 else None,
        "nextId": ordered[index + 1] if index + 1 < len(ordered) else None,
        "position": index + 1,
        "count": len(ordered),
    }


def strip_figures(stem: str) -> str:
    return FIGURE_RE.sub("", stem or "").strip()


def format_katex_errors(errors: Iterable[Any]) -> str:
    parts: List[str] = []
    for item in list(errors)[:4]:
        if isinstance(item, dict):
            field = item.get("field") or "field"
            parts.append(f"{field}: {item.get('error') or 'render failed'}")
        else:
            parts.append(str(item))
    return "; ".join(parts)


def source_url_for(question_id: int) -> str:
    """The exact screenshot the stored bboxes were measured against.

    Cached so the crop editor keeps working through a Supabase blip: it fires
    several image requests per drag and must not depend on the network.
    """

    def fetch() -> str:
        question = _fetch_question(question_id)
        conversion = _fetch_active_conversion(question_id)
        return (conversion or {}).get("source_image_url") or question.get("question_image") or ""

    return cached(f"source_url:{question_id}", 1800.0, fetch)


def _normalize_assets(assets: Any) -> List[Dict[str, Any]]:
    if not isinstance(assets, list):
        return []
    return [dict(asset) for asset in assets if isinstance(asset, dict)]


def load_question(
    question_id: int,
    *,
    refresh: bool = False,
    warm_neighbors: bool = True,
) -> Dict[str, Any]:
    """Load one question for the review UI.

    Results are cached briefly and neighbors are warmed in the background so
    Prev/Next feel instant when reviewing a paper in order.
    """

    def produce() -> Dict[str, Any]:
        question_future = _POOL.submit(_fetch_question, question_id)
        conversion_future = _POOL.submit(_fetch_active_conversion, question_id)
        question = question_future.result()
        conversion = conversion_future.result()

        source_url = (conversion or {}).get("source_image_url") or question.get("question_image")
        stem = (conversion or {}).get("question_stem") or question.get("question_stem") or ""
        options = (conversion or {}).get("options") or question.get("options") or {}
        assets = _normalize_assets(
            (conversion or {}).get("diagram_assets") or question.get("diagram_assets")
        )
        report = (conversion or {}).get("conversion_report") or {}

        source_width: Optional[int] = None
        source_height: Optional[int] = None
        source_error: Optional[str] = None
        if source_url:
            _CACHE[f"source_url:{question_id}"] = (time.monotonic(), source_url)
            try:
                source_width, source_height = imaging.source_size(source_url)
            except Exception as exc:  # network/decoding issues must not break the editor
                source_error = str(exc)

        return {
            "question": {
                "questionId": int(question["id"]),
                "paperId": int(question["paper_id"]),
                "examName": question.get("exam_name") or "",
                "examYear": int(question.get("exam_year") or 0),
                "paperName": question.get("paper_name") or "",
                "partLetter": question.get("part_letter") or "",
                "partName": question.get("part_name") or "",
                "questionNumber": int(question.get("question_number") or 0),
                "answerLetter": (question.get("answer_letter") or "").upper(),
                "questionImage": question.get("question_image") or "",
                "contentFormat": question.get("content_format") or "image",
                "solutionImage": question.get("solution_image") or "",
                "solutionText": question.get("solution_text") or "",
                "expectedLetters": expected_option_letters(
                    question.get("exam_name") or "",
                    question.get("paper_name") or "",
                    question.get("part_name"),
                ),
                "publishedStem": question.get("question_stem") or "",
                "publishedOptions": question.get("options") or {},
            },
            "conversion": None
            if conversion is None
            else {
                "id": conversion.get("id"),
                "status": conversion.get("status"),
                "confidence": conversion.get("confidence"),
                "modelUsed": conversion.get("model_used"),
                "sourceImageUrl": conversion.get("source_image_url"),
                "sourceImageHash": conversion.get("source_image_hash"),
                "updatedAt": conversion.get("updated_at"),
                "report": report,
                "flags": _report_flags(report),
            },
            "draft": {
                "questionStem": strip_figures(stem),
                "options": options,
                "diagramAssets": assets,
            },
            "source": {
                "url": source_url,
                "width": source_width,
                "height": source_height,
                "error": source_error,
            },
            "neighbors": _neighbors(question),
        }

    payload = cached(f"question:{question_id}", 180.0, produce, refresh=refresh)
    if warm_neighbors:
        neighbors = payload.get("neighbors") or {}
        for neighbor_id in (neighbors.get("nextId"), neighbors.get("prevId")):
            if neighbor_id:
                _POOL.submit(_warm_question, int(neighbor_id))
    return payload


def _warm_question(question_id: int) -> None:
    try:
        load_question(question_id, warm_neighbors=False)
        # Also pull the screenshot into the imaging memory cache.
        url = source_url_for(question_id)
        if url:
            imaging.source_bytes(url)
    except Exception:
        return


def _next_asset_id(used: Iterable[str]) -> str:
    taken = {str(value) for value in used}
    index = 1
    while f"d{index}" in taken:
        index += 1
    return f"d{index}"


def _rebuild_stem(stem: str, assets: List[Dict[str, Any]]) -> str:
    base = strip_figures(stem)
    embeds = [
        build_diagram_stem_embed(
            str(asset.get("url") or ""),
            str(asset.get("alt") or "diagram not to scale"),
        )
        for asset in assets
        if asset.get("role") != "graphical_option"
        and not asset.get("option_letter")
        and asset.get("url")
    ]
    if not embeds:
        return base
    joined = "\n\n".join(embeds)
    return f"{base}\n\n{joined}" if base else joined


def _apply_asset_edits(
    question_id: int,
    incoming: List[Dict[str, Any]],
    existing: List[Dict[str, Any]],
    source_url: str,
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Re-crop any asset the editor marked dirty, keeping ids stable."""
    previous = {str(asset.get("id")): asset for asset in existing}
    notes: List[str] = []
    source: Optional[bytes] = None
    result: List[Dict[str, Any]] = []
    used_ids = {str(asset.get("id")) for asset in incoming if asset.get("id")}

    for position, raw in enumerate(incoming, start=1):
        asset_id = str(raw.get("id") or "") or _next_asset_id(used_ids)
        used_ids.add(asset_id)
        prior = previous.get(asset_id, {})
        option_letter = str(raw.get("option_letter") or "").strip().upper() or None
        role = "graphical_option" if option_letter else "stem_diagram"
        alt = str(raw.get("alt") or prior.get("alt") or "diagram not to scale").strip()

        asset: Dict[str, Any] = {
            "id": asset_id,
            "url": raw.get("url") or prior.get("url"),
            "alt": alt,
            "position": "option" if option_letter else "before_options",
            "role": role,
            "bbox_norm": raw.get("bbox_norm") or prior.get("bbox_norm"),
            "bbox_norm_raw": prior.get("bbox_norm_raw") or raw.get("bbox_norm"),
        }
        if option_letter:
            asset["option_letter"] = option_letter
        if prior.get("crop_diagnostics"):
            asset["crop_diagnostics"] = prior["crop_diagnostics"]

        needs_crop = bool(raw.get("recrop")) or not asset["url"]
        if needs_crop:
            if not source_url:
                raise ValueError("cannot re-crop: question has no source image")
            if source is None:
                source = imaging.source_bytes(source_url)
            crop_bytes, diagnostics = imaging.crop_norm(source, raw.get("bbox_norm"))
            asset["url"] = imaging.upload_crop(question_id, crop_bytes, index=position)
            asset["bbox_norm"] = diagnostics["bbox_norm_final"]
            asset["crop_diagnostics"] = {
                **(prior.get("crop_diagnostics") or {}),
                **diagnostics,
                "cutoff_risk": False,
                "manual_crop_at": _now_iso(),
            }
            asset.pop("crop_review_status", None)
            asset.pop("crop_review_reason", None)
            notes.append(f"Re-cropped {asset_id}")

        result.append(asset)

    removed = sorted(set(previous) - used_ids)
    if removed:
        notes.append(f"Removed {', '.join(removed)}")
    return result, notes


def _set_answer_letter(question_id: int, letter: str) -> Tuple[bool, Optional[str]]:
    client = _client()
    try:
        client.rpc(
            "set_question_answer_letter",
            {"p_question_id": question_id, "p_answer_letter": letter},
        ).execute()
        return True, None
    except Exception as exc:
        message = str(exc)
        lowered = message.lower()
        if "set_question_answer_letter" in lowered or "pgrst202" in lowered:
            return False, (
                "Answer key not saved: apply migration "
                "supabase/migrations/20260825120000_question_studio_answer_letter.sql"
            )
        if "protected data" in lowered:
            return False, (
                "Answer key not saved: the questions table trigger still blocks "
                "answer_letter changes. Apply migration "
                "supabase/migrations/20260825120000_question_studio_answer_letter.sql"
            )
        return False, f"Answer key not saved: {message}"


def save_question(question_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Persist an edited conversion, re-crop dirty diagrams, then publish."""
    client = _client()
    question = _fetch_question(question_id)
    conversion = _fetch_active_conversion(question_id)

    source_url = (conversion or {}).get("source_image_url") or question.get("question_image") or ""
    existing_assets = _normalize_assets(
        (conversion or {}).get("diagram_assets") or question.get("diagram_assets")
    )

    warnings: List[str] = []
    notes: List[str] = []

    assets, asset_notes = _apply_asset_edits(
        question_id,
        _normalize_assets(payload.get("diagramAssets")),
        existing_assets,
        source_url,
    )
    notes.extend(asset_notes)

    options = normalize_options(payload.get("options") or {})
    options = {letter: text for letter, text in options.items() if text or any(
        asset.get("option_letter") == letter for asset in assets
    )}
    stem = normalize_latex_delimiters(str(payload.get("questionStem") or "").strip())
    stem_with_figures = _rebuild_stem(stem, assets)

    katex_errors = validate_question_content(stem_with_figures, options)
    if katex_errors:
        warnings.append(f"KaTeX errors: {format_katex_errors(katex_errors)}")
    if not stem.strip():
        warnings.append("Question text is empty")
    if not options:
        warnings.append("No answer options")

    publishable = not katex_errors and bool(stem.strip()) and bool(options)
    status = "auto_approved" if publishable else "failed"

    report = dict((conversion or {}).get("conversion_report") or {})
    report.update(
        {
            "katex_errors": katex_errors,
            "studio_edited": True,
            "studio_edited_at": _now_iso(),
            "diagram_asset_count": len(assets),
        }
    )
    if payload.get("markReviewed"):
        report.update(
            {
                "studio_reviewed": True,
                "studio_reviewed_at": _now_iso(),
                "diagram_reviewed": True,
                "diagram_review_status": "reviewed",
                "human_crop_required": False,
            }
        )
    elif report.get("diagram_review_status") == "needs_review" and asset_notes:
        report["diagram_review_status"] = "available_for_review"
    if publishable:
        for key in ("missing_options", "diagram_crop_failed", "table_processing_failed"):
            if report.get(key):
                report[key] = False

    row: Dict[str, Any] = {
        "question_id": question_id,
        "status": status,
        "question_stem": stem_with_figures or None,
        "options": options or None,
        "diagram_assets": assets or None,
        "option_letters": sorted(options.keys()),
        "conversion_report": report,
        "source_image_url": source_url,
    }

    if conversion and conversion.get("id"):
        client.table("question_conversions").update(row).eq("id", conversion["id"]).execute()
    else:
        if not source_url:
            raise ValueError("question has no source image to record a conversion against")
        row["source_image_hash"] = imaging.sha256_hex(imaging.source_bytes(source_url))
        row["model_used"] = "manual_studio"
        client.table("question_conversions").upsert(
            row, on_conflict="question_id,source_image_hash"
        ).execute()
        notes.append("Created a manual conversion record")

    published = False
    if publishable:
        published = approve_question_text(
            question_id,
            {
                "question_stem": stem_with_figures,
                "options": options,
                "diagram_assets": assets or None,
                "content_format": "text",
            },
        )
        if published:
            notes.append("Published to the live question")
        else:
            warnings.append(
                "Saved as a draft but not published: the questions table is protected. "
                "Apply supabase/migrations/20260627110000_questions_text_conversion_promote.sql"
            )
    else:
        warnings.append("Saved as a draft. Fix the issues above to publish it live.")

    requested_letter = str(payload.get("answerLetter") or "").strip().upper()
    current_letter = (question.get("answer_letter") or "").strip().upper()
    if requested_letter and requested_letter != current_letter:
        ok, message = _set_answer_letter(question_id, requested_letter)
        if ok:
            notes.append(f"Answer key set to {requested_letter}")
        elif message:
            warnings.append(message)

    invalidate("overview", f"paper:{int(question['paper_id'])}", f"question:{question_id}")
    save_result = {
        "status": status,
        "published": published,
        "warnings": warnings,
        "notes": notes,
        "studioReviewed": report.get("studio_reviewed") is True,
        "contentFormat": "text" if published else (question.get("content_format") or "image"),
    }
    # Background studio saves skip the expensive post-save reload.
    if payload.get("light") is True:
        return {"questionId": question_id, "saveResult": save_result}
    result = load_question(question_id, refresh=True, warm_neighbors=True)
    result["saveResult"] = save_result
    return result
