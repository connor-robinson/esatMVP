"""Export a full-paper diagram placement dry-run report for external review."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from past_paper_converter.apply_stems import apply_one_sidecar
from past_paper_converter.display_size import attach_display_widths, compute_display_width_pct
from past_paper_converter.export_questions import download_image
from past_paper_converter.place_stems import (
    build_candidate_record,
    load_place_candidates,
    load_sidecar,
)
from past_paper_converter.stem_blocks import apply_placements_to_stem, validate_placements

REPORT_DIR = Path(__file__).resolve().parent / "_cache" / "stem_placements" / "reports"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def candidates_for_paper(paper_id: int) -> List[Dict[str, Any]]:
    rows = load_place_candidates(paper_id=paper_id)
    return sorted(rows, key=lambda row: int(row.get("questionNumber") or 0))


def build_question_report(candidate: Dict[str, Any]) -> Dict[str, Any]:
    qid = int(candidate["questionId"])
    prepared = build_candidate_record(candidate)
    blocks = prepared["stemBlocks"]
    assets = prepared["assets"]

    crop_meta: List[Dict[str, Any]] = []
    crop_bytes_by_id: Dict[str, bytes] = {}
    for asset in assets:
        asset_id = str(asset["id"])
        url = str(asset.get("url") or "")
        row: Dict[str, Any] = {"id": asset_id, "alt": asset.get("alt"), "url": url}
        if url:
            try:
                crop_bytes = download_image(url)
                crop_bytes_by_id[asset_id] = crop_bytes
                row["displayWidthPct"] = compute_display_width_pct(
                    {**asset, **next((a for a in (candidate.get("diagramAssets") or []) if str(a.get("id")) == asset_id), {})},
                    crop_bytes,
                )
            except Exception as exc:
                row["fetchError"] = str(exc)
        crop_meta.append(row)

    sidecar = load_sidecar(qid)
    placement_section: Dict[str, Any] = {"status": "not_run", "note": "place-stems dry-run does not call the model"}
    apply_preview: Dict[str, Any] | None = None

    if sidecar and sidecar.get("status") == "ok":
        placement_section = {
            "status": "ok",
            "model": sidecar.get("model"),
            "placedAt": sidecar.get("placedAt"),
            "placements": sidecar.get("placements"),
        }
        apply_preview = apply_one_sidecar(sidecar, dry_run=True)

    return {
        "questionId": qid,
        "questionNumber": prepared["questionNumber"],
        "examName": prepared["examName"],
        "examYear": prepared["examYear"],
        "paperName": prepared["paperName"],
        "blockCount": len(blocks),
        "stemBlocks": blocks,
        "stemDiagramAssets": crop_meta,
        "allowedInsertAfterBlock": list(range(0, len(blocks) + 1)),
        "placement": placement_section,
        "applyDryRun": apply_preview,
        "strippedStemPreview": prepared.get("strippedStem", "")[:500],
    }


def export_paper_report(paper_id: int, *, exam_label: str = "") -> Path:
    candidates = candidates_for_paper(paper_id)
    candidates.sort(key=lambda row: int(row.get("questionNumber") or 0))

    if not candidates:
        raise SystemExit(f"No stem-diagram candidates for paper_id={paper_id}")

    first = candidates[0]
    paper_label = (
        exam_label
        or f"{first.get('examName')} {first.get('examYear')} {first.get('paperName')}"
    )

    questions = [build_question_report(row) for row in candidates]
    multi = [q for q in questions if len(q["stemDiagramAssets"]) > 1]

    report: Dict[str, Any] = {
        "generatedAt": _now_iso(),
        "mode": "dry_run_export",
        "paperId": paper_id,
        "paperLabel": paper_label.strip(),
        "diagramQuestionCount": len(questions),
        "multiDiagramQuestionCount": len(multi),
        "notes": [
            "This is a dry-run export: no live question_stem rows were modified.",
            "placement blocks show existing sidecars when present; otherwise the AI pass has not run yet.",
            "displayWidthPct is computed from existing crops (no recrop).",
            "insertAfterBlock: 0 = before block 1, N = after block N, blockCount = after all text.",
        ],
        "questions": questions,
    }

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    slug = paper_label.lower().replace(" ", "_").replace("/", "-")
    out = REPORT_DIR / f"paper{paper_id}_{slug}_dry_run.json"
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return out


def main(argv: List[str] | None = None) -> int:
    paper_id = int((argv or sys.argv[1:])[0] if (argv or sys.argv[1:]) else 50)
    path = export_paper_report(paper_id)
    print(str(path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
