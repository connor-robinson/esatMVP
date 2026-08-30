"""Main Matplotlib renderer entry point."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from .collision import ObstacleSet, resolve_label_collisions
from .errors import DiagramLayoutError, VisualSpecError
from .labels import collect_label_specs, create_label_artists
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
    extra_labels: list[dict[str, Any]] = []
    fig, ax = plt.subplots(figsize=style.figsize, facecolor=style.background)
    try:
        _setup_axes(fig, ax, spec)
        draw_objects(ax, spec, style, obstacles, extra_labels)
        label_specs = collect_label_specs(spec, extra_labels)
        labels = create_label_artists(ax, label_specs, style)
        resolve_label_collisions(fig, ax, labels, obstacles, style)

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
