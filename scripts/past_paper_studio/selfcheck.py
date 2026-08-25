"""Health and save-integrity check for the conversion studio.

Start the studio first:
    python -m scripts.past_paper_studio.server --port 8790 --no-browser

Then:
    python scripts/past_paper_studio/selfcheck.py                 # read-only
    python scripts/past_paper_studio/selfcheck.py --save 2119     # also re-saves one question
    python scripts/past_paper_studio/selfcheck.py --save 2119 --recrop

The --save modes rewrite a question with its own current content, so a pass
means the read/edit/crop/publish round trip is lossless.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import io
import json
import sys
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image

BASE = "http://127.0.0.1:8790"

results: List[Tuple[str, bool, str]] = []


def check(label: str, passed: bool, detail: str = "") -> None:
    results.append((label, passed, detail))
    print(f"  [{'ok' if passed else 'FAIL'}] {label}{f'  ({detail})' if detail else ''}")


def get(path: str) -> Any:
    with urllib.request.urlopen(BASE + path, timeout=180) as response:
        return json.loads(response.read())


def get_bytes(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=180) as response:
        return response.read()


def post(path: str, payload: Dict[str, Any]) -> Any:
    request = urllib.request.Request(
        BASE + path,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        return json.loads(response.read())


def timed(path: str) -> Tuple[float, int]:
    start = time.perf_counter()
    with urllib.request.urlopen(BASE + path, timeout=180) as response:
        size = len(response.read())
    return (time.perf_counter() - start) * 1000, size


def image_size(url: str) -> Tuple[int, int]:
    with Image.open(io.BytesIO(get_bytes(url))) as img:
        return img.size


def check_reads(question_id: int) -> None:
    print("\n--- endpoints ---")
    overview = get("/api/overview")
    totals = overview["totals"]
    check("overview loads", totals["total"] > 0, f"{totals['converted']}/{totals['total']} text")
    check("papers grouped by exam", len(overview["exams"]) > 0, f"{len(overview['exams'])} exams")

    complete = 0
    partial = 0
    for exam in overview["exams"]:
        for year in exam["years"]:
            for paper in year["papers"]:
                if paper["state"] == "complete":
                    complete += 1
                elif paper["state"] in ("partial", "not_started"):
                    partial += 1
    check("paper completion states computed", complete + partial > 0, f"{complete} complete, {partial} outstanding")

    question = get(f"/api/question/{question_id}")
    paper = get(f"/api/paper/{question['question']['paperId']}")
    check("paper detail loads", len(paper["questions"]) > 0, f"{len(paper['questions'])} questions")
    check("question detail loads", bool(question["question"]["questionImage"]))
    check("source size known", bool(question["source"]["width"]), f"{question['source']['width']}x{question['source']['height']}")
    check("draft stem has no figure tags", "<figure" not in question["draft"]["questionStem"])

    print("\n--- latency (warm) ---")
    for label, path in (
        ("overview", "/api/overview"),
        ("paper", f"/api/paper/{question['question']['paperId']}"),
        ("question", f"/api/question/{question_id}"),
        ("source png", f"/api/question/{question_id}/source.png"),
        ("crop preview", f"/api/question/{question_id}/crop-preview.png?x=0.2&y=0.2&w=0.5&h=0.3"),
        ("crop past edge", f"/api/question/{question_id}/crop-preview.png?x=-0.2&y=-0.1&w=1.4&h=0.6"),
    ):
        elapsed, size = timed(path)
        print(f"  {label:16} {elapsed:7.0f} ms  {size / 1024:7.1f} KB")

    print("\n--- concurrent burst (the crop editor fires several at once) ---")
    paths = [
        f"/api/question/{question_id}/source.png",
        f"/api/question/{question_id}/crop-preview.png?x=0.22&y=0.13&w=0.54&h=0.24",
        f"/api/question/{question_id}",
    ]

    def fetch(path: str) -> bool:
        try:
            with urllib.request.urlopen(BASE + path, timeout=180) as response:
                return len(response.read()) > 0
        except Exception:
            return False

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(paths)) as pool:
        ok = all(pool.map(fetch, paths))
    check("concurrent requests all succeed", ok)


def payload_from(data: Dict[str, Any], *, recrop: bool, mark_reviewed: bool) -> Dict[str, Any]:
    draft = data["draft"]
    return {
        "questionStem": draft["questionStem"],
        "options": draft["options"],
        "answerLetter": data["question"]["answerLetter"],
        "markReviewed": mark_reviewed,
        "diagramAssets": [
            {
                "id": asset.get("id"),
                "url": asset.get("url"),
                "alt": asset.get("alt"),
                "role": asset.get("role"),
                "option_letter": asset.get("option_letter"),
                "bbox_norm": asset.get("bbox_norm"),
                "recrop": recrop,
            }
            for asset in draft["diagramAssets"]
        ],
    }


def check_save(question_id: int, *, recrop: bool, mark_reviewed: bool) -> None:
    print(f"\n--- save round trip on question {question_id}"
          f"{' with recrop' if recrop else ''} ---")
    before = get(f"/api/question/{question_id}")
    old_sizes = {
        asset["id"]: image_size(asset["url"])
        for asset in before["draft"]["diagramAssets"]
        if asset.get("url")
    }
    old_urls = {asset["id"]: asset.get("url") for asset in before["draft"]["diagramAssets"]}

    result = post(
        f"/api/question/{question_id}/save",
        payload_from(before, recrop=recrop, mark_reviewed=mark_reviewed),
    )
    save = result["saveResult"]
    for note in save["notes"]:
        print(f"  note: {note}")
    for warning in save["warnings"]:
        print(f"  warn: {warning}")

    after = get(f"/api/question/{question_id}")
    report = (after.get("conversion") or {}).get("report") or {}

    check("stem unchanged by round trip", before["draft"]["questionStem"] == after["draft"]["questionStem"])
    check("options unchanged by round trip", before["draft"]["options"] == after["draft"]["options"])
    check("answer key untouched", before["question"]["answerLetter"] == after["question"]["answerLetter"])
    check("asset count unchanged", len(before["draft"]["diagramAssets"]) == len(after["draft"]["diagramAssets"]))
    check("studio_edited recorded", report.get("studio_edited") is True)
    if mark_reviewed:
        check("studio_reviewed recorded", report.get("studio_reviewed") is True)
    if save["published"]:
        check("published live as text", after["question"]["contentFormat"] == "text")
        check("published stem carries figures", ("<figure" in after["question"]["publishedStem"])
              == bool([a for a in after["draft"]["diagramAssets"] if not a.get("option_letter")]))

    published_urls = after["question"]["publishedStem"]
    for asset in after["draft"]["diagramAssets"]:
        if asset.get("option_letter") or not asset.get("url"):
            continue
        check(f"{asset['id']} url present in published stem", asset["url"] in published_urls)

    for asset in after["draft"]["diagramAssets"]:
        if asset["id"] in old_sizes and asset.get("url"):
            new_size = image_size(asset["url"])
            check(f"{asset['id']} crop pixels identical", new_size == old_sizes[asset["id"]],
                  f"{old_sizes[asset['id']]} -> {new_size}")
            if recrop:
                check(f"{asset['id']} uploaded to a fresh url",
                      asset["url"] != old_urls.get(asset["id"]))


def main() -> int:
    parser = argparse.ArgumentParser(description="Studio self-check")
    parser.add_argument("--question", type=int, default=2119)
    parser.add_argument("--save", type=int, default=None, help="question id to re-save")
    parser.add_argument("--recrop", action="store_true")
    parser.add_argument("--mark-reviewed", action="store_true")
    args = parser.parse_args()

    try:
        check_reads(args.question)
        if args.save:
            check_save(args.save, recrop=args.recrop, mark_reviewed=args.mark_reviewed)
    except urllib.error.URLError as exc:
        print(f"\nCould not reach the studio at {BASE}: {exc}")
        print("Start it with: python -m scripts.past_paper_studio.server --no-browser")
        return 2

    failed = [item for item in results if not item[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
