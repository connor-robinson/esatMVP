"""Cheap deterministic pre-review checks for diagrams and questions."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .errors import DiagramLayoutError, VisualSpecError
from .schema import SUPPORTED_OBJECT_TYPES, parse_spec
from .text_format import format_label_text

MIN_IMAGE_PX = 32
BLANK_STDEV = 2.5


def _flag(code: str, message: str, *, severity: str = "flag") -> dict[str, str]:
    return {"code": code, "message": message, "severity": severity}


def check_png(path: str | Path | None) -> list[dict[str, str]]:
    flags: list[dict[str, str]] = []
    if not path:
        return [_flag("png_missing", "Generated PNG path is missing", severity="reject")]
    png = Path(path)
    if not png.is_file():
        return [_flag("png_missing", f"Generated PNG not found: {png}", severity="reject")]
    try:
        from PIL import Image, ImageStat

        with Image.open(png) as img:
            width, height = img.size
            if width < MIN_IMAGE_PX or height < MIN_IMAGE_PX:
                flags.append(
                    _flag(
                        "png_invalid_size",
                        f"Image dimensions invalid: {width}x{height}",
                        severity="reject",
                    )
                )
            gray = img.convert("L")
            stdev = float(ImageStat.Stat(gray).stddev[0])
            if stdev < BLANK_STDEV:
                flags.append(_flag("png_blank", "Image appears blank or near-blank", severity="reject"))
    except Exception as exc:
        flags.append(_flag("png_unreadable", f"Could not read PNG: {exc}", severity="reject"))
    return flags


def check_spec(spec: dict[str, Any] | None) -> list[dict[str, str]]:
    flags: list[dict[str, str]] = []
    if not spec:
        return flags
    try:
        parsed = parse_spec(spec)
    except VisualSpecError as exc:
        msg = str(exc)
        severity = "reject" if "unsupported type" in msg.lower() else "flag"
        code = "unsupported_diagram_type" if "unsupported type" in msg.lower() else "malformed_spec"
        return [_flag(code, msg, severity=severity)]

    for obj in parsed.objects:
        obj_type = str(obj.get("type") or "").strip().lower()
        if obj_type and obj_type not in SUPPORTED_OBJECT_TYPES:
            flags.append(
                _flag(
                    "unsupported_diagram_type",
                    f"Unsupported object type {obj_type!r}",
                    severity="reject",
                )
            )

    for label in parsed.labels:
        text = str(label.get("text") or "")
        math = bool(label.get("math"))
        try:
            formatted = format_label_text(text, math=math)
        except Exception as exc:
            flags.append(_flag("malformed_mathtext", f"Label {label.get('id')}: {exc}", severity="flag"))
            continue
        if ";" in formatted and "text" in formatted.lower():
            flags.append(
                _flag(
                    "malformed_mathtext",
                    f"Label {label.get('id')} may render a semicolon instead of a space",
                    severity="flag",
                )
            )
    return flags


def check_collision(render_error: str = "", collision_failure: bool = False) -> list[dict[str, str]]:
    if collision_failure or "collision" in (render_error or "").lower():
        return [
            _flag(
                "collision_check_failure",
                render_error or "Label collision check failed",
                severity="flag",
            )
        ]
    if "out of bounds" in (render_error or "").lower() or "outside" in (render_error or "").lower():
        return [_flag("labels_outside_canvas", render_error, severity="flag")]
    return []


def check_question(
    *,
    choices: dict[str, Any] | None = None,
    correct_answer: str | None = None,
) -> list[dict[str, str]]:
    flags: list[dict[str, str]] = []
    options = {str(k).strip().upper(): str(v).strip() for k, v in (choices or {}).items() if str(v).strip()}
    if options:
        seen: dict[str, str] = {}
        for letter, text in options.items():
            key = " ".join(text.lower().split())
            if key in seen:
                flags.append(
                    _flag(
                        "duplicate_options",
                        f"Options {seen[key]} and {letter} are duplicates",
                        severity="reject",
                    )
                )
            else:
                seen[key] = letter

        correct = [part.strip().upper() for part in str(correct_answer or "").replace(",", " ").split() if part.strip()]
        valid_correct = [c for c in correct if c in options]
        if len(valid_correct) == 0:
            flags.append(_flag("correct_answer_count", "Zero declared correct answers", severity="reject"))
        elif len(valid_correct) > 1:
            flags.append(
                _flag(
                    "correct_answer_count",
                    f"Multiple declared correct answers: {', '.join(valid_correct)}",
                    severity="reject",
                )
            )
    return flags


def run_auto_checks(
    *,
    png_path: str | Path | None = None,
    spec: dict[str, Any] | None = None,
    render_error: str = "",
    collision_failure: bool = False,
    choices: dict[str, Any] | None = None,
    correct_answer: str | None = None,
    diagram_required: bool = True,
) -> list[dict[str, str]]:
    flags: list[dict[str, str]] = []
    if diagram_required:
        flags.extend(check_png(png_path))
        flags.extend(check_spec(spec))
        flags.extend(check_collision(render_error, collision_failure))
        if render_error and not collision_failure and "collision" not in render_error.lower():
            # Surface Matplotlib/mathtext failures separately from a bare missing PNG.
            if not png_path or not Path(png_path).is_file():
                flags.append(
                    _flag(
                        "render_failed",
                        render_error.splitlines()[0][:300] if render_error else "Diagram render failed",
                        severity="reject",
                    )
                )
    flags.extend(check_question(choices=choices, correct_answer=correct_answer))
    return flags


def has_reject(flags: list[dict[str, str]]) -> bool:
    return any(f.get("severity") == "reject" for f in flags)


def collision_from_exc(exc: Exception) -> bool:
    if isinstance(exc, DiagramLayoutError):
        return True
    msg = str(exc).lower()
    return "collision" in msg or ("label" in msg and "place" in msg)
