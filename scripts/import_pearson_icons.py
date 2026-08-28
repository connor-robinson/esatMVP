"""
Import standalone Pearson chrome icons (user-provided PNGs on blue background).

Source files live in Cursor assets; outputs go to public/pearson/icons/.
Run: python scripts/import_pearson_icons.py
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCES_DIR = ROOT / "public" / "pearson" / "icon-sources"
OUT = ROOT / "public" / "pearson" / "icons"

# User-provided standalone icon crops (Aug 2026). Stored under icon-sources/.
SOURCES: dict[str, str] = {
    "flag.png": "flag-outline.png",
    "flag-filled.png": "flag-filled.png",
    "timer.png": "timer.png",
    "counter.png": "counter.png",
    "end-exam.png": "end-exam.png",
    "navigator.png": "navigator.png",
    "next.png": "next.png",
}


def source_path(name: str) -> Path:
    path = SOURCES_DIR / name
    if not path.is_file():
        raise FileNotFoundError(path)
    return path


def dist(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def sample_bg(img: Image.Image) -> tuple[int, int, int]:
    w, h = img.size
    pts = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (0, h // 2)]
    rs, gs, bs = zip(*(img.getpixel(p)[:3] for p in pts))
    return (sum(rs) // len(rs), sum(gs) // len(gs), sum(bs) // len(bs))


def is_yellow(r: int, g: int, b: int) -> bool:
    return r > 160 and g > 160 and b < 140 and (r + g) / 2 - b > 60


def extract_glyph(img: Image.Image, *, keep_yellow: bool = False) -> Image.Image:
    rgb = img.convert("RGBA")
    bg = sample_bg(rgb)
    out = Image.new("RGBA", rgb.size, (0, 0, 0, 0))
    op = out.load()
    ip = rgb.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b, a = ip[x, y]
            if a < 16:
                continue
            lum = (r + g + b) / 3
            d = dist((r, g, b), bg)
            if keep_yellow and is_yellow(r, g, b):
                op[x, y] = (255, 255, 0, 255)
            elif lum > 175 and d > 28:
                op[x, y] = (255, 255, 255, 255)
            elif d > 18 and lum > 130 and not keep_yellow:
                # anti-aliased white edges
                op[x, y] = (255, 255, 255, min(255, int((lum - 100) * 4)))
            elif keep_yellow and d > 18 and lum > 130:
                op[x, y] = (255, 255, 0, min(255, int((lum - 80) * 3)))
    bbox = out.getbbox()
    if not bbox:
        return out
    l, t, r, b = bbox
    pad = 1
    return out.crop(
        (
            max(0, l - pad),
            max(0, t - pad),
            min(out.width, r + 1 + pad),
            min(out.height, b + 1 + pad),
        )
    )


def flip_horizontal(img: Image.Image) -> Image.Image:
    return img.transpose(Image.FLIP_LEFT_RIGHT)


def recolor_white_to_yellow(img: Image.Image) -> Image.Image:
    out = img.copy()
    op = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = op[x, y]
            if a < 16:
                continue
            if r > 200 and g > 200 and b > 200:
                op[x, y] = (255, 255, 0, a)
            elif a > 0:
                # Preserve anti-aliased edges as yellow-tinted alpha.
                op[x, y] = (255, 255, 0, a)
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    for name, source_name in SOURCES.items():
        src = source_path(source_name)
        keep_yellow = name == "flag-filled.png"
        icon = extract_glyph(Image.open(src), keep_yellow=keep_yellow)
        icon.save(OUT / name)
        print(f"{name}: {icon.size} <- {src.name}")

    timer_yellow = recolor_white_to_yellow(Image.open(OUT / "timer.png"))
    timer_yellow.save(OUT / "timer-yellow.png")
    print(f"timer-yellow.png: {timer_yellow.size} (from timer)")

    prev = flip_horizontal(Image.open(OUT / "next.png"))
    prev.save(OUT / "prev.png")
    print(f"prev.png: {prev.size} (flipped from next)")


if __name__ == "__main__":
    main()
