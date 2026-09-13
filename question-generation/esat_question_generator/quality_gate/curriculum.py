"""ESAT curriculum loader for Quality Gate syllabus validation."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_DIR = Path(__file__).resolve().parent
_BASE = _DIR.parent
_CURRICULUM_PATH = _BASE / "curriculum" / "ESAT_CURRICULUM.json"
_CURRICULUM_SOURCE = "ESAT_Content_Specification_May2024"

# DB ``subjects`` / rubric labels -> paper_id list (order matters for snapshot).
_SUBJECT_PAPER_IDS: Dict[str, Tuple[str, ...]] = {
    "math 1": ("math1",),
    "mathematics 1": ("math1",),
    "math 2": ("math1", "math2"),
    "mathematics 2": ("math1", "math2"),
    "physics": ("physics", "math1"),
    "chemistry": ("chemistry", "math1"),
    "biology": ("biology", "math1"),
}


def normalize_subject(subject: Any) -> str:
    if subject is None:
        return ""
    if isinstance(subject, list):
        parts = [str(x).strip() for x in subject if x is not None and str(x).strip()]
        return parts[0] if parts else ""
    return str(subject).strip()


def subject_paper_ids(subject: Any) -> Tuple[str, ...]:
    key = normalize_subject(subject).casefold()
    return _SUBJECT_PAPER_IDS.get(key, ())


def _prefixed_code(paper_id: str, raw_code: str) -> str:
    if paper_id == "math1":
        return f"M1-{raw_code}"
    if paper_id == "math2":
        return f"M2-{raw_code}"
    if paper_id == "physics":
        return f"P-{raw_code}"
    return f"{paper_id}-{raw_code}"


@lru_cache(maxsize=1)
def _load_curriculum_data() -> Dict[str, Any]:
    path = _CURRICULUM_PATH
    if not path.is_file():
        raise FileNotFoundError(f"Curriculum file not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def _papers_by_id() -> Dict[str, Dict[str, Any]]:
    data = _load_curriculum_data()
    return {p["paper_id"]: p for p in data.get("papers") or []}


def _primary_paper_id(subject: Any) -> Optional[str]:
    """Main ESAT module paper for this subject (not assumed Math 1)."""
    papers = subject_paper_ids(subject)
    if not papers:
        return None
    for pid in papers:
        if pid != "math1":
            return pid
    return papers[0]


def _entries_for_papers(paper_ids: Tuple[str, ...]) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    seen: set[str] = set()
    for paper_id in paper_ids:
        paper = _papers_by_id().get(paper_id)
        if not paper:
            continue
        for topic in paper.get("topics") or []:
            raw = str(topic.get("code") or "")
            pref = _prefixed_code(paper_id, raw)
            if pref in seen:
                continue
            seen.add(pref)
            out.append(
                {
                    "code": raw,
                    "prefixed_code": pref,
                    "title": str(topic.get("title") or ""),
                    "paper_id": paper_id,
                    "paper_name": str(paper.get("paper_name") or ""),
                }
            )
    return out


def get_allowed_curriculum(subject: Any) -> List[Dict[str, str]]:
    """Topic entries allowed for the given subject label."""
    return _entries_for_papers(subject_paper_ids(subject))


def get_primary_curriculum(subject: Any) -> List[Dict[str, str]]:
    """Subject-module topics only (Chemistry / Biology / Physics / Math), excluding assumed Math 1 extras."""
    primary = _primary_paper_id(subject)
    if not primary:
        return []
    return _entries_for_papers((primary,))


def get_assumed_math1_curriculum(subject: Any) -> List[Dict[str, str]]:
    """Math 1 topics assumed by science modules (empty for pure Math 1 rows)."""
    papers = subject_paper_ids(subject)
    if "math1" not in papers:
        return []
    primary = _primary_paper_id(subject)
    if primary == "math1":
        return []
    return _entries_for_papers(("math1",))


def get_allowed_topic_codes(subject: Any) -> List[str]:
    codes: List[str] = []
    seen: set[str] = set()
    for entry in get_allowed_curriculum(subject):
        for key in ("prefixed_code", "code"):
            c = entry.get(key) or ""
            if c and c not in seen:
                seen.add(c)
                codes.append(c)
    return codes


def _lookup_primary_tag_entry(primary_tag: Optional[str]) -> Optional[Dict[str, str]]:
    tag = (primary_tag or "").strip()
    if not tag:
        return None
    for entries in (_papers_by_id().values()):
        paper_id = entries["paper_id"]
        for topic in entries.get("topics") or []:
            raw = str(topic.get("code") or "")
            pref = _prefixed_code(paper_id, raw)
            if tag == pref or tag == raw:
                return {
                    "code": raw,
                    "prefixed_code": pref,
                    "title": str(topic.get("title") or ""),
                    "paper_id": paper_id,
                    "paper_name": str(entries.get("paper_name") or ""),
                }
    return None


def get_curriculum_snapshot(
    subject: Any,
    *,
    primary_tag: Optional[str] = None,
    max_chars: int = 8000,
) -> str:
    """Compact allowed-topics snapshot for the LLM judge.

    For science subjects, the **primary module** (Chemistry / Biology / Physics)
    is listed first and clearly separated from assumed Mathematics 1 toolkit topics.
    """
    subject_s = normalize_subject(subject) or "unknown"
    primary_id = _primary_paper_id(subject)
    primary_entries = get_primary_curriculum(subject)
    assumed_m1 = get_assumed_math1_curriculum(subject)

    lines = [
        f"ESAT allowed curriculum for subject: {subject_s}",
        f"Source: {_CURRICULUM_SOURCE}",
        "",
    ]
    if primary_id and primary_id != "math1" and assumed_m1:
        paper_name = (primary_entries[0].get("paper_name") if primary_entries else primary_id) or primary_id
        lines.append(f"## Primary module ({paper_name}) — score scientific content here")
        lines.append(
            "Syllabus fit for Biology/Chemistry/Physics content must be judged against "
            "these primary-module codes. Do not mark a science item in_syllabus using only Math 1 codes."
        )
        lines.append("")
        for entry in primary_entries:
            lines.append(
                f"- {entry['prefixed_code']} ({entry['code']}): {entry['title']} "
                f"[{entry['paper_name']}]"
            )
        lines.append("")
        lines.append("## Assumed Mathematics 1 toolkit (supporting maths only)")
        lines.append(
            "Math 1 may be used for arithmetic/algebra needed to solve the science item. "
            "It does not replace the Chemistry/Biology/Physics module requirement."
        )
        lines.append("")
        for entry in assumed_m1:
            lines.append(
                f"- {entry['prefixed_code']} ({entry['code']}): {entry['title']} "
                f"[{entry['paper_name']}]"
            )
    else:
        for entry in get_allowed_curriculum(subject):
            lines.append(
                f"- {entry['prefixed_code']} ({entry['code']}): {entry['title']} "
                f"[{entry['paper_name']}]"
            )

    if primary_tag:
        match = _lookup_primary_tag_entry(primary_tag)
        lines.append("")
        lines.append(f"Stored primary_tag: {primary_tag}")
        if match:
            lines.append(
                f"Matched curriculum entry: {match['prefixed_code']} — {match['title']} "
                f"({match['paper_name']})"
            )
        else:
            lines.append("Stored primary_tag does not match any known curriculum code.")
    text = "\n".join(lines)
    if len(text) > max_chars:
        return text[: max_chars - 20] + "\n…[truncated]"
    return text


def primary_tag_allowed_for_subject(primary_tag: Optional[str], subject: Any) -> bool:
    tag = (primary_tag or "").strip()
    if not tag:
        return True
    allowed = set(get_allowed_topic_codes(subject))
    if tag in allowed:
        return True
    # Accept bare M1 vs M1-M1 style if unambiguous.
    for code in allowed:
        if code.endswith(f"-{tag}") or code == tag:
            return True
    return False


def is_mm_tag(tag: str) -> bool:
    t = (tag or "").strip().upper()
    return t.startswith("M2-MM") or t.startswith("MM") or "-MM" in t


def get_math2_relocation_context(row: Dict[str, Any]) -> Dict[str, Any]:
    """For Math 1 rows, include Math 2 curriculum so the judge can recommend move_to_math2."""
    subject = normalize_subject(row.get("subjects"))
    if subject.casefold() not in ("math 1", "mathematics 1"):
        return {}
    return {
        "curriculum_math2_allowed_codes": get_allowed_topic_codes("Math 2"),
        "curriculum_math2_snapshot": get_curriculum_snapshot("Math 2", max_chars=6000),
        "relocation_note": (
            "Row is Mathematics 1. If the solve path fits Math 2 allowed codes but not Math 1, "
            "prefer recommended_action move_to_math2 over regenerate when the item is otherwise sound."
        ),
    }


def get_curriculum_for_row(row: Dict[str, Any]) -> Dict[str, Any]:
    subject = normalize_subject(row.get("subjects"))
    primary = (row.get("primary_tag") or "").strip() or None
    secondary = row.get("secondary_tags")
    if isinstance(secondary, list):
        sec_list = [str(x).strip() for x in secondary if str(x).strip()]
    elif secondary:
        sec_list = [str(secondary).strip()]
    else:
        sec_list = []
    allowed = get_allowed_curriculum(subject)
    primary_entries = get_primary_curriculum(subject)
    assumed_m1 = get_assumed_math1_curriculum(subject)
    primary_codes: List[str] = []
    seen: set[str] = set()
    for entry in primary_entries:
        for key in ("prefixed_code", "code"):
            c = entry.get(key) or ""
            if c and c not in seen:
                seen.add(c)
                primary_codes.append(c)
    return {
        "curriculum_source": _CURRICULUM_SOURCE,
        "curriculum_allowed_codes": get_allowed_topic_codes(subject),
        "curriculum_primary_paper": _primary_paper_id(subject),
        "curriculum_primary_codes": primary_codes,
        "curriculum_assumed_math1_codes": [
            e["prefixed_code"] for e in assumed_m1 if e.get("prefixed_code")
        ],
        "curriculum_snapshot": get_curriculum_snapshot(subject, primary_tag=primary),
        "primary_tag_entry": _lookup_primary_tag_entry(primary),
        "primary_tag_allowed": primary_tag_allowed_for_subject(primary, subject),
        "allowed_topic_count": len(allowed),
    }
