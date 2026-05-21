"""Deterministic whitespace normalizer for ``question.stem``.

Collapses sentence-by-sentence paragraphing while preserving structure around
display math, graph/diagram placeholders, and qg-diagram figures.
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
    """Join single newlines inside a prose-only paragraph block."""
    lines = [ln.strip() for ln in para.split("\n")]
    lines = [ln for ln in lines if ln]
    if not lines:
        return ""
    if len(lines) == 1:
        return lines[0]
    # Keep intentional multi-line givens only when 3+ short list-like lines.
    if len(lines) >= 3 and all(len(ln) < 100 for ln in lines):
        looks_like_givens = sum(
            1 for ln in lines[:-1] if re.search(r"\d|°C|kg|min|s\b|N\b|V\b|A\b", ln)
        ) >= 2
        if looks_like_givens:
            return "\n".join(lines)
    return " ".join(lines)


def normalize_stem_whitespace(stem: str) -> str:
    """Normalize stem newlines for compact prose with preserved structure."""
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
    """Text-only stems: one compact block; at most one break before the final question."""
    if re.search(r"\$\$|<GRAPH\b|<DIAGRAM\b|<figure\b", text, re.IGNORECASE):
        return text
    flat = re.sub(r"\s*\n\s*", " ", text)
    flat = re.sub(r"  +", " ", flat).strip()
    m = _FINAL_Q_RE.search(flat)
    if m and m.start() > 0:
        setup = flat[: m.start()].strip()
        question = flat[m.start() :].strip()
        if setup:
            return f"{setup}\n\n{question}"
    return flat


def apply_stem_whitespace_to_question_pkg(pkg: dict) -> dict:
    """Normalize ``question.stem`` in an implementer JSON package (in place)."""
    if not isinstance(pkg, dict):
        return pkg
    q = pkg.get("question")
    if isinstance(q, dict) and isinstance(q.get("stem"), str):
        q["stem"] = normalize_stem_whitespace(q["stem"])
    return pkg
