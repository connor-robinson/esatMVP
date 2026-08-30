"""Main Matplotlib renderer entry point."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from .collision import LabelArtist, ObstacleSet, resolve_label_collisions
from .errors import DiagramLayoutError, VisualSpecError
from .objects import draw_objects
from .schema import VisualSpec, parse_spec
from .style import DEFAULT_STYLE, ExamStyle


@dataclass
class RenderResult:
    path: Path
    spec: VisualSpec
    renderer: str = "matplotlib_diagram_v1"
    dpi: int = 220
    label_placements: list[dict[str, Any]] | None = None


def _setup_axes(fig, ax, spec: VisualSpec) -> None:
    cs = spec.coordinate_system
    ax.set_xlim(cs.x_min, cs.x_max)
    ax.set_ylim(cs.y_min, cs.y_max)
    if cs.equal_aspect:
        ax.set_aspect("equal", adjustable="box")
    if cs.show_axes:
        ax.tick_params(left=False, bottom=False, labelleft=False, labelbottom=False)
        for spine in ax.spines.values():
            spine.set_visible(False)
    else:
        ax.axis("off")
    ax.set_facecolor("white")


def _draw_annotations(ax, spec: VisualSpec, style: ExamStyle) -> None:
    cs = spec.coordinate_system
    for ann in spec.annotations:
        if str(ann.get("type") or "").lower() != "caption":
            continue
        text = str(ann.get("text") or "")
        position = str(ann.get("position") or "bottom_center").lower()
        x = 0.5 * (cs.x_min + cs.x_max)
        y = cs.y_min + 0.04 * (cs.y_max - cs.y_min)
        ha = "center"
        if position == "bottom_left":
            x = cs.x_min + 0.02 * (cs.x_max - cs.x_min)
            ha = "left"
        elif position == "bottom_right":
            x = cs.x_max - 0.02 * (cs.x_max - cs.x_min)
            ha = "right"
        ax.text(
            x,
            y,
            text,
            ha=ha,
            va="bottom",
            fontsize=max(style.font_size - 1.0, 8.0),
            color="#444444",
            style="italic",
            fontfamily=style.font_family,
        )


def _create_labels(ax, spec: VisualSpec, style: ExamStyle) -> list[LabelArtist]:
    labels: list[LabelArtist] = []
    for idx, lbl in enumerate(spec.labels):
        label_id = str(lbl.get("id") or f"label_{idx + 1}")
        text = str(lbl["text"])
        anchor = (float(lbl["anchor"][0]), float(lbl["anchor"][1]))
        preferred = str(lbl.get("preferred_position") or "center")
        artist = ax.text(
            anchor[0],
            anchor[1],
            text,
            ha="center",
            va="center",
            fontsize=style.font_size,
            color=style.stroke,
            fontfamily=style.font_family,
        )
        labels.append(
            LabelArtist(
                label_id=label_id,
                text=text,
                anchor=anchor,
                preferred_position=preferred,
                artist=artist,
            )
        )
    return labels


def render_diagram(
    spec: VisualSpec | dict[str, Any],
    out_path: str | Path,
    *,
    style: ExamStyle | None = None,
) -> RenderResult:
    """Render a visual spec to PNG. Raises DiagramLayoutError if labels collide."""
    if isinstance(spec, dict):
        spec = parse_spec(spec)
    if not spec.needs_diagram:
        raise VisualSpecError("spec.needs_diagram is false")

    style = style or DEFAULT_STYLE
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    obstacles = ObstacleSet()
    fig, ax = plt.subplots(figsize=style.figsize, facecolor=style.background)
    try:
        _setup_axes(fig, ax, spec)
        draw_objects(ax, spec, style, obstacles)
        labels = _create_labels(ax, spec, style)
        resolve_label_collisions(fig, ax, labels, obstacles, style)
        _draw_annotations(ax, spec, style)

        fig.savefig(
            out_path,
            dpi=style.dpi,
            bbox_inches="tight",
            pad_inches=style.pad_inches,
            facecolor=style.background,
            transparent=False,
        )

        placements = [
            {
                "id": lbl.label_id,
                "position": (float(lbl.artist.get_position()[0]), float(lbl.artist.get_position()[1])),
                "ha": lbl.artist.get_ha(),
                "va": lbl.artist.get_va(),
            }
            for lbl in labels
        ]
        return RenderResult(path=out_path, spec=spec, dpi=style.dpi, label_placements=placements)
    finally:
        plt.close(fig)
