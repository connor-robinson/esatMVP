"""Graph / axes drawing."""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

from ..collision.obstacles import ObstacleSet
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
    allowed = {"x": x, **{k: v for k, v in _ALLOWED_FUNCS.items() if k != "pi"}}
    allowed["pi"] = math.pi
    return float(eval(expr, {"__builtins__": {}}, allowed))  # noqa: S307


def draw_axes(
    ax: Axes,
    obj: dict,
    style: ExamStyle,
    cs,
    obstacles: ObstacleSet,
    extra_labels: list | None = None,
) -> None:
    from ..labels import axis_label_specs

    x_min, x_max = cs.x_min, cs.x_max
    y_min, y_max = cs.y_min, cs.y_max
    ax.spines["left"].set_position(("data", 0))
    ax.spines["bottom"].set_position(("data", 0))
    ax.spines["right"].set_color("none")
    ax.spines["top"].set_color("none")
    ax.plot([x_min, x_max], [0, 0], color=style.stroke, linewidth=style.stroke_width * 0.9, clip_on=False)
    ax.plot([0, 0], [y_min, y_max], color=style.stroke, linewidth=style.stroke_width * 0.9, clip_on=False)
    obstacles.add_segment(x_min, 0, x_max, 0, kind="axis")
    obstacles.add_segment(0, y_min, 0, y_max, kind="axis")

    if extra_labels is not None:
        extra_labels.extend(axis_label_specs(obj, cs))


def draw_function(ax: Axes, obj: dict, style: ExamStyle, obstacles: ObstacleSet, y_min: float | None = None, y_max: float | None = None) -> None:
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
    ax.plot(xs, ys, color=style.stroke, linewidth=float(obj.get("linewidth") or style.stroke_width))
    obstacles.add_polyline(list(zip(xs, ys)), kind="function")
