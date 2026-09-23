"""Deterministic post-render consistency checks for pedigree schemas.

This does not use an LLM. It verifies the drawable payload still matches the
validated genetics schema (IDs, sexes, statuses, family topology).
"""

from __future__ import annotations

from typing import Any

from .pedigree_schema import validate_pedigree


def check_pedigree_render_consistency(
    schema: dict[str, Any] | None,
    *,
    rendered_object: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return PASS/FAIL against the structured pedigree schema."""
    errors: list[str] = []
    result = validate_pedigree(schema or {})
    if not result.valid or not result.pedigree:
        return {
            "status": "FAIL",
            "errors": result.errors or ["pedigree schema invalid"],
            "retry": False,
        }

    pedigree = result.pedigree
    obj = rendered_object or {}
    # Prefer individuals on the rendered object when present.
    people = obj.get("individuals") or obj.get("people") or pedigree["individuals"]
    families = obj.get("families") or []
    if not families and obj.get("children"):
        families = [
            {
                "parents": list(item.get("parents") or []),
                "children": list(item.get("offspring") or item.get("children") or []),
            }
            for item in obj.get("children") or []
            if isinstance(item, dict)
        ]
    if not families:
        families = pedigree["families"]

    schema_ids = {str(p["id"]) for p in pedigree["individuals"]}
    drawn_ids = {str(p.get("id") or "") for p in people if isinstance(p, dict)}
    drawn_ids.discard("")
    if schema_ids != drawn_ids:
        missing = sorted(schema_ids - drawn_ids)
        extra = sorted(drawn_ids - schema_ids)
        if missing:
            errors.append(f"Missing individuals in render payload: {', '.join(missing)}")
        if extra:
            errors.append(f"Extra individuals in render payload: {', '.join(extra)}")

    by_schema = {str(p["id"]): p for p in pedigree["individuals"]}
    for person in people:
        if not isinstance(person, dict):
            continue
        pid = str(person.get("id") or "")
        if pid not in by_schema:
            continue
        expect = by_schema[pid]
        sex = str(person.get("sex") or "").lower()
        if sex and sex != expect["sex"]:
            errors.append(f"Individual {pid} sex mismatch: {sex} vs {expect['sex']}")
        status = str(person.get("status") or "").lower()
        if not status and person.get("affected") is True:
            status = "affected"
        if status and status != expect["status"]:
            errors.append(f"Individual {pid} status mismatch: {status} vs {expect['status']}")

    for fam in pedigree["families"]:
        parents = set(map(str, fam.get("parents") or []))
        if len(parents) != 2:
            errors.append(f"Family parents invalid: {sorted(parents)}")
            continue
        kids = set(map(str, fam.get("children") or []))
        matched = False
        for drawn in families:
            if not isinstance(drawn, dict):
                continue
            dp = set(map(str, drawn.get("parents") or []))
            dc = set(map(str, drawn.get("children") or drawn.get("offspring") or []))
            if dp == parents and dc == kids:
                matched = True
                break
        if not matched:
            errors.append(
                f"Family {sorted(parents)} -> {sorted(kids)} missing from render payload"
            )

    return {
        "status": "PASS" if not errors else "FAIL",
        "errors": errors,
        "retry": False,
    }
