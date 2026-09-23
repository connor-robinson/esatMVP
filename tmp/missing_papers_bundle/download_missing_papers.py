#!/usr/bin/env python3
"""
Download missing NSAA/ENGAA resources into ./downloaded/
Run:
    python download_missing_papers.py
Optional:
    python download_missing_papers.py --out /path/to/output
    python download_missing_papers.py --only NSAA
"""
from __future__ import annotations
import argparse, json, re, sys, time
from pathlib import Path
from urllib.parse import urljoin
import urllib.request
import urllib.error
import urllib.parse

HERE = Path(__file__).resolve().parent
MANIFEST = json.loads((HERE / "manifest.json").read_text(encoding="utf-8"))

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36"

def request_bytes(url: str, timeout=35):
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "application/pdf,text/html;q=0.9,*/*;q=0.8",
    })
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
        ctype = r.headers.get("Content-Type", "")
        final = r.geturl()
    return data, ctype, final

def pdf_ok(data: bytes) -> bool:
    return data.lstrip().startswith(b"%PDF-")

def fetch_pdf(url: str):
    try:
        data, ctype, final = request_bytes(url)
        if pdf_ok(data):
            return data, final, None
        return None, final, f"not a PDF (content-type={ctype!r}, first bytes={data[:30]!r})"
    except Exception as e:
        return None, url, str(e)

def discover_topachievers(exam: str, year: int):
    """Best-effort fallback for 2016-era specs on the Top Achievers archive page."""
    page = "https://topachieversprogramme.com/resources/test-papers/"
    try:
        html, _, final = request_bytes(page)
        text = html.decode("utf-8", errors="ignore")
        # collect hrefs that mention specification and likely exam/year
        hrefs = re.findall(r'href=["\']([^"\']+)["\']', text, flags=re.I)
        scored = []
        for href in hrefs:
            full = urljoin(final, href)
            lo = full.lower()
            score = 0
            if "spec" in lo: score += 2
            if str(year) in lo: score += 2
            if exam.lower() in lo: score += 3
            if "natural" in lo and exam == "NSAA": score += 2
            if "engineering" in lo and exam == "ENGAA": score += 2
            if score >= 4:
                scored.append((score, full))
        return [u for _, u in sorted(scored, reverse=True)]
    except Exception:
        return []

def wayback_candidates(exam: str, year: int):
    """
    Best-effort CDX fallback for retired official Cambridge PDFs.
    Returns archived URLs that appear to match exam + year + specification.
    """
    patterns = []
    if exam == "NSAA":
        patterns = [
            f"https://www.undergraduate.study.cam.ac.uk/files/publications/nsaa*{year}*.pdf",
            f"https://www.undergraduate.study.cam.ac.uk/files/publications/natural*sciences*specification*{year}*.pdf",
        ]
    else:
        patterns = [
            f"https://www.undergraduate.study.cam.ac.uk/files/publications/engaa*{year}*.pdf",
            f"https://www.undergraduate.study.cam.ac.uk/files/publications/engineering*specification*{year}*.pdf",
        ]
    found = []
    for pattern in patterns:
        api = (
            "https://web.archive.org/cdx/search/cdx?"
            "url=" + urllib.parse.quote(pattern, safe="") +
            "&output=json&filter=statuscode:200&filter=mimetype:application/pdf&collapse=urlkey"
        )
        try:
            raw, _, _ = request_bytes(api)
            rows = json.loads(raw.decode("utf-8"))
            for row in rows[1:]:
                ts, original = row[1], row[2]
                found.append(f"https://web.archive.org/web/{ts}id_/{original}")
        except Exception:
            pass
    return found

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(HERE/"downloaded"))
    ap.add_argument("--only", choices=["NSAA","ENGAA"])
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    report = []
    ok = 0
    failed = 0

    for item in MANIFEST["items"]:
        if args.only and item["exam"] != args.only:
            continue
        target = out / item["target"]
        target.parent.mkdir(parents=True, exist_ok=True)

        if target.exists() and pdf_ok(target.read_bytes()[:16]):
            print(f"SKIP  {target.relative_to(out)}")
            report.append({"target":str(target), "status":"already-exists"})
            ok += 1
            continue

        candidates = list(item["urls"])
        if item["category"] == "specification":
            candidates += discover_topachievers(item["exam"], int(item["year"]))
            candidates += wayback_candidates(item["exam"], int(item["year"]))

        seen = set()
        errors = []
        saved = False
        for url in candidates:
            if url in seen:
                continue
            seen.add(url)
            print(f"TRY   {item['target']} <- {url}")
            data, final, err = fetch_pdf(url)
            if data:
                target.write_bytes(data)
                print(f"OK    {target.relative_to(out)} ({len(data):,} bytes)")
                report.append({
                    "target":str(target),
                    "status":"downloaded",
                    "source":final,
                    "bytes":len(data),
                    "note":item["note"],
                })
                ok += 1
                saved = True
                break
            errors.append({"url":url, "error":err})
            time.sleep(0.25)

        if not saved:
            print(f"FAIL  {item['target']}")
            report.append({
                "target":str(target),
                "status":"failed",
                "errors":errors,
                "note":item["note"],
            })
            failed += 1

    (out/"download_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print()
    print(f"Done: {ok} OK, {failed} failed")
    print(f"Report: {out/'download_report.json'}")
    if failed:
        print("Any failed historical specifications are usually retired URLs; inspect the report and use the source notes in README.md.")
        return 2
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
