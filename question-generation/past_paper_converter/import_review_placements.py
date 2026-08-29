"""Import human-reviewed placement JSON into stem placement sidecars."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from past_paper_converter.place_stems import (
    build_candidate_record,
    load_place_candidates,
    write_sidecar_record,
)
from past_paper_converter.stem_block_overrides import display_width_override, placement_skip_reason
from past_paper_converter.stem_blocks import stem_diagram_assets, validate_placements

DEFAULT_PATH = (
    Path(__file__).resolve().parent
    / "_cache"
    / "stem_placements"
    / "reports"
    / "paper50_review_placements.json"
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def import_review_placements(path: Path) -> Dict[str, Any]:
    rows: List[Dict[str, Any]] = json.loads(path.read_text(encoding="utf-8"))
    by_qid = {int(row["questionId"]): row for row in rows}
    candidates = {
        int(candidate["questionId"]): candidate
        for candidate in load_place_candidates(paper_id=50)
    }

    results: Dict[str, Any] = {"ok": [], "failed": []}

    for qid, row in sorted(by_qid.items()):
        candidate = candidates.get(qid)
        if not candidate:
            results["failed"].append({"questionId": qid, "error": "not in paper 50"})
            continue

        skip_reason = placement_skip_reason(qid)
        if skip_reason:
            prepared = build_candidate_record(candidate)
            record = {
                "questionId": qid,
                "examName": prepared["examName"],
                "examYear": prepared["examYear"],
                "paperName": prepared["paperName"],
                "questionNumber": prepared["questionNumber"],
                "stemBlocks": prepared["stemBlocks"],
                "assets": prepared["assets"],
                "placements": [],
                "model": "human_review_chatgpt",
                "placedAt": _now_iso(),
                "sourceImageHash": prepared.get("sourceImageHash") or "",
                "status": "skipped_graphical_options",
                "skipReason": skip_reason,
                "reviewSource": str(path),
            }
            write_sidecar_record(record)
            results["ok"].append(qid)
            continue

        prepared = build_candidate_record(candidate)
        asset_ids = [str(asset["id"]) for asset in prepared["assets"]]
        placements, error = validate_placements(
            row.get("placements"),
            asset_ids=asset_ids,
            block_count=len(prepared["stemBlocks"]),
        )
        if error:
            results["failed"].append(
                {
                    "questionId": qid,
                    "error": error,
                    "blockCount": len(prepared["stemBlocks"]),
                    "blocks": prepared["stemBlocks"],
                }
            )
            continue

        display_widths: Dict[str, float] = {}
        for asset in prepared["assets"]:
            asset_id = str(asset["id"])
            override = display_width_override(qid, asset_id)
            if override is not None:
                display_widths[asset_id] = override

        placements_out = []
        for placement in placements:
            asset_id = placement["assetId"]
            row_out = dict(placement)
            if asset_id in display_widths:
                row_out["displayWidthPct"] = display_widths[asset_id]
            placements_out.append(row_out)

        record = {
            "questionId": qid,
            "examName": prepared["examName"],
            "examYear": prepared["examYear"],
            "paperName": prepared["paperName"],
            "questionNumber": prepared["questionNumber"],
            "stemBlocks": prepared["stemBlocks"],
            "assets": prepared["assets"],
            "placements": placements_out,
            "model": "human_review_chatgpt",
            "placedAt": _now_iso(),
            "sourceImageHash": prepared.get("sourceImageHash") or "",
            "status": "ok",
            "reviewSource": str(path),
        }
        write_sidecar_record(record)
        results["ok"].append(qid)

    results["summary"] = {
        "ok": len(results["ok"]),
        "failed": len(results["failed"]),
    }
    return results


def main(argv: List[str] | None = None) -> int:
    path = Path((argv or sys.argv[1:])[0]) if (argv or sys.argv[1:]) else DEFAULT_PATH
    result = import_review_placements(path)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if not result["failed"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
