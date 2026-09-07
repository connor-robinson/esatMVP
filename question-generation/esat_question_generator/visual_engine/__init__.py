"""Deterministic Matplotlib diagram renderer for ESAT-style exam figures."""

from .diagram_designer import DiagramDesignerInput, DiagramDesignerResult, run_diagram_designer
from .errors import DiagramLayoutError, VisualSpecError
from .generation import generate_diagram, regenerate_diagram
from .render_matplotlib import RenderResult, render_diagram
from .review_store import ReviewStore
from .schema import VisualSpec, parse_spec
from .visual_verifier import VisualVerifierResult, run_visual_verifier

__all__ = [
    "DiagramDesignerInput",
    "DiagramDesignerResult",
    "DiagramLayoutError",
    "RenderResult",
    "ReviewStore",
    "VisualSpec",
    "VisualSpecError",
    "VisualVerifierResult",
    "generate_diagram",
    "parse_spec",
    "regenerate_diagram",
    "render_diagram",
    "run_diagram_designer",
    "run_visual_verifier",
]
