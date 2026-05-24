"""Tests for answer-key reconciliation in quality gate."""

from __future__ import annotations

import unittest

from quality_gate.answer_key import build_answer_key_patch, build_answer_key_precheck
from quality_gate.schemas import _only_auto_fix_disposition, parse_quality_gate_json


class TestAnswerKey(unittest.TestCase):
    def test_precheck_detects_mismatch(self) -> None:
        row = {
            "correct_option": "A",
            "options": {"A": "1", "B": "2", "C": "3", "D": "4"},
            "distractor_map": {
                "B": "This is the correct answer, derived from the solution.",
                "A": "Wrong value.",
            },
            "solution_reasoning": "Therefore the correct answer is B.",
        }
        pre = build_answer_key_precheck(row)
        self.assertTrue(pre["mismatch_detected"])
        self.assertEqual(pre["inferred_option"], "B")

    def test_build_patch_fixes_letter(self) -> None:
        row = {
            "correct_option": "A",
            "options": {"A": "1", "B": "2"},
            "distractor_map": {
                "B": "This is the correct answer, derived from the solution.",
            },
            "solution_reasoning": "",
        }
        patch, reason = build_answer_key_patch(row)
        self.assertEqual(patch.get("correct_option"), "B")
        self.assertTrue(reason)

    def test_parse_disposition_and_answer_key(self) -> None:
        data = {
            "verdict": "Pass",
            "scores": {"syllabus_fit": 5, "solution_quality": 5, "esat_realism_pacing": 4},
            "recommended_action": "approve",
            "reasoning": "Only the keyed letter was wrong; item is sound.",
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
                "syllabus_fit_score": 5,
                "curriculum_match": "in_syllabus",
                "required_topic_codes": ["M1-M1"],
                "suspicious_topics": [],
                "curriculum_reason": "ok",
                "curriculum_flags": [],
            },
            "formatting_validation": {
                "formatting_score": 5,
                "formatting_issues": [],
                "apply_fix": False,
                "formatting_reason": "ok",
            },
            "answer_key_validation": {
                "stored_option": "A",
                "true_option": "B",
                "was_wrong": True,
                "apply_fix": True,
                "reason": "Solution says B.",
            },
            "review_disposition": {
                "outcome": "keep",
                "labels": ["wrong_answer_key_fixed"],
                "notes": "Auto-fix key only.",
            },
            "auto_fix_triage": {
                "auto_fixable_issues": ["wrong answer key"],
                "human_blocking_issues": [],
                "recommended_action_after_auto_fix": "approve",
                "reason": "Key only.",
            },
        }
        result = parse_quality_gate_json(data)
        self.assertTrue(result.answer_key_was_wrong)
        self.assertEqual(result.disposition_outcome, "keep")
        self.assertIn("wrong_answer_key_fixed", result.disposition_labels)
        self.assertTrue(_only_auto_fix_disposition(result.disposition_labels))


if __name__ == "__main__":
    unittest.main()
