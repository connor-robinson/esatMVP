"""Tests for multi-issue auto-fix triage and post-fix approve logic."""

from __future__ import annotations

import unittest

from quality_gate.schemas import (
    QualityGateResult,
    apply_post_auto_fix_action,
    effective_action,
    parse_quality_gate_json,
    resolve_action_after_auto_fix,
)


def _base_payload(**overrides):
    data = {
        "verdict": "Pass",
        "scores": {"syllabus_fit": 4, "solution_quality": 4, "esat_realism_pacing": 4},
        "recommended_action": "human_review",
        "reasoning": "Cosmetic formatting only.",
        "confidence": "high",
        "calibration_tier": None,
        "calibration_notes": None,
        "graph_enrichment": {
            "mode": "none",
            "is_candidate": False,
            "suggested_stem_edits": "",
            "insertion_placeholders": [],
            "notes_for_human": "",
        },
        "curriculum_validation": {
            "syllabus_fit_score": 4,
            "curriculum_match": "in_syllabus",
            "required_topic_codes": ["M1-M1"],
            "suspicious_topics": [],
            "curriculum_reason": "ok",
            "curriculum_flags": [],
        },
        "formatting_validation": {
            "formatting_score": 3,
            "formatting_issues": ["excessive blank lines"],
            "apply_fix": True,
            "formatting_reason": "Collapse spurious breaks.",
        },
        "answer_key_validation": {
            "stored_option": "A",
            "true_option": "A",
            "was_wrong": False,
            "apply_fix": False,
            "reason": "ok",
        },
        "review_disposition": {
            "outcome": "edit",
            "labels": ["formatting"],
            "notes": "Line breaks only.",
        },
        "auto_fix_triage": {
            "auto_fixable_issues": ["excessive blank lines"],
            "human_blocking_issues": [],
            "recommended_action_after_auto_fix": "approve",
            "reason": "Only whitespace.",
        },
    }
    data.update(overrides)
    return data


class TestAutoFixTriage(unittest.TestCase):
    def test_parse_auto_fix_triage(self) -> None:
        result = parse_quality_gate_json(_base_payload())
        self.assertEqual(result.action_after_auto_fix, "approve")
        self.assertEqual(result.auto_fixable_issues, ["excessive blank lines"])
        self.assertEqual(result.human_blocking_issues, [])

    def test_approve_after_formatting_fix_only(self) -> None:
        result = parse_quality_gate_json(_base_payload())
        eff = effective_action(
            result,
            auto_fixes_planned=True,
            formatting_will_fix=True,
        )
        self.assertEqual(eff, "approve")

    def test_human_review_when_blocking_after_fix(self) -> None:
        data = _base_payload(
            auto_fix_triage={
                "auto_fixable_issues": ["excessive blank lines"],
                "human_blocking_issues": ["borderline syllabus fit"],
                "recommended_action_after_auto_fix": "human_review",
                "reason": "Curriculum still borderline.",
            },
            curriculum_validation={
                "syllabus_fit_score": 3,
                "curriculum_match": "borderline",
                "required_topic_codes": ["M1-M4"],
                "suspicious_topics": [],
                "curriculum_reason": "Edge case.",
                "curriculum_flags": [],
            },
        )
        result = parse_quality_gate_json(data)
        eff = effective_action(
            result,
            auto_fixes_planned=True,
            formatting_will_fix=True,
        )
        self.assertEqual(eff, "human_review")

    def test_infer_approve_when_triage_omitted(self) -> None:
        data = _base_payload()
        del data["auto_fix_triage"]
        result = parse_quality_gate_json(data)
        after = resolve_action_after_auto_fix(
            result, formatting_will_fix=True, answer_key_will_fix=False
        )
        self.assertEqual(after, "approve")

    def test_apply_post_auto_fix_never_approves_off_syllabus(self) -> None:
        result = parse_quality_gate_json(
            _base_payload(
                curriculum_validation={
                    "syllabus_fit_score": 2,
                    "curriculum_match": "off_syllabus",
                    "required_topic_codes": [],
                    "suspicious_topics": ["calculus"],
                    "curriculum_reason": "bad",
                    "curriculum_flags": [],
                },
                auto_fix_triage={
                    "auto_fixable_issues": ["formatting"],
                    "human_blocking_issues": [],
                    "recommended_action_after_auto_fix": "approve",
                    "reason": "wrong",
                },
            )
        )
        out = apply_post_auto_fix_action(
            "human_review",
            result,
            auto_fixes_planned=True,
            formatting_will_fix=True,
        )
        self.assertEqual(out, "human_review")


    def test_deterministic_conflict_blocks_auto_delete(self) -> None:
        result = parse_quality_gate_json(
            _base_payload(
                recommended_action="delete",
                review_disposition={
                    "outcome": "edit",
                    "labels": ["deterministic_conflict"],
                    "notes": "Precheck over-triggered.",
                },
            )
        )
        eff = effective_action(result)
        self.assertEqual(eff, "human_review")


if __name__ == "__main__":
    unittest.main()
