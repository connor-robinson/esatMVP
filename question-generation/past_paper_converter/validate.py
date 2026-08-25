"""Deterministic validation of extracted question content."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple

from .config import CONFIDENCE_THRESHOLD, uses_variable_option_count
from .export_questions import QuestionJob
from .katex_validate import validate_question_content


VISUAL_CUE_RE = re.compile(
    r"\b(as shown|shown (?:above|below|in)|diagram|figure|illustration|"
    r"waveform|(?:graph|table|sketch|axes?) (?:shown|above|below))\b",
    re.IGNORECASE,
)


def normalize_latex_delimiters(text: str) -> str:
    if not text:
        return text
    text = re.sub(r"\\\((.+?)\\\)", r"$\1$", text)
    text = re.sub(r"\\\[(.+?)\\\]", r"$$\1$$", text, flags=re.DOTALL)
    return text


def normalize_options(options: Dict[str, Any]) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for k, v in (options or {}).items():
        letter = str(k).strip().upper()
        if letter and v is not None:
            out[letter] = normalize_latex_delimiters(str(v).strip())
    return out


def _letters_contiguous_from_a(letters: List[str]) -> bool:
    if not letters:
        return False
    ords = sorted(ord(l) - ord("A") for l in letters if len(l) == 1 and l.isalpha())
    if len(ords) != len(letters):
        return False
    return ords == list(range(len(ords)))


def validate_extraction(
    job: QuestionJob,
    parsed: Dict[str, Any],
    stem: str,
    options: Dict[str, str],
    *,
    preflight_blur_score: float = 0.0,
    preflight_blurry: bool = False,
    image_fetch_failed: bool = False,
    diagram_crop_failed: bool = False,
    table_processing_failed: bool = False,
    skip_katex: bool = False,
) -> Tuple[Dict[str, Any], bool]:
    """
    Returns (conversion_report, hard_fail).
    hard_fail=True means do not auto-approve.
    """
    report: Dict[str, Any] = {
        "blurry": preflight_blurry,
        "blur_score": preflight_blur_score,
        "image_fetch_failed": image_fetch_failed,
        "diagram_crop_failed": diagram_crop_failed,
        "table_processing_failed": table_processing_failed,
        "wrong_question_number": False,
        "missing_options": False,
        "extra_options": False,
        "katex_errors": [],
        "low_confidence": False,
        "answer_letter_missing": False,
    }

    has_diagram = parsed.get("has_diagram") is True
    has_table = parsed.get("has_table") is True
    diagram_confidence = float(
        parsed.get("diagram_confidence")
        if parsed.get("diagram_confidence") is not None
        else parsed.get("confidence") or 0
    )
    diagram_type = str(parsed.get("diagram_type") or ("other" if has_diagram else "none"))
    has_graphical_options = parsed.get("has_graphical_options") is True
    processed_graphical_letters = sorted(parsed.get("graphical_option_letters_processed") or [])
    visual_cue_mismatch = bool(VISUAL_CUE_RE.search(stem or "")) and not (
        has_diagram or has_table
    )
    diagram_uncertain = diagram_confidence < 0.9

    report.update(
        {
            "has_diagram": has_diagram,
            "has_table": has_table,
            "diagram_classification": (
                "diagram" if has_diagram else "table" if has_table else "no_diagram"
            ),
            "diagram_type": diagram_type,
            "diagram_confidence": diagram_confidence,
            "diagram_reviewed": False,
            "diagram_review_status": (
                "needs_review"
                if diagram_crop_failed
                or table_processing_failed
                or diagram_uncertain
                or visual_cue_mismatch
                else "available_for_review"
                if has_diagram or has_table
                else "not_applicable"
            ),
            "diagram_source": "cropped_original" if has_diagram else None,
            "diagram_generated": False,
            "diagram_detection_mismatch": visual_cue_mismatch,
            "diagram_classification_uncertain": diagram_uncertain,
            "has_graphical_options": has_graphical_options,
            "graphical_option_letters_processed": processed_graphical_letters,
            "structured_tables_processed": int(parsed.get("structured_tables_processed") or 0),
        }
    )

    detected = parsed.get("detected_question_number")
    # Section 2 rows are stored as individual a/b/c subparts with a sequential
    # database index, while the screenshot repeats the parent printed number.
    # Those values are intentionally not comparable.
    printed_number_comparable = "section 2" not in (job.paper_name or "").lower()
    if (
        printed_number_comparable
        and detected is not None
        and int(detected) != job.question_number
    ):
        report["wrong_question_number"] = True
        report["detected_question_number"] = int(detected)
        report["expected_question_number"] = job.question_number
    report["printed_question_number_comparable"] = printed_number_comparable

    confidence = float(parsed.get("confidence") or 0)
    if confidence < CONFIDENCE_THRESHOLD:
        report["low_confidence"] = True
        report["confidence"] = confidence

    option_letters = sorted(options.keys())
    graphical_options_incomplete = has_graphical_options and (
        processed_graphical_letters != option_letters
    )
    report["graphical_options_incomplete"] = graphical_options_incomplete
    if graphical_options_incomplete:
        report["diagram_review_status"] = "needs_review"
        report["graphical_option_assets_raw"] = parsed.get("graphical_option_assets")
        report["graphical_option_bbox_format"] = parsed.get("graphical_option_bbox_format")
    expected = job.expected_letters
    variable_count = uses_variable_option_count(job.exam_name, job.paper_name)

    if variable_count:
        # Section 1: each question may show A–F, A–G, or A–H — not always 8 options
        if len(option_letters) < 4:
            report["missing_options"] = True
            report["option_count"] = len(option_letters)
            report["expected_count"] = "4-8 (variable)"
        elif not _letters_contiguous_from_a(option_letters):
            report["missing_options"] = True
            report["option_count"] = len(option_letters)
            report["expected_count"] = "contiguous from A"
            report["option_gaps"] = True
    elif len(option_letters) < len(expected):
        report["missing_options"] = True
        report["option_count"] = len(option_letters)
        report["expected_count"] = len(expected)
    extra = [l for l in option_letters if l not in expected]
    if extra:
        report["extra_options"] = True
        report["extra_letters"] = extra

    if job.answer_letter and job.answer_letter not in options:
        report["answer_letter_missing"] = True
        report["answer_letter"] = job.answer_letter

    katex_errors: List[Any] = []
    if not skip_katex:
        katex_errors = validate_question_content(stem, options)
    if katex_errors:
        report["katex_errors"] = katex_errors

    hard_fail = (
        image_fetch_failed
        or diagram_crop_failed
        or table_processing_failed
        or diagram_uncertain
        or visual_cue_mismatch
        or graphical_options_incomplete
        or bool(katex_errors)
        or report["missing_options"]
        or report["answer_letter_missing"]
        or not stem.strip()
        or not options
    )

    return report, hard_fail
