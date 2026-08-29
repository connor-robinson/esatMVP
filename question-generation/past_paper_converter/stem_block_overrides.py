"""Per-question stem block order fixes and display-width tweaks."""

from __future__ import annotations

import re
from typing import Callable, Dict, List, Optional

# question_id -> explicit display_width_pct for stem diagrams
DISPLAY_WIDTH_OVERRIDES: Dict[int, Dict[str, float]] = {
    2956: {"d1": 22.0},  # Q57 cyclohexa-1,4-diene: tiny structure in source
}


def _reorder_q58_blocks(blocks: List[str]) -> List[str]:
    """Original order: intro, diagram, explanation, table, final question."""
    table_index = next(
        (index for index, block in enumerate(blocks) if block.lstrip().startswith("|")),
        None,
    )
    final_index = next(
        (
            index
            for index, block in enumerate(blocks)
            if re.search(r"Using the information in the table", block, re.I)
        ),
        None,
    )
    if table_index is None or final_index is None:
        return blocks
    if table_index > final_index:
        table = blocks[table_index]
        final = blocks[final_index]
        remaining = [
            block
            for index, block in enumerate(blocks)
            if index not in (table_index, final_index)
        ]
        return remaining + [table, final]
    return blocks


BLOCK_OVERRIDES: Dict[int, Callable[[List[str]], List[str]]] = {
    2957: _reorder_q58_blocks,
}


def apply_block_overrides(question_id: int, blocks: List[str]) -> List[str]:
    fn = BLOCK_OVERRIDES.get(int(question_id))
    if not fn:
        return blocks
    return fn(list(blocks))


def display_width_override(question_id: int, asset_id: str) -> Optional[float]:
    row = DISPLAY_WIDTH_OVERRIDES.get(int(question_id)) or {}
    value = row.get(str(asset_id))
    return float(value) if value is not None else None
