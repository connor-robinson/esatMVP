"""Curriculum snapshot splits primary science module from assumed Math 1."""

from __future__ import annotations

from quality_gate.curriculum import (
    get_assumed_math1_curriculum,
    get_curriculum_for_row,
    get_curriculum_snapshot,
    get_primary_curriculum,
)


def test_chemistry_primary_is_chemistry_not_biology():
    primary = get_primary_curriculum("Chemistry")
    codes = {e["prefixed_code"] for e in primary}
    assert any(c.startswith("chemistry-C") for c in codes)
    assert not any(c.startswith("biology-B") for c in codes)
    assumed = get_assumed_math1_curriculum("Chemistry")
    assert assumed and all(e["paper_id"] == "math1" for e in assumed)


def test_biology_primary_is_biology_not_chemistry():
    primary = get_primary_curriculum("Biology")
    codes = {e["prefixed_code"] for e in primary}
    assert any(c.startswith("biology-B") for c in codes)
    assert not any(c.startswith("chemistry-C") for c in codes)


def test_snapshot_separates_primary_module_for_chemistry():
    snap = get_curriculum_snapshot("Chemistry")
    assert "Primary module" in snap
    assert "Assumed Mathematics 1 toolkit" in snap
    assert "Atomic structure" in snap
    # Primary section appears before Math 1 toolkit section.
    assert snap.index("Atomic structure") < snap.index("Assumed Mathematics 1 toolkit")


def test_curriculum_for_row_exposes_primary_codes():
    cur = get_curriculum_for_row({"subjects": "Biology", "primary_tag": "", "secondary_tags": []})
    assert cur["curriculum_primary_paper"] == "biology"
    assert any(str(c).startswith("biology-B") for c in cur["curriculum_primary_codes"])
    assert any(str(c).startswith("M1-") for c in cur["curriculum_assumed_math1_codes"])
