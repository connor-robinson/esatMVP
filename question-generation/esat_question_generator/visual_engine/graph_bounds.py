"""Tighten graph coordinate limits around plotted data.

Science graphs should hug the curves. Do not force an empty strip down to (0,0)
unless the data (or a signed axis) actually needs it. When data is non-negative,
keep the bottom spine flush with the data floor (e.g. spectra at y=0).
"""

from __future__ import annotations

import math
from typing import Any

from .objects.graph import _eval_expr
from .schema import CoordinateSystem, VisualSpec


def _finite(v: Any) -> float | None:
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(x):
        return None
    return x


def _add_xy(xs: list[float], ys: list[float], x: Any, y: Any) -> None:
    xf, yf = _finite(x), _finite(y)
    if xf is not None and yf is not None:
        xs.append(xf)
        ys.append(yf)


def collect_graph_data_extents(spec: VisualSpec | dict[str, Any]) -> tuple[float, float, float, float] | None:
    """Return (x_min, x_max, y_min, y_max) from drawable graph content, or None."""
    if isinstance(spec, dict):
        objects = spec.get("objects") or []
    else:
        objects = spec.objects

    xs: list[float] = []
    ys: list[float] = []

    for obj in objects:
        if not isinstance(obj, dict):
            continue
        kind = str(obj.get("type") or "").strip().lower()
        if kind == "function":
            domain = obj.get("domain") or []
            if not isinstance(domain, (list, tuple)) or len(domain) != 2:
                continue
            x0, x1 = _finite(domain[0]), _finite(domain[1])
            if x0 is None or x1 is None:
                continue
            expr = str(obj.get("expr") or "")
            samples = int(obj.get("samples") or 200)
            samples = max(2, min(samples, 400))
            for i in range(samples):
                x = x0 + (x1 - x0) * i / (samples - 1)
                try:
                    y = _eval_expr(expr, x)
                except Exception:
                    continue
                yf = _finite(y)
                if yf is None:
                    continue
                xs.append(x)
                ys.append(yf)
        elif kind == "line":
            start = obj.get("start") or [None, None]
            end = obj.get("end") or [None, None]
            if isinstance(start, (list, tuple)) and len(start) >= 2:
                _add_xy(xs, ys, start[0], start[1])
            if isinstance(end, (list, tuple)) and len(end) >= 2:
                _add_xy(xs, ys, end[0], end[1])
            for pt in obj.get("points") or []:
                if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                    _add_xy(xs, ys, pt[0], pt[1])
        elif kind == "polygon":
            for pt in obj.get("points") or []:
                if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                    _add_xy(xs, ys, pt[0], pt[1])
        elif kind == "point":
            at = obj.get("at") or obj.get("center")
            if isinstance(at, (list, tuple)) and len(at) >= 2:
                _add_xy(xs, ys, at[0], at[1])
        elif kind == "arrow":
            start = obj.get("start") or [None, None]
            end = obj.get("end") or [None, None]
            if isinstance(start, (list, tuple)) and len(start) >= 2:
                _add_xy(xs, ys, start[0], start[1])
            if isinstance(end, (list, tuple)) and len(end) >= 2:
                _add_xy(xs, ys, end[0], end[1])
        elif kind in {"circle", "arc"}:
            center = obj.get("center") or [None, None]
            r = _finite(obj.get("radius"))
            if isinstance(center, (list, tuple)) and len(center) >= 2 and r is not None:
                cx, cy = _finite(center[0]), _finite(center[1])
                if cx is not None and cy is not None:
                    xs.extend([cx - r, cx + r])
                    ys.extend([cy - r, cy + r])

    if len(xs) < 2 or len(ys) < 1:
        return None
    return min(xs), max(xs), min(ys), max(ys)


def _filter_ticks(ticks: Any, lo: float, hi: float, *, slack: float) -> list[Any]:
    if not isinstance(ticks, list):
        return []
    out: list[Any] = []
    for raw in ticks:
        val = _finite(raw)
        if val is None:
            # keep labelled categorical ticks as-is
            out.append(raw)
            continue
        if lo - slack <= val <= hi + slack:
            out.append(raw)
    return out


def tighten_graph_spec(
    spec: VisualSpec,
    *,
    pad_frac: float = 0.04,
    min_pad_frac: float = 0.02,
) -> VisualSpec:
    """Mutate ``spec.coordinate_system`` so axes hug plotted data.

    - Does not force inclusion of 0.
    - Negatives are fine.
    - Forces ``equal_aspect=False`` for science-style readability.
    - Trims far-away axis ticks that only existed to reach an empty origin.
    """
    extents = collect_graph_data_extents(spec)
    if extents is None:
        # Still drop equal-aspect distortion on graphs.
        spec.coordinate_system.equal_aspect = False
        return spec

    x0, x1, y0, y1 = extents
    if x1 < x0:
        x0, x1 = x1, x0
    if y1 < y0:
        y0, y1 = y1, y0

    span_x = max(x1 - x0, 1e-9)
    span_y = max(y1 - y0, 1e-9)
    # Near-flat series still need a visible band.
    if span_y / max(abs(y0), abs(y1), 1.0) < 1e-3:
        mid = 0.5 * (y0 + y1)
        pad = max(abs(mid) * 0.08, 1.0)
        y0, y1 = mid - pad, mid + pad
        span_y = y1 - y0
    if span_x / max(abs(x0), abs(x1), 1.0) < 1e-3:
        mid = 0.5 * (x0 + x1)
        pad = max(abs(mid) * 0.08, 1.0)
        x0, x1 = mid - pad, mid + pad
        span_x = x1 - x0

    pad_x = max(span_x * pad_frac, span_x * min_pad_frac, 1e-6)
    pad_y = max(span_y * pad_frac, span_y * min_pad_frac, 1e-6)

    new_xmin = x0 - pad_x
    new_xmax = x1 + pad_x
    new_ymin = y0 - pad_y
    new_ymax = y1 + pad_y

    # Flush baseline spines to the data floor/ceiling so peaks and curves
    # meet the axis (no empty strip under y=0 for spectra/counts).
    if y0 >= 0 and y1 >= 0:
        new_ymin = y0
        new_ymax = y1 + pad_y
    elif y0 <= 0 and y1 <= 0:
        new_ymax = y1
        new_ymin = y0 - pad_y

    # Time / counts from the origin: left spine at x=0, not a negative pad.
    if x0 == 0 and x1 > 0:
        new_xmin = 0.0
        new_xmax = x1 + pad_x
    elif x1 == 0 and x0 < 0:
        new_xmax = 0.0
        new_xmin = x0 - pad_x

    # If data already crosses zero, keep a little room on both sides (signed plots).
    if y0 < 0 < y1:
        new_ymin = min(y0 - pad_y, -pad_y)
        new_ymax = max(y1 + pad_y, pad_y)
    if x0 < 0 < x1:
        new_xmin = min(x0 - pad_x, -pad_x)
        new_xmax = max(x1 + pad_x, pad_x)

    cs = spec.coordinate_system
    # Only shrink (or mild expand for pad). Never re-introduce a huge empty origin
    # if the designer had already set a looser frame.
    # Prefer the tight frame always for graphs.
    spec.coordinate_system = CoordinateSystem(
        x_min=new_xmin,
        x_max=new_xmax,
        y_min=new_ymin,
        y_max=new_ymax,
        equal_aspect=False,
        show_axes=cs.show_axes if cs.show_axes else True,
    )

    slack_x = 0.08 * (new_xmax - new_xmin)
    slack_y = 0.08 * (new_ymax - new_ymin)
    for obj in spec.objects:
        if str(obj.get("type") or "").lower() != "axes":
            continue
        if "x_ticks" in obj:
            obj["x_ticks"] = _filter_ticks(obj.get("x_ticks"), new_xmin, new_xmax, slack=slack_x)
        if "y_ticks" in obj:
            obj["y_ticks"] = _filter_ticks(obj.get("y_ticks"), new_ymin, new_ymax, slack=slack_y)
        # Drop matching tick labels that no longer have ticks when lengths matched.
        xt = obj.get("x_ticks") or []
        yt = obj.get("y_ticks") or []
        xl = obj.get("x_tick_labels")
        yl = obj.get("y_tick_labels")
        if isinstance(xl, list) and len(xl) != len(xt):
            obj.pop("x_tick_labels", None)
        if isinstance(yl, list) and len(yl) != len(yt):
            obj.pop("y_tick_labels", None)
    return spec
