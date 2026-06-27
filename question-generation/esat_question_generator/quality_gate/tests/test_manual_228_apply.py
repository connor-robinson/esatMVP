"""Tests for ESAT 228 manual curriculum decision apply."""

from __future__ import annotations

import json
import unittest
from copy import deepcopy
from pathlib import Path
from unittest.mock import MagicMock, patch

from quality_gate.manual_curriculum_apply import (
    EXPECTED_INVALID_QUESTION,
    EXPECTED_KEEP,
    EXPECTED_OUT_OF_SYLLABUS,
    EXPECTED_REJECT,
    EXPECTED_TOTAL,
    MANUAL_AUDIT_VERSION,
    analyze_decision,
    build_manual_patch,
    has_newer_blocker_for_keep,
    load_manual_decisions,
    normalize_stem,
)

_REPO = Path(__file__).resolve().parents[4]
MANUAL_FILE = _REPO / "data" / "manual_overrides" / "esat_228_manual_keep_reject.json"


def _base_row(**overrides):
    row = {
        "id": "003005bb-cf4c-4e12-b467-86a703044fed",
        "schema_id": "M_test",
        "subjects": "Math 2",
        "primary_tag": "M2-MM5",
        "test_type": "ESAT",
        "status": "pending",
        "question_stem": "What is the value of the sum$$\\sum_{n=1}^{63} \\log_4 \\left( 1 + \\frac{1}{n} \\right)$$",
        "quality_gate_verdict": "Pass",
        "quality_gate_action": "human_review",
        "quality_gate_assessed_at": "2026-01-01T00:00:00Z",
        "quality_gate_payload": {
            "verdict": "Pass",
            "reasoning": "ok",
            "scores": {"syllabus_fit": 5, "solution_quality": 4, "esat_realism_pacing": 4},
            "recommended_action": "approve",
            "effective_recommended_action": "human_review",
            "curriculum_validation": {
                "curriculum_match": "in_syllabus",
                "curriculum_validation_status": "valid",
                "curriculum_validator_version": "v2_borderline_reassessment",
                "syllabus_fit_score": 5,
                "confidence": "high",
            },
            "formatting_validation": {
                "formatting_score": 4,
                "formatting_issues": [],
                "apply_fix": False,
            },
            "answer_key_validation": {
                "stored_option": "B",
                "true_option": "B",
                "was_wrong": False,
                "apply_fix": False,
            },
            "review_disposition": {"outcome": "keep", "labels": [], "notes": ""},
            "auto_fix_triage": {
                "auto_fixable_issues": [],
                "human_blocking_issues": [],
            },
        },
    }
    row.update(overrides)
    return row


class TestManualFileValidation(unittest.TestCase):
    @unittest.skipUnless(MANUAL_FILE.is_file(), "manual file not present")
    def test_load_228_decisions(self) -> None:
        _, by_id, checksum = load_manual_decisions(MANUAL_FILE)
        self.assertEqual(len(by_id), EXPECTED_TOTAL)
        self.assertEqual(len(by_id), len(set(by_id)))
        self.assertEqual(sum(1 for d in by_id.values() if d["decision"] == "keep"), EXPECTED_KEEP)
        self.assertEqual(sum(1 for d in by_id.values() if d["decision"] == "reject"), EXPECTED_REJECT)
        self.assertEqual(
            sum(1 for d in by_id.values() if d["decision_category"] == "out_of_syllabus"),
            EXPECTED_OUT_OF_SYLLABUS,
        )
        self.assertEqual(
            sum(1 for d in by_id.values() if d["decision_category"] == "invalid_question"),
            EXPECTED_INVALID_QUESTION,
        )
        self.assertEqual(len(checksum), 64)


class TestDecisionMapping(unittest.TestCase):
    def test_keep_maps_to_approve(self) -> None:
        decision = {
            "id": "003005bb-cf4c-4e12-b467-86a703044fed",
            "decision": "keep",
            "decision_category": "in_syllabus",
            "recommended_action": "approve",
            "reason": "ok",
            "manual_confidence": "high",
            "subject": "Math 2",
            "primary_tag": "M2-MM5",
            "question_stem": _base_row()["question_stem"],
        }
        built = build_manual_patch(_base_row(), decision, source_file="x.json", source_checksum="abc")
        self.assertEqual(built["bucket"], "would_approve")
        self.assertEqual(built["patch"]["quality_gate_action"], "approve")
        self.assertEqual(built["patch"]["status"], "approved")
        cv = built["patch"]["quality_gate_payload"]["curriculum_validation"]
        self.assertEqual(cv["curriculum_match"], "in_syllabus")
        self.assertEqual(cv["curriculum_validator_version"], "v2_borderline_reassessment")

    def test_out_of_syllabus_maps_to_regenerate(self) -> None:
        decision = {
            "id": "003005bb-cf4c-4e12-b467-86a703044fed",
            "decision": "reject",
            "decision_category": "out_of_syllabus",
            "recommended_action": "regenerate",
            "reason": "bad",
            "manual_confidence": "high",
            "subject": "Math 2",
            "primary_tag": "M2-MM5",
            "question_stem": _base_row()["question_stem"],
        }
        built = build_manual_patch(_base_row(), decision, source_file="x.json", source_checksum="abc")
        self.assertEqual(built["bucket"], "would_regenerate_out_of_syllabus")
        self.assertEqual(built["patch"]["quality_gate_action"], "regenerate")
        self.assertNotEqual(built["patch"]["status"], "approved")

    def test_invalid_question_maps_with_label(self) -> None:
        decision = {
            "id": "003005bb-cf4c-4e12-b467-86a703044fed",
            "decision": "reject",
            "decision_category": "invalid_question",
            "recommended_action": "regenerate",
            "reason": "underdetermined",
            "manual_confidence": "high",
            "subject": "Math 2",
            "primary_tag": "M2-MM5",
            "question_stem": _base_row()["question_stem"],
        }
        built = build_manual_patch(_base_row(), decision, source_file="x.json", source_checksum="abc")
        labels = built["patch"]["quality_gate_payload"]["review_disposition"]["labels"]
        self.assertIn("manual_invalid_question", labels)
        self.assertEqual(built["patch"]["quality_gate_action"], "regenerate")


class TestSafetyAndIdempotency(unittest.TestCase):
    def test_content_mismatch_not_applied(self) -> None:
        decision = {
            "id": "003005bb-cf4c-4e12-b467-86a703044fed",
            "decision": "keep",
            "decision_category": "in_syllabus",
            "recommended_action": "approve",
            "reason": "ok",
            "manual_confidence": "high",
            "subject": "Math 2",
            "primary_tag": "M2-MM5",
            "question_stem": "different stem",
        }
        bucket, reasons, built = analyze_decision(_base_row(), decision)
        self.assertEqual(bucket, "manual_override_content_mismatch")
        self.assertIsNone(built)
        self.assertTrue(reasons)

    def test_newer_blocker_prevents_keep(self) -> None:
        row = _base_row()
        row["quality_gate_payload"]["answer_key_validation"]["was_wrong"] = True
        blockers = has_newer_blocker_for_keep(row)
        self.assertIn("unresolved_wrong_answer_key", blockers)

    def test_audit_appended_not_overwritten(self) -> None:
        row = _base_row()
        decision = {
            "id": row["id"],
            "decision": "keep",
            "decision_category": "in_syllabus",
            "recommended_action": "approve",
            "reason": "ok",
            "manual_confidence": "high",
            "subject": "Math 2",
            "primary_tag": "M2-MM5",
            "question_stem": row["question_stem"],
        }
        built1 = build_manual_patch(row, decision, source_file="x.json", source_checksum="abc")
        payload = built1["patch"]["quality_gate_payload"]
        row2 = _base_row(quality_gate_payload=deepcopy(payload))
        row2["quality_gate_payload"]["manual_audit_version"] = MANUAL_AUDIT_VERSION
        bucket, _, built2 = analyze_decision(row2, decision)
        self.assertEqual(bucket, "already_applied")
        self.assertIsNone(built2)

    def test_zero_llm_calls_in_script(self) -> None:
        with patch("quality_gate.supabase_io.get_supabase") as mock_sb:
            mock_client = MagicMock()
            mock_sb.return_value = mock_client
            mock_client.table.return_value.select.return_value.in_.return_value.execute.return_value = MagicMock(
                data=[_base_row()]
            )
            from scripts.apply_esat_228_manual_decisions import run

            with patch("quality_gate.manual_curriculum_apply.load_manual_decisions") as mock_load:
                decision = {
                    "id": _base_row()["id"],
                    "decision": "keep",
                    "decision_category": "in_syllabus",
                    "recommended_action": "approve",
                    "reason": "ok",
                    "manual_confidence": "high",
                    "subject": "Math 2",
                    "primary_tag": "M2-MM5",
                    "question_stem": _base_row()["question_stem"],
                }
                mock_load.return_value = ({}, {decision["id"]: decision}, "checksum")
                with patch("quality_gate.manual_curriculum_apply.fetch_rows_by_ids", return_value={decision["id"]: _base_row()}):
                    code = run(
                        manual_path=MANUAL_FILE,
                        dry_run=True,
                        question_id=decision["id"],
                        limit=0,
                        batch_size=1,
                        force=False,
                        report_path=None,
                    )
            self.assertEqual(code, 0)
            mock_client.table.return_value.update.assert_not_called()


class TestStemNormalization(unittest.TestCase):
    def test_whitespace_normalization(self) -> None:
        a = normalize_stem("hello   world\n")
        b = normalize_stem("hello world")
        self.assertEqual(a, b)


if __name__ == "__main__":
    unittest.main()
