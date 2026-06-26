"""Append-only audit storage for curriculum reassessment."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

AUDIT_TABLE = "esat_curriculum_reassessment_audit"


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def insert_audit_record(
    client: Any,
    *,
    question_id: str,
    validator_version: str,
    model: str,
    eligibility_bucket: str,
    eligibility_reasons: List[str],
    prior_curriculum_validation: Dict[str, Any],
    prior_effective_action: Optional[str],
    new_curriculum_validation: Dict[str, Any],
    new_effective_action: str,
    raw_model_response: str,
    run_id: str,
) -> Dict[str, Any]:
    record = {
        "id": str(uuid.uuid4()),
        "question_id": question_id,
        "validator_version": validator_version,
        "model": model,
        "reassessed_at": _iso_now(),
        "eligibility_bucket": eligibility_bucket,
        "eligibility_reasons": eligibility_reasons,
        "prior_curriculum_validation": prior_curriculum_validation,
        "prior_effective_action": prior_effective_action,
        "new_curriculum_validation": new_curriculum_validation,
        "new_effective_action": new_effective_action,
        "raw_model_response": raw_model_response,
        "run_id": run_id,
    }
    client.table(AUDIT_TABLE).insert(record).execute()
    return record


def append_payload_audit_fallback(
    payload: Dict[str, Any],
    audit_entry: Dict[str, Any],
) -> Dict[str, Any]:
    """Append to quality_gate_payload when the audit table is unavailable."""
    existing = payload.get("curriculum_reassessment_audits")
    if not isinstance(existing, list):
        existing = []
    return {
        **payload,
        "curriculum_reassessment_audits": [*existing, audit_entry],
    }
