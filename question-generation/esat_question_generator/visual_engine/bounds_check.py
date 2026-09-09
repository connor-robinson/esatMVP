"""Post-render figure bounds checks for text artists."""

from __future__ import annotations

from typing import Any

from .errors import DiagramLayoutError


def assert_text_inside_figure(fig, *, margin_px: float = 2.0) -> None:
    """Raise if any visible text artist extends outside the figure canvas."""
    fig.canvas.draw()
    renderer = fig.canvas.get_renderer()
    width = float(fig.bbox.width)
    height = float(fig.bbox.height)
    outside: list[str] = []
    for artist in fig.findobj(match=lambda a: getattr(a, "get_window_extent", None) is not None):
        # Only check Text / Annotation text content.
        text = getattr(artist, "get_text", lambda: "")()
        if not str(text or "").strip():
            continue
        if not getattr(artist, "get_visible", lambda: True)():
            continue
        try:
            bbox = artist.get_window_extent(renderer=renderer)
        except Exception:
            continue
        if (
            bbox.x0 < -margin_px
            or bbox.y0 < -margin_px
            or bbox.x1 > width + margin_px
            or bbox.y1 > height + margin_px
        ):
            label = str(getattr(artist, "get_label", lambda: "")() or text)[:60]
            outside.append(label)
    if outside:
        detail = "; ".join(outside[:6])
        raise DiagramLayoutError(
            f"Text outside figure bounds: {detail}",
            issues=outside,
        )


def series_label_specs_only(label_specs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop axis/tick/title-like labels; keep data-series labels for auto-placement."""
    kept: list[dict[str, Any]] = []
    for lbl in label_specs:
        if not isinstance(lbl, dict):
            continue
        if bool(lbl.get("axis_label")):
            continue
        side = str(lbl.get("axis_side") or "").lower()
        if side in {"x_title", "y_title", "x_tick", "y_tick"}:
            continue
        lid = str(lbl.get("id") or "").lower()
        if (
            lid.startswith("tick_")
            or "_xtick_" in lid
            or "_ytick_" in lid
            or lid.endswith("_xtitle")
            or lid.endswith("_ytitle")
            or lid.startswith("axes_")
        ):
            continue
        if not str(lbl.get("text") or "").strip():
            continue
        kept.append(lbl)
    return kept
