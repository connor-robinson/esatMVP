"""Matplotlib mathtext formatting for diagram labels."""

from __future__ import annotations

import re

_MATH_HINT_RE = re.compile(r"[\\^_{}=+\-*/]|\\[a-zA-Z]+|\^[\w{]|_\w")
_UNICODE_MATH = {
    "Ω": r"\Omega",
    "θ": r"\theta",
    "φ": r"\phi",
    "π": r"\pi",
    "α": r"\alpha",
    "β": r"\beta",
    "γ": r"\gamma",
    "δ": r"\delta",
    "°": r"^\circ",
    "×": r"\times",
    "≤": r"\leq",
    "≥": r"\geq",
}


def _collapse_backslashes(text: str) -> str:
    """Turn Gemini double-escaped LaTeX (\\\\Omega) into single \\Omega."""
    prev = None
    while prev != text:
        prev = text
        text = text.replace("\\\\", "\\")
    return text


def _strip_outer_math_delimiters(text: str) -> str:
    raw = text.strip()
    while raw.startswith("$") and raw.endswith("$") and len(raw) >= 2:
        raw = raw[1:-1].strip()
    if raw.startswith(r"\(") and raw.endswith(r"\)"):
        raw = raw[2:-2].strip()
    return raw


def _replace_unicode(text: str) -> str:
    out = text
    for src, dst in _UNICODE_MATH.items():
        out = out.replace(src, dst)
    return out


def format_label_text(text: str, *, math: bool = False) -> str:
    """Return text ready for Matplotlib ``Text`` (mathtext when requested).

    Supports:
    - explicit ``$...$`` mathtext
    - LaTeX-style ``\\(...\\)`` (converted to mathtext)
    - ``math=True`` wrapping with lightweight normalisation
    - Gemini double-escaped commands (``\\\\Omega`` → ``\\Omega``)
    """
    raw = (text or "").strip()
    if not raw:
        return raw

    had_delimiters = (
        (raw.startswith("$") and raw.endswith("$") and len(raw) >= 2)
        or (raw.startswith(r"\(") and raw.endswith(r"\)"))
    )
    inner = _strip_outer_math_delimiters(raw)
    inner = _collapse_backslashes(inner)
    inner = _replace_unicode(inner)

    if not math and not had_delimiters and _MATH_HINT_RE.search(inner):
        math = True

    if math or had_delimiters:
        if "\\" in inner and " " in inner:
            cleaned = re.sub(r"\s+", r"\;", inner.strip())
        else:
            cleaned = inner.replace(" ", "")
            cleaned = cleaned.replace("=", "=")
        return f"${cleaned}$"

    return inner
