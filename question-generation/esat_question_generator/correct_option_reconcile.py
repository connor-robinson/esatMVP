"""
Reconcile ``question.correct_option`` with ``distractor_map`` and solution text.

The implementer sometimes sets ``correct_option`` to one letter while describing
another letter as the correct answer in ``distractor_map``. Sync used to default
missing keys to ``A``, which hides the bug. This module fixes obvious mismatches
before verifier / DB write.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

# Pipeline placeholder from ``_fill_distractor_map_gaps`` — not evidence of truth.
_GENERIC_CORRECT_FILLER_PREFIX = "this is the correct answer given the worked reasoning"

# Strong signals that THIS option's text asserts it is the keyed correct answer.
_CLAIMS_SELF_CORRECT = re.compile(
    r"(?is)"
    r"\b(?:"
    r"this\s+is\s+the\s+correct\s+answer"
    r"|the\s+correct\s+answer\s*,\s*derived"
    r"|is\s+the\s+correct\s+answer\s*,\s*derived"
    r"|correct\s+answer\s*,\s*derived\s+from"
    r")\b"
)

_DENIES_SELF_CORRECT = re.compile(
    r"(?is)\b(?:not|is\s+not)\s+(?:the\s+)?correct\s+answer\b"
)

# Last-resort: stated letter in solution reasoning (conclusion).
_SOLUTION_PATTERNS = (
    re.compile(r"(?is)(?:the\s+)?correct\s+answer\s+is\s*\(?\s*([A-H])\b"),
    re.compile(r"(?is)\banswer\s+is\s*\(?\s*([A-H])\b"),
    re.compile(r"(?is)correct\s+option\s+is\s*\(?\s*([A-H])\b"),
    re.compile(r"(?is)option\s*\(?\s*([A-H])\s*\)?\s+is\s+(?:the\s+)?correct"),
)


def _norm_letter(key: Any) -> Optional[str]:
    if key is None:
        return None
    s = str(key).strip().upper()
    if len(s) == 1 and s in "ABCDEFGH":
        return s
    return None


def _option_letters(options: Any) -> List[str]:
    if isinstance(options, dict):
        out: List[str] = []
        for k in options.keys():
            L = _norm_letter(k)
            if L:
                out.append(L)
        return sorted(set(out))
    if isinstance(options, list):
        return [chr(ord("A") + i) for i in range(len(options))]
    return []


def _text_claims_this_option_correct(text: Any) -> bool:
    if not text or not isinstance(text, str):
        return False
    s = text.strip()
    if not s:
        return False
    low = s.lower()
    if _DENIES_SELF_CORRECT.search(s):
        return False
    if low.startswith(_GENERIC_CORRECT_FILLER_PREFIX):
        return False
    return bool(_CLAIMS_SELF_CORRECT.search(s))


def infer_correct_option_from_solution(solution: Any) -> Optional[str]:
    """Return a single letter if solution text strongly states it, else None."""
    if not isinstance(solution, dict):
        return None
    reasoning = solution.get("reasoning")
    if not isinstance(reasoning, str) or not reasoning.strip():
        return None
    # Prefer the last few mentions (conclusion is usually at the end).
    tail = reasoning[-4000:] if len(reasoning) > 4000 else reasoning
    matches: List[str] = []
    for pat in _SOLUTION_PATTERNS:
        for m in pat.finditer(tail):
            g = m.group(1)
            if g:
                matches.append(g.upper())
    if not matches:
        return None
    letter = matches[-1]
    return letter if letter in "ABCDEFGH" else None


def reconcile_correct_option(
    question: Dict[str, Any],
    distractor_map: Any,
    solution: Any = None,
) -> Tuple[Optional[str], Optional[str]]:
    """
    If ``distractor_map`` clearly marks exactly one option as the correct answer
    (and it differs from ``question['correct_option']``), return that letter.

    Returns:
        (new_letter, reason) — ``(None, None)`` if no change.
    """
    if not isinstance(question, dict):
        return None, None
    opts = question.get("options")
    letters = _option_letters(opts)
    if not letters:
        return None, None

    if not isinstance(distractor_map, dict):
        distractor_map = {}

    claimers: List[str] = []
    for key, text in distractor_map.items():
        L = _norm_letter(key)
        if not L or L not in letters:
            continue
        if _text_claims_this_option_correct(text):
            claimers.append(L)

    claimers_unique = sorted(set(claimers))
    current = _norm_letter(question.get("correct_option"))
    if not current or current not in letters:
        current = None

    if len(claimers_unique) == 1:
        only = claimers_unique[0]
        if current is None or only != current:
            return only, "distractor_map_single_explicit_correct_claim"
        return None, None

    if len(claimers_unique) > 1:
        # Ambiguous — try solution tail only if it matches one of the claimers.
        sol_letter = infer_correct_option_from_solution(solution)
        if sol_letter and sol_letter in claimers_unique:
            if current is None or sol_letter != current:
                return sol_letter, "solution_disambiguates_multiple_distractor_claims"
        return None, None

    # No explicit distractor claim — try solution if current missing or wrong.
    sol_letter = infer_correct_option_from_solution(solution)
    if sol_letter and sol_letter in letters:
        if current is None or sol_letter != current:
            return sol_letter, "solution_states_answer_letter"
    return None, None


def apply_reconcile_to_question_package(pkg: Dict[str, Any]) -> bool:
    """
    In-place: fix ``question.correct_option`` when reconciliation applies.

    Returns True if ``correct_option`` was changed.
    """
    if not isinstance(pkg, dict):
        return False
    q = pkg.get("question")
    if not isinstance(q, dict):
        return False
    dm = pkg.get("distractor_map")
    sol = pkg.get("solution")
    before = q.get("correct_option")
    new_letter, _reason = reconcile_correct_option(q, dm, sol)
    if new_letter:
        q["correct_option"] = new_letter
        return str(before).strip().upper()[:1] != new_letter
    return False
