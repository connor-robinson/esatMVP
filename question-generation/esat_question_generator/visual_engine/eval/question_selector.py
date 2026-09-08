"""Select NSAA/ENGAA questions with stem diagram assets for Phase 2 eval."""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

# past_paper_converter lives alongside esat_question_generator
_QGEN_ROOT = Path(__file__).resolve().parents[3]
if str(_QGEN_ROOT) not in sys.path:
    sys.path.insert(0, str(_QGEN_ROOT))

from past_paper_converter.export_questions import download_image
from past_paper_converter.place_stems import load_place_candidates
from past_paper_converter.stem_blocks import stem_diagram_assets, strip_figures

DEFAULT_AUDIT_SUMMARY = (
    _QGEN_ROOT / "past_paper_converter" / "_cache" / "diagram_audit" / "summary.json"
)


@dataclass
class EvalQuestion:
    question_id: int
    exam_name: str
    exam_year: int
    paper_name: str
    question_number: int
    question_stem: str
    diagram_url: str
    diagram_asset_id: str
    source_image_url: str
    part_name: str = ""

    @property
    def reference_question(self) -> str:
        return strip_figures(self.question_stem)

    @property
    def question_concept(self) -> str:
        text = self.reference_question
        return text[:1200] if len(text) > 1200 else text

    @property
    def has_source_visual(self) -> bool:
        return bool(str(self.diagram_url or "").strip() or str(self.source_image_url or "").strip())


def paper_subject(paper_name: str, part_name: str = "") -> str:
    blob = f"{paper_name} {part_name}".lower()
    if "biology" in blob:
        return "biology"
    if "chemistry" in blob:
        return "chemistry"
    if "physics" in blob:
        return "physics"
    return "mathematics"


def _flagged_ids(audit_summary_path: Path | None) -> set[int]:
    path = audit_summary_path or DEFAULT_AUDIT_SUMMARY
    if not path.is_file():
        return set()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return set()
    flagged: set[int] = set()
    for item in data.get("questions") or []:
        if item.get("flags"):
            flagged.add(int(item["question_id"]))
    return flagged


def _candidate_to_eval(row: dict[str, Any]) -> EvalQuestion | None:
    assets = stem_diagram_assets(row.get("diagramAssets") or [])
    if not assets:
        return None
    asset = assets[0]
    url = str(asset.get("url") or "").strip()
    if not url:
        return None
    return EvalQuestion(
        question_id=int(row["questionId"]),
        exam_name=str(row.get("examName") or ""),
        exam_year=int(row.get("examYear") or 0),
        paper_name=str(row.get("paperName") or ""),
        question_number=int(row.get("questionNumber") or 0),
        question_stem=str(row.get("questionStem") or ""),
        diagram_url=url,
        diagram_asset_id=str(asset.get("id") or "diagram_0"),
        source_image_url=str(row.get("sourceImageUrl") or ""),
        part_name=str(row.get("partName") or row.get("part_name") or ""),
    )


# Words that usually mean the diagram is outside the Matplotlib geometry/graph vocabulary.
_UNSUPPORTED_DIAGRAM_HINTS = (
    "circuit",
    "resistor",
    "ammeter",
    "voltmeter",
    "battery",
    "capacitor",
    "coil",
    "magnet",
    "solenoid",
    "carbon cycle",
    "photosynthesis",
    "organism",
    "cell membrane",
    "food web",
    "periodic table",
    "electron",
    "nucleus",
    "orbital",
    "flowchart",
    "immunolog",
    "mammalian",
    "antibody",
    "antigen",
    "lymphocyte",
    "vaccine",
    "dna sequence",
    "punnett",
)

# Prefer questions whose stems suggest pure math geometry/graphs.
_MATH_DIAGRAM_HINTS = (
    "triangle",
    "circle",
    "angle",
    "polygon",
    "parallelogram",
    "trapezium",
    "rectangle",
    "square",
    "coordinate",
    "graph of",
    "sketch the graph",
    "axes",
    "tangent",
    "chord",
    "radius",
    "diameter",
    "perpendicular",
    "isosceles",
    "equilateral",
    "sector",
    "arc",
    "vector",
    "shaded",
    "diagram",
)


def _stem_lower(text: str) -> str:
    return strip_figures(text or "").lower()


def _is_unsupported_diagram(stem: str) -> bool:
    low = _stem_lower(stem)
    return any(hint in low for hint in _UNSUPPORTED_DIAGRAM_HINTS)


def _looks_like_math_diagram(stem: str) -> bool:
    low = _stem_lower(stem)
    if _is_unsupported_diagram(low):
        return False
    return any(hint in low for hint in _MATH_DIAGRAM_HINTS)


_SKIP_PAPER_HINTS = ("biology", "chemistry")


def _skip_paper(paper_name: str) -> bool:
    low = (paper_name or "").lower()
    return any(hint in low for hint in _SKIP_PAPER_HINTS)


def select_nsaa_subject_questions(
    *,
    subject: str,
    count: int | None = None,
    question_ids: list[int] | None = None,
    require_diagram: bool = False,
    audit_summary_path: Path | None = None,
) -> list[EvalQuestion]:
    """NSAA Chemistry or Biology sources, with or without a stem diagram.

    Subject is taken from questions.part_name (Section 1 Part C/D), not paper_name.
    Section 2 long-answer items are skipped so the ESAT MCQ pipeline stays on-format.
    """
    wanted = (subject or "").strip().lower()
    if wanted not in {"chemistry", "biology"}:
        raise ValueError("subject must be chemistry or biology")
    flagged = _flagged_ids(audit_summary_path)
    selected: list[EvalQuestion] = []
    seen: set[int] = set()

    if question_ids:
        for qid in question_ids:
            eq = _fetch_question_as_eval(qid)
            if not eq or eq.question_id in flagged:
                continue
            if paper_subject(eq.paper_name, eq.part_name) != wanted:
                continue
            if require_diagram and not eq.has_source_visual:
                continue
            selected.append(eq)
            seen.add(eq.question_id)
        return selected[: count or len(selected)]

    for eq in _fetch_subject_questions(wanted):
        if eq.question_id in flagged or eq.question_id in seen:
            continue
        if paper_subject(eq.paper_name, eq.part_name) != wanted:
            continue
        if require_diagram and not eq.has_source_visual:
            continue
        selected.append(eq)
        seen.add(eq.question_id)

    n = 10_000 if count is None else max(1, int(count))
    return selected[:n]


def _row_to_eval_no_diagram(row: dict[str, Any]) -> EvalQuestion | None:
    stem = str(row.get("questionStem") or row.get("question_stem") or "")
    if not stem.strip():
        return None
    assets = stem_diagram_assets(row.get("diagramAssets") or row.get("diagram_assets") or [])
    url = ""
    asset_id = ""
    if assets:
        url = str(assets[0].get("url") or "").strip()
        asset_id = str(assets[0].get("id") or "diagram_0")
    return EvalQuestion(
        question_id=int(row.get("questionId") or row.get("id") or 0),
        exam_name=str(row.get("examName") or row.get("exam_name") or "NSAA"),
        exam_year=int(row.get("examYear") or row.get("exam_year") or 0),
        paper_name=str(row.get("paperName") or row.get("paper_name") or ""),
        question_number=int(row.get("questionNumber") or row.get("question_number") or 0),
        question_stem=stem,
        diagram_url=url,
        diagram_asset_id=asset_id,
        source_image_url=str(row.get("sourceImageUrl") or row.get("question_image") or ""),
        part_name=str(row.get("partName") or row.get("part_name") or ""),
    )


def _fetch_question_as_eval(question_id: int) -> EvalQuestion | None:
    try:
        from past_paper_converter.db import fetch_questions
    except Exception:
        return None
    rows = fetch_questions(question_id=question_id, limit=1)
    if not rows:
        return None
    return _row_to_eval_no_diagram(rows[0])


def _fetch_subject_questions(subject: str) -> list[EvalQuestion]:
    try:
        from past_paper_converter.db import fetch_questions
    except Exception:
        return []
    out: list[EvalQuestion] = []
    try:
        rows = fetch_questions(exam_name="NSAA")
    except Exception:
        return []
    for row in rows:
        paper = str(row.get("paper_name") or row.get("paperName") or "")
        if "section 2" in paper.lower():
            continue
        if paper_subject(paper, str(row.get("part_name") or row.get("partName") or "")) != subject:
            continue
        eq = _row_to_eval_no_diagram(row)
        if eq:
            out.append(eq)
    return out


def select_nsaa_diagram_questions(
    *,
    count: int | None = None,
    question_ids: list[int] | None = None,
    math_only: bool = True,
    audit_summary_path: Path | None = None,
) -> list[EvalQuestion]:
    """All NSAA stem-diagram questions suitable for geometry/graph variation.

    ENGAA is never included. Biology/chemistry papers and unsupported diagram
    types (circuits, cells, etc.) are skipped so the renderer can draw them.
    """
    n = 10_000 if count is None else max(1, int(count))
    selected = select_eval_questions(
        count=n,
        exam_names=("NSAA",),
        question_ids=question_ids,
        audit_summary_path=audit_summary_path,
        per_exam=False,
        math_only=math_only,
    )
    return [eq for eq in selected if not _skip_paper(eq.paper_name) and eq.exam_name.upper() == "NSAA"]


def select_eval_questions(
    *,
    count: int = 20,
    exam_names: tuple[str, ...] = ("NSAA", "ENGAA"),
    question_ids: list[int] | None = None,
    audit_summary_path: Path | None = None,
    per_exam: bool = True,
    math_only: bool = True,
) -> list[EvalQuestion]:
    """Pick indexed past-paper questions suitable for diagram variation eval."""
    flagged = _flagged_ids(audit_summary_path)
    selected: list[EvalQuestion] = []

    if question_ids:
        for qid in question_ids:
            rows = load_place_candidates(question_id=qid, limit=1)
            if not rows:
                continue
            eq = _candidate_to_eval(rows[0])
            if eq and qid not in flagged:
                selected.append(eq)
        return selected[:count]

    by_exam: dict[str, list[EvalQuestion]] = {name: [] for name in exam_names}
    for exam in exam_names:
        rows = load_place_candidates(exam_name=exam)
        for row in rows:
            qid = int(row["questionId"])
            if qid in flagged:
                continue
            eq = _candidate_to_eval(row)
            if not eq:
                continue
            # Prefer single stem diagram, no graphical options in stem set.
            if len(stem_diagram_assets(row.get("diagramAssets") or [])) != 1:
                continue
            if math_only and not _looks_like_math_diagram(eq.question_stem):
                continue
            by_exam[exam].append(eq)

    if per_exam and len(exam_names) >= 2:
        half = count // 2
        remainder = count - half * 2
        quotas = [half + remainder, half]
        for exam, quota in zip(exam_names, quotas):
            pool = by_exam.get(exam) or []
            # Spread across years/papers by stride sampling.
            stride = max(1, len(pool) // max(quota, 1))
            picked = [pool[i * stride] for i in range(min(quota, len(pool)))]
            selected.extend(picked)
    else:
        pool: list[EvalQuestion] = []
        for exam in exam_names:
            pool.extend(by_exam.get(exam) or [])
        stride = max(1, len(pool) // max(count, 1))
        selected = [pool[i * stride] for i in range(min(count, len(pool)))]

    return selected[:count]


def download_diagram(eq: EvalQuestion) -> bytes:
    return download_image(eq.diagram_url)
