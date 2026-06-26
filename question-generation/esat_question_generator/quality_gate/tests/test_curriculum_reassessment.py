"""Tests for ESAT curriculum-only reassessment eligibility and actions."""

from __future__ import annotations

import json
import unittest
from copy import deepcopy
from unittest.mock import MagicMock, patch

from quality_gate.curriculum_reassessment.actions import action_from_reassessment
from quality_gate.curriculum_reassessment.assess import build_curriculum_reassessment_payload
from quality_gate.curriculum_reassessment.audit import append_payload_audit_fallback
from quality_gate.curriculum_reassessment.constants import REASSESS_VERSION
from quality_gate.curriculum_reassessment.eligibility import is_curriculum_only_review_candidate
from quality_gate.curriculum_reassessment.esat_cohort import is_confirmed_esat
from quality_gate.schemas import QualityGateResult, parse_quality_gate_json


def _full_pass_payload(**overrides):
    data = {
        "verdict": "Pass",
        "scores": {"syllabus_fit": 4, "solution_quality": 3, "esat_realism_pacing": 3},
        "recommended_action": "approve",
        "reasoning": "ok",
        "confidence": "high",
        "graph_enrichment": {"mode": "none", "is_candidate": False},
        "curriculum_validation": {
            "syllabus_fit_score": 3,
            "curriculum_match": "borderline",
            "curriculum_validation_status": "valid",
            "required_topic_codes": ["M2-MM1"],
            "suspicious_topics": [],
            "curriculum_reason": "uncertain depth",
            "curriculum_flags": [],
        },
        "formatting_validation": {
            "formatting_score": 4,
            "formatting_issues": [],
            "apply_fix": False,
            "formatting_reason": "",
        },
        "answer_key_validation": {
            "stored_option": "B",
            "true_option": "B",
            "was_wrong": False,
            "apply_fix": False,
            "reason": "ok",
        },
        "review_disposition": {"outcome": "keep", "labels": [], "notes": ""},
        "auto_fix_triage": {
            "auto_fixable_issues": [],
            "human_blocking_issues": [],
            "recommended_action_after_auto_fix": "approve",
            "reason": "",
        },
    }
    data.update(overrides)
    return data


def _row(payload=None, **overrides):
    pl = payload if payload is not None else _full_pass_payload()
    row = {
        "id": "00000000-0000-4000-8000-000000000001",
        "schema_id": "M_03af253d",
        "subjects": "Math 2",
        "test_type": "ESAT",
        "status": "pending_review",
        "question_stem": "What is 2+2?",
        "options": {"A": "3", "B": "4"},
        "correct_option": "B",
        "solution_reasoning": "Basic arithmetic.",
        "quality_gate_verdict": "Pass",
        "quality_gate_action": "human_review",
        "quality_gate_assessed_at": "2026-01-01T00:00:00Z",
        "quality_gate_payload": pl,
    }
    row.update(overrides)
    return row


class TestEligibilityScores(unittest.TestCase):
    def test_score_2_blocks_eligibility(self) -> None:
        pl = _full_pass_payload(
            scores={"syllabus_fit": 4, "solution_quality": 2, "esat_realism_pacing": 4}
        )
        ok, bucket, reasons = is_curriculum_only_review_candidate(_row(pl))
        self.assertFalse(ok)
        self.assertEqual(bucket, "skipped_other_blocking")
        self.assertTrue(any("solution_quality=2" in r for r in reasons))

    def test_score_3_does_not_block_eligibility(self) -> None:
        pl = _full_pass_payload(
            scores={"syllabus_fit": 4, "solution_quality": 3, "esat_realism_pacing": 3}
        )
        ok, bucket, _ = is_curriculum_only_review_candidate(_row(pl))
        self.assertTrue(ok)
        self.assertEqual(bucket, "eligible_genuine_borderline")

    def test_missing_score_fails_closed(self) -> None:
        pl = _full_pass_payload()
        del pl["scores"]["solution_quality"]
        ok, bucket, reasons = is_curriculum_only_review_candidate(_row(pl))
        self.assertFalse(ok)
        self.assertEqual(bucket, "skipped_missing_required_validation")
        self.assertTrue(any("missing scores.solution_quality" in r for r in reasons))


class TestAnswerKeyAndFormatting(unittest.TestCase):
    def test_fixed_answer_key_does_not_block(self) -> None:
        pl = _full_pass_payload(
            answer_key_validation={
                "stored_option": "A",
                "true_option": "B",
                "was_wrong": True,
                "apply_fix": True,
                "reason": "fixed",
            },
            review_disposition={
                "outcome": "keep",
                "labels": ["wrong_answer_key_fixed"],
                "notes": "",
            },
        )
        ok, bucket, _ = is_curriculum_only_review_candidate(_row(pl))
        self.assertTrue(ok)
        self.assertEqual(bucket, "eligible_genuine_borderline")

    def test_unresolved_answer_key_blocks(self) -> None:
        pl = _full_pass_payload(
            answer_key_validation={
                "stored_option": "A",
                "true_option": "B",
                "was_wrong": True,
                "apply_fix": False,
                "reason": "wrong",
            },
            review_disposition={
                "outcome": "edit",
                "labels": ["wrong_answer_key"],
                "notes": "",
            },
            recommended_action="human_review",
        )
        ok, bucket, reasons = is_curriculum_only_review_candidate(_row(pl))
        self.assertFalse(ok)
        self.assertIn(bucket, ("skipped_other_blocking", "skipped_missing_required_validation"))
        self.assertTrue(
            any("unresolved_wrong_answer_key" in r or "disposition_outcome" in r for r in reasons)
        )


class TestHumanBlocking(unittest.TestCase):
    def test_structured_curriculum_only_code_allowed(self) -> None:
        pl = _full_pass_payload(
            auto_fix_triage={
                "auto_fixable_issues": [],
                "human_blocking_issues": ["curriculum_borderline"],
                "recommended_action_after_auto_fix": "human_review",
                "reason": "",
            }
        )
        ok, bucket, _ = is_curriculum_only_review_candidate(_row(pl))
        self.assertTrue(ok)
        self.assertEqual(bucket, "eligible_genuine_borderline")

    def test_unstructured_ambiguous_blocker_fails_closed(self) -> None:
        pl = _full_pass_payload(
            auto_fix_triage={
                "auto_fixable_issues": [],
                "human_blocking_issues": ["needs a second look at wording"],
                "recommended_action_after_auto_fix": "human_review",
                "reason": "",
            }
        )
        ok, bucket, _ = is_curriculum_only_review_candidate(_row(pl))
        self.assertFalse(ok)
        self.assertEqual(bucket, "skipped_ambiguous_blocking_issue")


class TestBlindPayload(unittest.TestCase):
    def test_payload_excludes_prior_curriculum(self) -> None:
        row = _row()
        payload = build_curriculum_reassessment_payload(row)
        blob = json.dumps(payload).lower()
        self.assertNotIn("prior_curriculum", blob)
        self.assertNotIn("reassessment_context", blob)
        self.assertNotIn("false positive", blob)
        self.assertNotIn("borderline", blob)
        self.assertIn("curriculum_snapshot", payload)
        self.assertIn("math1_assumed_knowledge_rules", payload)


class TestPostReassessmentActions(unittest.TestCase):
    def _base_result(self) -> QualityGateResult:
        return parse_quality_gate_json(_full_pass_payload())

    def test_in_syllabus_high_approves(self) -> None:
        act = action_from_reassessment(
            curriculum_match="in_syllabus",
            confidence="high",
            base_result=self._base_result(),
            row={"subjects": "Math 2"},
        )
        self.assertEqual(act, "approve")

    def test_in_syllabus_medium_stays_human_review(self) -> None:
        act = action_from_reassessment(
            curriculum_match="in_syllabus",
            confidence="medium",
            base_result=self._base_result(),
            row={"subjects": "Math 2"},
        )
        self.assertEqual(act, "human_review")

    def test_borderline_always_human_review(self) -> None:
        act = action_from_reassessment(
            curriculum_match="borderline",
            confidence="high",
            base_result=self._base_result(),
            row={"subjects": "Math 2"},
        )
        self.assertEqual(act, "human_review")

    def test_out_of_syllabus_high_triggers_destructive(self) -> None:
        act = action_from_reassessment(
            curriculum_match="out_of_syllabus",
            confidence="high",
            base_result=self._base_result(),
            row={"subjects": "Math 2"},
        )
        self.assertIn(act, ("regenerate", "move_to_math2", "human_review"))

    def test_out_of_syllabus_low_stays_human_review(self) -> None:
        act = action_from_reassessment(
            curriculum_match="out_of_syllabus",
            confidence="low",
            base_result=self._base_result(),
            row={"subjects": "Math 2"},
        )
        self.assertEqual(act, "human_review")


class TestIdempotencyAndAudit(unittest.TestCase):
    def test_already_reassessed_skipped(self) -> None:
        pl = _full_pass_payload()
        pl["curriculum_validation"]["curriculum_validator_version"] = REASSESS_VERSION
        ok, bucket, _ = is_curriculum_only_review_candidate(_row(pl))
        self.assertFalse(ok)
        self.assertEqual(bucket, "skipped_already_reassessed")

    def test_audit_appended_not_overwritten(self) -> None:
        payload = {"curriculum_reassessment_audits": [{"id": "a"}]}
        out = append_payload_audit_fallback(payload, {"id": "b"})
        self.assertEqual(len(out["curriculum_reassessment_audits"]), 2)
        self.assertEqual(out["curriculum_reassessment_audits"][0]["id"], "a")


class TestEsatCohort(unittest.TestCase):
    def test_non_esat_null_test_type_excluded(self) -> None:
        row = _row(test_type=None, subjects="Unknown Subject", schema_id="")
        ok, reason = is_confirmed_esat(row)
        self.assertFalse(ok)
        self.assertIn("null test_type", reason)

    def test_null_test_type_with_esat_signals_included(self) -> None:
        row = _row(test_type=None)
        ok, _ = is_confirmed_esat(row)
        self.assertTrue(ok)

    def test_tmua_excluded(self) -> None:
        row = _row(test_type="TMUA", subjects="Math 2")
        ok, _ = is_confirmed_esat(row)
        self.assertFalse(ok)


class TestAuditTableInsert(unittest.TestCase):
    def test_insert_audit_record(self) -> None:
        from quality_gate.curriculum_reassessment.audit import insert_audit_record

        client = MagicMock()
        insert_audit_record(
            client,
            question_id="00000000-0000-4000-8000-000000000001",
            validator_version=REASSESS_VERSION,
            model="gemini-2.5-flash",
            eligibility_bucket="eligible_genuine_borderline",
            eligibility_reasons=["borderline is sole blocking issue"],
            prior_curriculum_validation={"curriculum_match": "borderline"},
            prior_effective_action="human_review",
            new_curriculum_validation={"curriculum_match": "in_syllabus"},
            new_effective_action="approve",
            raw_model_response='{"curriculum_match":"in_syllabus"}',
            run_id="test-run",
        )
        client.table.assert_called_once()
        client.table().insert.assert_called_once()


if __name__ == "__main__":
    unittest.main()
