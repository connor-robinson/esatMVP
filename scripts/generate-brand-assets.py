#!/usr/bin/env python3
"""Generate ESAT CAMP raster brand assets from the master icon PNG."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "source" / "esat-camp-icon.png"
OUT = ROOT / "public" / "brand"
APP_DIR = ROOT / "src" / "app"
PUBLIC_DIR = ROOT / "public"


def black_to_white_transparent(img: Image.Image) -> Image.Image:
    """Turn black strokes into white; white background becomes transparent."""
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            luminance = (r + g + b) / 3
            if luminance < 200:
                pixels[x, y] = (255, 255, 255, 255)
            else:
                pixels[x, y] = (255, 255, 255, 0)
    return img


def trim_transparent(img: Image.Image, padding: int = 8) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    cropped = img.crop(bbox)
    w, h = cropped.size
    canvas = Image.new("RGBA", (w + padding * 2, h + padding * 2), (0, 0, 0, 0))
    canvas.paste(cropped, (padding, padding), cropped)
    return canvas


def circular_favicon(
    icon: Image.Image,
    size: int = 512,
    bg=(0, 0, 0, 255),
) -> Image.Image:
    """Opaque black circle with the white mark centered — no transparent corners.

    Transparent rounded-square corners show up as a white ring in Google SERPs.
    """
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)

    bg_layer = Image.new("RGBA", (size, size), bg)
    canvas = Image.composite(bg_layer, canvas, mask)

    # Fill most of the disc so the mark stays clear at 16–32px.
    icon_max = int(size * 0.58)
    icon_w, icon_h = icon.size
    scale = min(icon_max / icon_w, icon_max / icon_h)
    new_size = (max(1, int(icon_w * scale)), max(1, int(icon_h * scale)))
    resized = icon.resize(new_size, Image.Resampling.LANCZOS)
    x = (size - new_size[0]) // 2
    y = (size - new_size[1]) // 2
    canvas.paste(resized, (x, y), resized)

    # Flatten onto black so ICO/PNG has no alpha fringe for crawlers.
    flat = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    flat.paste(canvas, (0, 0), canvas)
    return flat


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source icon: {SRC}")

    OUT.mkdir(parents=True, exist_ok=True)

    source = Image.open(SRC)
    mark = trim_transparent(black_to_white_transparent(source))
    mark.save(OUT / "logo-mark.png")

    favicon_512 = circular_favicon(mark, size=512)
    favicon_512.save(OUT / "favicon-dark.png")
    favicon_512.resize((180, 180), Image.Resampling.LANCZOS).save(
        OUT / "apple-icon-dark.png"
    )
    favicon_512.resize((32, 32), Image.Resampling.LANCZOS).save(
        OUT / "favicon-light.png"
    )
    favicon_512.resize((180, 180), Image.Resampling.LANCZOS).save(
        OUT / "apple-icon-light.png"
    )

    # Browsers often request /favicon.ico directly (bypasses metadata).
    APP_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    favicon_32 = favicon_512.resize((32, 32), Image.Resampling.LANCZOS)
    favicon_16 = favicon_512.resize((16, 16), Image.Resampling.LANCZOS)
    favicon_ico_path = PUBLIC_DIR / "favicon.ico"
    favicon_32.save(
        favicon_ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32)],
        append_images=[favicon_16],
    )
    # Next.js App Router file conventions (auto-injected into <head>).
    favicon_32.save(APP_DIR / "icon.png", format="PNG")
    favicon_512.resize((180, 180), Image.Resampling.LANCZOS).save(
        APP_DIR / "apple-icon.png",
        format="PNG",
    )
    favicon_32.save(APP_DIR / "favicon.ico", format="ICO")

    print(f"Wrote brand assets to {OUT}")
    print(f"Wrote favicon.ico + app icons to {PUBLIC_DIR} and {APP_DIR}")


if __name__ == "__main__":
    main()