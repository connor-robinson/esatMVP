"""Matplotlib mathtext formatting for diagram labels."""

from __future__ import annotations

import re


_MATH_HINT_RE = re.compile(r"[\\^_{}=+\-*/]|\\[a-zA-Z]+|\^[\w{]|_\w")


def format_label_text(text: str, *, math: bool = False) -> str:
    """Return text ready for Matplotlib ``Text`` (mathtext when requested).

    Supports:
    - explicit ``$...$`` mathtext
    - LaTeX-style ``\\(...\\)`` (converted to mathtext)
    - ``math=True`` wrapping with lightweight normalisation
    """
    raw = (text or "").strip()
    if not raw:
        return raw

    if raw.startswith("$") and raw.endswith("$") and len(raw) >= 2:
        return raw

    if raw.startswith(r"\(") and raw.endswith(r"\)"):
        inner = raw[2:-2].strip()
        return f"${inner}$"

    if not math and _MATH_HINT_RE.search(raw):
        math = True

    if math:
        inner = raw.replace(" ", "")
        # Common exam labels: y = x^2 -> y=x^2
        inner = inner.replace("= ", "=").replace(" =", "=")
        return f"${inner}$"

    return raw
