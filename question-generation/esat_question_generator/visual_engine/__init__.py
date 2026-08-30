"""Deterministic Matplotlib diagram renderer for ESAT-style exam figures."""

from .errors import DiagramLayoutError, VisualSpecError
from .render_matplotlib import RenderResult, render_diagram
from .schema import VisualSpec, parse_spec

__all__ = [
    "DiagramLayoutError",
    "RenderResult",
    "VisualSpec",
    "VisualSpecError",
    "parse_spec",
    "render_diagram",
]
