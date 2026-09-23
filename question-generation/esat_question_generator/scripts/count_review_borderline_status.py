#!/usr/bin/env python3
"""Count unreviewed ESAT questions and borderline-only curriculum backlog by subject."""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

_BASE = Path(__file__).resolve().parent.parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))


def _parse_payload(raw):
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        return json.loads(raw)
    return {}


def is_borderline_only(result, payload, row) -> bool:
    from quality_gate.schemas import _blocking_disposition_labels, _curriculum_is_out_of_syllabus

    cm = result.curriculum_match or ""
    if cm != "borderline":
        return False
    if _curriculum_is_out_of_syllabus(cm):
        return False
    if (row.get("quality_gate_verdict") or result.verdict) == "Major":
        return False
    if int(result.scores.get("solution_quality") or 5) <= 2:
        return False
    if int(result.scores.get("esat_realism_pacing") or 5) <= 2:
        return False
    if "deterministic_conflict" in result.disposition_labels:
        return False

    ak_labels = {"wrong_answer_key", "wrong_answer_key_fixed"}
    for lab in _blocking_disposition_labels(result.disposition_labels):
        if lab not in ak_labels and lab not in ("formatting_fixed",):
            return False

    for issue in result.human_blocking_issues or []:
        low = str(issue).lower()
        if any(tok in low for tok in ("curriculum", "borderline", "syllabus", "uncertain")):
            continue
        if "answer" in low or "key" in low:
            return False
        if "format" in low:
            return False
        return False

    if result.disposition_outcome in ("regenerate", "disregard", "delete", "move_paper"):
        return False

    ak = payload.get("answer_key_validation") or {}
    if ak.get("was_wrong") and not ak.get("fix_applied"):
        return False
    if "wrong_answer_key" in set(result.disposition_labels):
        return False
    return True


def fetch_esat_rows(client):
    cols = (
        "id, subjects, test_type, status, quality_gate_assessed_at, "
        "quality_gate_action, quality_gate_verdict, quality_gate_payload"
    )
    rows = []
    offset = 0
    while True:
        q = (
            client.table("ai_generated_questions")
            .select(cols)
            .neq("status", "deleted")
            .or_("test_type.eq.ESAT,test_type.is.null")
            .order("id")
            .range(offset, offset + 499)
        )
        batch = list(q.execute().data or [])
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < 500:
            break
        offset += 500
    return rows


def by_subj(pairs):
    return dict(sorted(Counter(s for s, _ in pairs).items()))


def main() -> int:
    from quality_gate.schemas import parse_quality_gate_json
    from quality_gate.supabase_io import get_supabase

    rows = fetch_esat_rows(get_supabase())
    not_reviewed = [r for r in rows if not r.get("quality_gate_assessed_at")]
    reviewed = [r for r in rows if r.get("quality_gate_assessed_at")]
    by_action = Counter(r.get("quality_gate_action") or "unknown" for r in reviewed)

    borderline_only_hr = []
    borderline_only_approved = []
    borderline_any_hr = []

    for r in reviewed:
        p = _parse_payload(r.get("quality_gate_payload"))
        try:
            res = parse_quality_gate_json(p)
        except Exception:
            continue
        subj = r.get("subjects") or "Unknown"
        action = r.get("quality_gate_action")
        if res.curriculum_match == "borderline":
            if action == "human_review":
                borderline_any_hr.append((subj, r))
            if is_borderline_only(res, p, r):
                if action == "human_review":
                    borderline_only_hr.append((subj, r))
                elif action == "approve":
                    borderline_only_approved.append((subj, r))

    out = {
        "total_esat_pool": len(rows),
        "not_reviewed_unassessed": len(not_reviewed),
        "reviewed_assessed": len(reviewed),
        "reviewed_by_action": dict(by_action),
        "human_review_remaining": by_action.get("human_review", 0),
        "borderline_curriculum_human_review_any_blockers": {
            "total": len(borderline_any_hr),
            "by_subject": by_subj(borderline_any_hr),
        },
        "borderline_only_curriculum_human_review": {
            "total": len(borderline_only_hr),
            "by_subject": by_subj(borderline_only_hr),
        },
        "borderline_only_curriculum_already_approved": {
            "total": len(borderline_only_approved),
            "by_subject": by_subj(borderline_only_approved),
        },
    }

    report_path = _BASE / "quality_gate" / "review_borderline_counts.json"
    report_path.write_text(json.dumps(out, indent=2), encoding="utf-8")

    print("=== ESAT review status (excludes TMUA, excludes deleted) ===")
    print(f"Total pool: {out['total_esat_pool']}")
    print(f"NOT reviewed (never quality-gate assessed): {out['not_reviewed_unassessed']}")
    print(f"Reviewed (assessed at least once): {out['reviewed_assessed']}")
    print()
    print("Reviewed breakdown by action:", out["reviewed_by_action"])
    print()
    print(f"human_review still pending: {out['human_review_remaining']}")
    print()
    b = out["borderline_only_curriculum_human_review"]
    print(f"Reviewed + ONLY borderline curriculum + still human_review: {b['total']}")
    for s, n in b["by_subject"].items():
        print(f"  {s}: {n}")
    print()
    ba = out["borderline_curriculum_human_review_any_blockers"]
    print(f"Reviewed + borderline curriculum + human_review (may have other blockers): {ba['total']}")
    for s, n in ba["by_subject"].items():
        print(f"  {s}: {n}")
    print(f"\nReport: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
