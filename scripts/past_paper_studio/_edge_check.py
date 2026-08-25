"""Temporary checks for answer-key and graphical-option handling."""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "question-generation"))
sys.path.insert(0, str(ROOT))

from scripts.past_paper_studio.store import _client  # noqa: E402

BASE = "http://127.0.0.1:8790"


def get(path: str):
    with urllib.request.urlopen(BASE + path, timeout=120) as response:
        return json.loads(response.read())


def post(path: str, payload: dict):
    request = urllib.request.Request(
        BASE + path,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        return json.loads(response.read())


def find_graphical_question() -> int | None:
    rows = (
        _client()
        .table("question_conversions")
        .select("question_id")
        .contains("conversion_report", {"has_graphical_options": True})
        .eq("status", "auto_approved")
        .limit(1)
        .execute()
        .data
        or []
    )
    return int(rows[0]["question_id"]) if rows else None


def check_answer_key_guard(question_id: int) -> None:
    print(f"\n--- answer key guard on question {question_id} ---")
    before = get(f"/api/question/{question_id}")
    current = before["question"]["answerLetter"]
    alternative = next(
        letter for letter in before["question"]["expectedLetters"] if letter != current
    )
    print(f"  stored answer: {current} -> requesting {alternative}")

    payload = {
        "questionStem": before["draft"]["questionStem"],
        "options": before["draft"]["options"],
        "answerLetter": alternative,
        "markReviewed": False,
        "diagramAssets": [
            {
                "id": asset.get("id"),
                "url": asset.get("url"),
                "alt": asset.get("alt"),
                "role": asset.get("role"),
                "option_letter": asset.get("option_letter"),
                "bbox_norm": asset.get("bbox_norm"),
                "recrop": False,
            }
            for asset in before["draft"]["diagramAssets"]
        ],
    }
    result = post(f"/api/question/{question_id}/save", payload)
    save = result["saveResult"]
    for note in save["notes"]:
        print(f"  note: {note}")
    for warning in save["warnings"]:
        print(f"  warn: {warning}")

    after = get(f"/api/question/{question_id}")
    landed = after["question"]["answerLetter"]
    if landed == alternative:
        print(f"  answer key CHANGED to {landed} - restoring {current}")
        payload["answerLetter"] = current
        post(f"/api/question/{question_id}/save", payload)
        restored = get(f"/api/question/{question_id}")["question"]["answerLetter"]
        print(f"  restored to {restored} ({'ok' if restored == current else 'FAILED'})")
        print("  migration is applied: answer key edits work")
    else:
        print(f"  answer key still {landed} (unchanged), guard reported the migration need")


def check_graphical(question_id: int) -> None:
    print(f"\n--- graphical options on question {question_id} ---")
    data = get(f"/api/question/{question_id}")
    assets = data["draft"]["diagramAssets"]
    option_assets = [a for a in assets if a.get("option_letter")]
    print(f"  assets: {len(assets)}, option assets: {len(option_assets)}")
    for asset in option_assets[:8]:
        print(f"    {asset['id']} letter={asset['option_letter']} role={asset.get('role')}")
    print(f"  options keys: {sorted(data['draft']['options'])}")
    print(f"  stem length: {len(data['draft']['questionStem'])}")


def main() -> int:
    check_answer_key_guard(2119)
    graphical = find_graphical_question()
    if graphical:
        check_graphical(graphical)
    else:
        print("\nno graphical-option question found")
    return 0


if __name__ == "__main__":
    sys.exit(main())
