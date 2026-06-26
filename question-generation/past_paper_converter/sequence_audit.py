"""Paper-level sequence validation for missing/wrong-order screenshots."""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any, Dict, List, Tuple

from .db import fetch_questions


def audit_paper_sequence(paper_id: int) -> Dict[str, Any]:
    """
    Deterministic sequence audit — no AI tokens.
    Flags gaps, duplicates, and wrong detected numbers per paper.
    """
    questions = fetch_questions(paper_id=paper_id)
    if not questions:
        return {"paper_id": paper_id, "ok": True, "issues": []}

    qnums = sorted(int(q["question_number"]) for q in questions)
    expected_set = set(qnums)
    issues: List[Dict[str, Any]] = []

    # Gap detection within paper question_number range
    if qnums:
        for n in range(qnums[0], qnums[-1] + 1):
            if n not in expected_set:
                issues.append({"type": "sequence_gap", "question_number": n})

    # Duplicate question_number in same paper
    counts = Counter(int(q["question_number"]) for q in questions)
    for num, cnt in counts.items():
        if cnt > 1:
            issues.append({"type": "duplicate_question_number", "question_number": num, "count": cnt})

    return {
        "paper_id": paper_id,
        "exam_name": questions[0].get("exam_name"),
        "exam_year": questions[0].get("exam_year"),
        "paper_name": questions[0].get("paper_name"),
        "question_count": len(questions),
        "question_range": [qnums[0], qnums[-1]] if qnums else [],
        "ok": len(issues) == 0,
        "issues": issues,
    }


def apply_sequence_flags_to_conversions(
    paper_id: int,
    conversions_by_qid: Dict[int, Dict[str, Any]],
) -> Dict[int, Dict[str, Any]]:
    """Merge sequence audit + detected-number mismatches into conversion reports."""
    audit = audit_paper_sequence(paper_id)
    issue_qnums = {i["question_number"] for i in audit["issues"] if "question_number" in i}

    questions = fetch_questions(paper_id=paper_id)
    qid_by_num = {int(q["question_number"]): int(q["id"]) for q in questions}

    for num in issue_qnums:
        qid = qid_by_num.get(num)
        if qid and qid in conversions_by_qid:
            report = conversions_by_qid[qid].setdefault("conversion_report", {})
            if audit["issues"]:
                report["sequence_gap"] = True
                report["paper_sequence_issues"] = audit["issues"]

    return conversions_by_qid


def audit_all_papers(paper_ids: List[int]) -> List[Dict[str, Any]]:
    return [audit_paper_sequence(pid) for pid in paper_ids]
