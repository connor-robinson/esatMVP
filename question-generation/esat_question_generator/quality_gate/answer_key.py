"""Detect and fix mismatched ``correct_option`` vs solution / distractor_map."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from correct_option_reconcile import reconcile_correct_option


def build_answer_key_precheck(row: Dict[str, Any]) -> Dict[str, Any]:
    """Deterministic check sent to the LLM (no schema required)."""
    question = {
        "options": row.get("options"),
        "correct_option": row.get("correct_option"),
    }
    solution = {
        "reasoning": row.get("solution_reasoning") or "",
        "key_insight": row.get("solution_key_insight") or "",
    }
    stored = (row.get("correct_option") or "").strip().upper()[:1] or None
    inferred, reason = reconcile_correct_option(
        question,
        row.get("distractor_map"),
        solution,
    )
    return {
        "stored_option": stored,
        "inferred_option": inferred,
        "mismatch_detected": bool(inferred and stored and inferred != stored),
        "inference_reason": reason or "",
        "can_auto_fix": bool(inferred and (not stored or inferred != stored)),
    }


def build_answer_key_patch(row: Dict[str, Any]) -> Tuple[Dict[str, Any], Optional[str]]:
    """
    Return (supabase patch, reconcile_reason) when ``correct_option`` should change.
    """
    question = {
        "options": row.get("options"),
        "correct_option": row.get("correct_option"),
    }
    solution = {
        "reasoning": row.get("solution_reasoning") or "",
        "key_insight": row.get("solution_key_insight") or "",
    }
    new_letter, reason = reconcile_correct_option(
        question,
        row.get("distractor_map"),
        solution,
    )
    if not new_letter:
        return {}, None
    stored = (row.get("correct_option") or "").strip().upper()[:1]
    if stored == new_letter:
        return {}, None
    return {"correct_option": new_letter}, reason


def apply_llm_answer_key_patch(
    row: Dict[str, Any],
    *,
    true_option: str,
) -> Dict[str, Any]:
    """Apply LLM-confirmed letter if valid for this row's options."""
    letter = (true_option or "").strip().upper()[:1]
    if not letter or letter not in "ABCDEFGH":
        return {}
    opts = row.get("options")
    if isinstance(opts, dict) and letter not in {str(k).strip().upper()[:1] for k in opts.keys()}:
        return {}
    stored = (row.get("correct_option") or "").strip().upper()[:1]
    if stored == letter:
        return {}
    return {"correct_option": letter}
