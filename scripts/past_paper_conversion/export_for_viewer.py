"""Export question_conversions to JSON for the local HTML viewer."""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "question-generation"))

from past_paper_converter.db import make_client  # noqa: E402

OUT_PATH = Path(__file__).resolve().parent / "viewer_data.json"


def list_papers() -> None:
    client = make_client()
    resp = (
        client.table("papers")
        .select("id, exam_name, exam_year, paper_name")
        .order("exam_name")
        .order("exam_year", desc=True)
        .execute()
    )
    print("\nPaper ID | Exam")
    print("-" * 50)
    for row in resp.data or []:
        print(
            f"{row['id']:8} | {row['exam_name']} {row['exam_year']} — {row['paper_name']}"
        )
    print()


def export_rows(*, paper_id: int | None, limit: int, status: str, shuffle: bool) -> int:
    client = make_client()
    question_ids: list[int] | None = None
    if paper_id is not None:
        qresp = client.table("questions").select("id").eq("paper_id", paper_id).execute()
        question_ids = [int(r["id"]) for r in (qresp.data or [])]
        if not question_ids:
            print(f"No questions for paper_id={paper_id}")
            OUT_PATH.write_text(json.dumps({"conversions": [], "exportedAt": None}), encoding="utf-8")
            return 0

    query = (
        client.table("question_conversions")
        .select(
            """
            id, question_id, status, question_stem, options, diagram_assets,
            detected_question_number, option_letters, confidence, conversion_report,
            source_image_url, created_at,
            questions (exam_name, exam_year, paper_name, question_number, question_image, paper_id)
            """
        )
        .neq("status", "superseded")
        .order("created_at", desc=True)
        .limit(limit)
    )
    if status != "all":
        query = query.eq("status", status)
    if question_ids is not None:
        query = query.in_("question_id", question_ids)

    resp = query.execute()
    rows = []
    for raw in resp.data or []:
        q = raw.get("questions")
        if isinstance(q, list):
            q = q[0] if q else None
        if not q:
            continue
        rows.append(
            {
                "id": raw["id"],
                "questionId": raw["question_id"],
                "status": raw["status"],
                "questionStem": raw.get("question_stem"),
                "options": raw.get("options") or {},
                "diagramAssets": raw.get("diagram_assets") or [],
                "detectedQuestionNumber": raw.get("detected_question_number"),
                "optionLetters": raw.get("option_letters") or [],
                "confidence": float(raw["confidence"]) if raw.get("confidence") is not None else None,
                "conversionReport": raw.get("conversion_report") or {},
                "sourceImageUrl": raw.get("source_image_url"),
                "examName": q["exam_name"],
                "examYear": q["exam_year"],
                "paperName": q["paper_name"],
                "paperId": q["paper_id"],
                "questionNumber": q["question_number"],
            }
        )

    if shuffle:
        random.shuffle(rows)

    payload = {
        "exportedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "paperId": paper_id,
        "count": len(rows),
        "conversions": rows,
    }
    OUT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {len(rows)} conversion(s) to {OUT_PATH}")
    return len(rows)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--list-papers", action="store_true")
    parser.add_argument("--paper-id", type=int, default=None)
    parser.add_argument("--limit", type=int, default=24)
    parser.add_argument("--status", default="all", choices=["all", "auto_approved", "failed"])
    parser.add_argument("--shuffle", action="store_true")
    args = parser.parse_args()

    if args.list_papers:
        list_papers()
        return 0

    export_rows(
        paper_id=args.paper_id,
        limit=args.limit,
        status=args.status,
        shuffle=args.shuffle,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
