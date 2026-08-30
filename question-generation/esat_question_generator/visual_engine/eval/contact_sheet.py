"""Build a contact-sheet gallery of generated diagram eval outputs."""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


def _load_font(size: int = 14):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def _fit(image: Image.Image, width: int, height: int) -> Image.Image:
    copy = image.copy().convert("RGB")
    copy.thumbnail((width, height), Image.Resampling.LANCZOS)
    return copy


def _load_rgb(path: Path) -> Image.Image | None:
    if not path.is_file():
        return None
    try:
        return Image.open(path).convert("RGB")
    except OSError:
        return None


def build_contact_sheet(
    cases: list[dict[str, Any]],
    out_path: Path,
    *,
    cols: int = 4,
    cell_w: int = 420,
    cell_h: int = 320,
    thumb_w: int = 380,
    thumb_h: int = 220,
) -> Path:
    """Create a grid gallery from case metadata dicts.

    Each case expects keys: question_id, variation_mode, verdict, png_path, source_path (optional).
    """
    if not cases:
        raise ValueError("No cases for contact sheet")

    rows = math.ceil(len(cases) / cols)
    sheet_w = cols * cell_w
    sheet_h = rows * cell_h + 40
    sheet = Image.new("RGB", (sheet_w, sheet_h), "white")
    draw = ImageDraw.Draw(sheet)
    title_font = _load_font(16)
    label_font = _load_font(13)
    draw.text((12, 8), f"Phase 2 Diagram Eval ({len(cases)} diagrams)", fill="black", font=title_font)

    for index, case in enumerate(cases):
        col = index % cols
        row = index // cols
        left = col * cell_w
        top = row * cell_h + 40

        qid = case.get("question_id", "?")
        mode = case.get("variation_mode", "?")
        verdict = case.get("verdict") or case.get("verifier_verdict") or "-"
        flags: list[str] = []
        if case.get("math_incorrect"):
            flags.append("math")
        if case.get("too_similar_to_source"):
            flags.append("similar")
        if case.get("looks_bad"):
            flags.append("bad")
        if case.get("collision_failure"):
            flags.append("collision")
        flag_text = f" [{', '.join(flags)}]" if flags else ""

        header = f"Q{qid} {mode} | {verdict}{flag_text}"
        color = "green" if verdict == "PASS" else ("orange" if verdict == "FIX" else "red")
        draw.text((left + 8, top + 4), header[:52], fill=color, font=label_font)

        png_path = Path(str(case.get("png_path") or ""))
        source_path = Path(str(case.get("source_path") or ""))
        gen = _load_rgb(png_path)
        src = _load_rgb(source_path)

        if gen and src:
            gen_thumb = _fit(gen, thumb_w // 2 - 6, thumb_h)
            src_thumb = _fit(src, thumb_w // 2 - 6, thumb_h)
            draw.text((left + 8, top + 22), "src", fill="gray", font=label_font)
            draw.text((left + 8 + thumb_w // 2, top + 22), "gen", fill="gray", font=label_font)
            sheet.paste(src_thumb, (left + 8, top + 36))
            sheet.paste(gen_thumb, (left + 8 + thumb_w // 2, top + 36))
        elif gen:
            gen_thumb = _fit(gen, thumb_w, thumb_h)
            sheet.paste(gen_thumb, (left + 8, top + 36))
        else:
            draw.text((left + 8, top + 60), "NO PNG", fill="red", font=label_font)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path, quality=90)
    return out_path
