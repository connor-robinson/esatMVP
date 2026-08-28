"""Extract Pearson chrome icons from user-supplied ESAT screenshot crops."""

from __future__ import annotations

import math
import os
from pathlib import Path

from PIL import Image

ASSETS = Path(
    r"C:\Users\anson\.cursor\projects\c-Users-anson-Desktop-nocalcMVP2-real\assets"
)
OUT = Path(__file__).resolve().parents[1] / "public" / "pearson" / "icons"


def asset(name_fragment: str) -> Path:
    matches = list(ASSETS.glob(f"*{name_fragment}*"))
    if not matches:
        raise FileNotFoundError(name_fragment)
    return matches[0]


def to_white_alpha(img: Image.Image, box: tuple[int, int, int, int], *, yellow: bool = False) -> Image.Image:
    sub = img.crop(box)
    bg = sub.getpixel((1, 1))
    out = Image.new("RGBA", sub.size, (0, 0, 0, 0))
    op = out.load()
    ip = sub.load()
    for y in range(sub.height):
        for x in range(sub.width):
            r, g, b = ip[x, y]
            lum = (r + g + b) / 3
            d = math.sqrt(sum((a - bg[i]) ** 2 for i, a in enumerate((r, g, b))))
            if yellow and r > 170 and g > 170 and b < 170:
                op[x, y] = (255, 255, 0, 255)
            elif lum > 140 and d > 15:
                op[x, y] = (255, 255, 255, 255)
    bbox = out.getbbox()
    if not bbox:
        return out
    l, t, r, b = bbox
    return out.crop((max(0, l - 1), max(0, t - 1), r + 2, b + 2))


def save(name: str, icon: Image.Image) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    icon.save(OUT / name)
    print(f"{name}: {icon.size}")


def main() -> None:
    save("flag.png", to_white_alpha(Image.open(asset("8255219a")).convert("RGB"), (0, 0, 120, 186)))
    save("flag-filled.png", to_white_alpha(Image.open(asset("229bd343")).convert("RGB"), (0, 0, 50, 88)))
    save("counter.png", to_white_alpha(Image.open(asset("41e36f75")).convert("RGB"), (0, 0, 38, 70)))
    save("timer.png", to_white_alpha(Image.open(asset("fca1a1ef")).convert("RGB"), (0, 0, 48, 60)))
    save(
        "timer-yellow.png",
        to_white_alpha(Image.open(asset("55610a44")).convert("RGB"), (0, 0, 90, 48), yellow=True),
    )
    save(
        "end-exam.png",
        to_white_alpha(Image.open(asset("452b92c8")).convert("RGB"), (5, 489, 42, 505)),
    )

    footer_icons = Image.open(asset("9a53ac21")).convert("RGB")
    w = footer_icons.width
    third = w // 3
    icon_w, icon_h = 130, 68
    for name, idx in [("prev.png", 0), ("navigator.png", 1), ("next.png", 2)]:
        x0 = idx * third + (third - icon_w) // 2
        save(name, to_white_alpha(footer_icons, (x0, 2, x0 + icon_w, 2 + icon_h)))


if __name__ == "__main__":
    main()
