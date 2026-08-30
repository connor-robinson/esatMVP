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

    @property
    def reference_question(self) -> str:
        return strip_figures(self.question_stem)

    @property
    def question_concept(self) -> str:
        text = self.reference_question
        return text[:1200] if len(text) > 1200 else text


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
    )


def select_eval_questions(
    *,
    count: int = 20,
    exam_names: tuple[str, ...] = ("NSAA", "ENGAA"),
    question_ids: list[int] | None = None,
    audit_summary_path: Path | None = None,
    per_exam: bool = True,
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
