"""Tests for stem whitespace normalization."""

import re

from pipeline_v4.stem_whitespace import normalize_stem_whitespace


def test_plain_prose_collapses_sentence_breaks():
    stem = """Two liquids X and Y are heated separately by identical heaters.

Heating 1.0 kg of liquid X by 10 °C takes 2.0 minutes.

Heating 1.0 kg of liquid Y by 10 °C takes 4.0 minutes.

What is the final equilibrium temperature?"""
    out = normalize_stem_whitespace(stem)
    assert out.count("\n\n") <= 1
    assert "Two liquids X and Y" in out
    assert "What is the final equilibrium temperature?" in out
    assert "\n\nHeating 1.0 kg" not in out


def test_display_equation_spacing_preserved():
    stem = """The drag force is given by

$$
F = kv
$$

What happens when the speed doubles?"""
    out = normalize_stem_whitespace(stem)
    assert "$$" in out
    assert "F = kv" in out
    assert "$$" in out and "\n\n" in out


def test_graph_placeholder_block_level():
    stem = """The velocity-time graph is shown.

<GRAPH id="g1" />

What is the acceleration during the first 4 s?"""
    out = normalize_stem_whitespace(stem)
    assert "<GRAPH id=\"g1\" />" in out
    assert "velocity-time graph is shown" in out
    assert "What is the acceleration" in out
