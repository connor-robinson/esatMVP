"""Build read-only side-by-side QA sheets for every approved diagram conversion."""

from __future__ import annotations

import argparse
import io
import json
import math
from pathlib import Path
from typing import Any

import httpx
from PIL import Image, ImageDraw, ImageFont

from .db import make_client


def _approved_rows() -> list[dict[str, Any]]:
    client = make_client()
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        page = (
            client.table("question_conversions")
            .select(
                "question_id,status,source_image_url,source_image_hash,"
                "diagram_assets,conversion_report,updated_at"
            )
            .eq("status", "auto_approved")
            .range(offset, offset + 999)
            .execute()
            .data
            or []
        )
        rows.extend(page)
        if len(page) < 1000:
            break
        offset += 1000
    return rows


def _fit(image: Image.Image, width: int, height: int) -> Image.Image:
    copy = image.copy().convert("RGB")
    copy.thumbnail((width, height), Image.Resampling.LANCZOS)
    return copy


def _load_image(client: httpx.Client, url: str) -> Image.Image:
    response = client.get(url)
    response.raise_for_status()
    return Image.open(io.BytesIO(response.content)).convert("RGB")


def _question_panel(
    row: dict[str, Any], client: httpx.Client
) -> tuple[Image.Image, dict[str, Any]]:
    question_id = int(row["question_id"])
    report = row.get("conversion_report") or {}
    assets = row.get("diagram_assets") or []
    flags: list[str] = []
    human_crop_required = report.get("human_crop_required") is True

    if report.get("has_table") and int(report.get("structured_tables_processed") or 0) < 1:
        flags.append("table_not_structured")
    if not assets:
        flags.append("missing_assets")
    letters = [str(asset.get("option_letter") or "") for asset in assets if asset.get("role") == "graphical_option"]
    if len(letters) != len(set(letters)):
        flags.append("duplicate_graphical_option_letters")
    expected = sorted(report.get("graphical_option_letters_processed") or [])
    if report.get("has_graphical_options") and sorted(letters) != expected:
        flags.append("graphical_option_asset_mismatch")

    for asset in assets:
        diagnostics = asset.get("crop_diagnostics") or {}
        if diagnostics.get("cutoff_risk") or diagnostics.get("risky_edges"):
            flags.append(f"cutoff_risk:{asset.get('id')}")
        url = str(asset.get("url") or "")
        if not url:
            flags.append(f"missing_url:{asset.get('id')}")
        elif "_" not in url.rsplit("/", 1)[-1]:
            flags.append(f"unversioned_url:{asset.get('id')}")

    panel = Image.new("RGB", (1600, 900), "white")
    draw = ImageDraw.Draw(panel)
    title = f"Q{question_id} | {report.get('diagram_type', 'unknown')} | assets={len(assets)}"
    if human_crop_required:
        title += " | HUMAN CROP REQUIRED"
    if flags:
        title += " | FLAGS: " + ", ".join(flags)
    draw.text((20, 15), title, fill="red" if flags else "black", font=ImageFont.load_default())

    try:
        source = _fit(_load_image(client, str(row.get("source_image_url") or "")), 740, 800)
        panel.paste(source, (20, 65))
        draw.rectangle((19, 64, 21 + source.width, 66 + source.height), outline="gray", width=2)
    except Exception as exc:
        flags.append(f"source_download_failed:{type(exc).__name__}")
        draw.text((20, 80), "SOURCE DOWNLOAD FAILED", fill="red")

    asset_area_x = 800
    columns = 2 if len(assets) > 1 else 1
    rows_count = max(1, math.ceil(len(assets) / columns))
    cell_w = 380 if columns == 2 else 760
    cell_h = min(390, max(120, 800 // rows_count))
    for index, asset in enumerate(assets):
        col = index % columns
        row_index = index // columns
        left = asset_area_x + col * cell_w
        top = 65 + row_index * cell_h
        label = str(asset.get("option_letter") or asset.get("role") or asset.get("id") or index + 1)
        draw.text((left, top), label, fill="black", font=ImageFont.load_default())
        try:
            crop = _fit(_load_image(client, str(asset.get("url") or "")), cell_w - 15, cell_h - 30)
            panel.paste(crop, (left, top + 20))
            draw.rectangle((left, top + 19, left + crop.width + 1, top + crop.height + 21), outline="gray")
        except Exception as exc:
            flags.append(f"asset_download_failed:{asset.get('id')}:{type(exc).__name__}")
            draw.text((left, top + 30), "ASSET DOWNLOAD FAILED", fill="red")

    return panel, {
        "question_id": question_id,
        "asset_count": len(assets),
        "graphical_option_letters": letters,
        "flags": sorted(set(flags)),
        "human_crop_required": human_crop_required,
        "human_crop_asset_ids": report.get("human_crop_asset_ids") or [],
        "source_image_url": row.get("source_image_url"),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("past_paper_converter/_cache/diagram_audit"))
    parser.add_argument("--per-sheet", type=int, default=4)
    parser.add_argument(
        "--expected-ids",
        default="",
        help="Comma-separated prior diagram IDs; any reclassified ID is reported",
    )
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    rows = [
        row
        for row in _approved_rows()
        if (row.get("conversion_report") or {}).get("has_diagram") is True
    ]
    rows.sort(key=lambda row: int(row["question_id"]))
    expected_ids = {
        int(value) for value in args.expected_ids.split(",") if value.strip()
    }
    actual_ids = {int(row["question_id"]) for row in rows}

    panels: list[Image.Image] = []
    audit: list[dict[str, Any]] = []
    with httpx.Client(follow_redirects=True, timeout=60) as client:
        for row in rows:
            panel, result = _question_panel(row, client)
            panels.append(panel)
            audit.append(result)
            panel.save(args.output / f"q{result['question_id']}.jpg", quality=90)

    sheet_paths: list[str] = []
    for start in range(0, len(panels), args.per_sheet):
        group = panels[start : start + args.per_sheet]
        sheet = Image.new("RGB", (3200, 1800), "white")
        for index, panel in enumerate(group):
            sheet.paste(panel, ((index % 2) * 1600, (index // 2) * 900))
        path = args.output / f"sheet_{start // args.per_sheet + 1:02d}.jpg"
        sheet.save(path, quality=90)
        sheet_paths.append(str(path))

    summary = {
        "diagram_questions": len(audit),
        "diagram_assets": sum(item["asset_count"] for item in audit),
        "flagged_questions": [item for item in audit if item["flags"]],
        "expected_ids_missing": sorted(expected_ids - actual_ids),
        "human_crop_questions": [
            item for item in audit if item["human_crop_required"]
        ],
        "sheets": sheet_paths,
        "questions": audit,
    }
    (args.output / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps({key: summary[key] for key in ("diagram_questions", "diagram_assets", "flagged_questions", "expected_ids_missing", "human_crop_questions", "sheets")}, indent=2))
    return 1 if summary["flagged_questions"] or summary["expected_ids_missing"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
