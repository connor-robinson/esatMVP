"""Deterministic checks for visual placeholders / spec linkage.

The V4 implementer is supposed to:

* insert ``<GRAPH id="g1" />`` or ``<DIAGRAM id="d1" />`` in the stem when a
  visual is required, and
* set ``visual_requirements.visual_need`` to one of the routing strings.

We check that those signals are mutually consistent.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Set

_GRAPH_TAG = re.compile(r"<GRAPH\s+id\s*=\s*\"([^\"]+)\"\s*/?>", re.IGNORECASE)
_DIAG_TAG = re.compile(r"<DIAGRAM\s+id\s*=\s*\"([^\"]+)\"\s*/?>", re.IGNORECASE)

_VALID_VISUAL_NEEDS = {
    "none",
    "accurate_graph_json",
    "accurate_schematic_json",
    "concept_image_only",
}


def _ids_in_stem(stem: str) -> Set[str]:
    return set(_GRAPH_TAG.findall(stem)) | set(_DIAG_TAG.findall(stem))


def validate_visual_linkage(
    question_pkg: Dict[str, Any],
    *,
    graph_spec: Optional[Dict[str, Any]] = None,
    schematic_spec: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, str]]:
    errs: List[Dict[str, str]] = []
    visual_req = question_pkg.get("visual_requirements") or {}
    if not isinstance(visual_req, dict):
        errs.append({"field": "visual_requirements", "kind": "missing", "message": "visual_requirements must be an object."})
        return errs

    visual_need = (visual_req.get("visual_need") or "").strip()
    if visual_need and visual_need not in _VALID_VISUAL_NEEDS:
        errs.append(
            {
                "field": "visual_requirements.visual_need",
                "kind": "invalid_enum",
                "message": f"visual_need must be one of {_VALID_VISUAL_NEEDS}, got {visual_need!r}.",
            }
        )

    stem = (question_pkg.get("question") or {}).get("stem", "") or ""
    has_graph_placeholder = bool(_GRAPH_TAG.search(stem))
    has_diagram_placeholder = bool(_DIAG_TAG.search(stem))

    if visual_need == "accurate_graph_json":
        if not has_graph_placeholder:
            errs.append(
                {
                    "field": "question.stem",
                    "kind": "missing_placeholder",
                    "message": "visual_need=accurate_graph_json but stem has no <GRAPH id=\"...\" /> placeholder.",
                }
            )
        if graph_spec is not None:
            ids = _ids_in_stem(stem)
            gid = str(graph_spec.get("graph_id", "")).strip()
            if gid and ids and gid not in ids:
                errs.append(
                    {
                        "field": "graph_spec.graph_id",
                        "kind": "placeholder_mismatch",
                        "message": f"graph_spec.graph_id={gid!r} not found in stem placeholders {sorted(ids)}.",
                    }
                )
    elif visual_need == "accurate_schematic_json":
        if not has_diagram_placeholder:
            errs.append(
                {
                    "field": "question.stem",
                    "kind": "missing_placeholder",
                    "message": "visual_need=accurate_schematic_json but stem has no <DIAGRAM id=\"...\" /> placeholder.",
                }
            )
        if schematic_spec is not None:
            ids = _ids_in_stem(stem)
            did = str(schematic_spec.get("diagram_id", "")).strip()
            if did and ids and did not in ids:
                errs.append(
                    {
                        "field": "schematic_spec.diagram_id",
                        "kind": "placeholder_mismatch",
                        "message": f"schematic_spec.diagram_id={did!r} not found in stem placeholders {sorted(ids)}.",
                    }
                )
    else:
        # No visual route claimed but stem references a visual -> ambiguous.
        if has_graph_placeholder or has_diagram_placeholder:
            errs.append(
                {
                    "field": "question.stem",
                    "kind": "stray_placeholder",
                    "message": (
                        "Stem references a graph/diagram placeholder but visual_need is "
                        f"{visual_need!r}; placeholder must be removed or visual_need updated."
                    ),
                }
            )

    # Defensive: concept images must never be answer-bearing in V4.
    if visual_need == "concept_image_only":
        ans_dep = bool(visual_req.get("answer_depends_on_visual", False))
        if ans_dep:
            errs.append(
                {
                    "field": "visual_requirements.answer_depends_on_visual",
                    "kind": "concept_image_answer_bearing",
                    "message": "concept_image_only assets must not be answer-bearing.",
                }
            )

    return errs
