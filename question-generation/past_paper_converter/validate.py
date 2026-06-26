"""Deterministic validation of extracted question content."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple

from .config import CONFIDENCE_THRESHOLD, uses_variable_option_count
from .export_questions import QuestionJob
from .katex_validate import validate_question_content


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
        "wrong_question_number": False,
        "missing_options": False,
        "extra_options": False,
        "katex_errors": [],
        "low_confidence": False,
        "answer_letter_missing": False,
    }

    detected = parsed.get("detected_question_number")
    if detected is not None and int(detected) != job.question_number:
        report["wrong_question_number"] = True
        report["detected_question_number"] = int(detected)
        report["expected_question_number"] = job.question_number

    confidence = float(parsed.get("confidence") or 0)
    if confidence < CONFIDENCE_THRESHOLD:
        report["low_confidence"] = True
        report["confidence"] = confidence

    option_letters = sorted(options.keys())
    expected = job.expected_letters
    variable_count = uses_variable_option_count(job.exam_name, job.paper_name)

    if variable_count:
        # Section 1: each question may show A–F, A–G, or A–H — not always 8 options
        if len(option_letters) < 4:
            report["missing_options"] = True
            report["option_count"] = len(option_letters)
            report["expected_count"] = "4-8 (variable Section 1)"
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

    katex_errors = validate_question_content(stem, options)
    if katex_errors:
        report["katex_errors"] = katex_errors

    hard_fail = (
        image_fetch_failed
        or bool(katex_errors)
        or report["missing_options"]
        or report["answer_letter_missing"]
        or not stem.strip()
        or not options
    )

    return report, hard_fail
