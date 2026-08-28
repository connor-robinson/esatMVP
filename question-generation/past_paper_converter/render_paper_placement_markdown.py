"""Render a ChatGPT-friendly markdown summary from a paper dry-run JSON report."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def render_markdown(report: dict) -> str:
    lines = [
        f"# Diagram placement dry-run: {report.get('paperLabel')}",
        "",
        f"- paper_id: {report.get('paperId')}",
        f"- generated: {report.get('generatedAt')}",
        f"- diagram questions: {report.get('diagramQuestionCount')}",
        f"- multi-diagram questions: {report.get('multiDiagramQuestionCount')}",
        "",
        "## How to read this",
        "",
        "- `insertAfterBlock`: 0 = before block 1, N = after block N, `blockCount` = after all text.",
        "- This dry-run export shows stem blocks and assets only. AI placement was **not** run (Vertex batch API blocked).",
        "- `displayWidthPct` normalizes on-screen size from crop bbox + ink fill (no recrop).",
        "",
        "---",
        "",
    ]

    for q in report.get("questions") or []:
        qnum = q.get("questionNumber")
        qid = q.get("questionId")
        blocks = q.get("stemBlocks") or []
        assets = q.get("stemDiagramAssets") or []
        lines.append(f"## Q{qnum} (id {qid})")
        lines.append("")
        lines.append(f"- blocks: {len(blocks)}")
        lines.append(f"- stem diagrams: {len(assets)}")
        for asset in assets:
            width = asset.get("displayWidthPct")
            width_txt = f", displayWidthPct={width}" if width is not None else ""
            lines.append(f"  - **{asset.get('id')}**: {asset.get('alt') or 'diagram'}{width_txt}")
        lines.append("")
        lines.append("### Text blocks")
        for index, block in enumerate(blocks, start=1):
            preview = block.replace("\n", " ").strip()
            if len(preview) > 320:
                preview = preview[:320] + "..."
            lines.append(f"{index}. {preview}")
        lines.append("")
        placement = q.get("placement") or {}
        if placement.get("status") == "ok":
            lines.append("### AI placements (from sidecar)")
            for row in placement.get("placements") or []:
                lines.append(
                    f"- {row.get('assetId')}: insertAfterBlock={row.get('insertAfterBlock')} "
                    f"(confidence={row.get('confidence')})"
                )
        else:
            lines.append("### AI placements")
            lines.append("- not run in this dry-run export")
        lines.append("")
        apply_preview = q.get("applyDryRun")
        if apply_preview and apply_preview.get("status") == "dry_run":
            lines.append("### Apply preview (first 400 chars of stem with figures)")
            stem = str(apply_preview.get("stemPreview") or "")
            lines.append("```")
            lines.append(stem[:400] + ("..." if len(stem) > 400 else ""))
            lines.append("```")
        lines.append("")
        lines.append("---")
        lines.append("")

    return "\n".join(lines)


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if path is None:
        raise SystemExit("usage: python -m past_paper_converter.render_paper_placement_markdown REPORT.json")
    report = json.loads(path.read_text(encoding="utf-8"))
    out = path.with_suffix(".md")
    out.write_text(render_markdown(report), encoding="utf-8")
    print(str(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
