"""Render-measure-adjust loop for collision-free labels."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from matplotlib.text import Text

from ..errors import DiagramLayoutError
from ..style import ExamStyle
from .bbox import pt_to_data, text_bbox_data
from .obstacles import ObstacleSet
from .placement import (
    CANDIDATES,
    apply_candidate,
    bounds_rect,
    candidate_order,
    label_collides,
    offset_distance,
    score_candidate,
)

if TYPE_CHECKING:
    from matplotlib.axes import Axes
    from matplotlib.figure import Figure


@dataclass
class LabelArtist:
    label_id: str
    text: str
    anchor: tuple[float, float]
    preferred_position: str
    artist: Text
    candidate_index: int = 0


@dataclass
class PlacementState:
    labels: list[LabelArtist] = field(default_factory=list)


def resolve_label_collisions(
    fig: Figure,
    ax: Axes,
    labels: list[LabelArtist],
    obstacles: ObstacleSet,
    style: ExamStyle,
) -> None:
    if not labels:
        return

    fig.canvas.draw()
    renderer = fig.canvas.get_renderer()
    label_gap = pt_to_data(ax, style.min_label_gap_pt, "y")
    segment_clearance = pt_to_data(ax, style.min_label_clearance_pt, "y")
    bounds_margin = pt_to_data(ax, style.bounds_margin_pt, "y")
    bounds = bounds_rect(ax, bounds_margin)
    offset_dist = offset_distance(ax, style)

    max_iters = style.max_placement_iterations
    for _ in range(max_iters):
        fig.canvas.draw()
        renderer = fig.canvas.get_renderer()
        rects: list[tuple[float, float, float, float]] = []
        for lbl in labels:
            rects.append(text_bbox_data(lbl.artist, renderer))

        any_collision = False
        for idx, lbl in enumerate(labels):
            others = [r for j, r in enumerate(rects) if j != idx]
            issues = label_collides(
                rects[idx],
                obstacles=obstacles,
                other_label_rects=others,
                bounds=bounds,
                label_gap=label_gap,
                segment_clearance=segment_clearance,
            )
            if not issues:
                continue

            any_collision = True
            order = candidate_order(lbl.preferred_position)
            best_score = float("-inf")
            best_candidate_idx = lbl.candidate_index
            best_pos = (lbl.artist.get_position()[0], lbl.artist.get_position()[1])
            best_ha = lbl.artist.get_ha()
            best_va = lbl.artist.get_va()

            for cand_idx, cand in enumerate(order):
                pos, ha, va = apply_candidate(anchor=lbl.anchor, candidate=cand, offset_dist=offset_dist)
                lbl.artist.set_position(pos)
                lbl.artist.set_ha(ha)
                lbl.artist.set_va(va)
                fig.canvas.draw()
                trial_rect = text_bbox_data(lbl.artist, renderer)
                trial_issues = label_collides(
                    trial_rect,
                    obstacles=obstacles,
                    other_label_rects=others,
                    bounds=bounds,
                    label_gap=label_gap,
                    segment_clearance=segment_clearance,
                )
                score = score_candidate(trial_rect, lbl.anchor, trial_issues)
                if score > best_score:
                    best_score = score
                    best_candidate_idx = cand_idx
                    best_pos = pos
                    best_ha = ha
                    best_va = va

            lbl.artist.set_position(best_pos)
            lbl.artist.set_ha(best_ha)
            lbl.artist.set_va(best_va)
            lbl.candidate_index = best_candidate_idx

        if not any_collision:
            return

    fig.canvas.draw()
    renderer = fig.canvas.get_renderer()
    remaining: list[str] = []
    rects = [text_bbox_data(lbl.artist, renderer) for lbl in labels]
    for idx, lbl in enumerate(labels):
        others = [r for j, r in enumerate(rects) if j != idx]
        issues = label_collides(
            rects[idx],
            obstacles=obstacles,
            other_label_rects=others,
            bounds=bounds,
            label_gap=label_gap,
            segment_clearance=segment_clearance,
        )
        if issues:
            remaining.append(f"{lbl.label_id}: {', '.join(issues)}")

    if remaining:
        raise DiagramLayoutError(
            "Could not resolve label collisions within attempt limit",
            issues=remaining,
        )
