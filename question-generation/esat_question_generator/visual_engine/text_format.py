"""Matplotlib mathtext formatting for diagram labels."""

from __future__ import annotations

import re

_MATH_HINT_RE = re.compile(r"[\\^_{}=+\-*/]|\\[a-zA-Z]+|\^[\w{]|_\w")
_TEXT_CMD_RE = re.compile(r"\\(?:text|mathrm|mathbf|mathit)\{[^}]*\}")
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


def _repair_semicolon_spaces(text: str) -> str:
    """Fix botched unit spacing like '1200;kg' or '(x-1);cm'."""
    return re.sub(r"(?<=[\w\)])\s*;\s*(?=[\w\\])", " ", text)


def _math_spaces(text: str) -> str:
    """Insert thin math spaces outside \\text/\\mathrm groups; keep spaces inside them."""
    parts = _TEXT_CMD_RE.split(text)
    cmds = _TEXT_CMD_RE.findall(text)
    out: list[str] = []
    for i, part in enumerate(parts):
        cleaned = re.sub(r"\s+", r"\,", part.strip()) if part.strip() else part
        # Keep operator adjacency tidy: x\,=\,2 -> x=2 is fine via strip of empties
        out.append(cleaned)
        if i < len(cmds):
            out.append(cmds[i])
    return "".join(out)


def format_label_text(text: str, *, math: bool = False) -> str:
    """Return text ready for Matplotlib ``Text`` (mathtext when requested).

    Supports:
    - explicit ``$...$`` mathtext
    - LaTeX-style ``\\(...\\)`` (converted to mathtext)
    - ``math=True`` wrapping with lightweight normalisation
    - Gemini double-escaped commands (``\\\\Omega`` → ``\\Omega``)
    - preserves spaces inside ``\\text{...}`` (avoids visible ';' artifacts)
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
    inner = _repair_semicolon_spaces(inner)

    if not math and not had_delimiters and _MATH_HINT_RE.search(inner):
        math = True

    if math or had_delimiters:
        if "\\" in inner:
            cleaned = _math_spaces(inner)
        else:
            cleaned = inner.replace(" ", "")
        return f"${cleaned}$"

    return inner
