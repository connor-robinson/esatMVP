"""Finer stem block splitting for mid-stem diagram placement.

Coarse split is blank-line paragraphs. Many past-paper stems use single
newlines between prose sections without a blank line, which merges text on
both sides of a diagram into one block. This module subdivides prose blocks
at sentence / line boundaries while keeping tables intact.
"""

from __future__ import annotations

import re
from typing import List

# Final question or trailing section that usually follows the diagram.
_BLOCK_START_RE = re.compile(
    r"^(?:"
    r"Which of the following|"
    r"What is the|"
    r"What is |"
    r"How much|"
    r"How many|"
    r"In what direction|"
    r"Using the information|"
    r"Results from|"
    r"The switch is now closed|"
    r"Bromine is dissolved|"
    r"Mirror X is now"
    r")",
    re.IGNORECASE,
)

# First line often ends here; the diagram sits on the next row in the PDF.
_DIAGRAM_AFTER_FIRST_LINE_RE = re.compile(
    r"(?:shown\.|apparatus:|following apparatus:|structure of .+ is:)\s*$",
    re.IGNORECASE,
)

# Mid-stem breaks that often follow a diagram in converted stems.
_MIDSTEM_LINE_RE = re.compile(
    r"^(?:"
    r"The switch is now closed|"
    r"Mirror X is now|"
    r"Electrons can pass|"
    r"Results from three|"
    r"Bromine is dissolved"
    r")",
    re.IGNORECASE,
)


def _strip_key_legend_lines(lines: List[str]) -> List[str]:
    """Drop Key + legend rows when the pedigree/graphic crop includes the key."""
    out: List[str] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if line.strip() == "Key":
            index += 1
            while index < len(lines):
                candidate = lines[index].strip()
                if _BLOCK_START_RE.match(candidate):
                    break
                if re.match(r"^\d+\s", candidate):
                    break
                index += 1
            continue
        out.append(line)
        index += 1
    return out


def _split_inline_question_tail(text: str) -> List[str]:
    match = re.search(
        r"(?<=[.?!])\s+(?=Which of the following|What is the|What is the new|"
        r"How much|How many|In what direction|Using the information)",
        text,
        flags=re.IGNORECASE,
    )
    if match and match.start() > 15:
        head = text[: match.start()].strip()
        tail = text[match.start() :].strip()
        if head and tail:
            return [head, tail]
    return [text]


def _split_prose_lines(text: str) -> List[str]:
    raw_lines = [line.rstrip() for line in text.split("\n")]
    lines = [line.strip() for line in raw_lines if line.strip()]
    if not lines:
        return []

    lines = _strip_key_legend_lines(lines)

    if len(lines) >= 2 and _DIAGRAM_AFTER_FIRST_LINE_RE.search(lines[0]):
        head = [lines[0]]
        tail = _split_prose_lines("\n".join(lines[1:]))
        return head + tail

    if len(lines) == 1:
        return _split_inline_question_tail(lines[0])

    blocks: List[str] = []
    buffer: List[str] = []

    def flush() -> None:
        if buffer:
            blocks.append("\n".join(buffer).strip())
            buffer.clear()

    for line in lines:
        if _BLOCK_START_RE.match(line):
            flush()
            blocks.append(line)
            continue
        if _MIDSTEM_LINE_RE.match(line) and buffer:
            flush()
            buffer.append(line)
            continue
        buffer.append(line)

    flush()
    return [block for block in blocks if block]


def refine_stem_blocks(blocks: List[str], *, is_table_block) -> List[str]:
    """Subdivide prose blocks; leave tables untouched."""
    refined: List[str] = []
    for block in blocks:
        if is_table_block(block):
            refined.append(block)
            continue
        refined.extend(_split_prose_lines(block))
    return refined
