#!/usr/bin/env python3
"""Generate ESAT CAMP raster brand assets from the master icon PNG."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "source" / "esat-camp-icon.png"
OUT = ROOT / "public" / "brand"
APP_DIR = ROOT / "src" / "app"
PUBLIC_DIR = ROOT / "public"

# ~15% safe padding on each side → logo fills 70% of the canvas.
LOGO_FILL = 0.70


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


def square_favicon(icon: Image.Image, size: int = 512) -> Image.Image:
    """Solid #000000 square with the white mark centered and ~15% padding.

    Edge-to-edge black (no transparency, no circular mask, no white border) so
    Google SERP circular crops render as a clean black disc.
    """
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 255))

    icon_max = max(1, int(size * LOGO_FILL))
    icon_w, icon_h = icon.size
    scale = min(icon_max / icon_w, icon_max / icon_h)
    new_size = (max(1, int(icon_w * scale)), max(1, int(icon_h * scale)))
    resized = icon.resize(new_size, Image.Resampling.LANCZOS)
    x = (size - new_size[0]) // 2
    y = (size - new_size[1]) // 2
    canvas.paste(resized, (x, y), resized)

    # Flatten to opaque RGB — no alpha channel for crawlers.
    return canvas.convert("RGB")


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, format="PNG", optimize=True)


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source icon: {SRC}")

    OUT.mkdir(parents=True, exist_ok=True)
    APP_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    source = Image.open(SRC)
    mark = trim_transparent(black_to_white_transparent(source))
    save_png(mark, OUT / "logo-mark.png")

    favicon_512 = square_favicon(mark, size=512)
    favicon_192 = favicon_512.resize((192, 192), Image.Resampling.LANCZOS)
    favicon_48 = favicon_512.resize((48, 48), Image.Resampling.LANCZOS)
    favicon_32 = favicon_512.resize((32, 32), Image.Resampling.LANCZOS)
    favicon_16 = favicon_512.resize((16, 16), Image.Resampling.LANCZOS)
    apple_180 = favicon_512.resize((180, 180), Image.Resampling.LANCZOS)

    # Public brand copies (crawlable static URLs).
    save_png(favicon_512, OUT / "favicon-512.png")
    save_png(favicon_192, OUT / "favicon-192.png")
    save_png(favicon_48, OUT / "favicon-48.png")
    save_png(favicon_512, OUT / "favicon-dark.png")
    save_png(favicon_48, OUT / "favicon-light.png")
    save_png(apple_180, OUT / "apple-icon-dark.png")
    save_png(apple_180, OUT / "apple-icon-light.png")

    # Next.js App Router file conventions + stable public URLs.
    save_png(favicon_512, APP_DIR / "icon.png")
    save_png(apple_180, APP_DIR / "apple-icon.png")
    save_png(apple_180, OUT / "apple-icon.png")
    save_png(apple_180, PUBLIC_DIR / "apple-icon.png")

    # Multi-size ICO for /favicon.ico (browsers + crawlers).
    # Pillow builds each size from this source image when `sizes=` is set.
    ico_path = PUBLIC_DIR / "favicon.ico"
    favicon_48.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
    favicon_48.save(
        APP_DIR / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )

    print(f"Wrote brand assets to {OUT}")
    print(f"Wrote favicon.ico + app icons to {PUBLIC_DIR} and {APP_DIR}")


if __name__ == "__main__":
    main()
