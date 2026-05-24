"""Tests for LLM JSON / verdict / action parse hardening."""

from __future__ import annotations

import unittest

from quality_gate.assess import extract_json_object
from quality_gate.schemas import parse_quality_gate_json


def _minimal_payload(**overrides):
    data = {
        "verdict": "Minor",
        "scores": {"syllabus_fit": 3, "solution_quality": 4, "esat_realism_pacing": 4},
        "recommended_action": "human_review",
        "reasoning": "Borderline item.",
        "confidence": "medium",
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
            "syllabus_fit_score": 3,
            "curriculum_match": "borderline",
            "required_topic_codes": ["M2-MM1"],
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
            "true_option": "A",
            "was_wrong": False,
            "apply_fix": False,
            "reason": "ok",
        },
        "review_disposition": {
            "outcome": "move_paper",
            "labels": ["wrong_paper"],
            "notes": "Belongs on Math 2.",
        },
        "auto_fix_triage": {
            "auto_fixable_issues": [],
            "human_blocking_issues": ["wrong paper"],
            "recommended_action_after_auto_fix": "move_to_math2",
            "reason": "Paper mismatch.",
        },
    }
    data.update(overrides)
    return data


class TestParseHardening(unittest.TestCase):
    def test_single_quoted_python_dict(self) -> None:
        raw = "{'verdict': 'Pass', 'recommended_action': 'approve', 'reasoning': 'ok', 'scores': {'syllabus_fit': 4, 'solution_quality': 4, 'esat_realism_pacing': 4}}"
        parsed = extract_json_object(raw)
        self.assertEqual(parsed["verdict"], "Pass")

    def test_action_from_move_paper_disposition_when_action_missing(self) -> None:
        result = parse_quality_gate_json(
            _minimal_payload(recommended_action=None, verdict=None)
        )
        self.assertEqual(result.recommended_action, "move_to_math2")
        self.assertEqual(result.verdict, "Major")

    def test_verdict_inferred_from_human_review_action(self) -> None:
        result = parse_quality_gate_json(
            _minimal_payload(
                verdict=None,
                recommended_action="human_review",
                review_disposition={"outcome": "edit", "labels": [], "notes": ""},
            )
        )
        self.assertEqual(result.verdict, "Minor")


if __name__ == "__main__":
    unittest.main()
