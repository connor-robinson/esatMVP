"""Tests for tight graph axis bounds."""

from __future__ import annotations

from pathlib import Path

from visual_engine.graph_bounds import collect_graph_data_extents, tighten_graph_spec
from visual_engine.render_matplotlib import render_diagram
from visual_engine.schema import parse_spec


def _loose_graph_spec() -> dict:
    return {
        "spec_version": "1.0",
        "needs_diagram": True,
        "diagram_type": "graph",
        "diagram_id": "g1",
        "graph_preset": "science_xy",
        "not_to_scale": True,
        "coordinate_system": {
            "x_min": 0,
            "x_max": 50,
            "y_min": 0,
            "y_max": 100,
            "equal_aspect": False,
            "show_axes": True,
        },
        "objects": [
            {
                "id": "axes",
                "type": "axes",
                "x_label": "t / s",
                "y_label": "v / m s^{-1}",
                "x_ticks": [0, 10, 20, 30, 40, 50],
                "y_ticks": [0, 20, 40, 60, 80, 100],
            },
            {
                "id": "curve",
                "type": "function",
                "expr": "40 + 20*sin(x/5)",
                "domain": [12, 48],
                "samples": 80,
            },
        ],
        "labels": [],
        "annotations": [],
    }


def test_tighten_removes_empty_origin_strip():
    spec = parse_spec(_loose_graph_spec())
    extents = collect_graph_data_extents(spec)
    assert extents is not None
    x0, x1, y0, y1 = extents
    assert x0 >= 11
    assert y0 > 5  # not down at 0

    tighten_graph_spec(spec)
    cs = spec.coordinate_system
    assert cs.x_min > 5
    assert cs.y_min > 5
    assert cs.equal_aspect is False
    # Far origin ticks should be trimmed.
    axes = next(o for o in spec.objects if o["type"] == "axes")
    assert 0 not in [float(t) for t in axes["y_ticks"] if str(t).replace(".", "", 1).isdigit()]


def test_tighten_flushes_bottom_for_nonnegative_data():
    """Spectra / abundance: bottom spine at y=0, not a negative pad gap."""
    raw = {
        "kind": "graph",
        "graph_preset": "science_xy",
        "coordinate_system": {
            "x_min": 26,
            "x_max": 32,
            "y_min": 0,
            "y_max": 105,
            "equal_aspect": False,
            "show_axes": True,
        },
        "objects": [
            {
                "type": "axes",
                "x_label": "mass / charge",
                "y_label": "percentage abundance",
                "x_ticks": [27, 28, 29, 30, 31],
                "y_ticks": [0, 20, 40, 60, 80, 100],
            },
            {"type": "line", "start": [28, 0], "end": [28, 70]},
            {"type": "line", "start": [29, 0], "end": [29, 20]},
            {"type": "line", "start": [30, 0], "end": [30, 10]},
        ],
        "labels": [],
        "annotations": [],
    }
    spec = parse_spec(raw)
    tighten_graph_spec(spec)
    assert spec.coordinate_system.y_min == 0.0
    assert spec.coordinate_system.y_max >= 70
    assert spec.coordinate_system.y_min >= 0.0  # no negative pad under baseline


def test_tighten_keeps_signed_zero_when_data_crosses():
    raw = _loose_graph_spec()
    raw["coordinate_system"] = {
        "x_min": -20,
        "x_max": 20,
        "y_min": -80,
        "y_max": 80,
        "equal_aspect": False,
        "show_axes": True,
    }
    raw["graph_preset"] = "signed_y"
    raw["objects"][1] = {
        "id": "curve",
        "type": "function",
        "expr": "30*sin(x/3)",
        "domain": [-10, 10],
        "samples": 80,
    }
    raw["objects"][0]["y_ticks"] = [-60, -30, 0, 30, 60]
    spec = parse_spec(raw)
    tighten_graph_spec(spec)
    assert spec.coordinate_system.y_min < 0 < spec.coordinate_system.y_max


def test_render_uses_tight_bounds(tmp_path: Path):
    out = tmp_path / "tight.png"
    result = render_diagram(_loose_graph_spec(), out)
    assert out.is_file()
    assert result.spec.coordinate_system.y_min > 5
    assert result.spec.coordinate_system.x_min > 5
