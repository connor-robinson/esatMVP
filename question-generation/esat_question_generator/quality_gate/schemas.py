from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

Verdict = Literal["Pass", "Minor", "Major"]
RecommendedAction = Literal["approve", "human_review", "regenerate", "delete"]
Confidence = Literal["high", "medium", "low"]
CalibrationTier = Literal["gold"]
GraphMode = Literal["none", "candidate", "missing_expected"]


@dataclass
class QualityGateResult:
    verdict: Verdict
    scores: Dict[str, int]
    recommended_action: RecommendedAction
    reasoning: str
    exam_timing_notes: Optional[str] = None
    confidence: Confidence = "medium"
    """Elite calibration pool (~top 5% by design); only when item is truly outstanding."""
    calibration_tier: Optional[CalibrationTier] = None
    calibration_notes: Optional[str] = None
    """True if a light reword + SVG graph/diagram would materially help ESAT-style interpretation practice."""
    graph_candidate: bool = False
    """Graph classification:
    - none: no graph work needed
    - candidate: optional enrichment diagram may help
    - missing_expected: question appears to require a graph/diagram that is currently missing
    """
    graph_mode: GraphMode = "none"
    graph_suggested_stem_edits: str = ""
    graph_insertion_placeholders: List[str] = field(default_factory=list)
    graph_notes_for_human: str = ""
    raw: Dict[str, Any] = field(default_factory=dict)

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
        }


def parse_quality_gate_json(data: Dict[str, Any]) -> QualityGateResult:
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
        # Back-compat for older model output that only had is_candidate.
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

    return QualityGateResult(
        verdict=verdict,
        scores=scores,
        recommended_action=action,
        reasoning=reasoning[:8000],
        exam_timing_notes=notes,
        confidence=conf,
        calibration_tier=cal,
        calibration_notes=cal_notes,
        graph_candidate=graph_candidate,
        graph_mode=graph_mode,
        graph_suggested_stem_edits=stem_edits[:8000],
        graph_insertion_placeholders=placeholders[:12],
        graph_notes_for_human=notes_human[:8000],
        raw=dict(data),
    )


@dataclass
class CohortFilters:
    test_type: Optional[str] = "ESAT"  # ESAT | TMUA | None for any
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


def effective_action(result: QualityGateResult, downgrade_low_confidence_pass: bool = True) -> RecommendedAction:
    """If model says Pass but confidence is low, require human review instead of auto-approve."""
    if (
        downgrade_low_confidence_pass
        and result.verdict == "Pass"
        and result.recommended_action == "approve"
        and result.confidence == "low"
    ):
        return "human_review"
    return result.recommended_action


def effective_action_with_graph_queue(result: QualityGateResult, base: RecommendedAction) -> RecommendedAction:
    """
    Graph/diagram enrichment candidates need human stem/SVG work — do not treat as fully auto-approved.
    """
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
