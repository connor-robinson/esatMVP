#!/usr/bin/env python3
"""Structural, mathematical and image checks for the final calibration package."""

from __future__ import annotations

import hashlib
import json
import math
from collections import Counter
from fractions import Fraction
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
DATA = json.loads((ROOT / "questions.json").read_text(encoding="utf-8"))
QUESTIONS = DATA["questions"]


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def option_ids(question):
    return [option["id"] for option in question["options"]]


def check_structure():
    assessment = DATA["assessment"]
    require(len(QUESTIONS) == 15, "There must be exactly 15 questions")
    require([q["position"] for q in QUESTIONS] == list(range(1, 16)), "Positions must be 1 to 15")
    require(len({q["id"] for q in QUESTIONS}) == 15, "Question IDs must be unique")
    require(sum(q["targetTimeSeconds"] for q in QUESTIONS) == 1195, "Target time must be 1195 seconds")
    require(Counter(q["difficulty"] for q in QUESTIONS) == Counter(assessment["difficultyMix"]), "Difficulty mix mismatch")
    require(Counter(q["primaryTopic"] for q in QUESTIONS) == Counter(assessment["topicMix"]), "Topic mix mismatch")
    require("".join(q["correctOption"] for q in QUESTIONS) == "CEBFADCEBFADCEB", "Answer sequence mismatch")
    require(sum(q["diagramPath"] is not None for q in QUESTIONS) == 8, "Expected eight diagrams")

    for question in QUESTIONS:
        ids = option_ids(question)
        require(5 <= len(ids) <= 8, f"{question['id']} must have 5 to 8 options")
        require(len(ids) == len(set(ids)), f"{question['id']} has duplicate option IDs")
        require(question["correctOption"] in ids, f"{question['id']} answer is not an option")
        require(question["solutionMarkdown"].strip(), f"{question['id']} has no solution")
        require(question["fastInsight"].strip(), f"{question['id']} has no insight")
        require(0.7 <= question["irt"]["a"] <= 1.6, f"{question['id']} has implausible provisional a")
        require(-1.5 <= question["irt"]["b"] <= 1.3, f"{question['id']} has implausible provisional b")


def check_mathematics():
    expected = {
        "m1cal-final-q01": math.pi / 8,
        "m1cal-final-q02": 4,
        "m1cal-final-q03": None,
        "m1cal-final-q04": Fraction(7, 15),
        "m1cal-final-q05": Fraction(5, 16),
        "m1cal-final-q06": 14,
        "m1cal-final-q07": 65,
        "m1cal-final-q08": 9,
        "m1cal-final-q09": 40,
        "m1cal-final-q10": 75,
        "m1cal-final-q11": Fraction(4, 5),
        "m1cal-final-q12": 3 * math.sqrt(3) / 4,
        "m1cal-final-q13": Fraction(1, 18),
        "m1cal-final-q14": 380,
        "m1cal-final-q15": 16,
    }

    # Q1: incircle of midpoint square.
    require(math.isclose(math.pi * (3 * math.sqrt(2)) ** 2 / 12**2, expected["m1cal-final-q01"]), "Q1 failed")

    # Q2: conjugate denominators.
    q2 = 1 / (math.sqrt(5) - 2) - 1 / (math.sqrt(5) + 2)
    require(math.isclose(q2, expected["m1cal-final-q02"]), "Q2 failed")

    # Q3: rearrangement is symbolically equivalent.
    for p, r in ((0.2, 7.0), (-0.5, 3.0), (2.0, 5.0)):
        rearranged = r * (p + 1) / (3 - 2 * p)
        require(math.isclose((3 * rearranged - r) / (2 * rearranged + r), p), "Q3 failed")

    # Q4: unordered pair enumeration.
    pairs = [(a, b) for a in range(1, 7) for b in range(a + 1, 7)]
    favourable = [(a, b) for a, b in pairs if (a * b) % 6 == 0]
    require(Fraction(len(favourable), len(pairs)) == expected["m1cal-final-q04"], "Q4 failed")

    # Q5: shoelace area.
    P, Q, R = (Fraction(1, 3), 0), (1, Fraction(1, 4)), (Fraction(1, 2), 1)
    twice_area = abs(P[0] * Q[1] + Q[0] * R[1] + R[0] * P[1] - P[1] * Q[0] - Q[1] * R[0] - R[1] * P[0])
    require(twice_area / 2 == expected["m1cal-final-q05"], "Q5 failed")

    # Q6: repeated-root discriminant.
    require(36 - 4 * (expected["m1cal-final-q06"] - 5) == 0, "Q6 failed")

    # Q7: generate the spiral through 121 and inspect the cell below 100.
    positions = {1: (0, 0)}
    x = y = 0
    n = 1
    step = 1
    while n < 121:
        for dx, dy in ((1, 0), (0, 1)):
            for _ in range(step):
                if n >= 121:
                    break
                x, y, n = x + dx, y + dy, n + 1
                positions[n] = (x, y)
        step += 1
        for dx, dy in ((-1, 0), (0, -1)):
            for _ in range(step):
                if n >= 121:
                    break
                x, y, n = x + dx, y + dy, n + 1
                positions[n] = (x, y)
        step += 1
    inverse = {coordinate: number for number, coordinate in positions.items()}
    x100, y100 = positions[100]
    require(inverse[(x100, y100 - 1)] == expected["m1cal-final-q07"], "Q7 failed")

    # Q8: exponent is (x-4)^2+2.
    for x in (-3, 0, 4, 11):
        require((x - 4) ** 2 + 2 == x**2 - 8 * x + 18, "Q8 square completion failed")
    require(3**2 == expected["m1cal-final-q08"], "Q8 value failed")

    # Q9: isosceles triangle leaves 40 degrees.
    require(180 - 2 * 70 == expected["m1cal-final-q09"], "Q9 failed")

    # Q10: tooth contacts and time conversion.
    require(Fraction(25 * 18, 30) * 5 == expected["m1cal-final-q10"], "Q10 failed")

    # Q11: Bayes calculation.
    joint_red_transfer = Fraction(2, 3) * Fraction(2, 4)
    joint_blue_transfer = Fraction(1, 3) * Fraction(1, 4)
    require(joint_red_transfer / (joint_red_transfer + joint_blue_transfer) == expected["m1cal-final-q11"], "Q11 failed")

    # Q12: regular hexagon to square area ratio at common circumradius.
    ratio = (6 * math.sqrt(3) / 4) / 2
    require(math.isclose(ratio, expected["m1cal-final-q12"]), "Q12 failed")

    # Q13: reciprocal cube identity.
    require(Fraction(1, 3**3 - 3 * 3) == expected["m1cal-final-q13"], "Q13 failed")

    # Q14: same-time distance ratio.
    L = expected["m1cal-final-q14"]
    require(Fraction(L - 80, L - 140) == Fraction(5, 4), "Q14 failed")

    # Q15: two horizontal centre separations.
    separation = 2 * math.sqrt(1 * 4) + 2 * math.sqrt(4 * 9)
    require(separation == expected["m1cal-final-q15"], "Q15 failed")


def check_images():
    image_hashes = {}
    for question in QUESTIONS:
        if not question["diagramPath"]:
            continue
        path = ROOT / question["diagramPath"]
        require(path.exists(), f"Missing diagram: {path}")
        with Image.open(path).convert("RGB") as image:
            require(image.width >= 1400, f"Diagram too narrow: {path.name} ({image.width}px)")
            require(image.height >= 900, f"Diagram too short: {path.name} ({image.height}px)")
            sample = image.resize((120, 120))
            colours = sample.get_flattened_data() if hasattr(sample, "get_flattened_data") else sample.getdata()
            require(all(r == g == b for r, g, b in colours), f"Diagram is not grayscale: {path.name}")
        image_hashes[path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
    return image_hashes


def main():
    check_structure()
    check_mathematics()
    hashes = check_images()
    print("PASS: 15 structurally valid questions")
    print("PASS: all 15 independent mathematical checks")
    print("PASS: 8 grayscale diagrams at required resolution")
    print("PASS: answer sequence CEBFADCEBFADCEB")
    print("Diagram SHA-256:")
    for name, digest in hashes.items():
        print(f"  {name}: {digest}")


if __name__ == "__main__":
    main()
