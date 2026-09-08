"""Tests for NSAA sibling/far diagram question generation."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest

from visual_engine.errors import VisualSpecError
from visual_engine.nsaa_batch import already_generated_ids, nsaa_question_id, regenerate_nsaa_question
from visual_engine.objects.graph import _eval_expr
from visual_engine.question_designer import (
    NSAA_DIAGRAM_MODEL,
    NsaaQuestionDesignerInput,
    build_question_payload,
    parse_question_design,
)
from visual_engine.review_store import ReviewStore


def _valid_design(**overrides):
    payload = {
        "skip": False,
        "variation_mode": "sibling",
        "mode_reason": "same similar-triangles skill with new lengths",
        "difficulty": "Medium",
        "needs_diagram": True,
        "stem": "In the diagram, triangle ABC is right-angled at C. Find AB.",
        "options": {"A": "3", "B": "4", "C": "5", "D": "6", "E": "7"},
        "correct_option": "C",
        "explanation": "Use Pythagoras.",
        "idea_plan": {
            "diagram_type": "geometry",
            "visual_brief": "Right triangle ABC with AC=3, BC=4, right angle at C.",
            "what_must_be_shown": ["triangle ABC", "right angle at C"],
            "what_must_not_reveal": "do not label AB",
        },
    }
    payload.update(overrides)
    return payload


def test_diagram_model_is_gemini_37_flash():
    assert NSAA_DIAGRAM_MODEL == "gemini-3.7-flash"


def test_parse_question_design_accepts_sibling():
    design = parse_question_design(_valid_design())
    assert design.skip is False
    assert design.variation_mode == "sibling"
    assert design.correct_option == "C"
    assert design.options["C"] == "5"


def test_parse_question_design_maps_generalisation_to_far():
    design = parse_question_design(_valid_design(variation_mode="generalisation"))
    assert design.variation_mode == "far"


def test_parse_question_design_skip_does_not_require_stem():
    design = parse_question_design({"skip": True, "skip_reason": "circuit diagram"})
    assert design.skip is True
    assert "circuit" in design.skip_reason


def test_parse_question_design_rejects_text_only():
    with pytest.raises(VisualSpecError):
        parse_question_design(_valid_design(needs_diagram=False))


def test_parse_question_design_rejects_missing_visual_brief():
    with pytest.raises(VisualSpecError):
        parse_question_design(_valid_design(idea_plan={"diagram_type": "geometry", "visual_brief": ""}))


def test_question_payload_includes_original_nsaa_text():
    payload = build_question_payload(
        NsaaQuestionDesignerInput(
            source_question_id="2307",
            reference_question="Triangle ABC is isosceles.",
            reference_options={"A": "1", "B": "2"},
            exam_year=2019,
            paper_name="Mathematics",
            question_number=4,
        )
    )
    assert payload["exam"] == "NSAA"
    assert payload["original_stem"] == "Triangle ABC is isosceles."
    assert payload["original_options"]["A"] == "1"
    assert "sibling or far" in payload["instructions"]


@patch("visual_engine.eval.question_selector.load_place_candidates")
def test_select_nsaa_keeps_math_and_drops_biology_and_engaa(mock_load):
    def fake_load(*, exam_name=None, question_id=None, limit=None, paper_id=None):
        if exam_name == "NSAA":
            return [
                {
                    "questionId": 101,
                    "examName": "NSAA",
                    "examYear": 2019,
                    "paperName": "Mathematics",
                    "questionNumber": 1,
                    "questionStem": "In triangle ABC, angle A is 30 degrees.",
                    "diagramAssets": [{"id": "d1", "url": "https://example.com/nsaa.png"}],
                    "sourceImageUrl": "https://example.com/q.png",
                },
                {
                    "questionId": 102,
                    "examName": "NSAA",
                    "examYear": 2019,
                    "paperName": "Biology",
                    "questionNumber": 2,
                    "questionStem": "In triangle ABC, angle A is 30 degrees.",
                    "diagramAssets": [{"id": "d1", "url": "https://example.com/bio.png"}],
                    "sourceImageUrl": "https://example.com/q.png",
                },
            ]
        return [
            {
                "questionId": 201,
                "examName": "ENGAA",
                "examYear": 2018,
                "paperName": "Section 1",
                "questionNumber": 3,
                "questionStem": "In triangle ABC, angle A is 30 degrees.",
                "diagramAssets": [{"id": "d1", "url": "https://example.com/engaa.png"}],
                "sourceImageUrl": "https://example.com/q.png",
            }
        ]

    mock_load.side_effect = fake_load
    from visual_engine.eval.question_selector import select_nsaa_diagram_questions

    selected = select_nsaa_diagram_questions(count=20)
    ids = [eq.question_id for eq in selected]
    assert ids == [101]
    assert all(eq.exam_name == "NSAA" for eq in selected)


def test_review_store_nsaa_pipeline_and_variation_mode(tmp_path: Path):
    store = ReviewStore(tmp_path / "review.db")
    store.upsert_question(
        question_id="nsaa-101",
        subject="NSAA",
        topic="far",
        variation_mode="far",
        stem="New stem",
        choices={"A": "1", "B": "2", "C": "3", "D": "4"},
        correct_answer="B",
        source={"pipeline": "nsaa", "source_question_id": 101},
        diagram_required=True,
        question_status="pending",
    )
    store.add_diagram_attempt(question_id="nsaa-101", attempt=1, image_path="x.png")
    item = store.get_item("nsaa-101")
    assert item["variation_mode"] == "far"
    nsaa_items = store.list_items(status_filter="pending", pipeline="nsaa")
    assert len(nsaa_items) == 1
    assert already_generated_ids(store) == {101}
    other = store.list_items(status_filter="all", pipeline="other")
    assert other == []


def test_nsaa_question_id():
    assert nsaa_question_id(2307) == "nsaa-2307"


def test_regenerate_rejects_non_nsaa(tmp_path: Path):
    store = ReviewStore(tmp_path / "review.db")
    with pytest.raises(ValueError, match="NSAA-sourced"):
        regenerate_nsaa_question(store, {"question_id": "x", "source_json": "{}"})


def test_graph_expr_accepts_math_module_prefix():
    assert _eval_expr("math.sin(x)", 0.0) == pytest.approx(0.0)
    assert _eval_expr("sin(x)", 0.0) == pytest.approx(0.0)
    assert _eval_expr("x**2", 3.0) == pytest.approx(9.0)
