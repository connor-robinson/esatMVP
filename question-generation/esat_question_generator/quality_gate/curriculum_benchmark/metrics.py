"""Gold labels and metrics for ESAT 228 manual benchmark evaluation."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, Tuple

GoldLabel = Literal["in_syllabus", "out_of_syllabus", "invalid_question"]
PredictedLabel = Literal["in_syllabus", "borderline", "out_of_syllabus"]


def gold_label_from_decision(decision: Dict[str, Any]) -> GoldLabel:
    if decision["decision"] == "keep":
        return "in_syllabus"
    if decision.get("decision_category") == "invalid_question":
        return "invalid_question"
    return "out_of_syllabus"


def is_correct_prediction(gold: GoldLabel, predicted: str, confidence: str) -> bool:
    pred = (predicted or "").strip().lower()
    conf = (confidence or "medium").strip().lower()
    if gold == "in_syllabus":
        return pred == "in_syllabus"
    if gold == "out_of_syllabus":
        return pred == "out_of_syllabus"
    # invalid_question: must not be high-confidence in_syllabus
    if pred == "in_syllabus" and conf == "high":
        return False
    return pred in ("out_of_syllabus", "borderline") or (pred == "in_syllabus" and conf != "high")


def is_critical_false_positive(gold: GoldLabel, predicted: str, confidence: str) -> bool:
    """Manual reject classified as high-confidence in_syllabus."""
    if gold == "in_syllabus":
        return False
    return (predicted or "").strip().lower() == "in_syllabus" and (confidence or "").strip().lower() == "high"


def confusion_key(gold: GoldLabel, predicted: str) -> str:
    return f"gold={gold}|pred={(predicted or 'unknown').strip().lower()}"


def build_confusion_matrix(rows: List[Dict[str, Any]]) -> Dict[str, int]:
    matrix: Dict[str, int] = {}
    for r in rows:
        key = confusion_key(r["gold"], r["predicted_match"])
        matrix[key] = matrix.get(key, 0) + 1
    return dict(sorted(matrix.items()))


def benchmark_summary(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    total = len(rows)
    correct = sum(1 for r in rows if r.get("correct"))
    critical_fp = [r for r in rows if r.get("critical_false_positive")]
    disagreements = [r for r in rows if not r.get("correct")]
    return {
        "total": total,
        "correct": correct,
        "accuracy": round(correct / total, 4) if total else 0.0,
        "critical_false_positive_count": len(critical_fp),
        "disagreement_count": len(disagreements),
        "gold_in_syllabus": sum(1 for r in rows if r["gold"] == "in_syllabus"),
        "gold_out_of_syllabus": sum(1 for r in rows if r["gold"] == "out_of_syllabus"),
        "gold_invalid_question": sum(1 for r in rows if r["gold"] == "invalid_question"),
    }
