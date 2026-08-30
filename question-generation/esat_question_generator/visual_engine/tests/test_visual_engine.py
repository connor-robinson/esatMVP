"""Unit tests for visual_engine."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from visual_engine import DiagramLayoutError, VisualSpecError, parse_spec, render_diagram
from visual_engine.collision.geometry import segment_intersects_rect
from visual_engine.schema import SPEC_VERSION
from visual_engine.text_format import format_label_text

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"
OUTPUT_DIR = Path(__file__).resolve().parent / "output"


def _load_fixture(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text(encoding="utf-8"))


@pytest.fixture(scope="session", autouse=True)
def _ensure_output_dir():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


class TestTextFormat:
    def test_math_label_wraps_mathtext(self):
        assert format_label_text("y=x^2", math=True) == "$y=x^2$"

    def test_latex_inline_delimiters(self):
        assert format_label_text(r"\(y=x^2\)", math=False) == "$y=x^2$"

    def test_auto_detects_math_hints(self):
        assert format_label_text("x^2").startswith("$")


class TestSchema:
    def test_parse_triangle_fixture(self):
        spec = parse_spec(_load_fixture("labelled_triangle.json"))
        assert spec.diagram_type == "geometry"
        assert len(spec.objects) == 3
        assert len(spec.labels) == 4

    def test_rejects_invalid_polygon(self):
        with pytest.raises(VisualSpecError):
            parse_spec({"objects": [{"type": "polygon", "points": [[0, 0], [1, 1]]}]})

    def test_rejects_unknown_object_type(self):
        with pytest.raises(VisualSpecError):
            parse_spec({"objects": [{"type": "cloud", "points": [[0, 0], [1, 1], [0, 1]]}]})


class TestGeometryHelpers:
    def test_segment_intersects_rect(self):
        rect = (1.0, 1.0, 3.0, 3.0)
        assert segment_intersects_rect(2.0, 0.0, 2.0, 4.0, rect)
        assert not segment_intersects_rect(5.0, 5.0, 6.0, 6.0, rect)


class TestRenderer:
    @pytest.mark.parametrize(
        "fixture_name,output_name",
        [
            ("labelled_triangle.json", "01_labelled_triangle.png"),
            ("circle_tangent.json", "02_circle_tangent.png"),
            ("polygon_angle_arcs.json", "03_polygon_angle_arcs.png"),
            ("simple_graph.json", "04_simple_graph.png"),
            ("dimensioned_shape.json", "05_dimensioned_shape.png"),
        ],
    )
    def test_render_fixture(self, fixture_name, output_name):
        spec = _load_fixture(fixture_name)
        out = OUTPUT_DIR / output_name
        result = render_diagram(spec, out)
        assert result.path.exists()
        assert result.path.stat().st_size > 500
        assert result.dpi == 220
        assert result.renderer == "matplotlib_diagram_v1"
        assert result.label_placements is not None
        assert len(result.label_placements) == len(spec["labels"]) + sum(
            1 for a in spec.get("annotations", []) if str(a.get("type")).lower() == "caption"
        ) + (2 if any(o.get("type") == "axes" for o in spec.get("objects", [])) else 0)

    def test_render_fails_on_impossible_label_layout(self):
        spec = {
            "spec_version": SPEC_VERSION,
            "needs_diagram": True,
            "diagram_type": "geometry",
            "coordinate_system": {"x_min": 0, "x_max": 2, "y_min": 0, "y_max": 2},
            "objects": [
                {"type": "line", "start": [0, 1], "end": [2, 1]},
            ],
            "labels": [
                {"id": "a", "text": "AAAAAA", "anchor": [1, 1], "preferred_position": "center"},
                {"id": "b", "text": "BBBBBB", "anchor": [1, 1], "preferred_position": "center"},
                {"id": "c", "text": "CCCCCC", "anchor": [1, 1], "preferred_position": "center"},
            ],
        }
        with pytest.raises(DiagramLayoutError):
            render_diagram(spec, OUTPUT_DIR / "fail_collision.png")

    def test_png_is_220_dpi(self):
        out = OUTPUT_DIR / "dpi_check.png"
        render_diagram(_load_fixture("labelled_triangle.json"), out)
        # PNG pHYs chunk encodes pixels per meter; 220 dpi ≈ 8661 px/m
        data = out.read_bytes()
        assert data[:8] == b"\x89PNG\r\n\x1a\n"
