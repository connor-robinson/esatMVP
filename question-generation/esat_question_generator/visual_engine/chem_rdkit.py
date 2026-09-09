"""Deterministic chemical structure rendering via RDKit SMILES."""

from __future__ import annotations

from typing import Any

from .errors import VisualSpecError


def _require_rdkit():
    try:
        from rdkit import Chem
        from rdkit.Chem import Draw
        from rdkit.Chem.Draw import rdMolDraw2D
    except ImportError as exc:  # pragma: no cover
        raise VisualSpecError(
            "RDKit is required for chem_structure SMILES rendering. Install with: pip install rdkit"
        ) from exc
    return Chem, Draw, rdMolDraw2D


def smiles_to_png_bytes(
    smiles: str,
    *,
    width: int = 480,
    height: int = 360,
    highlight_atoms: list[int] | None = None,
) -> bytes:
    Chem, _Draw, rdMolDraw2D = _require_rdkit()
    mol = Chem.MolFromSmiles(str(smiles or "").strip())
    if mol is None:
        raise VisualSpecError(f"Invalid SMILES: {smiles!r}")
    drawer = rdMolDraw2D.MolDraw2DCairo(int(width), int(height))
    opts = drawer.drawOptions()
    opts.clearBackground = True
    opts.bondLineWidth = 1.6
    atoms = list(highlight_atoms or [])
    drawer.DrawMolecule(mol, highlightAtoms=atoms or None)
    drawer.FinishDrawing()
    return bytes(drawer.GetDrawingText())


def smiles_to_atom_bond_fallback(smiles: str) -> dict[str, Any]:
    """Atom/bond dict derived from RDKit 2D coords (Matplotlib draw path)."""
    Chem, _Draw, _rd = _require_rdkit()
    from rdkit.Chem import AllChem

    mol = Chem.MolFromSmiles(str(smiles or "").strip())
    if mol is None:
        raise VisualSpecError(f"Invalid SMILES: {smiles!r}")
    AllChem.Compute2DCoords(mol)
    conf = mol.GetConformer()
    atoms: list[dict[str, Any]] = []
    for atom in mol.GetAtoms():
        pos = conf.GetAtomPosition(atom.GetIdx())
        symbol = atom.GetSymbol()
        # Carbon labels omitted for cleaner organic drawings.
        label = "" if symbol == "C" else symbol
        atoms.append({"id": f"a{atom.GetIdx()}", "label": label, "x": float(pos.x), "y": float(pos.y)})
    bonds: list[dict[str, Any]] = []
    for bond in mol.GetBonds():
        order = int(round(bond.GetBondTypeAsDouble()))
        bonds.append(
            {
                "from": f"a{bond.GetBeginAtomIdx()}",
                "to": f"a{bond.GetEndAtomIdx()}",
                "order": max(1, min(order, 3)),
            }
        )
    return {"atoms": atoms, "bonds": bonds, "smiles": smiles}


def normalize_chem_structure_payload(raw: dict[str, Any]) -> dict[str, Any]:
    """Prefer SMILES; expand to atoms/bonds when only SMILES is provided."""
    data = dict(raw or {})
    smiles = str(data.get("smiles") or data.get("SMILES") or "").strip()
    atoms = data.get("atoms") or []
    if smiles:
        expanded = smiles_to_atom_bond_fallback(smiles)
        data["smiles"] = smiles
        data["atoms"] = expanded["atoms"]
        data["bonds"] = expanded["bonds"]
        return data
    if isinstance(atoms, list) and atoms:
        return data
    raise VisualSpecError("chem_structure requires smiles (preferred) or atoms/bonds")
