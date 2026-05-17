"""Builder for ``manifest.json`` (per-question summary).

The manifest is the durable on-disk record of a V4 run. It collates the
stage statuses, model trace, visual asset metadata, and rejection reasons in
one file so downstream tooling does not need to crawl the stage JSONs.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional


def build_manifest(
    *,
    qid: str,
    schema_id: str,
    difficulty: str,
    subject: str = "physics",
    status: str = "rejected",  # accepted | rejected | error
    failure_gate: Optional[str] = None,
    failure_reasons: Optional[List[str]] = None,
    has_visual: bool = False,
    visual_type: str = "none",
    answer_depends_on_visual: bool = False,
    assets: Optional[List[Dict[str, Any]]] = None,
    model_trace: Optional[Dict[str, str]] = None,
    retry_counts: Optional[Dict[str, int]] = None,
    stages: Optional[Iterable[Dict[str, Any]]] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    manifest = {
        "question_id": qid,
        "subject": subject,
        "schema_id": schema_id,
        "difficulty": difficulty,
        "status": status,
        "failure_gate": failure_gate,
        "failure_reasons": failure_reasons or [],
        "has_visual": has_visual,
        "visual_type": visual_type,
        "answer_depends_on_visual": answer_depends_on_visual,
        "assets": assets or [],
        "model_trace": model_trace or {},
        "retry_counts": retry_counts or {},
        "stages": list(stages or []),
        "pipeline": "v4",
        "created_at": datetime.now().astimezone().isoformat(timespec="seconds"),
    }
    if extra:
        manifest["extra"] = extra
    return manifest
