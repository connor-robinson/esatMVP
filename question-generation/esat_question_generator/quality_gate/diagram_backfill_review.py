"""Flag questions for human review after Quality Gate diagram backfill (image or SVG)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

BACKFILL_KIND_IMAGE = "image"
BACKFILL_KIND_SVG = "svg"

BACKFILL_REVIEW_TAG = "backgenerated_diagram"

_REASON_PREFIX = {
    BACKFILL_KIND_IMAGE: (
        "[BACKGENERATED_DIAGRAM:image] Quality Gate auto-inserted an exam-style diagram "
        "(Imagen image backfill). Human review required: verify the figure matches the stem, "
        "does not spoil the answer, and labels are correct."
    ),
    BACKFILL_KIND_SVG: (
        "[BACKGENERATED_DIAGRAM:svg] Quality Gate auto-inserted an inline SVG diagram "
        "(SVG backfill). Human review required: verify the figure matches the stem, "
        "does not spoil the answer, and rendering is correct."
    ),
}

_DISPLAY_LABEL = {
    BACKFILL_KIND_IMAGE: "Backgen · image",
    BACKFILL_KIND_SVG: "Backgen · SVG",
}


def backfill_review_label(kind: Optional[str]) -> str:
    k = (kind or "").strip().lower()
    return _DISPLAY_LABEL.get(k, "Backgen · diagram" if k else "")


def build_backfill_human_review_patch(
    row: Dict[str, Any],
    *,
    kind: str,
) -> Dict[str, Any]:
    """
    DB fields to set after a successful diagram merge.

    - Marks ``quality_gate_diagram_backfill_kind`` + timestamp
    - Forces ``quality_gate_action`` = human_review with a tagged reason
    - Reopens ``status`` = pending when the row was auto-approved
    """
    k = (kind or "").strip().lower()
    if k not in (BACKFILL_KIND_IMAGE, BACKFILL_KIND_SVG):
        raise ValueError(f"kind must be {BACKFILL_KIND_IMAGE!r} or {BACKFILL_KIND_SVG!r}")

    now = datetime.now(timezone.utc).isoformat()
    prefix = _REASON_PREFIX[k]
    prev_reason = (row.get("quality_gate_reason") or "").strip()
    if prev_reason and prefix not in prev_reason:
        reason = prefix + "\n\nPrior gate note: " + prev_reason[:4000]
    else:
        reason = prefix if not prev_reason else prev_reason

    patch: Dict[str, Any] = {
        "quality_gate_diagram_backfill_kind": k,
        "quality_gate_diagram_backfill_at": now,
        "quality_gate_action": "human_review",
        "quality_gate_reason": reason[:8000],
    }
    wf = (row.get("status") or "").strip().lower()
    if wf == "approved":
        patch["status"] = "pending"
    return patch
