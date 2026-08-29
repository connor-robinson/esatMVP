"""Render a ChatGPT-friendly markdown summary from a paper dry-run JSON report."""

from __future__ import annotations

import json
import sys
from pathlib import Path

REVIEW_PROMPT = """You are reviewing mid-stem diagram placement for past-paper questions.

For each question below:
1. Open **source screenshot** and compare layout to the numbered **text blocks**.
2. The text blocks are not authoritative. If the screenshot shows a diagram between sentences currently in the same block, treat that as a split boundary before assigning placement.
3. For every stem diagram asset (d1, d2, ...), return `insert_after_block`:
   - 0 = diagram before block 1
   - N = diagram after block N
   - {blockCount} = diagram after all text (end of stem)
4. Do not recrop. Ignore answer-choice images. Only stem diagrams listed.
5. Optional: comment if `displayWidthPct` looks too large/small (32-78% typical).

Return JSON per question:
{"questionId": 2904, "placements": [{"asset_id": "d1", "insert_after_block": 0, "confidence": 0.95}]}
"""


def render_markdown(report: dict) -> str:
    slot = report.get("slotModel") or {}
    lines = [
        REVIEW_PROMPT.strip(),
        "",
        f"# Diagram placement review: {report.get('paperLabel')}",
        "",
        f"- paper_id: {report.get('paperId')}",
        f"- diagram questions: {report.get('diagramQuestionCount')}",
        f"- multi-diagram questions: {report.get('multiDiagramQuestionCount')}",
        "",
        "## Slot model (read this first)",
        "",
        "Text is split into numbered blocks (paragraphs/tables). Figures are stripped from blocks.",
        "Blocks are hints, not ground truth. Split at diagram boundaries when the screenshot shows mid-stem placement inside one block.",
        "Your job: say which **slot** each diagram belongs in, using the **source screenshot** as ground truth.",
        "",
        "| insert_after_block | Meaning |",
        "| --- | --- |",
        "| 0 | Diagram before block 1 |",
        "| 1 | Diagram after block 1 |",
        "| 2 | Diagram after block 2 |",
        f"| blockCount | Diagram after all blocks (end of stem) |",
        "",
        "Example: 2 blocks, diagram between them → `insert_after_block: 1`.",
        "Example: diagram above all text → `insert_after_block: 0`.",
        "",
        "---",
        "",
    ]

    for q in report.get("questions") or []:
        qnum = q.get("questionNumber")
        qid = q.get("questionId")
        blocks = q.get("stemBlocks") or []
        assets = q.get("stemDiagramAssets") or []
        block_count = len(blocks)

        lines.append(f"## Q{qnum} (questionId {qid})")
        lines.append("")
        lines.append(f"- blockCount: {block_count}")
        lines.append(f"- allowed insert_after_block: {list(range(0, block_count + 1))}")
        lines.append(f"- stem diagrams: {len(assets)}")
        skip_reason = q.get("placementSkipReason")
        if skip_reason:
            lines.append(f"- **SKIP stem placement**: {skip_reason}")
        lines.append("")

        screenshot = q.get("sourceScreenshotUrl") or ""
        if screenshot:
            lines.append("### Source screenshot (layout ground truth)")
            lines.append(f"Open this image and compare to the blocks below:")
            lines.append(f"{screenshot}")
            lines.append("")

        lines.append("### Stem diagram crops (already cropped; do not recrop)")
        for asset in assets:
            width = asset.get("displayWidthPct")
            width_txt = f", displayWidthPct={width}" if width is not None else ""
            lines.append(f"- **{asset.get('id')}**{width_txt}")
            if asset.get("alt"):
                lines.append(f"  - alt: {asset.get('alt')}")
            if asset.get("url"):
                lines.append(f"  - crop: {asset.get('url')}")
        lines.append("")

        lines.append("### Numbered text blocks (figures removed)")
        for index, block in enumerate(blocks, start=1):
            lines.append(f"**Block {index}**")
            lines.append("```")
            lines.append(block.strip())
            lines.append("```")
            lines.append("")

        placement = q.get("placement") or {}
        if skip_reason:
            lines.append("### Placements")
            lines.append("- excluded from stem-diagram placement pass (see skip note above)")
        elif placement.get("status") == "ok":
            lines.append("### Reviewed placements")
            for row in placement.get("placements") or []:
                width = row.get("displayWidthPct")
                width_txt = f", displayWidthPct={width}" if width is not None else ""
                lines.append(
                    f"- {row.get('assetId')}: insertAfterBlock={row.get('insertAfterBlock')} "
                    f"(confidence={row.get('confidence')}){width_txt}"
                )
            preview = q.get("placementPreview")
            if preview:
                lines.append("")
                lines.append("### Placement preview (diagram markers in reading order)")
                lines.append("```")
                lines.append(preview)
                lines.append("```")
        else:
            lines.append("### Placements")
            lines.append("- pending review")
        lines.append("")
        lines.append("---")
        lines.append("")

    return "\n".join(lines)


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if path is None:
        raise SystemExit(
            "usage: python -m past_paper_converter.render_paper_placement_markdown REPORT.json"
        )
    report = json.loads(path.read_text(encoding="utf-8"))
    out = path.with_suffix(".md")
    out.write_text(render_markdown(report), encoding="utf-8")
    print(str(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
