"""Very small KaTeX delimiter sanity check.

Goal: catch the most common implementer slips early — unbalanced ``$``,
stray ``\\(``/``\\[``, raw backslashes in JSON strings — *before* spending a
Verifier LLM call. We do not try to be a real LaTeX parser.
"""

from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Tuple

_FORBIDDEN_PATTERNS = (
    (r"\\\\\(", "Use $...$ instead of \\\\(...\\\\)."),
    (r"\\\\\)", "Use $...$ instead of \\\\(...\\\\)."),
    (r"\\\\\[", "Use $$...$$ instead of \\\\[...\\\\]."),
    (r"\\\\\]", "Use $$...$$ instead of \\\\[...\\\\]."),
)


def _count_unescaped(s: str, char: str) -> int:
    n = 0
    i = 0
    while i < len(s):
        c = s[i]
        if c == "\\" and i + 1 < len(s):
            i += 2
            continue
        if c == char:
            n += 1
        i += 1
    return n


def _check_string(field: str, value: str) -> List[Dict[str, str]]:
    errs: List[Dict[str, str]] = []
    if not isinstance(value, str) or not value:
        return errs

    # 1) Forbidden alternative delimiters
    for pat, msg in _FORBIDDEN_PATTERNS:
        if re.search(pat, value):
            errs.append({"field": field, "kind": "forbidden_delimiter", "message": msg})

    # 2) Balanced $$ pairs (display math) -- count occurrences of $$
    dd = value.count("$$")
    if dd % 2 != 0:
        errs.append(
            {
                "field": field,
                "kind": "unbalanced_display_math",
                "message": "Odd number of '$$' tokens.",
            }
        )

    # 3) Balanced single $ pairs after stripping $$ pairs.
    stripped = value.replace("$$", "")
    dollar_pairs = _count_unescaped(stripped, "$")
    if dollar_pairs % 2 != 0:
        errs.append(
            {
                "field": field,
                "kind": "unbalanced_inline_math",
                "message": "Odd number of unescaped '$' tokens.",
            }
        )

    return errs


def _walk_strings(obj: Any, prefix: str = "") -> Iterable[Tuple[str, str]]:
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from _walk_strings(v, f"{prefix}.{k}" if prefix else str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from _walk_strings(v, f"{prefix}[{i}]")
    elif isinstance(obj, str):
        yield prefix, obj


def basic_katex_lint(question_pkg: Dict[str, Any]) -> List[Dict[str, str]]:
    """Return a list of ``{field, kind, message}`` errors. Empty list = clean."""
    errs: List[Dict[str, str]] = []
    # Only check the strings that ship to candidates / solution display.
    candidates = (
        ("question.stem", question_pkg.get("question", {}).get("stem", "")),
    )
    for field, val in candidates:
        errs.extend(_check_string(field, val))

    options = question_pkg.get("question", {}).get("options") or {}
    if isinstance(options, dict):
        for k, v in options.items():
            errs.extend(_check_string(f"question.options.{k}", str(v) if v is not None else ""))

    solution = question_pkg.get("solution") or {}
    if isinstance(solution, dict):
        for k in ("key_insight", "reasoning"):
            errs.extend(_check_string(f"solution.{k}", str(solution.get(k, "") or "")))

    distractor_map = question_pkg.get("distractor_map") or {}
    if isinstance(distractor_map, dict):
        for k, v in distractor_map.items():
            errs.extend(_check_string(f"distractor_map.{k}", str(v) if v is not None else ""))
    return errs
