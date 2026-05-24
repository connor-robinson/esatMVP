from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

Verdict = Literal["Pass", "Minor", "Major"]
RecommendedAction = Literal["approve", "human_review", "regenerate", "delete"]
Confidence = Literal["high", "medium", "low"]
CalibrationTier = Literal["gold"]
GraphMode = Literal["none", "candidate", "missing_expected"]
CurriculumMatch = Literal["in_syllabus", "borderline", "off_syllabus"]
CurriculumSeverity = Literal["hard_fail", "warning"]


@dataclass
class CurriculumFlag:
    severity: CurriculumSeverity
    reason: str
    matched_pattern: str = ""
    suggested_action: RecommendedAction = "human_review"
    flag_id: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "severity": self.severity,
            "reason": self.reason,
            "matched_pattern": self.matched_pattern,
            "suggested_action": self.suggested_action,
            "flag_id": self.flag_id,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CurriculumFlag":
        sev = data.get("severity")
        if sev not in ("hard_fail", "warning"):
            sev = "warning"
        act = data.get("suggested_action")
        if act not in ("approve", "human_review", "regenerate", "delete"):
            act = "human_review"
        return cls(
            severity=sev,  # type: ignore[arg-type]
            reason=str(data.get("reason") or ""),
            matched_pattern=str(data.get("matched_pattern") or ""),
            suggested_action=act,  # type: ignore[arg-type]
            flag_id=str(data.get("flag_id") or ""),
        )


@dataclass
class QualityGateResult:
    verdict: Verdict
    scores: Dict[str, int]
    recommended_action: RecommendedAction
    reasoning: str
    exam_timing_notes: Optional[str] = None
    confidence: Confidence = "medium"
    calibration_tier: Optional[CalibrationTier] = None
    calibration_notes: Optional[str] = None
    graph_candidate: bool = False
    graph_mode: GraphMode = "none"
    graph_suggested_stem_edits: str = ""
    graph_insertion_placeholders: List[str] = field(default_factory=list)
    graph_notes_for_human: str = ""
    syllabus_fit_score: int = 3
    curriculum_match: CurriculumMatch = "in_syllabus"
    required_topic_codes: List[str] = field(default_factory=list)
    suspicious_topics: List[str] = field(default_factory=list)
    curriculum_reason: str = ""
    curriculum_flags: List[CurriculumFlag] = field(default_factory=list)
    formatting_score: int = 5
    formatting_issues: List[str] = field(default_factory=list)
    formatting_apply_fix: bool = False
    formatting_reason: str = ""
    raw: Dict[str, Any] = field(default_factory=dict)

    @property
    def pacing_score(self) -> int:
        return int(self.scores.get("esat_realism_pacing") or 3)

    def to_payload(self) -> Dict[str, Any]:
        return {
            "verdict": self.verdict,
            "scores": dict(self.scores),
            "recommended_action": self.recommended_action,
            "reasoning": self.reasoning,
            "exam_timing_notes": self.exam_timing_notes,
            "confidence": self.confidence,
            "calibration_tier": self.calibration_tier,
            "calibration_notes": self.calibration_notes,
            "graph_enrichment": {
                "is_candidate": self.graph_candidate,
                "mode": self.graph_mode,
                "suggested_stem_edits": self.graph_suggested_stem_edits,
                "insertion_placeholders": list(self.graph_insertion_placeholders),
                "notes_for_human": self.graph_notes_for_human,
            },
            "curriculum_validation": {
                "syllabus_fit_score": self.syllabus_fit_score,
                "curriculum_match": self.curriculum_match,
                "required_topic_codes": list(self.required_topic_codes),
                "suspicious_topics": list(self.suspicious_topics),
                "curriculum_reason": self.curriculum_reason,
                "curriculum_flags": [f.to_dict() for f in self.curriculum_flags],
            },
            "formatting_validation": {
                "formatting_score": self.formatting_score,
                "formatting_issues": list(self.formatting_issues),
                "apply_fix": self.formatting_apply_fix,
                "formatting_reason": self.formatting_reason,
            },
        }


def _parse_str_list(raw: Any, *, limit: int = 24) -> List[str]:
    if not isinstance(raw, list):
        return []
    out: List[str] = []
    for item in raw:
        s = str(item).strip()
        if s:
            out.append(s[:200])
    return out[:limit]


def _parse_curriculum_flags(raw: Any) -> List[CurriculumFlag]:
    if not isinstance(raw, list):
        return []
    out: List[CurriculumFlag] = []
    for item in raw:
        if isinstance(item, dict):
            out.append(CurriculumFlag.from_dict(item))
    return out[:30]


def merge_deterministic_curriculum_flags(
    result: QualityGateResult,
    pre_flags: List[CurriculumFlag],
) -> QualityGateResult:
    """Merge pre-check flags; deterministic hard fails tighten curriculum_match."""
    seen: set[tuple[str, str]] = set()
    merged: List[CurriculumFlag] = []
    for f in list(pre_flags) + list(result.curriculum_flags):
        key = (f.flag_id, f.matched_pattern)
        if key in seen:
            continue
        seen.add(key)
        merged.append(f)
    result.curriculum_flags = merged
    if any(f.severity == "hard_fail" for f in merged):
        if result.curriculum_match == "in_syllabus":
            result.curriculum_match = "off_syllabus"
        for f in merged:
            if f.severity == "hard_fail" and f.reason and f.reason not in result.suspicious_topics:
                result.suspicious_topics.append(f.reason[:200])
    elif merged and result.curriculum_match == "in_syllabus":
        result.curriculum_match = "borderline"
    return result


def parse_quality_gate_json(
    data: Dict[str, Any],
    *,
    pre_flags: Optional[List[CurriculumFlag]] = None,
) -> QualityGateResult:
    if "calibration_tier" not in data:
        data["calibration_tier"] = None
    if "calibration_notes" not in data:
        data["calibration_notes"] = None
    if not isinstance(data.get("graph_enrichment"), dict):
        data["graph_enrichment"] = {
            "is_candidate": False,
            "mode": "none",
            "suggested_stem_edits": "",
            "insertion_placeholders": [],
            "notes_for_human": "",
        }

    verdict = data.get("verdict")
    if verdict not in ("Pass", "Minor", "Major"):
        raise ValueError(f"invalid verdict: {verdict!r}")

    scores_in = data.get("scores") or {}
    scores: Dict[str, int] = {}
    for key in ("syllabus_fit", "solution_quality", "esat_realism_pacing"):
        v = scores_in.get(key)
        if v is None:
            raise ValueError(f"missing score: {key}")
        scores[key] = int(v)

    cv = data.get("curriculum_validation") if isinstance(data.get("curriculum_validation"), dict) else {}
    syllabus_fit_score = cv.get("syllabus_fit_score", scores.get("syllabus_fit"))
    try:
        syllabus_fit_score = int(syllabus_fit_score)
    except (TypeError, ValueError):
        syllabus_fit_score = int(scores.get("syllabus_fit") or 3)
    scores["syllabus_fit"] = syllabus_fit_score

    curriculum_match = cv.get("curriculum_match") or data.get("curriculum_match") or "in_syllabus"
    if curriculum_match not in ("in_syllabus", "borderline", "off_syllabus"):
        curriculum_match = "borderline"

    action = data.get("recommended_action")
    if action not in ("approve", "human_review", "regenerate", "delete"):
        raise ValueError(f"invalid recommended_action: {action!r}")

    reasoning = (data.get("reasoning") or "").strip()
    if not reasoning:
        raise ValueError("reasoning required")

    notes = data.get("exam_timing_notes")
    if notes is not None:
        notes = str(notes).strip() or None

    conf = data.get("confidence") or "medium"
    if conf not in ("high", "medium", "low"):
        conf = "medium"

    cal = data.get("calibration_tier")
    if cal not in (None, "gold", ""):
        cal = None
    if cal == "":
        cal = None

    cal_notes = data.get("calibration_notes")
    if cal_notes is not None:
        cal_notes = str(cal_notes).strip() or None
        if cal_notes:
            cal_notes = cal_notes[:4000]

    ge = data.get("graph_enrichment") if isinstance(data.get("graph_enrichment"), dict) else {}
    mode_raw = str(ge.get("mode") or "").strip().lower()
    if mode_raw in ("candidate", "enrichment_candidate"):
        graph_mode: GraphMode = "candidate"
    elif mode_raw in ("missing_expected", "missing_graph", "missing"):
        graph_mode = "missing_expected"
    elif mode_raw in ("none", ""):
        graph_mode = "none"
    else:
        graph_mode = "candidate" if bool(ge.get("is_candidate")) else "none"

    graph_candidate = graph_mode == "candidate"
    stem_edits = str(ge.get("suggested_stem_edits") or "").strip()
    notes_human = str(ge.get("notes_for_human") or "").strip()
    ph_raw = ge.get("insertion_placeholders")
    placeholders: List[str] = []
    if isinstance(ph_raw, list):
        for p in ph_raw:
            s = str(p).strip()
            if s:
                placeholders.append(s[:2000])
    elif isinstance(ph_raw, str) and ph_raw.strip():
        placeholders.append(ph_raw.strip()[:2000])

    llm_flags = _parse_curriculum_flags(cv.get("curriculum_flags"))
    pre = pre_flags or []

    fv = data.get("formatting_validation") if isinstance(data.get("formatting_validation"), dict) else {}
    fmt_score = fv.get("formatting_score", 5)
    try:
        fmt_score = int(fmt_score)
    except (TypeError, ValueError):
        fmt_score = 5
    fmt_score = max(1, min(5, fmt_score))
    fmt_issues = _parse_str_list(fv.get("formatting_issues"), limit=12)
    fmt_apply = bool(fv.get("apply_fix"))
    fmt_reason = str(fv.get("formatting_reason") or "")[:2000]

    result = QualityGateResult(
        verdict=verdict,
        scores=scores,
        recommended_action=action,
        reasoning=reasoning[:8000],
        exam_timing_notes=notes,
        confidence=conf,  # type: ignore[arg-type]
        calibration_tier=cal,
        calibration_notes=cal_notes,
        graph_candidate=graph_candidate,
        graph_mode=graph_mode,
        graph_suggested_stem_edits=stem_edits[:8000],
        graph_insertion_placeholders=placeholders[:12],
        graph_notes_for_human=notes_human[:8000],
        syllabus_fit_score=syllabus_fit_score,
        curriculum_match=curriculum_match,  # type: ignore[arg-type]
        required_topic_codes=_parse_str_list(cv.get("required_topic_codes")),
        suspicious_topics=_parse_str_list(cv.get("suspicious_topics")),
        curriculum_reason=str(cv.get("curriculum_reason") or "")[:4000],
        curriculum_flags=llm_flags,
        formatting_score=fmt_score,
        formatting_issues=fmt_issues,
        formatting_apply_fix=fmt_apply,
        formatting_reason=fmt_reason,
        raw=dict(data),
    )
    return merge_deterministic_curriculum_flags(result, pre)


@dataclass
class CohortFilters:
    test_type: Optional[str] = "ESAT"
    subjects: Optional[List[str]] = None
    difficulties: Optional[List[str]] = None
    statuses: Optional[List[str]] = None
    schema_id_prefix: Optional[str] = None
    only_unassessed: bool = True
    exclude_deleted: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "test_type": self.test_type,
            "subjects": self.subjects,
            "difficulties": self.difficulties,
            "statuses": self.statuses,
            "schema_id_prefix": self.schema_id_prefix,
            "only_unassessed": self.only_unassessed,
            "exclude_deleted": self.exclude_deleted,
        }


def _subject_label(row: Optional[Dict[str, Any]]) -> str:
    if not row:
        return ""
    raw = row.get("subjects")
    if isinstance(raw, str):
        return raw.strip()
    if isinstance(raw, list) and raw:
        return str(raw[0]).strip()
    return str(raw or "").strip()


def _has_hard_fail(flags: List[CurriculumFlag]) -> bool:
    return any(f.severity == "hard_fail" for f in flags)


def _required_has_mm(codes: List[str]) -> bool:
    for c in codes:
        u = (c or "").upper()
        if u.startswith("MM") or u.startswith("M2-MM") or "-MM" in u:
            return True
    return False


def effective_action(
    result: QualityGateResult,
    *,
    row: Optional[Dict[str, Any]] = None,
    downgrade_low_confidence_pass: bool = True,
) -> RecommendedAction:
    """Apply curriculum + confidence overrides before graph queue."""
    action = result.recommended_action
    subject = _subject_label(row)
    subj_cf = subject.casefold()
    has_hard = _has_hard_fail(result.curriculum_flags)

    if result.curriculum_match == "off_syllabus":
        if has_hard and result.confidence in ("high", "medium"):
            return "delete"
        return "human_review"

    if result.curriculum_match == "borderline":
        action = "human_review"

    if has_hard:
        if result.confidence in ("high", "medium") and any(
            f.suggested_action == "delete" for f in result.curriculum_flags if f.severity == "hard_fail"
        ):
            return "delete"
        return "human_review"

    if subj_cf in ("math 1", "mathematics 1") and _required_has_mm(result.required_topic_codes):
        if result.confidence in ("high", "medium"):
            return "delete"
        return "human_review"

    if result.verdict == "Pass" and result.syllabus_fit_score < 4:
        action = "human_review"

    if result.pacing_score <= 2 and action == "approve":
        action = "human_review"

    if result.formatting_score <= 2 and action == "approve":
        action = "human_review"

    if result.curriculum_match == "off_syllabus" and result.verdict == "Pass":
        action = "human_review"

    if (
        downgrade_low_confidence_pass
        and result.verdict == "Pass"
        and action == "approve"
        and result.confidence == "low"
    ):
        action = "human_review"

    if action == "approve" and has_hard:
        action = "human_review"

    if result.curriculum_match == "off_syllabus" and action == "approve":
        action = "human_review"

    return action


def effective_action_with_graph_queue(result: QualityGateResult, base: RecommendedAction) -> RecommendedAction:
    if base in ("delete", "regenerate", "human_review"):
        return base
    if result.graph_mode in ("candidate", "missing_expected") and result.verdict != "Major":
        return "human_review"
    return base


def build_graph_notes_for_db(result: QualityGateResult) -> Optional[str]:
    if result.graph_mode not in ("candidate", "missing_expected"):
        return None
    parts: List[str] = []
    if result.graph_mode == "missing_expected":
        parts.append("Graph mode: missing_expected (question likely requires a graph/diagram currently absent).")
    if result.graph_notes_for_human:
        parts.append(result.graph_notes_for_human)
    if result.graph_suggested_stem_edits:
        parts.append("Suggested stem edits:\n" + result.graph_suggested_stem_edits)
    if result.graph_insertion_placeholders:
        parts.append("Placeholders:\n" + "\n".join(result.graph_insertion_placeholders))
    text = "\n\n".join(parts).strip()
    return text[:12000] if text else None


def curriculum_fields_from_payload(payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract curriculum columns from stored quality_gate_payload."""
    p = payload or {}
    cv = p.get("curriculum_validation") if isinstance(p.get("curriculum_validation"), dict) else {}
    flags_raw = cv.get("curriculum_flags") or []
    flags = _parse_curriculum_flags(flags_raw) if isinstance(flags_raw, list) else []
    return {
        "curriculum_match": cv.get("curriculum_match") or "—",
        "syllabus_fit_score": cv.get("syllabus_fit_score"),
        "required_topic_codes": ", ".join(_parse_str_list(cv.get("required_topic_codes"), limit=8)) or "—",
        "suspicious_topics": ", ".join(_parse_str_list(cv.get("suspicious_topics"), limit=4)) or "—",
        "curriculum_reason": (cv.get("curriculum_reason") or "")[:120],
        "curriculum_flags": "; ".join(f.flag_id or f.reason[:40] for f in flags[:4]) or "—",
        "has_hard_fail": _has_hard_fail(flags),
        "math1_mm_required": _required_has_mm(_parse_str_list(cv.get("required_topic_codes"))),
        "calculus_in_math1": any(f.flag_id in ("differentiation", "integration") for f in flags),
        "missing_primary_tag": any(f.flag_id == "missing_primary_tag" for f in flags),
        "formatting_score": (p.get("formatting_validation") or {}).get("formatting_score"),
        "formatting_issues": ", ".join(
            _parse_str_list((p.get("formatting_validation") or {}).get("formatting_issues"), limit=3)
        )
        or "—",
    }
