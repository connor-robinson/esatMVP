"""RDKit SMILES parsing and exam-style structure depiction (MolDraw2DSVG)."""

from __future__ import annotations

from typing import Any

from .errors import VisualSpecError


def _require_rdkit():
    try:
        from rdkit import Chem
        from rdkit.Chem import AllChem, Descriptors, rdMolDescriptors
        from rdkit.Chem.Draw import rdMolDraw2D
    except ImportError as exc:  # pragma: no cover
        raise VisualSpecError(
            "RDKit is required for chem_structure SMILES rendering. Install with: pip install rdkit"
        ) from exc
    return Chem, AllChem, Descriptors, rdMolDescriptors, rdMolDraw2D


def parse_mol(smiles: str):
    """Parse SMILES with RDKit. Rejects anything RDKit cannot parse."""
    Chem, AllChem, *_rest = _require_rdkit()
    text = str(smiles or "").strip()
    if not text:
        raise VisualSpecError("chem_structure requires a non-empty SMILES string")
    mol = Chem.MolFromSmiles(text)
    if mol is None:
        raise VisualSpecError(f"Invalid SMILES (RDKit could not parse): {text!r}")
    AllChem.Compute2DCoords(mol)
    return mol


def canonicalize_smiles(smiles: str) -> str:
    Chem, *_rest = _require_rdkit()
    mol = parse_mol(smiles)
    return Chem.MolToSmiles(mol, canonical=True)


def mol_properties(mol) -> dict[str, Any]:
    """Basic molecular properties for the question verifier."""
    Chem, _AllChem, Descriptors, rdMolDescriptors, _draw = _require_rdkit()
    formula = rdMolDescriptors.CalcMolFormula(mol)
    return {
        "molecular_formula": formula,
        "exact_mass": round(float(Descriptors.ExactMolWt(mol)), 6),
        "molecular_weight": round(float(Descriptors.MolWt(mol)), 4),
        "num_atoms": int(mol.GetNumAtoms()),
        "num_heavy_atoms": int(mol.GetNumHeavyAtoms()),
        "num_rings": int(rdMolDescriptors.CalcNumRings(mol)),
        "canonical_smiles": Chem.MolToSmiles(mol, canonical=True),
    }


def smiles_properties(smiles: str) -> dict[str, Any]:
    mol = parse_mol(smiles)
    props = mol_properties(mol)
    props["input_smiles"] = str(smiles or "").strip()
    return props


def _apply_exam_draw_options(opts) -> None:
    """Black-and-white exam-style depiction options."""
    opts.clearBackground = True
    opts.bondLineWidth = 1.8
    opts.additionalAtomLabelPadding = 0.12
    opts.padding = 0.12
    opts.fixedBondLength = 28.0
    # Monochrome: no element colouring.
    if hasattr(opts, "useBWAtomPalette"):
        opts.useBWAtomPalette()
    if hasattr(opts, "singleColourBonds"):
        opts.singleColourBonds = True
    opts.minFontSize = 12
    opts.maxFontSize = 18
    if hasattr(opts, "explicitMethyl"):
        opts.explicitMethyl = False


def smiles_to_svg(
    smiles: str,
    *,
    width: int = 520,
    height: int = 390,
) -> str:
    """Generate standard 2D depiction SVG via MolDraw2DSVG."""
    _Chem, _AllChem, _D, _MD, rdMolDraw2D = _require_rdkit()
    mol = parse_mol(smiles)
    drawer = rdMolDraw2D.MolDraw2DSVG(int(width), int(height))
    _apply_exam_draw_options(drawer.drawOptions())
    drawer.DrawMolecule(mol)
    drawer.FinishDrawing()
    return str(drawer.GetDrawingText())


def smiles_to_png_bytes(
    smiles: str,
    *,
    width: int = 520,
    height: int = 390,
) -> bytes:
    """Rasterize the same RDKit depiction for the PNG review pipeline.

    Depiction settings match MolDraw2DSVG. Prefer Cairo when available; otherwise
    rasterize the SVG via a minimal Pillow fallback is not available, so Cairo
    is required for PNG output.
    """
    _Chem, _AllChem, _D, _MD, rdMolDraw2D = _require_rdkit()
    mol = parse_mol(smiles)
    if not hasattr(rdMolDraw2D, "MolDraw2DCairo"):
        raise VisualSpecError(
            "RDKit Cairo support is required to write chem_structure PNG files"
        )
    drawer = rdMolDraw2D.MolDraw2DCairo(int(width), int(height))
    _apply_exam_draw_options(drawer.drawOptions())
    drawer.DrawMolecule(mol)
    drawer.FinishDrawing()
    return bytes(drawer.GetDrawingText())


def normalize_chem_structure_payload(raw: dict[str, Any]) -> dict[str, Any]:
    """SMILES-only chem payload. Rejects hand-placed atoms/bonds and invalid SMILES."""
    data = dict(raw or {})
    smiles = str(data.get("smiles") or data.get("SMILES") or "").strip()
    if not smiles:
        if data.get("atoms") or data.get("bonds"):
            raise VisualSpecError(
                "chem_structure must use SMILES only; do not specify atom coordinates or bonds"
            )
        raise VisualSpecError("chem_structure requires a valid SMILES string")
    props = smiles_properties(smiles)
    return {
        "smiles": props["canonical_smiles"],
        "input_smiles": props["input_smiles"],
        "molecular_formula": props["molecular_formula"],
        "exact_mass": props["exact_mass"],
        "molecular_weight": props["molecular_weight"],
        "num_atoms": props["num_atoms"],
        "num_heavy_atoms": props["num_heavy_atoms"],
        "num_rings": props["num_rings"],
    }


def render_chem_structure_files(
    smiles: str,
    *,
    png_path: str | Any,
    svg_path: str | Any | None = None,
    width: int = 520,
    height: int = 390,
) -> dict[str, Any]:
    """Parse SMILES, write SVG (MolDraw2DSVG) and PNG, return properties."""
    from pathlib import Path

    props = smiles_properties(smiles)
    svg = smiles_to_svg(props["canonical_smiles"], width=width, height=height)
    png = smiles_to_png_bytes(props["canonical_smiles"], width=width, height=height)
    png_out = Path(png_path)
    png_out.parent.mkdir(parents=True, exist_ok=True)
    png_out.write_bytes(png)
    if svg_path is not None:
        svg_out = Path(svg_path)
        svg_out.parent.mkdir(parents=True, exist_ok=True)
        svg_out.write_text(svg, encoding="utf-8")
    return props
