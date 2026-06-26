"""ESAT cohort identification for curriculum reassessment."""

from __future__ import annotations

from typing import Any, Dict, Tuple

from quality_gate.curriculum import normalize_subject

from .constants import ESAT_SCHEMA_PREFIXES, ESAT_SUBJECTS


def _subject_is_esat(row: Dict[str, Any]) -> bool:
    return normalize_subject(row.get("subjects")).casefold() in ESAT_SUBJECTS


def _schema_id_is_esat(row: Dict[str, Any]) -> bool:
    schema_id = str(row.get("schema_id") or "").strip()
    if not schema_id:
        return False
    if schema_id.upper().startswith("TMUA"):
        return False
    return schema_id.startswith(ESAT_SCHEMA_PREFIXES)


def is_confirmed_esat(row: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Return whether the row belongs to the ESAT bank.

    ``test_type IS NULL`` rows are included only when another reliable field
    establishes ESAT membership.
    """
    test_type = row.get("test_type")
    if test_type == "ESAT":
        return True, "test_type=ESAT"
    if test_type == "TMUA":
        return False, "test_type=TMUA"
    if test_type is not None and str(test_type).strip():
        return False, f"test_type={test_type}"

    if not _subject_is_esat(row):
        return False, "null test_type without ESAT subject"

    has_qg = bool(row.get("quality_gate_assessed_at"))
    has_schema = _schema_id_is_esat(row)
    if has_qg and has_schema:
        return True, "null test_type + ESAT subject + schema_id + QG assessed"
    if has_qg:
        return True, "null test_type + ESAT subject + QG assessed"
    if has_schema:
        return True, "null test_type + ESAT subject + ESAT schema_id"
    return False, "null test_type without ESAT confirmation signal"
