#!/usr/bin/env python3
"""Render ESAT Math 1 calibration v2 diagrams via visual_engine.

Reads semantic visualSpec objects from math1-calibration-v2/questions.json,
maps each kind onto visual_engine primitives, and writes production PNGs plus
VisualSpec JSON sidecars.
"""

from __future__ import annotations

import json
import math
import os
import shutil
import sys
from dataclasses import replace
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
VE_ROOT = ROOT / "question-generation" / "esat_question_generator"
sys.path.insert(0, str(VE_ROOT))
os.environ["PYTHONPATH"] = os.pathsep.join(
    [str(VE_ROOT)] + [p for p in os.environ.get("PYTHONPATH", "").split(os.pathsep) if p]
)

from visual_engine.render_matplotlib import render_diagram  # noqa: E402
from visual_engine.style import ExamStyle  # noqa: E402

FG = "#1F2937"
SECONDARY = "#64748B"
LIGHT = "#F1F5F9"
HIGHLIGHT = "#DCE6F0"
WHITE = "#FFFFFF"
CONSTRUCTION = "#CBD5E1"

QUESTIONS_PATH = ROOT / "math1-calibration-v2" / "questions.json"
OUT_PUBLIC = ROOT / "public" / "calibration" / "math1-v2"
OUT_LIB = ROOT / "src" / "lib" / "calibration" / "math1" / "diagrams" / "v2"
OUT_SPECS = OUT_LIB / "specs"

# Export width target: figsize_w * dpi >= 1400 (tight bbox may shrink slightly).
STYLE = ExamStyle(
    background=WHITE,
    stroke=FG,
    leader_stroke=SECONDARY,
    stroke_width=2.2,
    font_size=14.0,
    font_family="DejaVu Sans",
    dpi=220,
    pad_inches=0.22,
    figsize=(12.0, 7.2),
    equal_tick_length_factor=0.035,
    right_angle_size_factor=0.04,
    angle_arc_radius_factor=0.12,
)


def _resolve_fill(token: str | None, fallback: str = LIGHT) -> str:
    if token is None:
        return fallback
    key = str(token).strip()
    mapping = {
        "lightFill": LIGHT,
        "highlightFill": HIGHLIGHT,
        "foreground": FG,
        "secondary": SECONDARY,
        "none": "none",
        "white": WHITE,
        "#FFFFFF": WHITE,
        "#ffffff": WHITE,
    }
    return mapping.get(key, key)


def _base_spec(
    diagram_id: str,
    canvas: dict[str, Any],
    *,
    equal_aspect: bool | None = None,
    show_axes: bool = False,
) -> dict[str, Any]:
    xlim = canvas["xlim"]
    ylim = canvas["ylim"]
    aspect = canvas.get("aspect", "equal")
    if equal_aspect is None:
        equal_aspect = str(aspect).lower() != "auto"
    return {
        "spec_version": "1.0",
        "needs_diagram": True,
        "diagram_type": "geometry",
        "diagram_id": diagram_id,
        "not_to_scale": False,
        "coordinate_system": {
            "x_min": float(xlim[0]),
            "x_max": float(xlim[1]),
            "y_min": float(ylim[0]),
            "y_max": float(ylim[1]),
            "equal_aspect": bool(equal_aspect),
            "show_axes": bool(show_axes),
        },
        "objects": [],
        "labels": [],
        "annotations": [],
    }


def _label(
    text: str,
    anchor: list[float],
    preferred: str = "center",
    *,
    label_id: str | None = None,
    axis_label: bool = False,
    fixed: bool = False,
    offset: tuple[float, float] | None = None,
) -> dict[str, Any]:
    ax_ = float(anchor[0])
    ay_ = float(anchor[1])
    if offset is not None:
        ax_ += float(offset[0])
        ay_ += float(offset[1])
    payload: dict[str, Any] = {
        "text": text,
        "anchor": [ax_, ay_],
        "preferred_position": preferred if not fixed else "center",
    }
    if label_id:
        payload["id"] = label_id
    if axis_label:
        payload["axis_label"] = True
    if fixed:
        payload["fixed"] = True
    return payload


def _point_marker(at: list[float], *, size: float = 5.0) -> dict[str, Any]:
    return {"type": "point", "at": [float(at[0]), float(at[1])], "size": size}


def map_nested_square_incircle(vs: dict[str, Any]) -> dict[str, Any]:
    g = vs["geometry"]
    outer = g["outerSquare"]
    mid = g["midpointSquare"]
    circle = g["circle"]
    dim = g["dimension"]
    styling = vs.get("styling") or {}
    spec = _base_spec(vs["id"], vs["canvas"])
    outer_pts = [outer["A"], outer["B"], outer["C"], outer["D"]]
    mid_pts = [mid["E"], mid["F"], mid["G"], mid["H"]]
    spec["objects"] = [
        {
            "type": "polygon",
            "points": outer_pts,
            "fill": True,
            "facecolor": _resolve_fill(styling.get("outerSquareFill"), LIGHT),
            "edgecolor": FG,
            "linewidth": 3.0,
        },
        {
            "type": "polygon",
            "points": mid_pts,
            "fill": True,
            "facecolor": WHITE,
            "edgecolor": SECONDARY,
            "linewidth": 2.5,
        },
        {
            "type": "circle",
            "center": circle["centre"],
            "radius": float(circle["radius"]),
            "fill": True,
            "facecolor": _resolve_fill(styling.get("circleFill"), HIGHLIGHT),
            "edgecolor": FG,
            "linewidth": 3.0,
        },
        {
            "type": "dimension_line",
            "start": dim["from"],
            "end": dim["to"],
            "direction": "below",
            "offset": 0.85,
        },
    ]
    # Vertex markers
    for pt in outer_pts + mid_pts:
        spec["objects"].append(_point_marker(pt, size=4.0))
    cx, cy = float(circle["centre"][0]), float(circle["centre"][1])
    tick = 0.28
    spec["objects"].extend(
        [
            {
                "type": "line",
                "start": [cx - tick, cy],
                "end": [cx + tick, cy],
                "color": SECONDARY,
                "linewidth": 1.5,
            },
            {
                "type": "line",
                "start": [cx, cy - tick],
                "end": [cx, cy + tick],
                "color": SECONDARY,
                "linewidth": 1.5,
            },
        ]
    )
    label_offsets = {
        "A": (outer["A"], (-0.52, -0.42)),
        "B": (outer["B"], (0.22, -0.42)),
        "C": (outer["C"], (0.22, 0.18)),
        "D": (outer["D"], (-0.55, 0.18)),
        "E": (mid["E"], (-0.12, -0.55)),
        "F": (mid["F"], (0.30, -0.06)),
        "G": (mid["G"], (-0.12, 0.34)),
        "H": (mid["H"], (-0.58, -0.06)),
    }
    for name, (anchor, delta) in label_offsets.items():
        spec["labels"].append(
            _label(name, anchor, "center", label_id=f"pt_{name}", fixed=True, offset=delta)
        )
    spec["labels"].append(
        _label(
            r"$12\,\mathrm{cm}$",
            [(dim["from"][0] + dim["to"][0]) / 2, -1.25],
            "center",
            label_id="dim_12",
            fixed=True,
        )
    )
    spec["coordinate_system"]["y_min"] = min(float(spec["coordinate_system"]["y_min"]), -1.9)
    return spec


def map_parabolic_arch(vs: dict[str, Any]) -> dict[str, Any]:
    plot = vs["plot"]
    styling = vs.get("styling") or {}
    curve = plot["curve"]
    beam = plot["beam"]
    known = plot["knownPoint"]
    domain = curve["domain"]
    # Sample fill polygon under the arch.
    samples = 240
    fill_pts: list[list[float]] = [[float(domain[0]), 0.0]]
    for i in range(samples + 1):
        x = float(domain[0]) + (float(domain[1]) - float(domain[0])) * i / samples
        y = x * (8.0 - x)
        fill_pts.append([x, y])
    fill_pts.append([float(domain[1]), 0.0])

    spec = _base_spec(vs["id"], vs["canvas"], equal_aspect=False, show_axes=False)
    beam_y = float(beam["y"])
    beam_from = beam["fromX"]
    spec["objects"] = [
        {
            "type": "polygon",
            "points": fill_pts,
            "fill": True,
            "facecolor": _resolve_fill(styling.get("underArchFill"), LIGHT),
            "edgecolor": LIGHT,
            "linewidth": 0.5,
        },
        {
            "type": "function",
            "expr": str(curve["expression"]),
            "domain": list(domain),
            "samples": 600,
            "linewidth": 3.4,
            "color": FG,
        },
        {
            "type": "arrow",
            "start": [float(vs["canvas"]["xlim"][0]) + 0.15, 0.0],
            "end": [float(vs["canvas"]["xlim"][1]) - 0.15, 0.0],
            "linewidth": 1.8,
        },
        {
            "type": "arrow",
            "start": [0.0, float(vs["canvas"]["ylim"][0]) + 0.35],
            "end": [0.0, float(vs["canvas"]["ylim"][1]) - 0.35],
            "linewidth": 1.8,
        },
        {
            "type": "line",
            "start": [float(beam_from[0]), beam_y],
            "end": [float(beam_from[1]), beam_y],
            "style": "dashed",
            "color": SECONDARY,
            "linewidth": 2.5,
        },
        {
            "type": "line",
            "start": [float(plot["intersections"][0]["coordinate"][0]), beam_y],
            "end": [float(plot["intersections"][1]["coordinate"][0]), beam_y],
            "color": SECONDARY,
            "linewidth": 2.7,
        },
    ]
    for intercept in plot.get("intercepts") or []:
        x = float(intercept[0])
        tick = 0.18
        spec["objects"].append(
            {"type": "line", "start": [x, -tick], "end": [x, tick], "color": FG, "linewidth": 1.4}
        )
        spec["labels"].append(
            {
                "text": str(int(x)),
                "anchor": [x, -0.65],
                "preferred_position": "below",
                "id": f"tick_{int(x)}",
                "axis_label": True,
            }
        )

    for item in plot["intersections"]:
        pt = item["coordinate"]
        spec["objects"].append(_point_marker(pt, size=7.0))
        side = "lower_left" if item["label"] == "P" else "lower_right"
        dx = -0.10 if item["label"] == "P" else 0.10
        spec["labels"].append(
            _label(
                item["label"],
                pt,
                side,
                label_id=f"int_{item['label']}",
                axis_label=True,
                offset=(dx, -0.55),
            )
        )

    known_pt = known["coordinate"]
    spec["objects"].append(_point_marker(known_pt, size=7.0))
    spec["labels"].append(
        _label(r"$(2,12)$", known_pt, "upper_left", label_id="known", axis_label=True, offset=(-0.9, 1.2))
    )

    # Widen canvas slightly so axis titles clear collision checks.
    cs = spec["coordinate_system"]
    cs["x_min"] = float(cs["x_min"]) - 0.35
    cs["x_max"] = float(cs["x_max"]) + 0.45
    cs["y_min"] = float(cs["y_min"]) - 0.35
    cs["y_max"] = float(cs["y_max"]) + 0.35

    spec["labels"].extend(
        [
            _label(r"$x\,/\,\mathrm{m}$", [float(vs["canvas"]["xlim"][1]) - 0.2, -0.95], "below", label_id="xlabel"),
            _label(r"$y\,/\,\mathrm{m}$", [-0.7, float(vs["canvas"]["ylim"][1]) - 0.5], "left", label_id="ylabel"),
            _label(r"$y=9$", [float(beam_from[1]) + 0.15, beam_y + 0.4], "right", label_id="beam_y"),
        ]
    )
    return spec


def _spinner_objects(
    centre: list[float],
    radius: float,
    labels_cw: list[Any],
    title: str,
    fills: list[str],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx, cy = float(centre[0]), float(centre[1])
    objects: list[dict[str, Any]] = []
    labels: list[dict[str, Any]] = []
    # Match reference: sectors from top-right clockwise; Matplotlib wedge is CCW.
    for index in range(4):
        theta1 = 90.0 - 90.0 * (index + 1)
        theta2 = 90.0 - 90.0 * index
        fill = fills[index % len(fills)]
        objects.append(
            {
                "type": "sector",
                "center": [cx, cy],
                "radius": radius,
                "theta1": theta1,
                "theta2": theta2,
                "fill": True,
                "facecolor": fill,
                "edgecolor": FG,
                "linewidth": 2.1,
            }
        )
    # Label angles: centres of sectors clockwise from top-right.
    for angle_deg, text in zip((45.0, -45.0, -135.0, 135.0), labels_cw):
        ang = math.radians(angle_deg)
        lx = cx + 0.59 * radius * math.cos(ang)
        ly = cy + 0.59 * radius * math.sin(ang)
        labels.append(
            _label(str(text), [lx, ly], "center", label_id=f"{title}_{text}_{angle_deg}", fixed=True)
        )
    # Hub
    objects.append(
        {
            "type": "circle",
            "center": [cx, cy],
            "radius": 0.15,
            "fill": True,
            "facecolor": SECONDARY,
            "edgecolor": FG,
            "linewidth": 1.2,
        }
    )
    # Pointer above spinner
    objects.append(
        {
            "type": "polygon",
            "points": [
                [cx - 0.20, cy + radius + 0.22],
                [cx + 0.20, cy + radius + 0.22],
                [cx, cy + radius - 0.10],
            ],
            "fill": True,
            "facecolor": SECONDARY,
            "edgecolor": FG,
            "linewidth": 1.0,
        }
    )
    labels.append(_label(title, [cx, cy - radius - 0.55], "below", label_id=f"title_{title}"))
    return objects, labels


def map_paired_equal_spinners(vs: dict[str, Any]) -> dict[str, Any]:
    styling = vs.get("styling") or {}
    fills_raw = styling.get("alternateSectorFills") or ["lightFill", "#FFFFFF"]
    fills = [_resolve_fill(f, LIGHT if i % 2 == 0 else WHITE) for i, f in enumerate(fills_raw)]
    spec = _base_spec(vs["id"], vs["canvas"])
    for spinner in vs["spinners"]:
        objs, labs = _spinner_objects(
            spinner["centre"],
            float(spinner["radius"]),
            list(spinner["labelsClockwiseFromTopRight"]),
            str(spinner["title"]),
            fills,
        )
        spec["objects"].extend(objs)
        spec["labels"].extend(labs)
    return spec


def map_circle_tangent_isosceles(vs: dict[str, Any]) -> dict[str, Any]:
    g = vs["geometry"]
    pts = g["points"]
    circle = g["circle"]
    styling = vs.get("styling") or {}
    construction = set(styling.get("constructionSegments") or [])
    spec = _base_spec(vs["id"], vs["canvas"])
    spec["objects"] = [
        {
            "type": "circle",
            "center": circle["centre"],
            "radius": float(circle["radius"]),
            "fill": True,
            "facecolor": _resolve_fill(styling.get("circleFill"), LIGHT),
            "edgecolor": FG,
            "linewidth": 3.0,
        }
    ]
    # Extend tangent slightly past A and T like the reference.
    a = pts["A"]
    t = pts["T"]
    ax_ext = float(a[0]) - 0.28
    tx_ext = float(t[0]) + 0.28
    spec["objects"].append(
        {
            "type": "line",
            "start": [ax_ext, float(a[1])],
            "end": [tx_ext, float(t[1])],
            "color": FG,
            "linewidth": 3.0,
        }
    )
    for seg in g["segments"]:
        name = "".join(seg)
        # Skip AT as a separate short segment; already drawn as extended tangent.
        if name in {"AT", "TA"}:
            continue
        p0, p1 = pts[seg[0]], pts[seg[1]]
        is_construction = name in construction or name[::-1] in construction
        spec["objects"].append(
            {
                "type": "line",
                "start": p0,
                "end": p1,
                "color": SECONDARY if is_construction else FG,
                "linewidth": 2.0 if is_construction else 2.8,
            }
        )
    ticks = g.get("equalLengthTicks") or []
    if len(ticks) >= 2:
        s1, s2 = ticks[0], ticks[1]
        spec["objects"].append(
            {
                "type": "equal_length_ticks",
                "seg1_start": pts[s1[0]],
                "seg1_end": pts[s1[1]],
                "seg2_start": pts[s2[0]],
                "seg2_end": pts[s2[1]],
                "linewidth": 2.2,
            }
        )
    for mark in g.get("angleMarks") or []:
        vertex = pts[mark["vertex"]]
        arms = mark["arms"]
        p1, p2 = pts[arms[0]], pts[arms[1]]
        # Explicit arc matching reference angles around T.
        if mark["vertex"] == "T":
            spec["objects"].append(
                {
                    "type": "arc",
                    "center": vertex,
                    "radius": 0.22,
                    "theta1": 110,
                    "theta2": 180,
                    "color": SECONDARY,
                    "linewidth": 2.0,
                }
            )
            label_angle = math.radians(144)
            lx = float(vertex[0]) + 0.34 * math.cos(label_angle)
            ly = float(vertex[1]) + 0.34 * math.sin(label_angle)
            # Show given 70° only; never print target angle ACB.
            spec["labels"].append(
                _label(r"$70^{\circ}$", [lx, ly], "center", label_id="angle_70", fixed=True)
            )
        else:
            spec["objects"].append(
                {
                    "type": "angle_arc",
                    "vertex": vertex,
                    "point1": p1,
                    "point2": p2,
                    "radius": 0.22,
                    "color": SECONDARY,
                }
            )
            if mark.get("label"):
                spec["labels"].append(_label(str(mark["label"]), vertex, "upper_right", axis_label=True))
    point_deltas = {
        "A": (-0.10, -0.17),
        "B": (0.06, 0.06),
        "C": (-0.14, 0.09),
        "T": (0.06, -0.16),
    }
    for name, xy in pts.items():
        spec["objects"].append(_point_marker(xy, size=5.0))
        dx, dy = point_deltas.get(name, (0.08, 0.08))
        spec["labels"].append(
            _label(name, xy, "center", label_id=f"pt_{name}", fixed=True, offset=(dx, dy))
        )
    return spec


def map_growing_rectangular_dot_grids(vs: dict[str, Any]) -> dict[str, Any]:
    styling = vs.get("styling") or {}
    dot_r = float(styling.get("dotRadius") or 0.13)
    back_fill = _resolve_fill(styling.get("backplateFill"), LIGHT)
    spec = _base_spec(vs["id"], vs["canvas"])
    last_right = 0.0
    last_mid_y = 0.0
    for stage in vs["stages"]:
        ox, oy = float(stage["origin"][0]), float(stage["origin"][1])
        rows, cols = int(stage["rows"]), int(stage["columns"])
        spacing = float(stage["spacing"])
        width = (cols - 1) * spacing + 1.10
        height = (rows - 1) * spacing + 1.10
        pad = 0.55
        spec["objects"].append(
            {
                "type": "polygon",
                "points": [
                    [ox - pad, oy - pad],
                    [ox - pad + width, oy - pad],
                    [ox - pad + width, oy - pad + height],
                    [ox - pad, oy - pad + height],
                ],
                "fill": True,
                "facecolor": back_fill,
                "edgecolor": CONSTRUCTION,
                "linewidth": 1.5,
            }
        )
        for row in range(rows):
            for col in range(cols):
                spec["objects"].append(
                    {
                        "type": "circle",
                        "center": [ox + col * spacing, oy + row * spacing],
                        "radius": dot_r,
                        "fill": True,
                        "facecolor": FG,
                        "edgecolor": FG,
                        "linewidth": 0.5,
                    }
                )
        centre_x = ox + (cols - 1) * spacing / 2.0
        spec["labels"].append(
            _label(str(stage["caption"]), [centre_x, oy - 1.05], "below", label_id=f"stage_{stage['stage']}")
        )
        last_right = ox - pad + width
        last_mid_y = oy + (rows - 1) * spacing / 2.0
    if styling.get("continuationEllipsis", True):
        spec["labels"].append(_label("⋯", [last_right + 1.15, last_mid_y], "center", label_id="ellipsis"))
    return spec


def map_two_counter_boxes(vs: dict[str, Any]) -> dict[str, Any]:
    styling = vs.get("styling") or {}
    gold = _resolve_fill(styling.get("goldTokenFill"), WHITE)
    blue = _resolve_fill(styling.get("blueTokenFill"), HIGHLIGHT)
    spec = _base_spec(vs["id"], vs["canvas"])
    for box in vs["boxes"]:
        x0, y0, x1, y1 = [float(v) for v in box["bounds"]]
        spec["objects"].append(
            {
                "type": "polygon",
                "points": [[x0, y0], [x1, y0], [x1, y1], [x0, y1]],
                "fill": True,
                "facecolor": LIGHT,
                "edgecolor": FG,
                "linewidth": 2.3,
            }
        )
        spec["labels"].append(
            _label(str(box["label"]), [(x0 + x1) / 2.0, y1 + 0.35], "above", label_id=f"box_{box['label']}")
        )
        for token in box["tokens"]:
            label = str(token["label"])
            at = token["at"]
            facecolor = gold if label == "G" else blue
            # Blue tokens use dark fill; keep label readable via contrast in text only.
            # Prefer SECONDARY fill for blue to match reference grayscale distinction.
            if label == "B":
                facecolor = SECONDARY
            spec["objects"].append(
                {
                    "type": "circle",
                    "center": at,
                    "radius": 0.40,
                    "fill": True,
                    "facecolor": facecolor,
                    "edgecolor": FG,
                    "linewidth": 2.0,
                }
            )
            spec["labels"].append(_label(label, at, "center", label_id=f"token_{box['label']}_{label}_{at[0]}"))
    spec["labels"].append(
        _label("G = gold     B = blue", [6.5, 0.15], "below", label_id="legend")
    )
    return spec


def map_coordinate_perpendicular_division(vs: dict[str, Any]) -> dict[str, Any]:
    g = vs["geometry"]
    pts = g["points"]
    plane = vs.get("coordinatePlane") or {}
    styling = vs.get("styling") or {}
    spec = _base_spec(vs["id"], vs["canvas"], show_axes=False)
    xlim = vs["canvas"]["xlim"]
    ylim = vs["canvas"]["ylim"]
    # Axes without numeric ticks / grid.
    spec["objects"].extend(
        [
            {
                "type": "arrow",
                "start": [float(xlim[0]) + 0.2, 0.0],
                "end": [float(xlim[1]) - 0.25, 0.0],
                "linewidth": 1.8,
            },
            {
                "type": "arrow",
                "start": [0.0, float(ylim[0]) + 0.2],
                "end": [0.0, float(ylim[1]) - 0.25],
                "linewidth": 1.8,
            },
            {
                "type": "line",
                "start": pts["A"],
                "end": pts["B"],
                "color": FG,
                "linewidth": 3.0,
            },
            {
                "type": "line",
                "start": pts["P"],
                "end": pts["Q"],
                "color": SECONDARY,
                "linewidth": 2.8,
            },
            {
                "type": "right_angle_marker",
                "vertex": pts["P"],
                "leg1": pts["A"],
                "leg2": pts["Q"],
                "color": SECONDARY,
                "linewidth": 1.8,
            },
        ]
    )
    axis_names = plane.get("axisLabels") or ["x", "y"]
    spec["labels"].extend(
        [
            _label(rf"${axis_names[0]}$", [float(xlim[1]) - 0.45, -0.4], "below", label_id="xlabel"),
            _label(rf"${axis_names[1]}$", [-0.35, float(ylim[1]) - 0.35], "left", label_id="ylabel"),
        ]
    )
    # Label A,B with coordinates; P and Q as letters only (do not reveal answer coords).
    reveal_q = not bool(styling.get("doNotRevealQCoordinate", True))
    label_map = {
        "A": (r"$A=(-2,1)$", (-1.15, -0.62)),
        "B": (r"$B=(6,5)$", (0.18, 0.17)),
        "P": (r"$P$", (-0.45, 0.28)),
        "Q": (r"$Q=(6,0)$" if reveal_q else r"$Q$", (0.20, -0.42)),
    }
    for name, xy in pts.items():
        text, delta = label_map[name]
        spec["objects"].append(_point_marker(xy, size=6.0))
        spec["labels"].append(
            _label(text, xy, "center", label_id=f"pt_{name}", fixed=True, offset=delta)
        )
    return spec


def map_isometric_cuboid_opposite_vertices(vs: dict[str, Any]) -> dict[str, Any]:
    g = vs["geometry"]
    styling = vs.get("styling") or {}
    proj = vs.get("projection") or {}
    front = g["frontFace"]
    bl = front["bottomLeft"]
    width = float(front["width"])
    height = float(front["height"])
    depth_vec = proj.get("depthVector") or [2.4, 1.7]
    # Show left face (matches leftFaceFill): depth goes back-left.
    shift = [-abs(float(depth_vec[0])), float(depth_vec[1])]

    fbl = [float(bl[0]), float(bl[1])]
    fbr = [fbl[0] + width, fbl[1]]
    ftr = [fbl[0] + width, fbl[1] + height]
    ftl = [fbl[0], fbl[1] + height]
    bbl = [fbl[0] + shift[0], fbl[1] + shift[1]]
    bbr = [fbr[0] + shift[0], fbr[1] + shift[1]]
    btr = [ftr[0] + shift[0], ftr[1] + shift[1]]
    btl = [ftl[0] + shift[0], ftl[1] + shift[1]]

    spec = _base_spec(vs["id"], vs["canvas"])
    spec["objects"] = [
        {
            "type": "polygon",
            "points": [fbl, bbl, btl, ftl],
            "fill": True,
            "facecolor": _resolve_fill(styling.get("leftFaceFill"), HIGHLIGHT),
            "edgecolor": FG,
            "linewidth": 2.3,
        },
        {
            "type": "polygon",
            "points": [ftl, ftr, btr, btl],
            "fill": True,
            "facecolor": _resolve_fill(styling.get("topFaceFill"), LIGHT),
            "edgecolor": FG,
            "linewidth": 2.3,
        },
        {
            "type": "polygon",
            "points": [fbl, fbr, ftr, ftl],
            "fill": True,
            "facecolor": _resolve_fill(styling.get("frontFaceFill"), WHITE),
            "edgecolor": FG,
            "linewidth": 2.8,
        },
    ]
    # Visible depth edges only; omit fbr-bbr (would cross / clutter).
    for front_pt, back_pt in ((fbl, bbl), (ftr, btr), (ftl, btl)):
        spec["objects"].append(
            {"type": "line", "start": front_pt, "end": back_pt, "color": FG, "linewidth": 2.2}
        )

    # Start A (filled) and finish G (ring).
    spec["objects"].append(_point_marker(fbl, size=9.0))
    spec["objects"].append(
        {
            "type": "circle",
            "center": btr,
            "radius": 0.11,
            "fill": True,
            "facecolor": WHITE,
            "edgecolor": FG,
            "linewidth": 2.5,
        }
    )
    spec["labels"].extend(
        [
            _label(r"$A$", fbl, "center", label_id="pt_A", fixed=True, offset=(-0.38, -0.18)),
            _label(r"$G$", btr, "center", label_id="pt_G", fixed=True, offset=(-0.05, 0.32)),
            _label("start", [fbl[0], fbl[1] - 0.64], "center", label_id="start", fixed=True),
            _label("finish", [btr[0] + 0.48, btr[1] + 0.10], "center", label_id="finish", fixed=True),
            _label(
                r"$6\,\mathrm{cm}$",
                [(fbl[0] + fbr[0]) / 2.0, fbl[1] - 0.70],
                "center",
                label_id="dim6",
                fixed=True,
            ),
            _label(
                r"$5\,\mathrm{cm}$",
                [fbr[0] + 0.85, (fbl[1] + ftr[1]) / 2.0],
                "center",
                label_id="dim5",
                fixed=True,
            ),
            _label(
                r"$3\,\mathrm{cm}$",
                [(ftl[0] + btl[0]) / 2.0 - 0.25, (ftl[1] + btl[1]) / 2.0 + 0.35],
                "center",
                label_id="dim3",
                fixed=True,
            ),
        ]
    )
    # Dimension ticks via secondary lines (simple exam-style callouts).
    spec["objects"].extend(
        [
            {
                "type": "dimension_line",
                "start": [fbl[0], fbl[1]],
                "end": [fbr[0], fbr[1]],
                "direction": "below",
                "offset": 0.55,
                "color": SECONDARY,
            },
            {
                "type": "dimension_line",
                "start": [fbr[0], fbl[1]],
                "end": [ftr[0], ftr[1]],
                "direction": "right",
                "offset": 0.55,
                "color": SECONDARY,
            },
            {
                "type": "line",
                "start": [ftl[0] - 0.28, ftl[1] + 0.25],
                "end": [btl[0] - 0.28, btl[1] + 0.25],
                "color": SECONDARY,
                "linewidth": 1.6,
            },
        ]
    )
    return spec


MAPPERS = {
    "nested_square_incircle": map_nested_square_incircle,
    "parabolic_arch": map_parabolic_arch,
    "paired_equal_spinners": map_paired_equal_spinners,
    "circle_tangent_isosceles": map_circle_tangent_isosceles,
    "growing_rectangular_dot_grids": map_growing_rectangular_dot_grids,
    "two_counter_boxes": map_two_counter_boxes,
    "coordinate_perpendicular_division": map_coordinate_perpendicular_division,
    "isometric_cuboid_opposite_vertices": map_isometric_cuboid_opposite_vertices,
}


def _question_file_stem(question_id: str) -> str:
    # m1cal-v2-q01 -> q01
    if "-q" in question_id:
        return "q" + question_id.rsplit("-q", 1)[-1]
    return question_id


def _png_is_ok(path: Path, min_width: int = 1400) -> tuple[bool, str]:
    if not path.exists() or path.stat().st_size < 500:
        return False, "missing or tiny file"
    try:
        from PIL import Image
    except ImportError:
        # Fallback: matplotlib read
        import matplotlib.image as mpimg

        arr = mpimg.imread(path)
        h, w = arr.shape[:2]
        if w < min_width:
            return False, f"width {w} < {min_width}"
        if arr.max() == arr.min():
            return False, "blank image"
        return True, f"{w}x{h}"
    with Image.open(path) as im:
        w, h = im.size
        if w < min_width:
            return False, f"width {w} < {min_width}"
        extrema = im.convert("L").getextrema()
        if extrema[0] == extrema[1]:
            return False, "blank image"
        return True, f"{w}x{h}"


def main() -> int:
    data = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    questions = data["questions"] if isinstance(data, dict) and "questions" in data else data

    OUT_PUBLIC.mkdir(parents=True, exist_ok=True)
    OUT_LIB.mkdir(parents=True, exist_ok=True)
    OUT_SPECS.mkdir(parents=True, exist_ok=True)

    rendered: list[str] = []
    failures: list[str] = []

    for q in questions:
        vs = q.get("visualSpec")
        if not vs:
            continue
        kind = vs.get("kind")
        mapper = MAPPERS.get(kind)
        if mapper is None:
            failures.append(f"{q.get('id')}: unknown kind {kind!r}")
            continue
        stem = _question_file_stem(str(q["id"]))
        engine_spec = mapper(vs)
        engine_spec["source_question_id"] = q["id"]
        engine_spec["diagram_id"] = vs.get("id") or engine_spec["diagram_id"]

        spec_path = OUT_SPECS / f"{stem}.json"
        spec_path.write_text(json.dumps(engine_spec, indent=2), encoding="utf-8")

        # Per-diagram figsize from canvas target width.
        canvas = vs.get("canvas") or {}
        target_w = float(canvas.get("widthPx") or 1400)
        target_h = float(canvas.get("heightPx") or 850)
        dpi = max(220, int(STYLE.dpi))
        fig_w = max(target_w / dpi, 7.0)
        fig_h = max(target_h / dpi, 4.5)
        # Pad so tight bbox still clears 1400 px.
        fig_w = max(fig_w * 1.15, 8.0)
        fig_h = max(fig_h * 1.10, 5.0)
        style = replace(STYLE, dpi=dpi, figsize=(fig_w, fig_h))

        lib_png = OUT_LIB / f"{stem}.png"
        layout_warn: str | None = None
        try:
            render_diagram(engine_spec, lib_png, style=style)
        except Exception as exc:  # noqa: BLE001
            # PNG may still have been written before a layout soft-fail.
            from visual_engine.errors import DiagramLayoutError

            if isinstance(exc, DiagramLayoutError) and lib_png.exists():
                layout_warn = str(exc)
            else:
                # Retry once with a larger figure / looser pad.
                style2 = replace(
                    style,
                    figsize=(fig_w * 1.4, fig_h * 1.3),
                    dpi=max(dpi, 240),
                    pad_inches=0.35,
                )
                try:
                    render_diagram(engine_spec, lib_png, style=style2)
                except DiagramLayoutError as layout_exc:
                    if lib_png.exists():
                        layout_warn = str(layout_exc)
                    else:
                        failures.append(f"{stem}: render failed: {exc}")
                        continue
                except Exception as exc2:  # noqa: BLE001
                    failures.append(f"{stem}: render failed: {exc2}")
                    continue

        ok, detail = _png_is_ok(lib_png, min_width=1400)
        if not ok:
            style3 = replace(style, figsize=(fig_w * 1.5, fig_h * 1.4), dpi=max(dpi, 240), pad_inches=0.4)
            try:
                render_diagram(engine_spec, lib_png, style=style3)
            except Exception:
                pass
            ok, detail = _png_is_ok(lib_png, min_width=1400)
        if not ok:
            failures.append(f"{stem}: PNG check failed ({detail})")
            continue
        if layout_warn:
            print(f"WARN {stem}: layout note (PNG kept): {layout_warn[:120]}")
        public_png = OUT_PUBLIC / f"{stem}.png"
        shutil.copy2(lib_png, public_png)
        rendered.append(f"{stem}.png ({detail}) kind={kind}")
        print(f"OK {stem}: {detail}")

    print(f"\nRendered {len(rendered)} diagrams")
    for line in rendered:
        print(f"  - {line}")
    if failures:
        print("\nFailures:")
        for line in failures:
            print(f"  - {line}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
