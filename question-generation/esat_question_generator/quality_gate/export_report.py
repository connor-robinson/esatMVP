"""
Flatten assessed questions for CSV / JSONL export (Streamlit and CLI).
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

import pandas as pd

_HTML_TAG_RE = re.compile(r"<[^>]+>")


def strip_html(text: str) -> str:
    if not text:
        return ""
    t = _HTML_TAG_RE.sub(" ", text)
    return re.sub(r"\s+", " ", t).strip()


def _coerce_str(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, str):
        return val.strip()
    if isinstance(val, (int, float, bool)):
        return str(val)
    return str(val).strip()


def _parse_payload(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            p = json.loads(raw)
            return p if isinstance(p, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _join_list(val: Any, *, sep: str = ", ") -> str:
    if val is None:
        return ""
    if isinstance(val, list):
        parts = [_coerce_str(x) for x in val]
        return sep.join(x for x in parts if x)
    s = _coerce_str(val)
    if s.startswith("[") and s.endswith("]"):
        try:
            parsed = json.loads(s)
            if isinstance(parsed, list):
                return _join_list(parsed, sep=sep)
        except json.JSONDecodeError:
            pass
    return s


def _format_curriculum_flags(flags: Any) -> str:
    if not isinstance(flags, list):
        return ""
    parts: List[str] = []
    for f in flags:
        if not isinstance(f, dict):
            continue
        fid = _coerce_str(f.get("flag_id"))
        sev = _coerce_str(f.get("severity"))
        reason = _coerce_str(f.get("reason"))
        pat = _coerce_str(f.get("matched_pattern"))
        chunk = " — ".join(x for x in [fid, sev, pat, reason] if x)
        if chunk:
            parts.append(chunk)
    return " | ".join(parts)


def _scores_dict(payload: Dict[str, Any]) -> Dict[str, Any]:
    scores = payload.get("scores")
    return scores if isinstance(scores, dict) else {}


def flatten_assessed_question_row(
    row: Dict[str, Any],
    *,
    review_base: str = "",
) -> Dict[str, Any]:
    """One export record per assessed question."""
    qid = _coerce_str(row.get("id"))
    stem = _coerce_str(row.get("question_stem"))
    payload = _parse_payload(row.get("quality_gate_payload"))
    scores = _scores_dict(payload)
    cv = payload.get("curriculum_validation") if isinstance(payload.get("curriculum_validation"), dict) else {}
    fv = payload.get("formatting_validation") if isinstance(payload.get("formatting_validation"), dict) else {}
    ak = payload.get("answer_key_validation") if isinstance(payload.get("answer_key_validation"), dict) else {}
    ge = payload.get("graph_enrichment") if isinstance(payload.get("graph_enrichment"), dict) else {}
    rd = payload.get("review_disposition") if isinstance(payload.get("review_disposition"), dict) else {}

    base = (review_base or "").rstrip("/")
    review_url = f"{base}/review?id={qid}" if base and qid else ""

    db_reason = _coerce_str(row.get("quality_gate_reason"))
    ai_reasoning = _coerce_str(payload.get("reasoning")) or db_reason

    return {
        "question_id": qid,
        "subjects": _coerce_str(row.get("subjects")),
        "difficulty": _coerce_str(row.get("difficulty")),
        "primary_tag": _coerce_str(row.get("primary_tag")),
        "secondary_tags": _join_list(row.get("secondary_tags")),
        "test_type": _coerce_str(row.get("test_type")),
        "status": _coerce_str(row.get("status")),
        "media_upload_code": _coerce_str(row.get("media_upload_code")),
        "question_stem_plain": strip_html(stem),
        "question_stem": stem,
        "quality_gate_assessed_at": _coerce_str(row.get("quality_gate_assessed_at")),
        "quality_gate_job_id": _coerce_str(row.get("quality_gate_job_id")),
        "quality_gate_verdict": _coerce_str(row.get("quality_gate_verdict")),
        "quality_gate_action": _coerce_str(row.get("quality_gate_action")),
        "quality_gate_reason": db_reason,
        "quality_gate_model": _coerce_str(row.get("quality_gate_model")),
        "ai_reasoning": ai_reasoning,
        "exam_timing_notes": _coerce_str(payload.get("exam_timing_notes")),
        "confidence": _coerce_str(payload.get("confidence")),
        "calibration_tier": _coerce_str(row.get("quality_gate_calibration_tier") or payload.get("calibration_tier")),
        "calibration_notes": _coerce_str(
            row.get("quality_gate_calibration_notes") or payload.get("calibration_notes")
        ),
        "score_syllabus_fit": scores.get("syllabus_fit", ""),
        "score_solution_quality": scores.get("solution_quality", ""),
        "score_esat_realism_pacing": scores.get("esat_realism_pacing", ""),
        "curriculum_match": _coerce_str(cv.get("curriculum_match")),
        "syllabus_fit_score": cv.get("syllabus_fit_score", ""),
        "required_topic_codes": _join_list(cv.get("required_topic_codes")),
        "suspicious_topics": _join_list(cv.get("suspicious_topics")),
        "curriculum_reason": _coerce_str(cv.get("curriculum_reason")),
        "curriculum_flags": _format_curriculum_flags(cv.get("curriculum_flags")),
        "formatting_score": fv.get("formatting_score", ""),
        "formatting_issues": _join_list(fv.get("formatting_issues"), sep="; "),
        "formatting_reason": _coerce_str(fv.get("formatting_reason")),
        "answer_key_stored": _coerce_str(ak.get("stored_option")),
        "answer_key_true": _coerce_str(ak.get("true_option")),
        "answer_key_was_wrong": ak.get("was_wrong", ""),
        "answer_key_fix_applied": ak.get("fix_applied", ""),
        "disposition_outcome": _coerce_str(rd.get("outcome")),
        "disposition_labels": _join_list(rd.get("labels")),
        "disposition_notes": _coerce_str(rd.get("notes")),
        "graph_candidate": row.get("quality_gate_graph_candidate", ge.get("is_candidate", "")),
        "graph_mode": _coerce_str(row.get("quality_gate_graph_mode") or ge.get("mode")),
        "graph_notes": _coerce_str(row.get("quality_gate_graph_notes") or ge.get("notes_for_human")),
        "graph_suggested_stem_edits": _coerce_str(ge.get("suggested_stem_edits")),
        "diagram_backfill_kind": _coerce_str(row.get("quality_gate_diagram_backfill_kind")),
        "review_url": review_url,
    }


def build_export_dataframe(
    rows: List[Dict[str, Any]],
    *,
    review_base: str = "",
    for_csv: bool = False,
) -> pd.DataFrame:
    records = [flatten_assessed_question_row(r, review_base=review_base) for r in rows]
    if for_csv:
        for rec in records:
            rec.pop("question_stem", None)
    return pd.DataFrame.from_records(records) if records else pd.DataFrame()


def export_csv_bytes(rows: List[Dict[str, Any]], *, review_base: str = "") -> bytes:
    df = build_export_dataframe(rows, review_base=review_base, for_csv=True)
    return df.to_csv(index=False).encode("utf-8-sig")


def export_jsonl_bytes(rows: List[Dict[str, Any]], *, review_base: str = "") -> bytes:
    lines = [
        json.dumps(flatten_assessed_question_row(r, review_base=review_base), ensure_ascii=False)
        for r in rows
    ]
    return ("\n".join(lines) + ("\n" if lines else "")).encode("utf-8")
