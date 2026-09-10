"""Graph / axes drawing."""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

from ..collision.obstacles import ObstacleSet
from ..graph_presets import apply_native_axes, normalize_graph_preset
from ..style import ExamStyle

if TYPE_CHECKING:
    from matplotlib.axes import Axes


_ALLOWED_FUNCS = {
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "sqrt": math.sqrt,
    "log": math.log,
    "exp": math.exp,
    "abs": abs,
    "pi": math.pi,
}


def _eval_expr(expr: str, x: float) -> float:
    allowed = {
        "x": x,
        "math": math,
        **{k: v for k, v in _ALLOWED_FUNCS.items() if k != "pi"},
    }
    allowed["pi"] = math.pi
    return float(eval(expr, {"__builtins__": {}}, allowed))  # noqa: S307


def draw_axes(
    ax: Axes,
    obj: dict,
    style: ExamStyle,
    cs,
    obstacles: ObstacleSet,
    extra_labels: list | None = None,
    *,
    preset: str | None = None,
    use_native: bool = True,
) -> None:
    """Draw axis chrome.

    When ``use_native`` is true (graph path), titles/ticks use Matplotlib APIs only
    and are never added to ``extra_labels`` / collision resolution.
    """
    x_min, x_max = cs.x_min, cs.x_max
    y_min, y_max = cs.y_min, cs.y_max
    obstacles.add_segment(x_min, 0 if y_min <= 0 <= y_max else y_min, x_max, 0 if y_min <= 0 <= y_max else y_min, kind="axis")
    obstacles.add_segment(0 if x_min <= 0 <= x_max else x_min, y_min, 0 if x_min <= 0 <= x_max else x_min, y_max, kind="axis")

    if use_native:
        name = normalize_graph_preset(preset or obj.get("preset") or obj.get("graph_preset"))
        apply_native_axes(ax, obj, preset=name, style=style)
        return

    # Legacy geometry-style axes (kept for non-graph diagrams that still request axes).
    from ..labels import axis_label_specs

    ax.spines["left"].set_position(("data", 0))
    ax.spines["bottom"].set_position(("data", 0))
    ax.spines["right"].set_color("none")
    ax.spines["top"].set_color("none")
    lw = style.stroke_width * 0.9
    ax.annotate(
        "",
        xy=(x_max, 0),
        xytext=(x_min, 0),
        arrowprops=dict(arrowstyle="->", color=style.stroke, lw=lw),
        annotation_clip=False,
    )
    ax.annotate(
        "",
        xy=(0, y_max),
        xytext=(0, y_min),
        arrowprops=dict(arrowstyle="->", color=style.stroke, lw=lw),
        annotation_clip=False,
    )
    tick = max(abs(x_max - x_min), abs(y_max - y_min)) * 0.012
    for raw in obj.get("x_ticks") or []:
        try:
            val = float(raw)
        except (TypeError, ValueError):
            continue
        ax.plot([val, val], [-tick, tick], color=style.stroke, linewidth=lw, clip_on=False)
    for raw in obj.get("y_ticks") or []:
        try:
            val = float(raw)
        except (TypeError, ValueError):
            continue
        ax.plot([-tick, tick], [val, val], color=style.stroke, linewidth=lw, clip_on=False)
    if extra_labels is not None:
        extra_labels.extend(axis_label_specs(obj, cs))


def draw_function(
    ax: Axes,
    obj: dict,
    style: ExamStyle,
    obstacles: ObstacleSet,
    y_min: float | None = None,
    y_max: float | None = None,
) -> None:
    expr = str(obj["expr"])
    domain = obj["domain"]
    x0, x1 = float(domain[0]), float(domain[1])
    samples = int(obj.get("samples") or 200)
    if samples < 2:
        samples = 2
    xs: list[float] = []
    ys: list[float] = []
    for i in range(samples):
        x = x0 + (x1 - x0) * i / (samples - 1)
        try:
            y = _eval_expr(expr, x)
        except (ValueError, ZeroDivisionError, OverflowError):
            continue
        if not math.isfinite(y):
            continue
        if y_min is not None and y < y_min:
            continue
        if y_max is not None and y > y_max:
            continue
        xs.append(x)
        ys.append(y)
    if len(xs) < 2:
        return
    color = str(obj.get("color") or obj.get("edgecolor") or style.stroke)
    ax.plot(xs, ys, color=color, linewidth=float(obj.get("linewidth") or style.stroke_width))
    obstacles.add_polyline(list(zip(xs, ys)), kind="function")

