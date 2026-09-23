"""ESAT difficulty sampling for NSAA → ESAT generation."""

from __future__ import annotations

import os
import random
from typing import Mapping

# Default ESAT mix: Easy 5%, Medium 20%, Hard 55%, Extreme 15%.
DEFAULT_ESAT_DIFFICULTY_WEIGHTS: dict[str, float] = {
    "Easy": 0.05,
    "Medium": 0.20,
    "Hard": 0.55,
    "Extreme": 0.15,
}

VALID_DIFFICULTIES = tuple(DEFAULT_ESAT_DIFFICULTY_WEIGHTS.keys())


def difficulty_weights_from_env() -> dict[str, float]:
    d = DEFAULT_ESAT_DIFFICULTY_WEIGHTS
    return {
        "Easy": float(os.environ.get("W_EASY", str(d["Easy"]))),
        "Medium": float(os.environ.get("W_MED", str(d["Medium"]))),
        "Hard": float(os.environ.get("W_HARD", str(d["Hard"]))),
        "Extreme": float(os.environ.get("W_EXTREME", str(d["Extreme"]))),
    }


def normalize_difficulty(raw: str | None, *, default: str = "Hard") -> str:
    text = str(raw or "").strip()
    for label in VALID_DIFFICULTIES:
        if text.lower() == label.lower():
            return label
    fallback = default if default in VALID_DIFFICULTIES else "Hard"
    return fallback


def choose_target_difficulty(
    counts: Mapping[str, int] | None = None,
    *,
    rng: random.Random | None = None,
) -> str:
    """Sample a target difficulty using ESAT weights, rebalancing vs batch counts."""
    pick = rng.choices if rng is not None else random.choices
    weights = difficulty_weights_from_env()
    labels = list(weights.keys())
    base = [max(0.0, float(weights[d])) for d in labels]
    if not any(base):
        base = [DEFAULT_ESAT_DIFFICULTY_WEIGHTS[d] for d in labels]

    if counts:
        total = float(sum(int(counts.get(d, 0) or 0) for d in labels)) or 1.0
        weight_sum = float(sum(base)) or 1.0
        adjusted: list[float] = []
        for d, w in zip(labels, base):
            target_share = w / weight_sum
            actual_share = float(counts.get(d, 0) or 0) / total
            # Boost under-filled bands so the batch does not collapse to Medium.
            adjusted.append(max(0.01, w * (1.0 + 3.0 * max(0.0, target_share - actual_share))))
        base = adjusted

    return str(pick(labels, weights=base, k=1)[0])


def difficulty_mix_hint(target: str, counts: Mapping[str, int] | None = None) -> str:
    label = normalize_difficulty(target)
    bits = [
        f"Target difficulty for THIS item: {label}.",
        "Write the question at that ESAT band and set JSON difficulty to exactly that label.",
        "ESAT calibration: Easy = routine one-step; Medium = standard multi-step; "
        "Hard = typical ESAT stretch (multi-step + trap options); "
        "Extreme = unusually dense / subtle for ESAT.",
        "Do not default to Medium. Many NSAA-style items are Hard.",
    ]
    if counts:
        shown = ", ".join(f"{d}={int(counts.get(d, 0) or 0)}" for d in VALID_DIFFICULTIES)
        bits.append(f"Batch difficulty so far: {shown}.")
    return " ".join(bits)
