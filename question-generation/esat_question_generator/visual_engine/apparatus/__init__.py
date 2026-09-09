"""SVG apparatus component library for chemistry lab diagrams.

AI plans which pieces to place; this module draws them programmatically.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from xml.sax.saxutils import escape


COMPONENT_TYPES = frozenset(
    {
        "beaker",
        "conical_flask",
        "test_tube",
        "gas_jar",
        "delivery_tube",
        "bunsen",
        "stand",
        "label",
    }
)


@dataclass(frozen=True)
class ComponentGeom:
    kind: str
    x: float
    y: float
    w: float
    h: float
    label: str = ""
    rotate: float = 0.0
    extras: dict[str, Any] | None = None


def _beaker_svg(g: ComponentGeom) -> str:
    x, y, w, h = g.x, g.y, g.w, g.h
    lip = h * 0.08
    return (
        f'<g transform="translate({x:.1f},{y:.1f})">'
        f'<path d="M {w*0.08:.1f},{lip:.1f} L {w*0.08:.1f},{h:.1f} L {w*0.92:.1f},{h:.1f} '
        f'L {w*0.92:.1f},{lip:.1f}" fill="none" stroke="#111" stroke-width="2"/>'
        f'<path d="M 0,{lip:.1f} L {w:.1f},{lip:.1f}" fill="none" stroke="#111" stroke-width="2"/>'
        f'<line x1="{w*0.2:.1f}" y1="{h*0.55:.1f}" x2="{w*0.8:.1f}" y2="{h*0.55:.1f}" '
        f'stroke="#111" stroke-width="1.2" stroke-dasharray="3 2"/>'
        f"</g>"
    )


def _conical_flask_svg(g: ComponentGeom) -> str:
    x, y, w, h = g.x, g.y, g.w, g.h
    neck_w = w * 0.22
    neck_h = h * 0.28
    return (
        f'<g transform="translate({x:.1f},{y:.1f})">'
        f'<path d="M {(w-neck_w)/2:.1f},0 L {(w+neck_w)/2:.1f},0 '
        f'L {(w+neck_w)/2:.1f},{neck_h:.1f} L {w:.1f},{h:.1f} L 0,{h:.1f} '
        f'L {(w-neck_w)/2:.1f},{neck_h:.1f} Z" fill="none" stroke="#111" stroke-width="2"/>'
        f'<line x1="{w*0.25:.1f}" y1="{h*0.72:.1f}" x2="{w*0.75:.1f}" y2="{h*0.72:.1f}" '
        f'stroke="#111" stroke-width="1.2" stroke-dasharray="3 2"/>'
        f"</g>"
    )


def _test_tube_svg(g: ComponentGeom) -> str:
    x, y, w, h = g.x, g.y, g.w, g.h
    r = w / 2
    return (
        f'<g transform="translate({x:.1f},{y:.1f})">'
        f'<path d="M 0,0 L 0,{h-r:.1f} A {r:.1f} {r:.1f} 0 0 0 {w:.1f},{h-r:.1f} L {w:.1f},0" '
        f'fill="none" stroke="#111" stroke-width="2"/>'
        f"</g>"
    )


def _gas_jar_svg(g: ComponentGeom) -> str:
    x, y, w, h = g.x, g.y, g.w, g.h
    return (
        f'<g transform="translate({x:.1f},{y:.1f})">'
        f'<rect x="0" y="0" width="{w:.1f}" height="{h:.1f}" rx="2" ry="2" '
        f'fill="none" stroke="#111" stroke-width="2"/>'
        f"</g>"
    )


def _delivery_tube_svg(g: ComponentGeom) -> str:
    extras = g.extras or {}
    x2 = float(extras.get("x2", g.x + g.w))
    y2 = float(extras.get("y2", g.y))
    return (
        f'<path d="M {g.x:.1f},{g.y:.1f} L {x2:.1f},{g.y:.1f} L {x2:.1f},{y2:.1f}" '
        f'fill="none" stroke="#111" stroke-width="2"/>'
    )


def _bunsen_svg(g: ComponentGeom) -> str:
    x, y, w, h = g.x, g.y, g.w, g.h
    return (
        f'<g transform="translate({x:.1f},{y:.1f})">'
        f'<rect x="{w*0.35:.1f}" y="{h*0.35:.1f}" width="{w*0.3:.1f}" height="{h*0.65:.1f}" '
        f'fill="none" stroke="#111" stroke-width="2"/>'
        f'<path d="M {w*0.5:.1f},{h*0.35:.1f} L {w*0.35:.1f},{h*0.05:.1f} '
        f'L {w*0.65:.1f},{h*0.05:.1f} Z" fill="none" stroke="#111" stroke-width="1.6"/>'
        f"</g>"
    )


def _stand_svg(g: ComponentGeom) -> str:
    x, y, w, h = g.x, g.y, g.w, g.h
    return (
        f'<g transform="translate({x:.1f},{y:.1f})">'
        f'<line x1="{w*0.2:.1f}" y1="{h:.1f}" x2="{w*0.8:.1f}" y2="{h:.1f}" stroke="#111" stroke-width="2"/>'
        f'<line x1="{w*0.5:.1f}" y1="0" x2="{w*0.5:.1f}" y2="{h:.1f}" stroke="#111" stroke-width="2"/>'
        f"</g>"
    )


def _label_svg(g: ComponentGeom) -> str:
    return (
        f'<text x="{g.x:.1f}" y="{g.y:.1f}" fill="#111" font-size="14" '
        f'font-family="Times New Roman, serif">{escape(g.label)}</text>'
    )


_DRAWERS = {
    "beaker": _beaker_svg,
    "conical_flask": _conical_flask_svg,
    "test_tube": _test_tube_svg,
    "gas_jar": _gas_jar_svg,
    "delivery_tube": _delivery_tube_svg,
    "bunsen": _bunsen_svg,
    "stand": _stand_svg,
    "label": _label_svg,
}


def parse_component(raw: dict[str, Any]) -> ComponentGeom:
    kind = str(raw.get("type") or raw.get("kind") or "").strip().lower()
    if kind not in COMPONENT_TYPES:
        raise ValueError(f"Unknown apparatus component {kind!r}")
    return ComponentGeom(
        kind=kind,
        x=float(raw.get("x") or 0),
        y=float(raw.get("y") or 0),
        w=float(raw.get("w") or raw.get("width") or 60),
        h=float(raw.get("h") or raw.get("height") or 80),
        label=str(raw.get("label") or ""),
        rotate=float(raw.get("rotate") or 0),
        extras={k: v for k, v in raw.items() if k not in {"type", "kind", "x", "y", "w", "h", "width", "height", "label", "rotate"}},
    )


def compose_svg(
    components: list[dict[str, Any]],
    *,
    width: float = 420,
    height: float = 300,
    title: str = "",
) -> str:
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width:.0f}" height="{height:.0f}" '
        f'viewBox="0 0 {width:.0f} {height:.0f}">',
        '<rect width="100%" height="100%" fill="white"/>',
    ]
    if title:
        parts.append(
            f'<text x="{width/2:.1f}" y="22" text-anchor="middle" fill="#111" '
            f'font-size="14" font-family="Times New Roman, serif">{escape(title)}</text>'
        )
    for raw in components:
        geom = parse_component(raw)
        drawer = _DRAWERS[geom.kind]
        parts.append(drawer(geom))
        if geom.label and geom.kind != "label":
            parts.append(
                f'<text x="{geom.x + geom.w/2:.1f}" y="{geom.y + geom.h + 16:.1f}" '
                f'text-anchor="middle" fill="#111" font-size="12" '
                f'font-family="Times New Roman, serif">{escape(geom.label)}</text>'
            )
    parts.append("</svg>")
    return "\n".join(parts)


def default_layout_plan(raw: dict[str, Any]) -> list[dict[str, Any]]:
    """If the model only names pieces, place a simple left-to-right lab bench."""
    named = raw.get("components")
    if isinstance(named, list) and named and isinstance(named[0], dict) and "x" in named[0]:
        return [dict(item) for item in named if isinstance(item, dict)]

    kinds = []
    if isinstance(named, list):
        for item in named:
            if isinstance(item, str):
                kinds.append(item)
            elif isinstance(item, dict):
                kinds.append(str(item.get("type") or item.get("kind") or ""))
    for key in ("pieces", "equipment"):
        for item in raw.get(key) or []:
            if isinstance(item, str):
                kinds.append(item)
            elif isinstance(item, dict):
                kinds.append(str(item.get("type") or item.get("kind") or ""))

    kinds = [k.strip().lower().replace(" ", "_") for k in kinds if str(k).strip()]
    if not kinds:
        kinds = ["beaker", "delivery_tube", "gas_jar"]

    placed: list[dict[str, Any]] = []
    x = 40.0
    y = 70.0
    for kind in kinds:
        if kind not in COMPONENT_TYPES:
            continue
        if kind == "delivery_tube":
            placed.append({"type": kind, "x": x - 10, "y": y + 30, "w": 80, "h": 40, "x2": x + 70, "y2": y + 90})
            x += 50
            continue
        if kind == "bunsen":
            placed.append({"type": kind, "x": x, "y": y + 90, "w": 40, "h": 70, "label": "heat"})
            x += 70
            continue
        if kind == "test_tube":
            placed.append({"type": kind, "x": x, "y": y, "w": 28, "h": 110})
            x += 70
            continue
        if kind == "conical_flask":
            placed.append({"type": kind, "x": x, "y": y, "w": 70, "h": 110, "label": ""})
            x += 100
            continue
        if kind == "gas_jar":
            placed.append({"type": kind, "x": x, "y": y + 20, "w": 60, "h": 100})
            x += 90
            continue
        placed.append({"type": "beaker", "x": x, "y": y, "w": 70, "h": 100})
        x += 100
    return placed
