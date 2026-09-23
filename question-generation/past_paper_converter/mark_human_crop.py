"""Place complete-but-overinclusive diagram assets in the manual crop queue."""

from __future__ import annotations

import argparse
import json

from .db import mark_conversion_for_human_crop


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--question-id", type=int, required=True)
    parser.add_argument(
        "--asset-ids",
        required=True,
        help="Comma-separated diagram asset IDs, for example d1,d2",
    )
    parser.add_argument("--note", required=True)
    args = parser.parse_args()
    asset_ids = [value.strip() for value in args.asset_ids.split(",") if value.strip()]
    updated = mark_conversion_for_human_crop(
        args.question_id,
        asset_ids=asset_ids,
        note=args.note.strip(),
    )
    report = updated.get("conversion_report") or {}
    print(
        json.dumps(
            {
                "question_id": args.question_id,
                "diagram_review_status": report.get("diagram_review_status"),
                "human_crop_required": report.get("human_crop_required"),
                "human_crop_asset_ids": report.get("human_crop_asset_ids"),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
