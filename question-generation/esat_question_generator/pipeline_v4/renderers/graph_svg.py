"""Deterministic SVG renderer for ``Physics Accurate_Graph_Spec.md`` output.

Supports the graph_types listed in the V4 spec:

- line_graph / piecewise_linear / iv_graph / temperature_time / velocity_time
  / force_time / displacement_time -> line through points / segments
- simple_curve -> use function expression sampled across the x range
- bar_chart -> rectangles

We only handle the fields the prompt is required to emit; anything missing
falls back to safe defaults so a partial spec still produces a usable diagram.
"""

from __future__ import annotations

import html
import math
from typing import Any, Dict, List, Optional, Sequence, Tuple

# Canvas dimensions roughly match exam-paper figure proportions.
W, H = 600, 420
# Plot box (leave room for axis labels + tick numbers).
PAD_L, PAD_R, PAD_T, PAD_B = 80, 40, 40, 70

_BG = "#f7f7f4"     # very light grey paper
_FG = "#111111"     # strong charcoal
_GRID = "#d6d6d6"   # subtle grid
_AXIS = "#222222"


def _attr_escape(value: Any) -> str:
    return html.escape(str(value), quote=True)


def _safe_number(value: Any, default: float = 0.0) -> float:
    try:
        f = float(value)
        if math.isfinite(f):
            return f
    except (TypeError, ValueError):
        pass
    return default


def _scale_x(x: float, x_min: float, x_max: float) -> float:
    if x_max == x_min:
        return PAD_L
    return PAD_L + (x - x_min) * (W - PAD_L - PAD_R) / (x_max - x_min)


def _scale_y(y: float, y_min: float, y_max: float) -> float:
    if y_max == y_min:
        return H - PAD_B
    return (H - PAD_B) - (y - y_min) * (H - PAD_T - PAD_B) / (y_max - y_min)


def _ticks(axis_min: float, axis_max: float, major: float) -> List[float]:
    if major <= 0 or not math.isfinite(major):
        return [axis_min, axis_max]
    out: List[float] = []
    # Walk from axis_min to axis_max in steps of `major`. Avoid drift.
    n = 0
    while True:
        v = axis_min + n * major
        if v > axis_max + 1e-9:
            break
        out.append(round(v, 9))
        n += 1
        if n > 200:  # paranoid
            break
    return out


def _format_tick(v: float) -> str:
    if v == 0:
        return "0"
    if abs(v - round(v)) < 1e-9 and abs(v) < 1e7:
        return str(int(round(v)))
    if abs(v) >= 1e5 or (abs(v) < 1e-3 and v != 0):
        return f"{v:.2g}"
    return f"{v:.3g}"


def _points_from_data(data: Dict[str, Any]) -> List[Tuple[float, float]]:
    raw_pts = data.get("points") or []
    pts: List[Tuple[float, float]] = []
    for p in raw_pts:
        if isinstance(p, (list, tuple)) and len(p) >= 2:
            pts.append((_safe_number(p[0]), _safe_number(p[1])))
        elif isinstance(p, dict) and "x" in p and "y" in p:
            pts.append((_safe_number(p["x"]), _safe_number(p["y"])))
    return pts


def _sample_function(expr: str, x_min: float, x_max: float, n: int = 80) -> List[Tuple[float, float]]:
    """Sample a Python-expression function ``y = f(x)`` across ``[x_min, x_max]``.

    SECURITY: we limit ``eval`` to math.* and ``x``. This is only ever called on
    Designer/Implementer-produced strings inside our own process; we still
    sandbox to be safe.
    """
    allowed = {k: getattr(math, k) for k in dir(math) if not k.startswith("_")}
    out: List[Tuple[float, float]] = []
    if not expr:
        return out
    expr = str(expr).strip()
    if not expr or any(bad in expr for bad in ("__", "import", "open(", "os.", "sys.")):
        return out
    step = (x_max - x_min) / max(1, n)
    for i in range(n + 1):
        x = x_min + i * step
        try:
            y = float(eval(expr, {"__builtins__": {}}, {"x": x, **allowed}))  # noqa: S307
        except Exception:
            continue
        if math.isfinite(y):
            out.append((x, y))
    return out


def _axis_label(label: str, *, axis: str) -> str:
    """Return SVG text element for axis label (italic serif, near arrow tip)."""
    text = _attr_escape(label or "")
    if axis == "x":
        return (
            f'<text x="{W - PAD_R + 6}" y="{H - PAD_B + 5}" '
            f'font-family="Times New Roman, serif" font-style="italic" '
            f'font-size="14" fill="{_FG}" text-anchor="start">{text}</text>'
        )
    return (
        f'<text x="{PAD_L - 8}" y="{PAD_T - 8}" '
        f'font-family="Times New Roman, serif" font-style="italic" '
        f'font-size="14" fill="{_FG}" text-anchor="end">{text}</text>'
    )


def _svg_polyline(points: Sequence[Tuple[float, float]]) -> str:
    if not points:
        return ""
    pts_str = " ".join(f"{x:.2f},{y:.2f}" for x, y in points)
    return (
        f'<polyline points="{pts_str}" fill="none" stroke="{_FG}" '
        f'stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" />'
    )


def render_graph_svg(spec: Dict[str, Any]) -> str:
    """Return a self-contained SVG string for a V4 graph spec.

    Never raises on partial specs; always returns valid SVG (possibly empty plot).
    """
    if not isinstance(spec, dict):
        spec = {}

    x_axis = spec.get("x_axis") or {}
    y_axis = spec.get("y_axis") or {}

    x_min = _safe_number(x_axis.get("min"), 0.0)
    x_max = _safe_number(x_axis.get("max"), 10.0)
    if x_max <= x_min:
        x_max = x_min + 1.0
    y_min = _safe_number(y_axis.get("min"), 0.0)
    y_max = _safe_number(y_axis.get("max"), 10.0)
    if y_max <= y_min:
        y_max = y_min + 1.0

    x_major = _safe_number(x_axis.get("major_tick"), (x_max - x_min) / 5.0)
    y_major = _safe_number(y_axis.get("major_tick"), (y_max - y_min) / 5.0)

    style = spec.get("style") or {}
    show_grid = bool(style.get("show_grid", True))

    data = spec.get("data") or {}
    graph_type = (spec.get("graph_type") or "line_graph").strip().lower()

    series: List[List[Tuple[float, float]]] = []
    if graph_type == "bar_chart":
        bars = data.get("points") or []
    elif graph_type == "simple_curve":
        fn = (data.get("function") or "").strip()
        if fn:
            series.append(_sample_function(fn, x_min, x_max))
        else:
            series.append(_points_from_data(data))
    else:
        # Default to line/piecewise from points; merge multiple segments if any
        segs = data.get("segments") or []
        if isinstance(segs, list) and segs and isinstance(segs[0], (list, tuple)):
            for seg in segs:
                if isinstance(seg, (list, tuple)):
                    series.append(
                        [(_safe_number(p[0]), _safe_number(p[1])) for p in seg if isinstance(p, (list, tuple)) and len(p) >= 2]
                    )
        if not series:
            pts = _points_from_data(data)
            if pts:
                series.append(pts)

    parts: List[str] = []
    parts.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
        f'role="img" aria-label="{_attr_escape(spec.get("title") or "graph")}">'
    )
    parts.append(f'<rect width="100%" height="100%" fill="{_BG}" />')

    # Optional title
    title = (spec.get("title") or "").strip()
    if title:
        parts.append(
            f'<text x="{W // 2}" y="22" font-family="Times New Roman, serif" '
            f'font-size="14" fill="{_FG}" text-anchor="middle">{_attr_escape(title)}</text>'
        )

    # Gridlines
    if show_grid:
        for v in _ticks(x_min, x_max, x_major):
            x = _scale_x(v, x_min, x_max)
            parts.append(
                f'<line x1="{x:.2f}" y1="{PAD_T}" x2="{x:.2f}" y2="{H - PAD_B}" '
                f'stroke="{_GRID}" stroke-width="0.8" />'
            )
        for v in _ticks(y_min, y_max, y_major):
            y = _scale_y(v, y_min, y_max)
            parts.append(
                f'<line x1="{PAD_L}" y1="{y:.2f}" x2="{W - PAD_R}" y2="{y:.2f}" '
                f'stroke="{_GRID}" stroke-width="0.8" />'
            )

    # Axes with arrowheads
    parts.append(
        f'<defs><marker id="arr" markerWidth="10" markerHeight="10" refX="6" refY="3" '
        f'orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L6,3 z" fill="{_AXIS}" /></marker></defs>'
    )
    # x-axis (along y_min) and y-axis (along x_min) — clamped to inside the plot area.
    x_axis_y = _scale_y(max(min(0.0, y_max), y_min), y_min, y_max)
    y_axis_x = _scale_x(max(min(0.0, x_max), x_min), x_min, x_max)
    parts.append(
        f'<line x1="{PAD_L}" y1="{x_axis_y:.2f}" x2="{W - PAD_R}" y2="{x_axis_y:.2f}" '
        f'stroke="{_AXIS}" stroke-width="1.5" marker-end="url(#arr)" />'
    )
    parts.append(
        f'<line x1="{y_axis_x:.2f}" y1="{H - PAD_B}" x2="{y_axis_x:.2f}" y2="{PAD_T}" '
        f'stroke="{_AXIS}" stroke-width="1.5" marker-end="url(#arr)" />'
    )

    # Ticks + tick labels
    for v in _ticks(x_min, x_max, x_major):
        x = _scale_x(v, x_min, x_max)
        parts.append(
            f'<line x1="{x:.2f}" y1="{x_axis_y - 4:.2f}" x2="{x:.2f}" y2="{x_axis_y + 4:.2f}" stroke="{_AXIS}" stroke-width="1" />'
        )
        parts.append(
            f'<text x="{x:.2f}" y="{x_axis_y + 18:.2f}" font-family="Times New Roman, serif" '
            f'font-size="11" fill="{_FG}" text-anchor="middle">{_format_tick(v)}</text>'
        )
    for v in _ticks(y_min, y_max, y_major):
        y = _scale_y(v, y_min, y_max)
        parts.append(
            f'<line x1="{y_axis_x - 4:.2f}" y1="{y:.2f}" x2="{y_axis_x + 4:.2f}" y2="{y:.2f}" stroke="{_AXIS}" stroke-width="1" />'
        )
        parts.append(
            f'<text x="{y_axis_x - 8:.2f}" y="{y + 4:.2f}" font-family="Times New Roman, serif" '
            f'font-size="11" fill="{_FG}" text-anchor="end">{_format_tick(v)}</text>'
        )

    # Axis labels (Times serif italic)
    parts.append(_axis_label(x_axis.get("label", "x"), axis="x"))
    parts.append(_axis_label(y_axis.get("label", "y"), axis="y"))

    # Series
    if graph_type == "bar_chart":
        bars = data.get("points") or []
        n = max(1, len(bars))
        slot = (W - PAD_L - PAD_R) / n
        for i, b in enumerate(bars):
            label = ""
            value = 0.0
            if isinstance(b, dict):
                label = str(b.get("label", b.get("x", "")))
                value = _safe_number(b.get("y", b.get("value", 0)))
            elif isinstance(b, (list, tuple)) and len(b) >= 2:
                label, value = str(b[0]), _safe_number(b[1])
            x0 = PAD_L + i * slot + slot * 0.2
            x1 = PAD_L + (i + 1) * slot - slot * 0.2
            y0 = _scale_y(value, y_min, y_max)
            y1 = _scale_y(max(y_min, 0.0), y_min, y_max)
            parts.append(
                f'<rect x="{x0:.2f}" y="{min(y0, y1):.2f}" width="{(x1 - x0):.2f}" '
                f'height="{abs(y1 - y0):.2f}" fill="none" stroke="{_FG}" stroke-width="1.3" />'
            )
            parts.append(
                f'<text x="{((x0 + x1) / 2):.2f}" y="{H - PAD_B + 18:.2f}" '
                f'font-family="Times New Roman, serif" font-size="11" '
                f'fill="{_FG}" text-anchor="middle">{_attr_escape(label)}</text>'
            )
    else:
        for pts in series:
            scaled = [
                (_scale_x(x, x_min, x_max), _scale_y(y, y_min, y_max))
                for x, y in pts
            ]
            parts.append(_svg_polyline(scaled))

    # Annotations (best effort: point_label, line_label, arrow)
    for ann in spec.get("annotations") or []:
        if not isinstance(ann, dict):
            continue
        kind = (ann.get("type") or "").strip().lower()
        text = _attr_escape(ann.get("text") or "")
        pos = ann.get("position") or [0, 0]
        if not isinstance(pos, (list, tuple)) or len(pos) < 2:
            continue
        px = _scale_x(_safe_number(pos[0]), x_min, x_max)
        py = _scale_y(_safe_number(pos[1]), y_min, y_max)
        if kind in ("point_label", "line_label"):
            parts.append(
                f'<circle cx="{px:.2f}" cy="{py:.2f}" r="2.5" fill="{_FG}" />'
                f'<text x="{px + 8:.2f}" y="{py - 6:.2f}" font-family="Times New Roman, serif" '
                f'font-size="11" fill="{_FG}">{text}</text>'
            )
        elif kind == "arrow":
            parts.append(
                f'<text x="{px + 8:.2f}" y="{py - 6:.2f}" font-family="Times New Roman, serif" '
                f'font-size="11" fill="{_FG}">{text}</text>'
            )

    # Frame around the plot box (subtle)
    parts.append(
        f'<rect x="{PAD_L}" y="{PAD_T}" width="{W - PAD_L - PAD_R}" height="{H - PAD_T - PAD_B}" '
        f'fill="none" stroke="{_GRID}" stroke-width="1" />'
    )

    # Not-to-scale footer (optional but matches TMUA convention)
    parts.append(
        f'<text x="{W // 2}" y="{H - 14}" font-family="Times New Roman, serif" '
        f'font-size="10" fill="#555" text-anchor="middle">[diagram not to scale]</text>'
    )

    parts.append("</svg>")
    return "".join(parts)
