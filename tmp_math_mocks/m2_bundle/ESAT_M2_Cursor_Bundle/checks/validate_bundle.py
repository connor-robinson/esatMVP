"""Standalone integrity checks for the exported ESAT Mathematics 2 bundle."""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

from PIL import Image


EXPECTED_TOPICS = {"MM1": 10, "MM2": 6, "MM3": 6, "MM4": 8, "MM5": 6, "MM6": 6, "MM7": 6, "MM8": 6}
EXPECTED_DIFFICULTY = {"easy": 14, "medium": 28, "hard": 12}
EXPECTED_ANSWERS = {"A": 8, "B": 8, "C": 8, "D": 8, "E": 8, "F": 7, "G": 7}


def validate_bundle(root: Path) -> dict:
    errors: list[str] = []
    data_path = root / "data" / "questions.json"
    try:
        pack = json.loads(data_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return {"questions": 0, "diagrams": 0, "errors": [f"Cannot read questions.json: {exc}"]}

    modules = pack.get("modules", [])
    if [len(module.get("questions", [])) for module in modules] != [27, 27]:
        errors.append("Expected two modules containing 27 questions each")

    questions = [question for module in modules for question in module.get("questions", [])]
    ids = [question.get("id") for question in questions]
    if len(ids) != len(set(ids)):
        errors.append("Question IDs are not unique")

    difficulty = Counter()
    answers = Counter()
    topics = Counter()
    diagram_count = 0
    for question in questions:
        qid = question.get("id", "unknown")
        options = question.get("options", [])
        option_ids = [option.get("id") for option in options]
        if not 4 <= len(options) <= 7 or len(option_ids) != len(set(option_ids)):
            errors.append(f"{qid}: options must contain 4 to 7 unique IDs")
        answer = question.get("correctOptionId")
        if answer not in option_ids:
            errors.append(f"{qid}: correct answer is missing from options")
        distractors = question.get("authorNotes", {}).get("distractors", {})
        if set(distractors) != set(option_ids) - {answer}:
            errors.append(f"{qid}: distractor map does not match incorrect options")
        if not 1 <= question.get("estimatedSeconds", 0) <= 90:
            errors.append(f"{qid}: estimated time is outside 1 to 90 seconds")
        if "—" in json.dumps(question, ensure_ascii=False):
            errors.append(f"{qid}: contains an em dash")
        for segment in question.get("stem", []):
            if segment.get("type") == "math":
                content = segment.get("content", "")
                if not content.startswith(r"\[") or not content.endswith(r"\]"):
                    errors.append(f"{qid}: invalid display-TeX delimiters")
        for option in options:
            tex = option.get("tex")
            if tex is not None and (not tex.startswith(r"\(") or not tex.endswith(r"\)")):
                errors.append(f"{qid}: option {option.get('id')} has invalid inline-TeX delimiters")

        difficulty[question.get("difficulty")] += 1
        answers[answer] += 1
        topics[str(question.get("syllabus", {}).get("primaryCode", ""))[:3]] += 1

        diagram = question.get("diagram")
        if diagram:
            diagram_count += 1
            png = root / "public" / diagram["pngPath"].lstrip("/")
            svg = root / "public" / diagram["svgPath"].lstrip("/")
            if not png.is_file() or not svg.is_file():
                errors.append(f"{qid}: diagram asset is missing")
                continue
            try:
                with Image.open(png) as image:
                    image.load()
                    if image.mode != "RGBA":
                        errors.append(f"{qid}: PNG must use RGBA mode")
            except Exception as exc:
                errors.append(f"{qid}: PNG cannot be decoded: {exc}")
            svg_text = svg.read_text(encoding="utf-8")
            if "<title>" not in svg_text or "<desc>" not in svg_text:
                errors.append(f"{qid}: SVG lacks accessible title or description")

    if dict(difficulty) != EXPECTED_DIFFICULTY:
        errors.append(f"Difficulty distribution changed: {dict(difficulty)}")
    if dict(answers) != EXPECTED_ANSWERS:
        errors.append(f"Answer distribution changed: {dict(answers)}")
    if dict(topics) != EXPECTED_TOPICS:
        errors.append(f"Topic distribution changed: {dict(topics)}")
    if sum(bool(question.get("strongQuestion")) for question in questions) != 8:
        errors.append("Expected eight strong questions")

    return {"questions": len(questions), "diagrams": diagram_count, "errors": errors}


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    report = validate_bundle(root)
    print(json.dumps(report, indent=2))
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
