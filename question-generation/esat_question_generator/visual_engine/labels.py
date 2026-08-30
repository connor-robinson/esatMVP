"""Build managed text labels (spec, axes, captions) for collision placement."""

from __future__ import annotations

from typing import Any

from matplotlib.axes import Axes

from .collision import LabelArtist
from .schema import CoordinateSystem, VisualSpec
from .style import ExamStyle
from .text_format import format_label_text


def caption_label_spec(ann: dict[str, Any], cs: CoordinateSystem, index: int) -> dict[str, Any]:
    position = str(ann.get("position") or "bottom_center").lower()
    x = 0.5 * (cs.x_min + cs.x_max)
    y = cs.y_min + 0.04 * (cs.y_max - cs.y_min)
    preferred = "above"
    ha_hint = "center"
    if position == "bottom_left":
        x = cs.x_min + 0.02 * (cs.x_max - cs.x_min)
        preferred = "above"
        ha_hint = "left"
    elif position == "bottom_right":
        x = cs.x_max - 0.02 * (cs.x_max - cs.x_min)
        preferred = "above"
        ha_hint = "right"
    return {
        "id": str(ann.get("id") or f"caption_{index + 1}"),
        "text": str(ann.get("text") or ""),
        "anchor": [x, y],
        "preferred_position": preferred,
        "caption": True,
        "ha_hint": ha_hint,
    }


def axis_label_specs(obj: dict[str, Any], cs: CoordinateSystem) -> list[dict[str, Any]]:
    x_label = str(obj.get("x_label") or "x")
    y_label = str(obj.get("y_label") or "y")
    pad_x = 0.06 * (cs.x_max - cs.x_min)
    pad_y = 0.08 * (cs.y_max - cs.y_min)
    return [
        {
            "id": str(obj.get("id") or "axes") + "_x",
            "text": x_label,
            "anchor": [cs.x_max - pad_x, 0.0],
            "preferred_position": "right",
            "math": bool(obj.get("x_label_math", len(x_label) <= 2)),
            "axis_label": True,
        },
        {
            "id": str(obj.get("id") or "axes") + "_y",
            "text": y_label,
            "anchor": [0.0, cs.y_max - pad_y],
            "preferred_position": "above",
            "math": bool(obj.get("y_label_math", len(y_label) <= 2)),
            "axis_label": True,
        },
    ]


def collect_label_specs(spec: VisualSpec, extra_labels: list[dict[str, Any]]) -> list[dict[str, Any]]:
    combined: list[dict[str, Any]] = []
    combined.extend(spec.labels)
    combined.extend(extra_labels)
    for idx, ann in enumerate(spec.annotations):
        if str(ann.get("type") or "").lower() == "caption":
            combined.append(caption_label_spec(ann, spec.coordinate_system, idx))
    return combined


def create_label_artists(ax: Axes, label_specs: list[dict[str, Any]], style: ExamStyle) -> list[LabelArtist]:
    labels: list[LabelArtist] = []
    for idx, lbl in enumerate(label_specs):
        label_id = str(lbl.get("id") or f"label_{idx + 1}")
        raw_text = str(lbl.get("text") or "")
        is_caption = bool(lbl.get("caption"))
        is_math = bool(lbl.get("math")) and not is_caption
        text = format_label_text(raw_text, math=is_math)
        anchor = (float(lbl["anchor"][0]), float(lbl["anchor"][1]))
        preferred = str(lbl.get("preferred_position") or "center")

        fontsize = style.font_size
        color = style.stroke
        fontstyle = "normal"
        if is_caption:
            fontsize = max(style.font_size - 1.0, 8.0)
            color = "#444444"
            fontstyle = "italic"

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
                role="caption" if is_caption else ("axis" if lbl.get("axis_label") else "label"),
            )
        )
    return labels
