"""Build VisualSpecs for chem_structure and pedigree from idea_plan data."""

from __future__ import annotations

from typing import Any

from .objects.pedigree import layout_pedigree
from .schema import parse_spec


def chem_structure_spec(raw: dict[str, Any], *, source_question_id: str = "", variation_mode: str = "") -> dict[str, Any]:
    atoms = list(raw.get("atoms") or [])
    xs = [float(a.get("x") or 0) for a in atoms if isinstance(a, dict)]
    ys = [float(a.get("y") or 0) for a in atoms if isinstance(a, dict)]
    pad = 1.2
    x_min = (min(xs) if xs else 0) - pad
    x_max = (max(xs) if xs else 4) + pad
    y_min = (min(ys) if ys else 0) - pad
    y_max = (max(ys) if ys else 3) + pad
    spec = {
        "spec_version": "1.0",
        "needs_diagram": True,
        "diagram_type": "geometry",
        "diagram_id": "chem1",
        "not_to_scale": True,
        "coordinate_system": {
            "x_min": x_min,
            "x_max": x_max,
            "y_min": y_min,
            "y_max": y_max,
            "equal_aspect": True,
            "show_axes": False,
        },
        "objects": [
            {
                "id": "structure",
                "type": "chem_structure",
                "atoms": atoms,
                "bonds": list(raw.get("bonds") or []),
            }
        ],
        "labels": [],
        "annotations": [],
        "source_question_id": source_question_id,
        "variation_mode": variation_mode,
    }
    return parse_spec(spec).to_dict()


def pedigree_spec(raw: dict[str, Any], *, source_question_id: str = "", variation_mode: str = "") -> dict[str, Any]:
    coords = layout_pedigree(raw)
    xs = [p[0] for p in coords.values()] or [0.0]
    ys = [p[1] for p in coords.values()] or [0.0]
    spec = {
        "spec_version": "1.0",
        "needs_diagram": True,
        "diagram_type": "geometry",
        "diagram_id": "ped1",
        "not_to_scale": True,
        "coordinate_system": {
            "x_min": min(xs) - 1.2,
            "x_max": max(xs) + 1.2,
            "y_min": min(ys) - 1.6,
            "y_max": max(ys) + 1.2,
            "equal_aspect": True,
            "show_axes": False,
        },
        "objects": [
            {
                "id": "pedigree",
                "type": "pedigree",
                "people": list(raw.get("people") or []),
                "unions": list(raw.get("unions") or []),
                "children": list(raw.get("children") or []),
                "key": raw.get("key", True),
            }
        ],
        "labels": [],
        "annotations": [],
        "source_question_id": source_question_id,
        "variation_mode": variation_mode,
    }
    return parse_spec(spec).to_dict()
