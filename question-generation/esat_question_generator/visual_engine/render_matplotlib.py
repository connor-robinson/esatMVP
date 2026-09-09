"""Main Matplotlib renderer entry point."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from .bounds_check import assert_text_inside_figure, series_label_specs_only
from .chem_rdkit import render_chem_structure_files
from .collision import ObstacleSet, resolve_label_collisions
from .errors import DiagramLayoutError, VisualSpecError
from .graph_presets import layout_for_preset, resolve_graph_preset
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
    graph_preset: str | None = None


def _setup_geometry_axes(fig, ax, spec: VisualSpec) -> None:
    cs = spec.coordinate_system
    span_x = max(cs.x_max - cs.x_min, 1e-6)
    span_y = max(cs.y_max - cs.y_min, 1e-6)
    pad_x = 0.08 * span_x
    pad_y = 0.08 * span_y
    ax.set_xlim(cs.x_min - pad_x, cs.x_max + pad_x)
    ax.set_ylim(cs.y_min - pad_y, cs.y_max + pad_y)
    if cs.equal_aspect:
        ax.set_aspect("equal", adjustable="box")
    if cs.show_axes:
        ax.tick_params(left=False, bottom=False, labelleft=False, labelbottom=False)
        for spine in ax.spines.values():
            spine.set_visible(False)
    else:
        ax.axis("off")
    ax.set_facecolor("white")


def _setup_graph_axes(fig, ax, spec: VisualSpec, preset: str) -> None:
    cs = spec.coordinate_system
    layout = layout_for_preset(preset)
    fig.subplots_adjust(left=layout.left, right=layout.right, bottom=layout.bottom, top=layout.top)
    ax.set_xlim(cs.x_min, cs.x_max)
    ax.set_ylim(cs.y_min, cs.y_max)
    if cs.equal_aspect:
        ax.set_aspect("equal", adjustable="box")
    ax.set_facecolor("white")
    # Native ticks/titles are applied later by draw_axes(use_native=True).
    ax.tick_params(left=True, bottom=True, labelleft=True, labelbottom=True)


def _place_series_labels_fixed(labels) -> None:
    """Offset series labels from their anchors without full collision search."""
    offsets = {
        "above": (0.0, 1.0, "center", "bottom"),
        "below": (0.0, -1.0, "center", "top"),
        "left": (-1.0, 0.0, "right", "center"),
        "right": (1.0, 0.0, "left", "center"),
        "upper_left": (-1.0, 1.0, "right", "bottom"),
        "upper_right": (1.0, 1.0, "left", "bottom"),
        "lower_left": (-1.0, -1.0, "right", "top"),
        "lower_right": (1.0, -1.0, "left", "top"),
        "center": (0.0, 0.0, "center", "center"),
    }
    for lbl in labels:
        dx, dy, ha, va = offsets.get(str(lbl.preferred_position or "above").lower(), offsets["above"])
        x, y = lbl.anchor
        # Small data-space nudge; keeps labels near their series without axis collision.
        span_guess = 1.0
        lbl.artist.set_position((x + 0.02 * dx * abs(x or 1), y + 0.03 * dy * max(abs(y), span_guess)))
        lbl.artist.set_ha(ha)
        lbl.artist.set_va(va)


def _render_graph(
    spec: VisualSpec,
    out_path: Path,
    style: ExamStyle,
) -> RenderResult:
    preset = resolve_graph_preset(spec)
    obstacles = ObstacleSet()
    extra_labels: list[dict[str, Any]] = []
    fig, ax = plt.subplots(figsize=style.figsize, facecolor=style.background)
    try:
        _setup_graph_axes(fig, ax, spec, preset)
        draw_objects(
            ax,
            spec,
            style,
            obstacles,
            extra_labels,
            graph_preset=preset,
            native_graph_axes=True,
        )
        # Axis chrome is native Matplotlib. Only series labels are placed, and they
        # never go through the geometry collision engine used for free diagram text.
        label_specs = series_label_specs_only(
            collect_label_specs(spec, extra_labels, normalize_axes=False)
        )
        labels = create_label_artists(ax, label_specs, style)
        _place_series_labels_fixed(labels)
        layout_error: DiagramLayoutError | None = None
        try:
            assert_text_inside_figure(fig, margin_px=4.0)
        except DiagramLayoutError as exc:
            layout_error = exc

        fig.savefig(
            out_path,
            dpi=style.dpi,
            bbox_inches=None,
            facecolor=style.background,
            transparent=False,
        )
        if layout_error is not None:
            raise layout_error

        placements = [
            {
                "id": lbl.label_id,
                "position": (float(lbl.artist.get_position()[0]), float(lbl.artist.get_position()[1])),
                "ha": lbl.artist.get_ha(),
                "va": lbl.artist.get_va(),
            }
            for lbl in labels
        ]
        return RenderResult(
            path=out_path,
            spec=spec,
            dpi=style.dpi,
            label_placements=placements,
            graph_preset=preset,
            renderer=f"matplotlib_graph_{preset}",
        )
    finally:
        plt.close(fig)


def _render_geometry(
    spec: VisualSpec,
    out_path: Path,
    style: ExamStyle,
) -> RenderResult:
    obstacles = ObstacleSet()
    extra_labels: list[dict[str, Any]] = []
    fig, ax = plt.subplots(figsize=style.figsize, facecolor=style.background)
    try:
        _setup_geometry_axes(fig, ax, spec)
        draw_objects(ax, spec, style, obstacles, extra_labels, native_graph_axes=False)
        label_specs = collect_label_specs(spec, extra_labels)
        labels = create_label_artists(ax, label_specs, style)
        layout_error: DiagramLayoutError | None = None
        try:
            resolve_label_collisions(fig, ax, labels, obstacles, style)
        except DiagramLayoutError as exc:
            layout_error = exc

        try:
            assert_text_inside_figure(fig)
        except DiagramLayoutError as exc:
            layout_error = layout_error or exc

        fig.savefig(
            out_path,
            dpi=style.dpi,
            bbox_inches="tight",
            pad_inches=style.pad_inches,
            facecolor=style.background,
            transparent=False,
        )
        if layout_error is not None:
            raise layout_error

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


def _chem_smiles_from_spec(spec: VisualSpec) -> str:
    for obj in spec.objects:
        if str(obj.get("type") or "").lower() == "chem_structure":
            smiles = str(obj.get("smiles") or "").strip()
            if smiles:
                return smiles
    raise VisualSpecError("chem_structure diagram requires an object with smiles")


def _render_chem_structure(
    spec: VisualSpec,
    out_path: Path,
    style: ExamStyle,
) -> RenderResult:
    smiles = _chem_smiles_from_spec(spec)
    svg_path = out_path.with_suffix(".svg")
    props = render_chem_structure_files(
        smiles,
        png_path=out_path,
        svg_path=svg_path,
        width=max(360, int(style.figsize[0] * style.dpi * 0.55)),
        height=max(280, int(style.figsize[1] * style.dpi * 0.55)),
    )
    # Keep derived properties on the object for downstream verifiers.
    for obj in spec.objects:
        if str(obj.get("type") or "").lower() == "chem_structure":
            obj["smiles"] = props["canonical_smiles"]
            obj["input_smiles"] = props.get("input_smiles") or smiles
            obj["molecular_formula"] = props.get("molecular_formula")
            obj["exact_mass"] = props.get("exact_mass")
            obj["molecular_weight"] = props.get("molecular_weight")
            obj["num_atoms"] = props.get("num_atoms")
            obj["num_heavy_atoms"] = props.get("num_heavy_atoms")
            obj["num_rings"] = props.get("num_rings")
            break
    return RenderResult(
        path=out_path,
        spec=spec,
        dpi=style.dpi,
        label_placements=[],
        renderer="rdkit_moldraw2dsvg",
    )


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

    dtype = str(spec.diagram_type or "").lower()
    if dtype == "graph":
        return _render_graph(spec, out_path, style)
    if dtype == "chem_structure" or any(
        str(o.get("type") or "").lower() == "chem_structure" for o in spec.objects
    ):
        return _render_chem_structure(spec, out_path, style)
    return _render_geometry(spec, out_path, style)
