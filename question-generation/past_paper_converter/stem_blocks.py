"""Deterministic stem block splitting and placement validation.

Used by the mid-stem placement batch: the model only chooses where each
existing stem diagram sits among these blocks. Crops are never changed here.
"""

from __future__ import annotations

import re
from typing import Any, Callable, Dict, List, Optional, Tuple

from .diagram import build_diagram_stem_embed
from .stem_block_overrides import apply_block_overrides, placement_skip_reason
from .stem_reblock import refine_stem_blocks

FIGURE_RE = re.compile(r"<figure[^>]*>[\s\S]*?</figure>", re.IGNORECASE)


def strip_figures(stem: str) -> str:
    return FIGURE_RE.sub("", stem or "").strip()


def _is_table_separator(line: str) -> bool:
    cells = [part.strip() for part in line.strip().strip("|").split("|")]
    if not cells:
        return False
    return all(re.fullmatch(r":?-{3,}:?", cell or "") for cell in cells)


def _is_markdown_table_block(text: str) -> bool:
    lines = [line for line in text.splitlines() if line.strip()]
    if len(lines) < 2:
        return False
    return "|" in lines[0] and "|" in lines[1] and _is_table_separator(lines[1])


def split_stem_blocks(stem: str, *, question_id: Optional[int] = None) -> List[str]:
    """Split figure-stripped stem into ordered blocks.

    Blank-line paragraphs first. A markdown table kept as one block even if
    it contains blank lines (tables should already be contiguous, but we also
    merge consecutive table-looking lines that were split).
    """
    cleaned = strip_figures(stem)
    if not cleaned:
        return []

    raw_parts = re.split(r"\n\s*\n+", cleaned)
    blocks: List[str] = []
    for part in raw_parts:
        text = part.strip()
        if not text:
            continue
        # If the previous block and this one are both table fragments, join.
        if (
            blocks
            and _is_markdown_table_block(blocks[-1])
            and ("|" in text)
            and not text.startswith("#")
        ):
            # Continuation rows without a separator still belong to the table.
            if _is_markdown_table_block(text) or all(
                "|" in line for line in text.splitlines() if line.strip()
            ):
                blocks[-1] = f"{blocks[-1]}\n{text}"
                continue
        blocks.append(text)
    refined = refine_stem_blocks(blocks, is_table_block=_is_markdown_table_block)
    if question_id is not None:
        refined = apply_block_overrides(int(question_id), refined)
    return refined


def stem_diagram_assets(assets: Any) -> List[Dict[str, Any]]:
    """Return stem diagram assets only (exclude graphical options)."""
    if not isinstance(assets, list):
        return []
    out: List[Dict[str, Any]] = []
    for asset in assets:
        if not isinstance(asset, dict):
            continue
        if asset.get("option_letter"):
            continue
        if asset.get("role") == "graphical_option":
            continue
        if asset.get("position") == "option":
            continue
        asset_id = str(asset.get("id") or "").strip()
        if not asset_id:
            continue
        out.append(asset)
    return out


def validate_placements(
    placements: Any,
    *,
    asset_ids: List[str],
    block_count: int,
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """Normalize and validate model placements.

    Returns (normalized_placements, error_message).
    insert_after_block must be in [0, block_count].
    Every asset_id must appear exactly once.
    """
    if not isinstance(placements, list):
        return [], "placements must be a list"

    expected = [str(aid) for aid in asset_ids]
    expected_set = set(expected)
    if len(expected_set) != len(expected):
        return [], "asset_ids contain duplicates"

    seen: set[str] = set()
    normalized: List[Dict[str, Any]] = []

    for item in placements:
        if not isinstance(item, dict):
            return [], "placement entry must be an object"
        raw_id = item.get("assetId", item.get("asset_id", item.get("id")))
        asset_id = str(raw_id or "").strip()
        if not asset_id:
            return [], "placement missing assetId"
        if asset_id not in expected_set:
            return [], f"unknown assetId: {asset_id}"
        if asset_id in seen:
            return [], f"duplicate assetId: {asset_id}"
        seen.add(asset_id)

        raw_index = item.get("insertAfterBlock", item.get("insert_after_block"))
        try:
            index = int(raw_index)
        except (TypeError, ValueError):
            return [], f"insertAfterBlock must be an int for {asset_id}"
        if index < 0 or index > block_count:
            return [], (
                f"insertAfterBlock {index} out of range for {asset_id} "
                f"(allowed 0..{block_count})"
            )

        confidence_raw = item.get("confidence", 1.0)
        try:
            confidence = float(confidence_raw)
        except (TypeError, ValueError):
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))

        normalized.append(
            {
                "assetId": asset_id,
                "insertAfterBlock": index,
                "confidence": confidence,
            }
        )

    missing = [aid for aid in expected if aid not in seen]
    if missing:
        return [], f"missing placements for: {', '.join(missing)}"

    # Stable order matching asset_ids for easier diffing.
    by_id = {row["assetId"]: row for row in normalized}
    ordered = [by_id[aid] for aid in expected]
    return ordered, None


def apply_placements_to_stem(
    blocks: List[str],
    placements: List[Dict[str, Any]],
    assets_by_id: Dict[str, Dict[str, Any]],
) -> str:
    """Build a stem with inline ``<figure>`` embeds at the chosen block slots."""
    slots: Dict[int, List[str]] = {}
    for row in placements:
        asset_id = str(row["assetId"])
        asset = assets_by_id.get(asset_id)
        if not asset or not asset.get("url"):
            continue
        display_pct = row.get("displayWidthPct", row.get("display_width_pct"))
        if display_pct is None:
            display_pct = asset.get("display_width_pct")
        embed = build_diagram_stem_embed(
            str(asset["url"]),
            str(asset.get("alt") or "diagram not to scale"),
            display_width_pct=display_pct,
        )
        index = int(row["insertAfterBlock"])
        slots.setdefault(index, []).append(embed)

    parts: List[str] = []
    for index, block in enumerate(blocks):
        for embed in slots.get(index, []):
            parts.append(embed)
        parts.append(block)
    for embed in slots.get(len(blocks), []):
        parts.append(embed)
    return "\n\n".join(parts)


def apply_placements_preview(
    blocks: List[str],
    placements: List[Dict[str, Any]],
    *,
    marker_for: Optional[Callable[[str], str]] = None,
) -> str:
    """Build a preview stem with markers (for tests / dry inspection).

    marker_for(asset_id) -> string. Default is ``{{diagram:id}}``.
    """

    def default_marker(asset_id: str) -> str:
        return f"{{{{diagram:{asset_id}}}}}"

    fn = marker_for or default_marker
    slots: Dict[int, List[str]] = {}
    for row in placements:
        index = int(row["insertAfterBlock"])
        slots.setdefault(index, []).append(fn(str(row["assetId"])))

    parts: List[str] = []
    for i, block in enumerate(blocks):
        for marker in slots.get(i, []):
            parts.append(marker)
        parts.append(block)
    for marker in slots.get(len(blocks), []):
        parts.append(marker)
    return "\n\n".join(parts)
