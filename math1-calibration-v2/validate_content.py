#!/usr/bin/env python3
"""Independent arithmetic and structural checks for Mathematics 1 Calibration v2."""

from __future__ import annotations

import json
import math
from collections import Counter
from fractions import Fraction
from pathlib import Path

from PIL import Image, ImageStat


ROOT = Path(__file__).resolve().parent
DATA = json.loads((ROOT / "questions.json").read_text(encoding="utf-8"))
QUESTIONS = DATA["questions"]


def close(actual: float, expected: float, tolerance: float = 1e-9) -> None:
    assert abs(actual - expected) <= tolerance, (actual, expected)


def angle_degrees(p: tuple[float, float], q: tuple[float, float], r: tuple[float, float]) -> float:
    """Return angle PQR in degrees."""
    u = (p[0] - q[0], p[1] - q[1])
    v = (r[0] - q[0], r[1] - q[1])
    cosine = (u[0] * v[0] + u[1] * v[1]) / (math.hypot(*u) * math.hypot(*v))
    return math.degrees(math.acos(max(-1.0, min(1.0, cosine))))


def validate_structure() -> None:
    assert len(QUESTIONS) == 15
    assert [q["position"] for q in QUESTIONS] == list(range(1, 16))
    assert len({q["id"] for q in QUESTIONS}) == 15
    assert all(5 <= len(q["options"]) <= 8 for q in QUESTIONS)
    assert all(q["correctOption"] in {o["id"] for o in q["options"]} for q in QUESTIONS)
    assert [q["correctOption"] for q in QUESTIONS] == DATA["assessment"]["correctOptionSequence"]
    assert Counter(q["correctOption"] for q in QUESTIONS) == Counter({"A": 3, "B": 2, "C": 3, "D": 2, "E": 3, "F": 2})
    assert Counter(q["difficulty"] for q in QUESTIONS) == Counter({"accessible": 4, "medium": 7, "difficult": 4})
    assert sum(q["targetTimeSeconds"] for q in QUESTIONS) == 1185
    assert sum(q["visualSpec"] is not None for q in QUESTIONS) == 8
    for question in QUESTIONS:
        text_fields = [question["stemMarkdown"], question["solutionMarkdown"], question["fastInsight"]]
        text_fields.extend(option["contentMarkdown"] for option in question["options"])
        for value in text_fields:
            assert value.count(r"\(") == value.count(r"\)"), (question["id"], "unbalanced MathJax delimiters", value)
            depth = 0
            for character in value:
                if character == "{":
                    depth += 1
                elif character == "}":
                    depth -= 1
                    assert depth >= 0, (question["id"], "closing brace before opening brace", value)
            assert depth == 0, (question["id"], "unbalanced braces", value)


def validate_answers() -> None:
    # Q1: incircle radius of midpoint square is 3*sqrt(2).
    q1_fraction = math.pi * (3 * math.sqrt(2)) ** 2 / 12**2
    close(q1_fraction, math.pi / 8)

    # Q2: storage in GB.
    q2_storage = 4 * (2.5 * 60) * 6.0 / 1000
    close(q2_storage, 3.6)

    # Q3: k=1 and roots of x(8-x)=9 are 4 +/- sqrt(7).
    k = 12 / (2 * (8 - 2))
    close(k, 1)
    q3_distance = (4 + math.sqrt(7)) - (4 - math.sqrt(7))
    close(q3_distance, 2 * math.sqrt(7))

    # Q4: percentage multipliers on ratio parts.
    q4_ratio = Fraction(3, 1) * Fraction(6, 5) / (Fraction(2, 1) * Fraction(9, 10))
    assert q4_ratio == 2

    # Q5: enumerate the 16 equally likely labelled sectors.
    x_spinner = [1, 2, 2, 3]
    y_spinner = [1, 2, 3, 4]
    primes = {2, 3, 5, 7}
    q5_favourable = sum(x + y in primes for x in x_spinner for y in y_spinner)
    assert Fraction(q5_favourable, 16) == Fraction(9, 16)

    # Q6: volume and density, including 1000 mm^3 = 1 cm^3.
    q6_volume_mm3 = 0.40 * 75 * (10 * 60)
    q6_mass_g = (q6_volume_mm3 / 1000) * 1.2
    close(q6_mass_g, 21.6)

    # Q7: x^3 + x^-3 = (x + x^-1)^3 - 3(x + x^-1).
    q7_denominator = 3**3 - 3 * 3
    assert Fraction(1, q7_denominator) == Fraction(1, 18)

    # Q8: solve (x+100)/3 = x+2.
    q8_x = Fraction(100 - 6, 2)
    assert q8_x == 47
    assert (42 + 45 + q8_x + (q8_x + 2) + 51 + 60) / 6 == q8_x + 2

    # Q9: verify the exact intended rendered geometry numerically.
    spec9 = QUESTIONS[8]["visualSpec"]["geometry"]["points"]
    A, B, C, T = (tuple(spec9[name]) for name in ("A", "B", "C", "T"))
    close(math.dist(A, B), math.dist(A, T), 1e-8)
    close(angle_degrees(A, T, B), 70, 1e-7)
    close(angle_degrees(A, C, B), 40, 1e-7)

    # Q10: reciprocal conjugates produce 10.
    x = math.sqrt(3) + math.sqrt(2)
    close(x**2 + x**-2, 10)

    # Q11: volume scale times density scale.
    q11_mass_ratio = Fraction(6, 5) ** 3 * Fraction(5, 8)
    assert q11_mass_ratio == Fraction(27, 25)

    # Q12: first stage above 280.
    lights = lambda n: (n + 1) * (n + 3)
    assert lights(14) == 255
    assert lights(15) == 288
    assert next(n for n in range(1, 100) if lights(n) > 280) == 15

    # Q13: equal priors cancel in Bayes' rule.
    match_given_a = Fraction(1, 3)
    match_given_b = Fraction(3, 6)
    q13_posterior = match_given_a / (match_given_a + match_given_b)
    assert q13_posterior == Fraction(2, 5)

    # Q14: P=A+3/4(B-A); perpendicular gradient is -2.
    A14, B14 = (-2, 1), (6, 5)
    P14 = tuple(Fraction(a) + Fraction(3, 4) * (Fraction(b) - Fraction(a)) for a, b in zip(A14, B14))
    assert P14 == (4, 4)
    q14_x_intercept = P14[0] + P14[1] / 2
    assert q14_x_intercept == 6

    # Q15: compare the three distinct two-face unfoldings.
    a, b, c = 3, 5, 6
    q15_candidates_squared = [(a + b) ** 2 + c**2, (a + c) ** 2 + b**2, (b + c) ** 2 + a**2]
    assert q15_candidates_squared == [100, 106, 130]
    close(math.sqrt(min(q15_candidates_squared)), 10)


def validate_reference_diagrams() -> None:
    expected = {
        "q01-midpoint-incircle.png",
        "q03-parabolic-arch.png",
        "q05-paired-spinners.png",
        "q09-circle-tangent.png",
        "q12-growing-light-wall.png",
        "q13-counter-boxes.png",
        "q14-coordinate-perpendicular.png",
        "q15-cuboid-surface-route.png",
    }
    preview_dir = ROOT / "diagram_previews"
    actual = {path.name for path in preview_dir.glob("*.png")}
    assert actual == expected, (actual, expected)
    for name in sorted(expected):
        with Image.open(preview_dir / name) as image:
            assert image.width >= 1400, (name, image.size)
            assert image.height >= 800, (name, image.size)
            grayscale = image.convert("L")
            extrema = grayscale.getextrema()
            assert extrema[1] - extrema[0] >= 80, (name, extrema)
            assert ImageStat.Stat(grayscale).var[0] > 25, (name, "image appears blank")


if __name__ == "__main__":
    validate_structure()
    validate_answers()
    validate_reference_diagrams()
    print("PASS: structure, 15 independent answers, and 8 reference diagrams validated.")
