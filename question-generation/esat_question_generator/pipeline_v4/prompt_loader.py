"""Load V4 Physics prompts from ``by_subject_prompts/new/Physics/``.

We do **not** touch ``project.load_prompts`` — V4 has its own loader so the
legacy pipeline keeps working untouched.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Optional


def _read(path: Path) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


@dataclass
class PhysicsV4Prompts:
    # Required
    designer: str
    idea_judge: str
    implementer: str
    verifier: str
    style_checker: str
    retry_controller: str
    regen_header: str

    # Variation
    sibling_mode: str = ""
    far_mode: str = ""

    # Visual track
    diagram_graph_router: str = ""
    accurate_graph_spec: str = ""
    accurate_schematic_spec: str = ""
    concept_image_prompt: str = ""
    concept_image_verifier: str = ""
    concept_image_regen: str = ""
    graph_visual_verifier: str = ""
    visual_style_guide: str = ""

    # Carried over (not in V4 pack)
    tag_labeler: str = ""
    format_fixer: str = ""

    extras: Dict[str, str] = field(default_factory=dict)


_PHYSICS_FILES: Dict[str, str] = {
    # field name -> filename under by_subject_prompts/new/Physics/
    "designer": "Physics Designer.md",
    "idea_judge": "Physics Idea_Judge.md",
    "implementer": "Physics Implementer.md",
    "verifier": "Physics Verifier.md",
    "style_checker": "Physics Style_checker.md",
    "retry_controller": "Physics Retry_controller.md",
    "regen_header": "Physics regen header.md",
    "sibling_mode": "Physics Sibling Mode.md",
    "far_mode": "Physics Far Mode.md",
    "diagram_graph_router": "Physics Diagram_Graph_Router.md",
    "accurate_graph_spec": "Physics Accurate_Graph_Spec.md",
    "accurate_schematic_spec": "Physics Accurate_Schematic_Spec.md",
    "concept_image_prompt": "Physics Concept_Image_Prompt.md",
    "concept_image_verifier": "Physics Concept_Image_Verifier.md",
    "concept_image_regen": "Physics Concept_Image_Regen.md",
    "graph_visual_verifier": "Physics Graph_Visual_Verifier.md",
    "visual_style_guide": "Physics TMUA_ENGAA_Visual_Style_Guide.md",
    "tag_labeler": "Physics Tag_Labeler.md",
    "format_fixer": "Physics Format Fixer.md",
}

_REQUIRED = (
    "designer",
    "idea_judge",
    "implementer",
    "verifier",
    "style_checker",
    "retry_controller",
    "regen_header",
)


def physics_prompts_dir(base_dir: str) -> Path:
    return Path(base_dir) / "by_subject_prompts" / "new" / "Physics"


def load_physics_v4_prompts(base_dir: str) -> PhysicsV4Prompts:
    folder = physics_prompts_dir(base_dir)
    if not folder.is_dir():
        raise FileNotFoundError(
            f"Physics V4 prompt directory missing: {folder}. "
            "Expected by_subject_prompts/new/Physics/ next to the generator base_dir."
        )

    fields: Dict[str, str] = {}
    missing: list[str] = []
    for key, fn in _PHYSICS_FILES.items():
        p = folder / fn
        if p.is_file():
            fields[key] = _read(p)
        elif key in _REQUIRED:
            missing.append(str(p))
        else:
            fields[key] = ""

    if missing:
        raise FileNotFoundError(
            "V4 Physics pack is incomplete. Missing required files:\n  "
            + "\n  ".join(missing)
        )

    return PhysicsV4Prompts(**{k: fields.get(k, "") for k in _PHYSICS_FILES.keys()})


def load_schemas_for_physics(base_dir: str) -> Dict[str, Dict[str, str]]:
    """Reuse the legacy schema loader so we share one source of truth.

    Imported lazily to avoid pulling all of ``project.py`` at module import.
    """
    # Local import to avoid a heavy import cycle with project.py at startup.
    from project import (  # type: ignore
        load_schemas_esat_markdown,
        parse_schemas_from_markdown,
    )

    _path, md = load_schemas_esat_markdown(base_dir)
    return parse_schemas_from_markdown(md, allow_prefixes=("P",))
