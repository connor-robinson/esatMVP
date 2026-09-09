"""Strict graph rendering presets (native Matplotlib axes only)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .errors import VisualSpecError
from .text_format import format_label_text

GRAPH_PRESETS = frozenset(
    {
        "cartesian",
        "science_xy",
        "log_x",
        "signed_y",
        "multi_series",
    }
)

DEFAULT_GRAPH_PRESET = "science_xy"


@dataclass(frozen=True)
class GraphPresetLayout:
    name: str
    left: float
    right: float
    bottom: float
    top: float
    origin_spines: bool
    boxed: bool
    x_arrows: bool
    y_arrows: bool


_LAYOUTS: dict[str, GraphPresetLayout] = {
    "cartesian": GraphPresetLayout(
        name="cartesian",
        left=0.12,
        right=0.96,
        bottom=0.14,
        top=0.94,
        origin_spines=True,
        boxed=False,
        x_arrows=True,
        y_arrows=True,
    ),
    "science_xy": GraphPresetLayout(
        name="science_xy",
        left=0.16,
        right=0.97,
        bottom=0.18,
        top=0.94,
        origin_spines=False,
        boxed=True,
        x_arrows=False,
        y_arrows=False,
    ),
    "log_x": GraphPresetLayout(
        name="log_x",
        left=0.16,
        right=0.97,
        bottom=0.20,
        top=0.94,
        origin_spines=False,
        boxed=True,
        x_arrows=False,
        y_arrows=False,
    ),
    "signed_y": GraphPresetLayout(
        name="signed_y",
        left=0.18,
        right=0.96,
        bottom=0.18,
        top=0.92,
        origin_spines=False,
        boxed=True,
        x_arrows=False,
        y_arrows=False,
    ),
    "multi_series": GraphPresetLayout(
        name="multi_series",
        left=0.16,
        right=0.86,
        bottom=0.18,
        top=0.94,
        origin_spines=False,
        boxed=True,
        x_arrows=False,
        y_arrows=False,
    ),
}


def normalize_graph_preset(raw: Any) -> str:
    value = str(raw or "").strip().lower().replace("-", "_")
    aliases = {
        "math": "cartesian",
        "cartesian_sparse": "cartesian",
        "science": "science_xy",
        "science_xy_units": "science_xy",
        "log": "log_x",
        "log_x_linear_y": "log_x",
        "quadrant_signed": "signed_y",
        "signed": "signed_y",
        "multi": "multi_series",
        "multi_series_labelled": "multi_series",
    }
    value = aliases.get(value, value)
    if value in GRAPH_PRESETS:
        return value
    return DEFAULT_GRAPH_PRESET


def resolve_graph_preset(spec: Any) -> str:
    """Pick preset from top-level field, axes object, or heuristics."""
    if isinstance(spec, dict):
        raw = spec.get("graph_preset")
        objects = spec.get("objects") or []
        cs = spec.get("coordinate_system") or {}
    else:
        raw = getattr(spec, "graph_preset", None)
        objects = getattr(spec, "objects", None) or []
        cs = getattr(spec, "coordinate_system", None)
        cs = {
            "x_min": getattr(cs, "x_min", 0),
            "x_max": getattr(cs, "x_max", 1),
            "y_min": getattr(cs, "y_min", 0),
            "y_max": getattr(cs, "y_max", 1),
        }

    if raw:
        return normalize_graph_preset(raw)

    axes_obj: dict[str, Any] = {}
    for obj in objects:
        if isinstance(obj, dict) and str(obj.get("type") or "").lower() == "axes":
            axes_obj = obj
            if obj.get("preset") or obj.get("graph_preset"):
                return normalize_graph_preset(obj.get("preset") or obj.get("graph_preset"))
            break

    x_ticks = axes_obj.get("x_ticks") or []
    y_min = float(cs.get("y_min") or 0)
    y_max = float(cs.get("y_max") or 1)
    labels = []
    if isinstance(spec, dict):
        labels = list(spec.get("labels") or [])
    else:
        labels = list(getattr(spec, "labels", None) or [])

    x_label = str(axes_obj.get("x_label") or "").lower()
    y_label = str(axes_obj.get("y_label") or "").lower()
    if x_label in {"x", ""} and y_label in {"y", ""}:
        return "cartesian"

    # Decade-style concentration axes.
    if len(x_ticks) >= 4:
        try:
            vals = sorted(float(v) for v in x_ticks)
            gaps = [vals[i + 1] - vals[i] for i in range(len(vals) - 1)]
            if gaps and all(abs(g - gaps[0]) < 1e-6 for g in gaps) and abs(gaps[0] - 1.0) < 1e-6:
                xtl = " ".join(str(t) for t in (axes_obj.get("x_tick_labels") or []))
                if "10^" in xtl or "10^{" in xtl or "mol" in str(axes_obj.get("x_label") or "").lower():
                    return "log_x"
        except (TypeError, ValueError):
            pass

    if y_min < 0 < y_max:
        return "signed_y"

    series_like = [
        lbl
        for lbl in labels
        if isinstance(lbl, dict)
        and str(lbl.get("text") or "").strip()
        and not bool(lbl.get("axis_label"))
    ]
    if len(series_like) >= 2:
        return "multi_series"

    return DEFAULT_GRAPH_PRESET


def layout_for_preset(preset: str) -> GraphPresetLayout:
    name = normalize_graph_preset(preset)
    return _LAYOUTS[name]


def _tick_values(raw: Any) -> list[float]:
    out: list[float] = []
    for item in raw or []:
        try:
            out.append(float(item))
        except (TypeError, ValueError):
            continue
    return out


def _tick_labels(values: list[float], labels: Any, *, math: bool) -> list[str]:
    out: list[str] = []
    for i, val in enumerate(values):
        if isinstance(labels, list) and i < len(labels) and str(labels[i]).strip():
            text = str(labels[i]).strip()
        else:
            text = str(int(val)) if float(val).is_integer() else f"{val:g}"
        out.append(format_label_text(text, math=math or ("^" in text or "_" in text or "\\" in text)))
    return out


def apply_native_axes(ax, axes_obj: dict[str, Any], *, preset: str, style) -> None:
    """Draw axis chrome with Matplotlib APIs only. Never creates collision labels."""
    layout = layout_for_preset(preset)
    stroke = getattr(style, "stroke", "#111111")
    lw = float(getattr(style, "stroke_width", 1.2)) * 0.9
    fontsize = float(getattr(style, "font_size", 11.0))
    family = getattr(style, "font_family", "serif")

    for spine in ax.spines.values():
        spine.set_color(stroke)
        spine.set_linewidth(lw)

    if layout.origin_spines:
        ax.spines["left"].set_position(("data", 0))
        ax.spines["bottom"].set_position(("data", 0))
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.xaxis.set_ticks_position("bottom")
        ax.yaxis.set_ticks_position("left")
    elif layout.boxed:
        for name in ("left", "bottom", "top", "right"):
            ax.spines[name].set_visible(name in {"left", "bottom"})
    else:
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)

    x_ticks = _tick_values(axes_obj.get("x_ticks"))
    y_ticks = _tick_values(axes_obj.get("y_ticks"))
    if x_ticks:
        ax.set_xticks(x_ticks)
        ax.set_xticklabels(
            _tick_labels(x_ticks, axes_obj.get("x_tick_labels"), math=True),
            fontsize=max(fontsize - 1.0, 8.0),
            fontfamily=family,
            color=stroke,
        )
    if y_ticks:
        ax.set_yticks(y_ticks)
        ax.set_yticklabels(
            _tick_labels(y_ticks, axes_obj.get("y_tick_labels"), math=False),
            fontsize=max(fontsize - 1.0, 8.0),
            fontfamily=family,
            color=stroke,
        )

    ax.tick_params(
        axis="both",
        which="both",
        length=4.5,
        width=lw,
        colors=stroke,
        direction="out",
        pad=3,
    )

    x_label = str(axes_obj.get("x_label") or "").strip()
    y_label = str(axes_obj.get("y_label") or "").strip()
    if x_label:
        ax.set_xlabel(
            format_label_text(x_label, math=bool(axes_obj.get("x_label_math", True))),
            fontsize=fontsize,
            fontfamily=family,
            color=stroke,
            labelpad=6,
        )
    if y_label:
        ax.set_ylabel(
            format_label_text(y_label, math=bool(axes_obj.get("y_label_math", True))),
            fontsize=fontsize,
            fontfamily=family,
            color=stroke,
            labelpad=6,
        )

    # Optional arrows on positive ends for cartesian math axes.
    if layout.x_arrows or layout.y_arrows:
        x0, x1 = ax.get_xlim()
        y0, y1 = ax.get_ylim()
        if layout.x_arrows:
            ax.annotate(
                "",
                xy=(x1, 0.0 if layout.origin_spines else y0),
                xytext=(x1 - 0.02 * (x1 - x0), 0.0 if layout.origin_spines else y0),
                arrowprops=dict(arrowstyle="->", color=stroke, lw=lw),
                annotation_clip=False,
            )
        if layout.y_arrows:
            ax.annotate(
                "",
                xy=(0.0 if layout.origin_spines else x0, y1),
                xytext=(0.0 if layout.origin_spines else x0, y1 - 0.02 * (y1 - y0)),
                arrowprops=dict(arrowstyle="->", color=stroke, lw=lw),
                annotation_clip=False,
            )

    # Zero reference for signed_y.
    if normalize_graph_preset(preset) == "signed_y":
        ax.axhline(0.0, color=stroke, linewidth=lw * 0.8, linestyle="--", zorder=1)


def find_axes_object(objects: list[dict[str, Any]]) -> dict[str, Any]:
    for obj in objects:
        if isinstance(obj, dict) and str(obj.get("type") or "").lower() == "axes":
            return obj
    return {"type": "axes", "x_label": "x", "y_label": "y"}


def assert_known_preset(raw: Any) -> str:
    value = str(raw or "").strip()
    if not value:
        return DEFAULT_GRAPH_PRESET
    name = normalize_graph_preset(value)
    if name not in GRAPH_PRESETS:
        raise VisualSpecError(f"Unknown graph_preset {value!r}")
    return name
