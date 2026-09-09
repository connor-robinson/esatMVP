"""Build VisualSpecs for chem_structure and pedigree from idea_plan data."""

from __future__ import annotations

from typing import Any

from .chem_rdkit import normalize_chem_structure_payload
from .objects.pedigree import layout_pedigree
from .schema import parse_spec


def chem_structure_spec(raw: dict[str, Any], *, source_question_id: str = "", variation_mode: str = "") -> dict[str, Any]:
    """SMILES-only chem structure. RDKit owns 2D layout; no atoms/bonds in the spec."""
    data = normalize_chem_structure_payload(raw if isinstance(raw, dict) else {})
    props = {
        "canonical_smiles": data["smiles"],
        "input_smiles": data.get("input_smiles") or data["smiles"],
        "molecular_formula": data.get("molecular_formula"),
        "exact_mass": data.get("exact_mass"),
        "molecular_weight": data.get("molecular_weight"),
        "num_atoms": data.get("num_atoms"),
        "num_heavy_atoms": data.get("num_heavy_atoms"),
        "num_rings": data.get("num_rings"),
    }
    spec = {
        "spec_version": "1.0",
        "needs_diagram": True,
        "diagram_type": "chem_structure",
        "diagram_id": "chem1",
        "not_to_scale": True,
        "coordinate_system": {
            "x_min": 0.0,
            "x_max": 10.0,
            "y_min": 0.0,
            "y_max": 7.5,
            "equal_aspect": True,
            "show_axes": False,
        },
        "objects": [
            {
                "id": "structure",
                "type": "chem_structure",
                "smiles": data["smiles"],
                "input_smiles": props["input_smiles"],
                "molecular_formula": props["molecular_formula"],
                "exact_mass": props["exact_mass"],
                "molecular_weight": props["molecular_weight"],
                "num_atoms": props["num_atoms"],
                "num_heavy_atoms": props["num_heavy_atoms"],
                "num_rings": props["num_rings"],
            }
        ],
        "labels": [],
        "annotations": [],
        "source_question_id": source_question_id,
        "variation_mode": variation_mode,
    }
    out = parse_spec(spec).to_dict()
    out["rdkit_properties"] = props
    return out


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
