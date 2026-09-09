"""Legacy Matplotlib chem atom/bond drawer (removed).

Chemical structures are rendered exclusively via RDKit MolDraw2DSVG
(`visual_engine.chem_rdkit`). Specs must contain SMILES only.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from ..errors import VisualSpecError
from ..style import ExamStyle
from ..collision.obstacles import ObstacleSet

if TYPE_CHECKING:
    from matplotlib.axes import Axes


def draw_chem_structure(ax: Axes, obj: dict[str, Any], style: ExamStyle, obstacles: ObstacleSet) -> None:
    raise VisualSpecError(
        "chem_structure is rendered with RDKit MolDraw2DSVG; Matplotlib atom/bond drawing is disabled"
    )
