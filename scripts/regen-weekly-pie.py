"""Regenerate the weekly email response pie chart."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "public" / "email" / "esat-response-pie.png"

# A 3.2%, B 0% omitted, C 51.6%, D 9.7%, E 32.3%, F 3.2%
LABELS = ["A", "C", "D", "E", "F"]
SIZES = [3.2, 51.6, 9.7, 32.3, 3.2]
COLORS = ["#d9d9d4", "#23856d", "#9c9c96", "#e6785c", "#efefe4"]

# Match email page background (#f4f4f2)
BG = (244, 244, 242, 255)

W = H = 720
R = 250


def main() -> None:
    im = Image.new("RGBA", (W, H), BG)
    draw = ImageDraw.Draw(im)
    cx = cy = W // 2
    bbox = [cx - R, cy - R, cx + R, cy + R]

    try:
        font_pct = ImageFont.truetype("arial.ttf", 36)
        font_lbl = ImageFont.truetype("arialbd.ttf", 28)
    except OSError:
        font_pct = ImageFont.load_default()
        font_lbl = font_pct

    start = -90.0
    for size, color in zip(SIZES, COLORS):
        extent = size / 100.0 * 360.0
        draw.pieslice(
            bbox,
            start=start,
            end=start + extent,
            fill=color,
            outline=(255, 255, 255, 255),
            width=4,
        )
        start += extent

    start = -90.0
    for label, size in zip(LABELS, SIZES):
        extent = size / 100.0 * 360.0
        ang = math.radians(start + extent / 2.0)

        if size >= 9:
            r_pct = R * 0.55
            x = cx + r_pct * math.cos(ang)
            y = cy + r_pct * math.sin(ang)
            text = f"{size:g}%"
            tb = draw.textbbox((0, 0), text, font=font_pct)
            tw, th = tb[2] - tb[0], tb[3] - tb[1]
            draw.text(
                (x - tw / 2, y - th / 2),
                text,
                fill=(255, 255, 255, 255),
                font=font_pct,
            )

        r_lbl = R * 1.18
        x = cx + r_lbl * math.cos(ang)
        y = cy + r_lbl * math.sin(ang)
        tb = draw.textbbox((0, 0), label, font=font_lbl)
        tw, th = tb[2] - tb[0], tb[3] - tb[1]
        pad_x, pad_y = 12, 8
        rect = [
            x - tw / 2 - pad_x,
            y - th / 2 - pad_y,
            x + tw / 2 + pad_x,
            y + th / 2 + pad_y,
        ]
        # White background pills behind A/C/D/E/F
        draw.rounded_rectangle(rect, radius=10, fill=(255, 255, 255, 255))
        draw.text((x - tw / 2, y - th / 2), label, fill=(17, 17, 17, 255), font=font_lbl)
        start += extent

    OUT.parent.mkdir(parents=True, exist_ok=True)
    im.save(OUT, "PNG")
    print(f"saved {OUT} {im.size} corner={im.getpixel((0, 0))}")


if __name__ == "__main__":
    main()
