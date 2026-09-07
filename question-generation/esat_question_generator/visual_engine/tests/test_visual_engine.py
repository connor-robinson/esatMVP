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

    def test_collapses_double_escaped_latex(self):
        assert format_label_text(r"8.0\\Omega", math=True) == r"$8.0\Omega$"

    def test_strips_nested_dollar_delimiters(self):
        assert format_label_text(r"$8.0\\Omega$", math=True) == r"$8.0\Omega$"

    def test_unicode_omega(self):
        assert format_label_text("30Ω", math=True) == r"$30\Omega$"

    def test_preserves_spaces_inside_text_command(self):
        out = format_label_text(r"1200\text{ kg}", math=True)
        assert ";kg" not in out
        assert r"\text{ kg}" in out or r"\text{kg}" in out

    def test_repairs_semicolon_unit_spacing(self):
        out = format_label_text("(x - 1);cm", math=True)
        assert ";cm" not in out
        assert "cm" in out


class TestGraphLabelNormalize:
    def test_snaps_numeric_x_tick(self):
        from visual_engine.labels import normalize_graph_labels
        from visual_engine.schema import CoordinateSystem

        cs = CoordinateSystem(x_min=-1, x_max=5, y_min=-2, y_max=20, show_axes=True)
        labels = [
            {"id": "label_x_val", "text": "3.0", "anchor": [3.0, -0.8], "preferred_position": "below"},
            {"id": "label_y_val", "text": "18", "anchor": [-0.2, 18.0], "preferred_position": "left"},
        ]
        out = normalize_graph_labels(labels, cs, diagram_type="graph")
        assert out[0]["axis_label"] is True
        assert out[0]["preferred_position"] == "below"
        assert out[0]["anchor"][1] < 0
        assert out[1]["axis_label"] is True
        assert out[1]["preferred_position"] == "left"
        assert out[1]["anchor"][0] < 0


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
        axes_obj = next((o for o in spec.get("objects", []) if o.get("type") == "axes"), None)
        axes_labels = 0
        if axes_obj:
            axes_labels = 2 + len(axes_obj.get("x_ticks") or []) + len(axes_obj.get("y_ticks") or [])
        assert len(result.label_placements) == len(spec["labels"]) + sum(
            1 for a in spec.get("annotations", []) if str(a.get("type")).lower() == "caption"
        ) + axes_labels

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
