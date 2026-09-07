"""Deterministic whitespace normalizer for ``question.stem``.

Preserves soft line breaks while keeping structure around display math,
graph/diagram placeholders, and qg-diagram figures.
"""

from __future__ import annotations

import re
from typing import List, Tuple

# Order matters: figures before bare <svg; display math before inline $.
_PROTECTED: List[Tuple[re.Pattern[str], str]] = [
    (
        re.compile(
            r'<figure\b[^>]*class="[^"]*qg-diagram[^"]*"[^>]*>[\s\S]*?</figure>',
            re.IGNORECASE,
        ),
        "FIGURE",
    ),
    (
        re.compile(r"\$\$[\s\S]*?\$\$", re.MULTILINE),
        "DISPLAY_MATH",
    ),
    (
        re.compile(r"<GRAPH\s+id\s*=\s*\"[^\"]+\"\s*/?>", re.IGNORECASE),
        "GRAPH",
    ),
    (
        re.compile(r"<DIAGRAM\s+id\s*=\s*\"[^\"]+\"\s*/?>", re.IGNORECASE),
        "DIAGRAM",
    ),
]


def _shield(text: str) -> Tuple[str, List[str]]:
    blocks: List[str] = []

    def _repl(m: re.Match[str]) -> str:
        blocks.append(m.group(0))
        return f"\n__STEM_WS_{len(blocks) - 1}__\n"

    out = text
    for pat, _kind in _PROTECTED:
        out = pat.sub(_repl, out)
    return out, blocks


def _unshield(text: str, blocks: List[str]) -> str:
    for i, block in enumerate(blocks):
        text = text.replace(f"__STEM_WS_{i}__", block)
    return text


def _collapse_prose_paragraph(para: str) -> str:
    """Preserve author line breaks; trim per-line edge whitespace only."""
    lines = [re.sub(r"[ \t]+$", "", re.sub(r"^[ \t]+", "", ln)) for ln in para.split("\n")]
    while lines and lines[0] == "":
        lines.pop(0)
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def normalize_stem_whitespace(stem: str) -> str:
    """Normalize stem newlines while preserving soft line breaks."""
    if stem is None:
        return ""
    text = str(stem).replace("\r\n", "\n").replace("\r", "\n")
    if not text.strip():
        return text

    masked, blocks = _shield(text)
    masked = re.sub(r"\n{3,}", "\n\n", masked)
    masked = re.sub(r"[ \t]+\n", "\n", masked)
    masked = re.sub(r"\n[ \t]+", "\n", masked)

    parts = re.split(r"\n\n+", masked)
    collapsed: List[str] = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if re.fullmatch(r"__STEM_WS_\d+__", part):
            collapsed.append(part)
        else:
            collapsed.append(_collapse_prose_paragraph(part))

    out = "\n\n".join(collapsed)

    # Ensure isolated placeholders have breathing room (still masked).
    out = re.sub(r"([^\n])\n(__STEM_WS_\d+__)", r"\1\n\n\2", out)
    out = re.sub(r"(__STEM_WS_\d+__)\n([^\n])", r"\1\n\n\2", out)
    out = re.sub(r"\n{3,}", "\n\n", out)

    out = _unshield(out, blocks)
    out = re.sub(r"\n{3,}", "\n\n", out)
    out = _finalize_text_only_stem(out)
    return out.strip()


_FINAL_Q_RE = re.compile(
    r"((?:What|Which|How|Find|Calculate|Determine|State|Explain|Deduce)\b[^?]*\?)",
    re.IGNORECASE,
)


def _finalize_text_only_stem(text: str) -> str:
    """Preserve soft line breaks; optionally blank-line before the final question."""
    if re.search(r"\$\$|<GRAPH\b|<DIAGRAM\b|<figure\b", text, re.IGNORECASE):
        return text
    trimmed = re.sub(r"[ \t]+\n", "\n", text)
    trimmed = re.sub(r"\n[ \t]+", "\n", trimmed).strip()
    if "\n\n" in trimmed:
        return trimmed
    m = _FINAL_Q_RE.search(trimmed)
    if m and m.start() > 0:
        setup = trimmed[: m.start()].strip()
        question = trimmed[m.start() :].strip()
        if setup:
            return f"{setup}\n\n{question}"
    return trimmed


def apply_stem_whitespace_to_question_pkg(pkg: dict) -> dict:
    """Normalize ``question.stem`` in an implementer JSON package (in place)."""
    if not isinstance(pkg, dict):
        return pkg
    q = pkg.get("question")
    if isinstance(q, dict) and isinstance(q.get("stem"), str):
        q["stem"] = normalize_stem_whitespace(q["stem"])
    return pkg
