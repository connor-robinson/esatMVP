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
    r"Which of the statements|"
    r"Which of the arrows|"
    r"Which graph|"
    r"Which statement|"
    r"Which row is correct|"
    r"Which row of the table|"
    r"What is the|"
    r"What is |"
    r"What mass of methanol|"
    r"How much|"
    r"How many|"
    r"In what direction|"
    r"Using the information|"
    r"Results from|"
    r"The switch is now closed|"
    r"Bromine is dissolved|"
    r"Mirror X is now|"
    r"The starting temperature|"
    r"A voltage is now applied|"
    r"The power transferred|"
    r"The glass tube has|"
    r"After five minutes|"
    r"The student made a drawing"
    r")",
    re.IGNORECASE,
)

# First line often ends here; the diagram sits on the next row in the PDF.
_DIAGRAM_AFTER_FIRST_LINE_RE = re.compile(
    r"(?:"
    r"shown\.|"
    r"apparatus:|"
    r"following apparatus:|"
    r"structure of .+ is:|"
    r"shows this arrangement\.|"
    r"as shown in the diagram\.|"
    r"connected in series\.|"
    r"transferred into the water\.|"
    r"considered negligible\.|"
    r"at the start of an experiment\.|"
    r"The diagram represents .+\.|"
    r"Each division on this ruler measures .+\."
    r")\s*$",
    re.IGNORECASE,
)

# Mid-stem breaks that often follow a diagram in converted stems.
_MIDSTEM_LINE_RE = re.compile(
    r"^(?:"
    r"The switch is now closed|"
    r"Mirror X is now|"
    r"Electrons can pass|"
    r"Results from three|"
    r"Bromine is dissolved|"
    r"A voltage is now applied|"
    r"The starting temperature|"
    r"The power transferred|"
    r"The glass tube has|"
    r"After five minutes|"
    r"The student made a drawing"
    r")",
    re.IGNORECASE,
)

# Split a single prose line when the diagram sits between two sentences.
_INLINE_SPLIT_BEFORE_RE = re.compile(
    r"(?<=[.?!])\s+(?="
    r"Which graph|"
    r"Which statement|"
    r"Which of the arrows|"
    r"Which row of the table|"
    r"Which row is correct|"
    r"Which of the arrows|"
    r"Which of the statements|"
    r"The starting temperature|"
    r"A voltage is now applied|"
    r"The power transferred|"
    r"The student made a drawing|"
    r"What mass of methanol|"
    r"What is the current"
    r")",
    re.IGNORECASE,
)

# Fixed anchor phrases where a mid-stem diagram typically follows in OCR merges.
_INLINE_DIAGRAM_ANCHORS = (
    "shows this arrangement.",
    "as shown in the diagram.",
    "connected in series.",
    "transferred into the water.",
    "considered negligible.",
    "at the start of an experiment.",
    "The diagram represents part of the carbon cycle.",
)

_INLINE_RULER_ANCHOR_RE = re.compile(
    r"Each division on this ruler measures .+?\$\.\s*",
    re.IGNORECASE,
)


def _split_after_diagram_anchors(text: str) -> List[str]:
    """Split inline prose at diagram anchor phrases when OCR merged one block."""
    remaining = text.strip()
    if not remaining:
        return []

    split_positions: List[int] = []
    lower = remaining.lower()

    for anchor in _INLINE_DIAGRAM_ANCHORS:
        start = 0
        anchor_lower = anchor.lower()
        while True:
            pos = lower.find(anchor_lower, start)
            if pos < 0:
                break
            end = pos + len(anchor)
            if remaining[end:].strip():
                split_positions.append(end)
            start = pos + 1

    ruler_match = _INLINE_RULER_ANCHOR_RE.search(remaining)
    if ruler_match and remaining[ruler_match.end() :].strip():
        split_positions.append(ruler_match.end())

    if not split_positions:
        return [remaining]

    split_at = max(split_positions)
    head = remaining[:split_at].strip()
    tail = remaining[split_at:].strip()
    parts: List[str] = []
    if head:
        parts.append(head)
    if tail:
        parts.append(tail)
    return parts


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
    match = _INLINE_SPLIT_BEFORE_RE.search(text)
    if match and match.start() > 15:
        head = text[: match.start()].strip()
        tail = text[match.start() :].strip()
        if head and tail:
            return [head, tail]

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


def _split_prose_lines(text: str, *, allow_anchor_split: bool = True) -> List[str]:
    if allow_anchor_split:
        anchor_parts = _split_after_diagram_anchors(text)
        if len(anchor_parts) > 1:
            refined: List[str] = []
            for part in anchor_parts:
                refined.extend(_split_prose_lines(part, allow_anchor_split=False))
            return refined

    raw_lines = [line.rstrip() for line in text.split("\n")]
    lines = [line.strip() for line in raw_lines if line.strip()]
    if not lines:
        return []

    lines = _strip_key_legend_lines(lines)

    if len(lines) >= 1:
        split_parts = _split_inline_question_tail(lines[0])
        if len(split_parts) > 1:
            lines = split_parts + lines[1:]

    if len(lines) >= 2 and _DIAGRAM_AFTER_FIRST_LINE_RE.search(lines[0]):
        head = [lines[0]]
        tail = _split_prose_lines("\n".join(lines[1:]), allow_anchor_split=False)
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
