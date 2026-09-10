"""Structured genetics pedigree schema: normalize, validate, legend policy.

The LLM supplies individuals + families only. Layout and drawing are deterministic.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .errors import VisualSpecError

SEX_VALUES = frozenset({"male", "female", "unknown"})
STANDARD_STATUSES = frozenset({"unaffected", "affected", "carrier", "deceased", "unknown"})
CUSTOM_STATUSES = frozenset({"striped", "hatched", "half_filled", "custom_1", "custom_2"})
ALL_STATUSES = STANDARD_STATUSES | CUSTOM_STATUSES
CUSTOM_NEED_LEGEND = frozenset({"striped", "hatched", "half_filled", "custom_1", "custom_2", "carrier"})

_SEX_ALIASES = {
    "m": "male",
    "male": "male",
    "square": "male",
    "xy": "male",
    "zz": "male",
    "f": "female",
    "female": "female",
    "circle": "female",
    "xx": "female",
    "zw": "female",
    "unknown": "unknown",
    "?": "unknown",
    "u": "unknown",
}

_STATUS_ALIASES = {
    "unaffected": "unaffected",
    "normal": "unaffected",
    "clear": "unaffected",
    "affected": "affected",
    "filled": "affected",
    "carrier": "carrier",
    "heterozygote": "carrier",
    "deceased": "deceased",
    "dead": "deceased",
    "unknown": "unknown",
    "?": "unknown",
    "striped": "striped",
    "hatched": "hatched",
    "half_filled": "half_filled",
    "half-filled": "half_filled",
    "custom_1": "custom_1",
    "custom_2": "custom_2",
}


@dataclass
class PedigreeValidationResult:
    valid: bool
    errors: list[str] = field(default_factory=list)
    pedigree: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "valid": self.valid,
            "errors": list(self.errors),
            "pedigree": self.pedigree,
        }


def _as_id(raw: Any) -> str:
    if raw is None:
        return ""
    return str(raw).strip()


def _norm_sex(raw: Any) -> str:
    key = str(raw or "unknown").strip().lower()
    return _SEX_ALIASES.get(key, "")


def _norm_status(raw: Any, *, affected_flag: Any = None) -> str:
    if raw is None or str(raw).strip() == "":
        if affected_flag is True:
            return "affected"
        if affected_flag is False:
            return "unaffected"
        return "unaffected"
    key = str(raw).strip().lower().replace(" ", "_")
    return _STATUS_ALIASES.get(key, "")


def _parents_key(a: str, b: str) -> tuple[str, str]:
    return (a, b) if a <= b else (b, a)


def _normalize_from_legacy(raw: dict[str, Any]) -> dict[str, Any]:
    """Convert people/unions/children (+ key) into individuals/families/legend."""
    individuals: list[dict[str, Any]] = []
    for person in raw.get("people") or []:
        if not isinstance(person, dict):
            continue
        pid = _as_id(person.get("id") or person.get("label"))
        if not pid:
            continue
        status = _norm_status(person.get("status"), affected_flag=person.get("affected"))
        if not status:
            status = "unaffected"
        entry = {
            "id": pid,
            "sex": _norm_sex(person.get("sex") or person.get("gender")) or "unknown",
            "generation": person.get("generation", 1),
            "status": status,
            "label": str(person.get("label") or pid).strip(),
        }
        if person.get("deceased") is True or status == "deceased":
            entry["deceased"] = True
            if status == "deceased":
                entry["status"] = "unaffected"
        individuals.append(entry)

    families: list[dict[str, Any]] = []
    union_pairs: list[tuple[str, str]] = []
    for union in raw.get("unions") or []:
        if not isinstance(union, dict):
            continue
        a, b = _as_id(union.get("a")), _as_id(union.get("b"))
        if a and b and a != b:
            union_pairs.append((a, b))

    child_map: dict[tuple[str, str], list[str]] = {}
    for item in raw.get("children") or []:
        if not isinstance(item, dict):
            continue
        parents = [_as_id(p) for p in (item.get("parents") or []) if _as_id(p)]
        offspring = [
            _as_id(c)
            for c in (item.get("offspring") or item.get("children") or [])
            if _as_id(c)
        ]
        if len(parents) >= 2:
            key = _parents_key(parents[0], parents[1])
            child_map.setdefault(key, [])
            for kid in offspring:
                if kid not in child_map[key]:
                    child_map[key].append(kid)
            if (parents[0], parents[1]) not in union_pairs and (parents[1], parents[0]) not in union_pairs:
                union_pairs.append((parents[0], parents[1]))

    seen_fam: set[tuple[str, str]] = set()
    for a, b in union_pairs:
        key = _parents_key(a, b)
        if key in seen_fam:
            continue
        seen_fam.add(key)
        families.append({"parents": [a, b], "children": list(child_map.get(key) or [])})

    legend: dict[str, Any]
    if "legend" in raw and isinstance(raw.get("legend"), dict):
        legend = dict(raw["legend"])
    elif raw.get("key") is False:
        legend = {"show": False, "entries": []}
    else:
        legend = {"show": None, "entries": []}

    return {"individuals": individuals, "families": families, "legend": legend}


def normalize_pedigree(raw: Any) -> dict[str, Any]:
    """Return canonical pedigree dict (individuals / families / legend)."""
    if not isinstance(raw, dict):
        raise VisualSpecError("pedigree must be a JSON object")

    if isinstance(raw.get("individuals"), list):
        individuals_in = raw.get("individuals") or []
        families_in = raw.get("families") or []
        legend_in = raw.get("legend") if isinstance(raw.get("legend"), dict) else {"show": None, "entries": []}
        base = {
            "individuals": list(individuals_in),
            "families": list(families_in),
            "legend": dict(legend_in),
        }
    elif isinstance(raw.get("people"), list):
        base = _normalize_from_legacy(raw)
    else:
        raise VisualSpecError("pedigree requires individuals[] or people[]")

    individuals: list[dict[str, Any]] = []
    for person in base["individuals"]:
        if not isinstance(person, dict):
            continue
        pid = _as_id(person.get("id") or person.get("label"))
        if not pid:
            continue
        sex = _norm_sex(person.get("sex") or person.get("gender"))
        status = _norm_status(person.get("status"), affected_flag=person.get("affected"))
        try:
            generation = int(person.get("generation"))
        except (TypeError, ValueError):
            generation = 0
        deceased = bool(person.get("deceased")) or status == "deceased"
        if status == "deceased":
            status = "unaffected"
            deceased = True
        individuals.append(
            {
                "id": pid,
                "sex": sex or "unknown",
                "generation": generation,
                "status": status or "unaffected",
                "label": str(person.get("label") or pid).strip(),
                "deceased": deceased,
            }
        )

    families: list[dict[str, Any]] = []
    for fam in base["families"]:
        if not isinstance(fam, dict):
            continue
        parents = [_as_id(p) for p in (fam.get("parents") or []) if _as_id(p)]
        children = [_as_id(c) for c in (fam.get("children") or []) if _as_id(c)]
        families.append({"parents": parents, "children": children})

    legend_raw = base.get("legend") if isinstance(base.get("legend"), dict) else {}
    entries: list[dict[str, str]] = []
    for entry in legend_raw.get("entries") or []:
        if not isinstance(entry, dict):
            continue
        st = _norm_status(entry.get("status"))
        if not st:
            continue
        label = str(entry.get("label") or st).strip()
        entries.append({"status": st, "label": label})

    show = legend_raw.get("show")
    if show is None and "show" not in legend_raw:
        show = None

    return {
        "individuals": individuals,
        "families": families,
        "legend": {"show": show, "entries": entries},
    }


def _resolve_legend(pedigree: dict[str, Any]) -> dict[str, Any]:
    """Decide whether a legend is needed and which entries to show."""
    legend = pedigree.get("legend") if isinstance(pedigree.get("legend"), dict) else {}
    show = legend.get("show")
    entries = list(legend.get("entries") or [])
    used = {str(p.get("status") or "unaffected") for p in pedigree.get("individuals") or []}
    has_deceased = any(bool(p.get("deceased")) for p in pedigree.get("individuals") or [])

    if show is False:
        return {"show": False, "entries": []}

    if show is True and entries:
        return {"show": True, "entries": entries}

    auto: list[dict[str, str]] = []
    default_labels = {
        "affected": "affected",
        "carrier": "carrier",
        "unknown": "phenotype unknown",
        "striped": "striped (see question)",
        "hatched": "hatched (see question)",
        "half_filled": "half-filled (see question)",
        "custom_1": "custom pattern 1",
        "custom_2": "custom pattern 2",
    }
    for status in ("affected", "carrier", "unknown", "striped", "hatched", "half_filled", "custom_1", "custom_2"):
        if status in used and status != "unaffected":
            # Skip trivial unknown-only legends unless combined with customs.
            if status == "unknown" and not (used & CUSTOM_NEED_LEGEND) and "affected" not in used:
                continue
            auto.append({"status": status, "label": default_labels[status]})
    if has_deceased:
        auto.append({"status": "deceased", "label": "deceased"})

    if entries:
        # Keep author entries; ensure customs used are covered.
        present = {e["status"] for e in entries}
        for status in used & CUSTOM_STATUSES:
            if status not in present:
                entries.append({"status": status, "label": default_labels.get(status, status)})
        return {"show": True if show is not False else False, "entries": entries}

    if show is True:
        return {"show": True, "entries": auto}

    # Auto: legend only when non-standard / carrier / custom / deceased / affected appear.
    needs = bool(used & (CUSTOM_NEED_LEGEND | {"affected"})) or has_deceased
    if not needs:
        return {"show": False, "entries": []}
    return {"show": True, "entries": auto}


def validate_pedigree(raw: Any, *, repair_legend: bool = True) -> PedigreeValidationResult:
    """Validate pedigree structure. Does not render."""
    errors: list[str] = []
    try:
        pedigree = normalize_pedigree(raw)
    except VisualSpecError as exc:
        return PedigreeValidationResult(valid=False, errors=[str(exc)])

    individuals = pedigree["individuals"]
    families = pedigree["families"]
    by_id: dict[str, dict[str, Any]] = {}

    if not individuals:
        errors.append("Pedigree has no individuals")

    for person in individuals:
        pid = person["id"]
        if pid in by_id:
            errors.append(f"Duplicate individual ID {pid}")
            continue
        by_id[pid] = person
        if person["sex"] not in SEX_VALUES:
            errors.append(f"Individual {pid} has invalid sex {person['sex']!r}")
        if person["status"] not in ALL_STATUSES:
            errors.append(f"Individual {pid} has invalid status {person['status']!r}")
        if int(person["generation"]) < 1:
            errors.append(f"Individual {pid} has invalid generation {person['generation']}")

    child_to_families: dict[str, int] = {}
    for fi, fam in enumerate(families, start=1):
        parents = fam.get("parents") or []
        children = fam.get("children") or []
        if len(parents) != 2:
            errors.append(f"Family {fi} contains {len(parents)} parents (need exactly 2)")
            continue
        a, b = parents[0], parents[1]
        if a == b:
            errors.append(f"Family {fi}: person {a} listed as both parents")
        for p in (a, b):
            if p not in by_id:
                errors.append(f"Family {fi}: parent {p} does not exist")
        if len({a, b}) == 2 and a in by_id and b in by_id:
            if int(by_id[a]["generation"]) != int(by_id[b]["generation"]):
                errors.append(
                    f"Family {fi}: parents {a} and {b} are in different generations"
                )
        seen_kids: set[str] = set()
        for child in children:
            if child not in by_id:
                errors.append(f"Family {fi}: child {child} does not exist")
                continue
            if child in (a, b):
                errors.append(f"Family {fi}: {child} cannot be their own parent")
            if child in seen_kids:
                errors.append(f"Family {fi}: duplicate child {child}")
            seen_kids.add(child)
            child_to_families[child] = child_to_families.get(child, 0) + 1
            if a in by_id and b in by_id and child in by_id:
                parent_gen = max(int(by_id[a]["generation"]), int(by_id[b]["generation"]))
                child_gen = int(by_id[child]["generation"])
                if child_gen <= parent_gen:
                    errors.append(
                        f"Family {fi}: child {child} generation {child_gen} is not below parents ({parent_gen})"
                    )

    for child, n in child_to_families.items():
        if n > 1:
            errors.append(f"Child {child} belongs to {n} parental families")

    # Cyclic ancestry via parent map.
    parent_of: dict[str, set[str]] = {pid: set() for pid in by_id}
    for fam in families:
        parents = fam.get("parents") or []
        if len(parents) != 2:
            continue
        for child in fam.get("children") or []:
            if child in parent_of:
                parent_of[child].update(parents)

    def _ancestors(start: str) -> set[str] | None:
        seen: set[str] = set()
        stack = list(parent_of.get(start) or [])
        while stack:
            cur = stack.pop()
            if cur == start:
                return None
            if cur in seen:
                continue
            seen.add(cur)
            stack.extend(parent_of.get(cur) or [])
        return seen

    for pid in by_id:
        if _ancestors(pid) is None:
            errors.append(f"Cyclic ancestry involving {pid}")
            break

    # Legend vs used statuses.
    used_statuses = {p["status"] for p in individuals}
    used_customs = used_statuses & CUSTOM_STATUSES
    has_deceased_flag = any(bool(p.get("deceased")) for p in individuals)
    legend = pedigree.get("legend") or {}
    legend_statuses = {
        str(e.get("status"))
        for e in (legend.get("entries") or [])
        if isinstance(e, dict)
    }
    if legend.get("show") is True:
        for st in legend_statuses:
            if st == "deceased":
                if not has_deceased_flag:
                    errors.append("Legend refers to unused status deceased")
            elif st not in used_statuses:
                errors.append(f"Legend refers to unused status {st}")
    for st in used_customs:
        if legend.get("show") is False:
            errors.append(f"Custom status {st} is used but legend.show is false")
        elif legend.get("entries") and st not in legend_statuses:
            errors.append(f"Custom status {st} is used but missing from legend")

    if errors:
        return PedigreeValidationResult(valid=False, errors=errors)

    if repair_legend:
        pedigree["legend"] = _resolve_legend(pedigree)
        # After auto legend, customs must have entries.
        if used_customs and not pedigree["legend"].get("show"):
            pedigree["legend"] = _resolve_legend(
                {**pedigree, "legend": {"show": True, "entries": list(legend.get("entries") or [])}}
            )
        final_legend_statuses = {e["status"] for e in pedigree["legend"].get("entries") or []}
        missing = used_customs - final_legend_statuses
        if missing:
            return PedigreeValidationResult(
                valid=False,
                errors=[f"Custom status {sorted(missing)[0]} is used but has no legend"],
            )

    # Also keep legacy mirrors for the drawable object / older callers.
    people = []
    for p in pedigree["individuals"]:
        people.append(
            {
                "id": p["id"],
                "sex": p["sex"],
                "generation": p["generation"],
                "status": p["status"],
                "affected": p["status"] == "affected",
                "deceased": bool(p.get("deceased")),
                "label": p["label"],
            }
        )
    unions = [{"a": f["parents"][0], "b": f["parents"][1]} for f in families if len(f["parents"]) == 2]
    children = [
        {"parents": list(f["parents"]), "offspring": list(f["children"])}
        for f in families
        if len(f["parents"]) == 2
    ]
    pedigree["people"] = people
    pedigree["unions"] = unions
    pedigree["children"] = children
    pedigree["key"] = bool(pedigree["legend"].get("show"))

    return PedigreeValidationResult(valid=True, errors=[], pedigree=pedigree)


def require_valid_pedigree(raw: Any) -> dict[str, Any]:
    result = validate_pedigree(raw)
    if not result.valid or not result.pedigree:
        raise VisualSpecError(
            "Invalid pedigree: " + "; ".join(result.errors or ["unknown error"])
        )
    return result.pedigree
