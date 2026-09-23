from pathlib import Path
import zipfile
import shutil
import fitz

ROOT = Path(r"c:\Users\anson\Desktop\nocalcMVP2_real")
TMP = ROOT / "tmp_math_mocks"
DOCX = Path(r"c:\Users\anson\Downloads\ESAT_Mathematics_1_Two_Practice_Modules.docx")
PDF = Path(r"c:\Users\anson\Downloads\ESAT_Mathematics_2_Two_Practice_Modules.pdf")
PUBLIC = ROOT / "public" / "esat-camp-mocks" / "diagrams"

MATH1_DIAGRAMS = {
    1: [17, 18, 19, 20, 24, 27],
    2: [17, 19, 20, 22, 24, 27],
}
MATH2_DIAGRAMS = {
    1: {
        10: 649,
        13: 752,
        19: 960,
        21: 1040,
        22: 1088,
        23: 1125,
        25: 1199,
        26: 1237,
        27: 1269,
    },
    2: {
        9: 3368,
        10: 3416,
        11: 3454,
        12: 3491,
        15: 3596,
        23: 3873,
        25: 3943,
        26: 3980,
        27: 4018,
    },
}

docx_dir = TMP / "docx_images"
pdf_dir = TMP / "pdf_unique"
docx_dir.mkdir(parents=True, exist_ok=True)
pdf_dir.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)

with zipfile.ZipFile(DOCX) as z:
    media = [n for n in z.namelist() if n.startswith("word/media/")]
    print("docx media", len(media))
    for n in media:
        dest = docx_dir / Path(n).name
        with z.open(n) as src, open(dest, "wb") as out:
            shutil.copyfileobj(src, out)
        print(" ", dest.name, dest.stat().st_size)

pdf = fitz.open(str(PDF))
seen = {}
placements = []
for i, page in enumerate(pdf):
    infos = page.get_image_info(xrefs=True)
    for info in infos:
        xref = info.get("xref")
        bbox = info.get("bbox")
        w = info.get("width")
        h = info.get("height")
        placements.append((i + 1, xref, w, h, bbox))
        if xref not in seen:
            seen[xref] = (i + 1, w, h)

print("pdf unique xrefs", len(seen), "placements", len(placements))
for xref in seen:
    pix = fitz.Pixmap(pdf, xref)
    if pix.n - pix.alpha >= 4:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    out = pdf_dir / f"xref{xref}.png"
    pix.save(str(out))
print("saved unique", len(list(pdf_dir.glob("*.png"))))

print("\nplacements w>=80:")
for pno, xref, w, h, bbox in placements:
    if w and w >= 80:
        print(f" page {pno:3d} xref {xref:5d} {w}x{h} bbox={bbox}")

needed = [xref for qs in MATH2_DIAGRAMS.values() for xref in qs.values()]
print("\nneeded math2 xrefs present:")
for xref in needed:
    p = pdf_dir / f"xref{xref}.png"
    print(f"  xref{xref}: {'OK' if p.exists() else 'MISSING'}")
