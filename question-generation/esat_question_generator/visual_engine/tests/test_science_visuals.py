from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest

from visual_engine.errors import VisualSpecError
from visual_engine.objects.pedigree import layout_pedigree
from visual_engine.question_designer import parse_question_design
from visual_engine.render_matplotlib import render_diagram
from visual_engine.science_visuals import chem_structure_spec, pedigree_spec
from visual_engine.tables import (
    ensure_table_in_stem,
    fill_options_from_option_table,
    normalize_table,
    should_hide_written_options,
    stem_has_option_table,
    table_to_markdown,
)


def test_normalize_table_and_markdown():
    table = {
        "headers": ["time / s", "mass / g"],
        "rows": [["0", "0.0"], ["20", "4.2"]],
    }
    data = normalize_table(table)
    assert data is not None
    md = table_to_markdown(data)
    assert "time / s" in md
    assert "4.2" in md
    stem = ensure_table_in_stem("Mass of product is recorded.", table)
    assert "| time / s |" in stem


def test_option_table_hides_row_placeholders():
    table = {
        "headers": [
            "Net movement across outer membrane",
            "Net movement across inner membrane",
            "Initial change in mass of inner bag",
        ],
        "rows": [
            ["beaker to outer bag", "outer bag to inner bag", "increases"],
            ["beaker to outer bag", "outer bag to inner bag", "decreases"],
            ["beaker to outer bag", "inner bag to outer bag", "increases"],
            ["beaker to outer bag", "inner bag to outer bag", "decreases"],
            ["outer bag to beaker", "outer bag to inner bag", "increases"],
        ],
        "row_headers": ["A", "B", "C", "D", "E"],
    }
    stem = ensure_table_in_stem("An artificial cell is placed in a beaker.", table)
    assert stem_has_option_table(stem)
    placeholders = {letter: f"row {letter}" for letter in "ABCDE"}
    assert should_hide_written_options(stem, placeholders)
    filled = fill_options_from_option_table(stem, placeholders)
    assert filled["E"].startswith("outer bag to beaker")
    assert "row E" not in filled["E"]


def test_option_table_detects_bold_letter_cells():
    stem = """Which row is correct?

| | outer membrane | inner membrane | inner bag |
|---|---|---|---|
| **A** | beaker $\\rightarrow$ outer bag | outer bag $\\rightarrow$ inner bag | increases |
| **B** | beaker $\\rightarrow$ outer bag | outer bag $\\rightarrow$ inner bag | decreases |
| **C** | beaker $\\rightarrow$ outer bag | inner bag $\\rightarrow$ outer bag | increases |
| **D** | beaker $\\rightarrow$ outer bag | inner bag $\\rightarrow$ outer bag | decreases |
| **E** | outer bag $\\rightarrow$ beaker | outer bag $\\rightarrow$ inner bag | increases |
"""
    placeholders = {letter: f"row {letter}" for letter in "ABCDE"}
    assert stem_has_option_table(stem)
    assert should_hide_written_options(stem, placeholders)
    filled = fill_options_from_option_table(stem, placeholders)
    assert filled["E"].startswith("outer bag")
    assert "row E" not in filled["E"]


def test_parse_chemistry_plain_text():
    design = parse_question_design(
        {
            "skip": False,
            "variation_mode": "sibling",
            "mode_reason": "same stoichiometry skill",
            "difficulty": "Medium",
            "needs_diagram": False,
            "stem": "What is the Mr of $\\ce{H2SO4}$? (Ar: H=1, S=32, O=16)",
            "options": {"A": "82", "B": "98", "C": "96", "D": "80", "E": "64"},
            "correct_option": "B",
            "explanation": "2+32+64=98",
            "idea_plan": {"visual_type": "none", "visual_brief": ""},
        },
        subject="chemistry",
    )
    assert design.needs_diagram is False
    assert design.idea_plan["visual_type"] == "none"


def test_parse_chemistry_table_requires_data():
    with pytest.raises(VisualSpecError):
        parse_question_design(
            {
                "skip": False,
                "variation_mode": "sibling",
                "mode_reason": "data table",
                "stem": "Use the table.",
                "options": {"A": "1", "B": "2", "C": "3", "D": "4"},
                "correct_option": "A",
                "explanation": "from the table",
                "idea_plan": {"visual_type": "table"},
            },
            subject="chemistry",
        )


def test_chem_structure_renders(tmp_path: Path):
    spec = chem_structure_spec(
        {
            "atoms": [
                {"id": "c1", "label": "C", "x": 0, "y": 0},
                {"id": "c2", "label": "C", "x": 1.4, "y": 0},
                {"id": "h1", "label": "H", "x": 0, "y": 1.0},
                {"id": "ch3", "label": "CH3", "x": 2.4, "y": 0},
            ],
            "bonds": [
                {"from": "c1", "to": "c2", "order": 1},
                {"from": "c1", "to": "h1", "order": 1},
                {"from": "c2", "to": "ch3", "order": 1},
            ],
        }
    )
    out = tmp_path / "chem.png"
    render_diagram(spec, out)
    assert out.is_file()
    assert out.stat().st_size > 100


def test_pedigree_layout_places_generations():
    raw = {
        "people": [
            {"id": "I1", "sex": "female", "affected": True, "generation": 1, "label": "1"},
            {"id": "I2", "sex": "male", "affected": False, "generation": 1, "label": "2"},
            {"id": "II1", "sex": "female", "affected": False, "generation": 2, "label": "3"},
        ],
        "unions": [{"a": "I1", "b": "I2"}],
        "children": [{"parents": ["I1", "I2"], "offspring": ["II1"]}],
    }
    coords = layout_pedigree(raw)
    assert set(coords) == {"I1", "I2", "II1"}
    assert coords["II1"][1] < coords["I1"][1]
    spec = pedigree_spec(raw)
    assert spec["objects"][0]["type"] == "pedigree"


def test_select_nsaa_subject_keeps_biology(tmp_path: Path):
    from visual_engine.eval.question_selector import EvalQuestion, select_nsaa_subject_questions

    bio = EvalQuestion(
        question_id=201,
        exam_name="NSAA",
        exam_year=2019,
        paper_name="Section 1",
        question_number=40,
        question_stem="A pedigree shows inheritance of a recessive allele.",
        diagram_url="",
        diagram_asset_id="",
        source_image_url="",
        part_name="Biology",
    )
    math = EvalQuestion(
        question_id=101,
        exam_name="NSAA",
        exam_year=2019,
        paper_name="Section 1",
        question_number=1,
        question_stem="In triangle ABC, angle A is 30 degrees.",
        diagram_url="https://example.com/nsaa.png",
        diagram_asset_id="d1",
        source_image_url="https://example.com/q.png",
        part_name="Mathematics",
    )
    with patch(
        "visual_engine.eval.question_selector._fetch_subject_questions",
        return_value=[bio, math],
    ):
        selected = select_nsaa_subject_questions(
            subject="biology",
            count=20,
            audit_summary_path=tmp_path / "no-audit.json",
        )
    assert [eq.question_id for eq in selected] == [201]


def test_has_source_visual_and_require_diagram(tmp_path: Path):
    from visual_engine.eval.question_selector import EvalQuestion, select_nsaa_subject_questions

    bio = EvalQuestion(
        question_id=201,
        exam_name="NSAA",
        exam_year=2019,
        paper_name="Section 1",
        question_number=40,
        question_stem="A pedigree shows inheritance of a recessive allele.",
        diagram_url="",
        diagram_asset_id="",
        source_image_url="",
        part_name="Biology",
    )
    bio_fig = EvalQuestion(
        question_id=202,
        exam_name="NSAA",
        exam_year=2019,
        paper_name="Section 1",
        question_number=41,
        question_stem="The graph shows enzyme rate against pH.",
        diagram_url="https://example.com/graph.png",
        diagram_asset_id="d1",
        source_image_url="",
        part_name="Biology",
    )
    assert bio.has_source_visual is False
    assert bio_fig.has_source_visual is True
    with patch(
        "visual_engine.eval.question_selector._fetch_subject_questions",
        return_value=[bio, bio_fig],
    ):
        selected = select_nsaa_subject_questions(
            subject="biology",
            require_diagram=True,
            audit_summary_path=tmp_path / "no-audit.json",
        )
    assert [eq.question_id for eq in selected] == [202]


def test_diagrams_only_mix_hint():
    from visual_engine.nsaa_batch import _mix_hint

    hint = _mix_hint("biology", {}, diagrams_only=True)
    assert "none or table" in hint
    assert "pedigree" in hint
