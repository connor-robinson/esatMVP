"""Deterministic validation of extracted question content."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple

from .config import CONFIDENCE_THRESHOLD
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
    if len(option_letters) < len(expected):
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
