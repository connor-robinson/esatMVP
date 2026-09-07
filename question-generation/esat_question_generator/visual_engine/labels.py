"""Build managed text labels (spec, axes, captions) for collision placement."""

from __future__ import annotations

import re
from typing import Any

from matplotlib.axes import Axes

from .collision import LabelArtist
from .schema import CoordinateSystem, VisualSpec
from .style import ExamStyle
from .text_format import format_label_text

_NUMERIC_TICK_RE = re.compile(
    r"^\(?-?\d+(?:\.\d+)?\)?(?:\s*(?:cm|mm|m|s|kg|N|°))?$",
    re.IGNORECASE,
)
_AXIS_TITLE_RE = re.compile(
    r"^(x|y|t|s|v|a|f|r|θ|\\theta)(\s*/\s*.+)?$|"
    r".+/\s*(\\text\{)?(cm|mm|m|s|kg|N|s\^|cm\^)",
    re.IGNORECASE,
)


def caption_label_spec(ann: dict[str, Any], cs: CoordinateSystem, index: int) -> dict[str, Any]:
    position = str(ann.get("position") or "bottom_center").lower()
    span_y = max(cs.y_max - cs.y_min, 1e-6)
    span_x = max(cs.x_max - cs.x_min, 1e-6)
    x = 0.5 * (cs.x_min + cs.x_max)
    y = cs.y_min + 0.02 * span_y
    preferred = "below"
    ha_hint = "center"
    if position == "bottom_left":
        x = cs.x_min + 0.02 * span_x
        ha_hint = "left"
    elif position == "bottom_right":
        x = cs.x_max - 0.02 * span_x
        ha_hint = "right"
    elif position == "top_center":
        y = cs.y_max - 0.02 * span_y
        preferred = "above"
    return {
        "id": str(ann.get("id") or f"caption_{index + 1}"),
        "text": str(ann.get("text") or ""),
        "anchor": [x, y],
        "preferred_position": preferred,
        "caption": True,
        "ha_hint": ha_hint,
    }


def axis_label_specs(obj: dict[str, Any], cs: CoordinateSystem) -> list[dict[str, Any]]:
    """Axis titles + optional tick labels from an axes object."""
    x_label = str(obj.get("x_label") or "x")
    y_label = str(obj.get("y_label") or "y")
    pad_x = 0.04 * (cs.x_max - cs.x_min)
    pad_y = 0.04 * (cs.y_max - cs.y_min)
    tick_pad_x = 0.035 * (cs.x_max - cs.x_min)
    tick_pad_y = 0.035 * (cs.y_max - cs.y_min)
    base_id = str(obj.get("id") or "axes")
    specs: list[dict[str, Any]] = [
        {
            "id": f"{base_id}_x",
            "text": x_label,
            "anchor": [cs.x_max - pad_x, -tick_pad_y],
            "preferred_position": "below",
            "math": bool(obj.get("x_label_math", True)),
            "axis_label": True,
            "axis_side": "x_title",
        },
        {
            "id": f"{base_id}_y",
            "text": y_label,
            "anchor": [-tick_pad_x, cs.y_max - pad_y],
            "preferred_position": "left",
            "math": bool(obj.get("y_label_math", True)),
            "axis_label": True,
            "axis_side": "y_title",
        },
    ]

    x_ticks = obj.get("x_ticks") or []
    y_ticks = obj.get("y_ticks") or []
    x_tick_labels = obj.get("x_tick_labels")
    y_tick_labels = obj.get("y_tick_labels")

    for i, raw in enumerate(x_ticks):
        try:
            val = float(raw)
        except (TypeError, ValueError):
            continue
        text = (
            str(x_tick_labels[i])
            if isinstance(x_tick_labels, list) and i < len(x_tick_labels)
            else str(raw)
        )
        specs.append(
            {
                "id": f"{base_id}_xtick_{i}",
                "text": text,
                "anchor": [val, -tick_pad_y],
                "preferred_position": "below",
                "math": False,
                "axis_label": True,
                "axis_side": "x_tick",
            }
        )

    for i, raw in enumerate(y_ticks):
        try:
            val = float(raw)
        except (TypeError, ValueError):
            continue
        text = (
            str(y_tick_labels[i])
            if isinstance(y_tick_labels, list) and i < len(y_tick_labels)
            else str(raw)
        )
        specs.append(
            {
                "id": f"{base_id}_ytick_{i}",
                "text": text,
                "anchor": [-tick_pad_x, val],
                "preferred_position": "left",
                "math": False,
                "axis_label": True,
                "axis_side": "y_tick",
            }
        )
    return specs


def _plain_label_text(text: str) -> str:
    t = (text or "").strip()
    t = re.sub(r"^\$|\$$", "", t)
    t = re.sub(r"\\text\{([^}]*)\}", r"\1", t)
    t = re.sub(r"\\mathrm\{([^}]*)\}", r"\1", t)
    return t.strip()


def _looks_like_numeric_tick(text: str) -> bool:
    plain = _plain_label_text(text).replace(" ", "")
    if plain in {"0", "O", "o"}:
        return True
    return bool(_NUMERIC_TICK_RE.match(_plain_label_text(text).strip()))


def _looks_like_axis_title(text: str, label_id: str) -> bool:
    lid = label_id.lower()
    if "axis" in lid and "tick" not in lid:
        return True
    plain = _plain_label_text(text)
    if plain.lower() in {"x", "y", "t", "s", "v", "a"}:
        return True
    return bool(_AXIS_TITLE_RE.match(plain.replace(" ", ""))) or "/" in plain


def normalize_graph_labels(
    labels: list[dict[str, Any]],
    cs: CoordinateSystem,
    *,
    diagram_type: str,
) -> list[dict[str, Any]]:
    """Snap free tick/title labels onto axes for graph-like specs.

    Gemini often draws arrows manually and emits free labels with anchors that
    the placer then pushes into the plot. Treat numeric near-axis labels as ticks.
    """
    span_x = max(cs.x_max - cs.x_min, 1e-6)
    span_y = max(cs.y_max - cs.y_min, 1e-6)
    # Near-axis band (data units).
    band_x = 0.12 * span_x
    band_y = 0.12 * span_y
    tick_pad_x = 0.03 * span_x
    tick_pad_y = 0.03 * span_y

    out: list[dict[str, Any]] = []
    for lbl in labels:
        item = dict(lbl)
        label_id = str(item.get("id") or "")
        text = str(item.get("text") or "")
        try:
            ax_ = float(item["anchor"][0])
            ay_ = float(item["anchor"][1])
        except (KeyError, TypeError, ValueError, IndexError):
            out.append(item)
            continue

        already_axis = bool(item.get("axis_label") or item.get("caption"))
        near_x_axis = abs(ay_) <= band_y
        near_y_axis = abs(ax_) <= band_x
        is_tick = _looks_like_numeric_tick(text)
        is_title = _looks_like_axis_title(text, label_id)

        if not already_axis and (diagram_type == "graph" or near_x_axis or near_y_axis):
            if is_tick and near_x_axis and not (is_tick and near_y_axis and abs(ax_) < band_x and abs(ay_) < band_y):
                # Prefer x-tick when closer to x-axis than y-axis.
                if abs(ay_) <= abs(ax_) or not near_y_axis:
                    item["anchor"] = [ax_, -tick_pad_y]
                    item["preferred_position"] = "below"
                    item["axis_label"] = True
                    item["axis_side"] = "x_tick"
                else:
                    item["anchor"] = [-tick_pad_x, ay_]
                    item["preferred_position"] = "left"
                    item["axis_label"] = True
                    item["axis_side"] = "y_tick"
            elif is_tick and near_y_axis:
                item["anchor"] = [-tick_pad_x, ay_]
                item["preferred_position"] = "left"
                item["axis_label"] = True
                item["axis_side"] = "y_tick"
            elif is_tick and abs(ax_) <= band_x and abs(ay_) <= band_y:
                # Origin
                item["anchor"] = [-tick_pad_x, -tick_pad_y]
                item["preferred_position"] = "lower_left"
                item["axis_label"] = True
                item["axis_side"] = "origin"
            elif is_title and near_x_axis and abs(ax_) > 0.4 * span_x:
                item["anchor"] = [cs.x_max - 0.04 * span_x, -tick_pad_y]
                item["preferred_position"] = "below"
                item["axis_label"] = True
                item["axis_side"] = "x_title"
            elif is_title and (near_y_axis or ay_ > 0.6 * cs.y_max):
                item["anchor"] = [-tick_pad_x, cs.y_max - 0.04 * span_y]
                item["preferred_position"] = "left"
                item["axis_label"] = True
                item["axis_side"] = "y_title"

        out.append(item)
    return out


def collect_label_specs(spec: VisualSpec, extra_labels: list[dict[str, Any]]) -> list[dict[str, Any]]:
    combined: list[dict[str, Any]] = []
    combined.extend(spec.labels)
    combined.extend(extra_labels)
    for idx, ann in enumerate(spec.annotations):
        if str(ann.get("type") or "").lower() == "caption":
            combined.append(caption_label_spec(ann, spec.coordinate_system, idx))
    return normalize_graph_labels(
        combined,
        spec.coordinate_system,
        diagram_type=str(spec.diagram_type or "geometry"),
    )


def create_label_artists(ax: Axes, label_specs: list[dict[str, Any]], style: ExamStyle) -> list[LabelArtist]:
    labels: list[LabelArtist] = []
    for idx, lbl in enumerate(label_specs):
        label_id = str(lbl.get("id") or f"label_{idx + 1}")
        raw_text = str(lbl.get("text") or "")
        is_caption = bool(lbl.get("caption"))
        is_axis = (
            bool(lbl.get("axis_label"))
            or label_id.startswith("tick_")
            or label_id.startswith("label_axis")
            or "_xtick_" in label_id
            or "_ytick_" in label_id
        )
        is_math = bool(lbl.get("math")) and not is_caption
        text = format_label_text(raw_text, math=is_math)
        anchor = (float(lbl["anchor"][0]), float(lbl["anchor"][1]))
        preferred = str(lbl.get("preferred_position") or "above")
        if preferred.lower() == "center" and not is_caption:
            preferred = "upper_right"

        fontsize = style.font_size
        color = style.stroke
        fontstyle = "normal"
        if is_caption:
            fontsize = max(style.font_size - 1.0, 8.0)
            color = "#444444"
            fontstyle = "italic"
        elif is_axis:
            fontsize = max(style.font_size - 0.5, 9.0)

        artist = ax.text(
            anchor[0],
            anchor[1],
            text,
            ha="center",
            va="center",
            fontsize=fontsize,
            color=color,
            fontstyle=fontstyle,
            fontfamily=style.font_family,
        )
        labels.append(
            LabelArtist(
                label_id=label_id,
                text=raw_text,
                anchor=anchor,
                preferred_position=preferred,
                artist=artist,
                role="caption" if is_caption else ("axis" if is_axis else "label"),
            )
        )
    return labels
