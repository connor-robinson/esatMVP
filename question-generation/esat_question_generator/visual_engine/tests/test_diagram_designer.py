"""Tests for Diagram Designer (mocked + optional live)."""

from __future__ import annotations

import json
import os
from pathlib import Path
from unittest.mock import patch

import pytest

from visual_engine.diagram_designer import DiagramDesignerInput, build_user_payload, run_diagram_designer
from visual_engine.llm import MultimodalCallResult
from visual_engine.render_matplotlib import render_diagram

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"
OUTPUT = Path(__file__).resolve().parent / "output" / "designer"
REFERENCE_TEXT = (
    "A triangle has a horizontal base split by a vertical height. "
    "Find the ratio of the two base segments."
)


def _triangle_spec() -> dict:
    return json.loads((FIXTURES / "labelled_triangle.json").read_text(encoding="utf-8"))


def test_build_user_payload_includes_variation_mode():
    payload = build_user_payload(
        DiagramDesignerInput(
            reference_question="Q text",
            variation_mode="far",
            schema_block="schema",
        )
    )
    assert payload["variation_mode"] == "far"
    assert payload["reference_question"] == "Q text"


def test_run_diagram_designer_validates_mock_response(tmp_path):
    image_path = Path(__file__).resolve().parent / "output" / "01_labelled_triangle.png"
    if not image_path.exists():
        pytest.skip("reference render PNG missing")

    mock_spec = _triangle_spec()
    mock_spec["variation_mode"] = "sibling"
    mock_spec["source_question_id"] = "test_001"

    def _fake_call(**kwargs):
        return MultimodalCallResult(
            parsed=mock_spec,
            raw_text=json.dumps(mock_spec),
            model="mock-gemini",
            usage={},
        )

    inp = DiagramDesignerInput(
        reference_question=REFERENCE_TEXT,
        diagram_image_path=image_path,
        variation_mode="sibling",
        source_question_id="test_001",
    )
    with patch("visual_engine.diagram_designer.call_json_multimodal", side_effect=_fake_call):
        result = run_diagram_designer(inp)

    assert result.validated.diagram_type == "geometry"
    assert result.visual_spec["source_question_id"] == "test_001"
    out = tmp_path / "designed.png"
    render_diagram(result.visual_spec, out)
    assert out.exists()


@pytest.mark.skipif(
    os.environ.get("RUN_DIAGRAM_DESIGNER_LIVE") != "1",
    reason="Set RUN_DIAGRAM_DESIGNER_LIVE=1 to run live Gemini test",
)
def test_live_diagram_designer_smoke():
    image_path = Path(__file__).resolve().parent / "output" / "01_labelled_triangle.png"
    if not image_path.exists():
        pytest.skip("reference render PNG missing")

    inp = DiagramDesignerInput(
        reference_question=REFERENCE_TEXT,
        diagram_image_path=image_path,
        variation_mode="sibling",
        math_paper="Math 1",
        schema_block="Core move: use similar triangles from a height dropped to the base.",
        target_difficulty="Medium",
    )
    result = run_diagram_designer(inp, thinking_level="high")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    spec_path = OUTPUT / "live_visual_spec.json"
    png_path = OUTPUT / "live_diagram.png"
    spec_path.write_text(json.dumps(result.visual_spec, ensure_ascii=False, indent=2), encoding="utf-8")
    render_diagram(result.visual_spec, png_path)
    assert png_path.exists()
    assert result.validated.needs_diagram is True
