"""Schema-first pedigree validation, layout, and rendering tests."""

from __future__ import annotations

from pathlib import Path

import pytest

from visual_engine.errors import VisualSpecError
from visual_engine.objects.pedigree import layout_pedigree
from visual_engine.pedigree_schema import validate_pedigree
from visual_engine.render_matplotlib import render_diagram
from visual_engine.science_visuals import pedigree_spec


def _simple_family() -> dict:
    return {
        "individuals": [
            {"id": 1, "sex": "female", "generation": 1, "status": "unaffected", "label": "1"},
            {"id": 2, "sex": "male", "generation": 1, "status": "unaffected", "label": "2"},
            {"id": 3, "sex": "female", "generation": 2, "status": "unaffected", "label": "3"},
            {"id": 4, "sex": "male", "generation": 2, "status": "unaffected", "label": "4"},
            {"id": 5, "sex": "female", "generation": 2, "status": "unaffected", "label": "5"},
        ],
        "families": [{"parents": [1, 2], "children": [3, 4, 5]}],
        "legend": {"show": False, "entries": []},
    }


def test_a_simple_two_parent_three_children():
    result = validate_pedigree(_simple_family())
    assert result.valid, result.errors
    coords = layout_pedigree(result.pedigree)
    assert set(coords) == {"1", "2", "3", "4", "5"}
    assert coords["3"][1] < coords["1"][1]
    mid = (coords["1"][0] + coords["2"][0]) / 2
    kids_mid = (coords["3"][0] + coords["5"][0]) / 2
    assert abs(kids_mid - mid) < 0.8


def test_b_c_two_and_three_generations():
    raw = {
        "individuals": [
            {"id": "I1", "sex": "female", "generation": 1, "status": "unaffected"},
            {"id": "I2", "sex": "male", "generation": 1, "status": "unaffected"},
            {"id": "II1", "sex": "female", "generation": 2, "status": "unaffected"},
            {"id": "II2", "sex": "male", "generation": 2, "status": "unaffected"},
            {"id": "III1", "sex": "male", "generation": 3, "status": "affected"},
        ],
        "families": [
            {"parents": ["I1", "I2"], "children": ["II1", "II2"]},
            {"parents": ["II1", "II2"], "children": ["III1"]},
        ],
    }
    result = validate_pedigree(raw)
    assert result.valid, result.errors
    coords = layout_pedigree(result.pedigree)
    assert coords["III1"][1] < coords["II1"][1] < coords["I1"][1]


def test_d_multiple_sibling_groups():
    raw = {
        "individuals": [
            {"id": 1, "sex": "female", "generation": 1, "status": "unaffected"},
            {"id": 2, "sex": "male", "generation": 1, "status": "unaffected"},
            {"id": 3, "sex": "female", "generation": 1, "status": "unaffected"},
            {"id": 4, "sex": "male", "generation": 1, "status": "unaffected"},
            {"id": 5, "sex": "male", "generation": 2, "status": "unaffected"},
            {"id": 6, "sex": "female", "generation": 2, "status": "unaffected"},
            {"id": 7, "sex": "male", "generation": 2, "status": "unaffected"},
        ],
        "families": [
            {"parents": [1, 2], "children": [5, 6]},
            {"parents": [3, 4], "children": [7]},
        ],
        "legend": {"show": False, "entries": []},
    }
    result = validate_pedigree(raw)
    assert result.valid, result.errors
    coords = layout_pedigree(result.pedigree)
    assert coords["5"][1] == coords["6"][1] == coords["7"][1]


def test_e_child_becomes_parent():
    raw = {
        "individuals": [
            {"id": 1, "sex": "female", "generation": 1, "status": "unaffected"},
            {"id": 2, "sex": "male", "generation": 1, "status": "unaffected"},
            {"id": 3, "sex": "female", "generation": 2, "status": "unaffected"},
            {"id": 4, "sex": "male", "generation": 2, "status": "unaffected"},
            {"id": 5, "sex": "male", "generation": 3, "status": "unaffected"},
        ],
        "families": [
            {"parents": [1, 2], "children": [3]},
            {"parents": [3, 4], "children": [5]},
        ],
        "legend": {"show": False, "entries": []},
    }
    assert validate_pedigree(raw).valid


def test_f_g_h_affected_carrier_deceased(tmp_path: Path):
    raw = {
        "individuals": [
            {"id": 1, "sex": "female", "generation": 1, "status": "affected", "label": "1"},
            {"id": 2, "sex": "male", "generation": 1, "status": "carrier", "deceased": True, "label": "2"},
            {"id": 3, "sex": "female", "generation": 2, "status": "unaffected", "label": "3"},
        ],
        "families": [{"parents": [1, 2], "children": [3]}],
    }
    result = validate_pedigree(raw)
    assert result.valid, result.errors
    assert result.pedigree["legend"]["show"] is True
    spec = pedigree_spec(raw)
    out = tmp_path / "ped_aff.png"
    render_diagram(spec, out)
    assert out.is_file() and out.stat().st_size > 100


def test_i_striped_requires_legend():
    raw = {
        "individuals": [
            {"id": 1, "sex": "female", "generation": 1, "status": "striped"},
            {"id": 2, "sex": "male", "generation": 1, "status": "unaffected"},
            {"id": 3, "sex": "female", "generation": 2, "status": "unaffected"},
        ],
        "families": [{"parents": [1, 2], "children": [3]}],
        "legend": {"show": False, "entries": []},
    }
    result = validate_pedigree(raw)
    assert not result.valid
    assert any("legend" in e.lower() or "striped" in e.lower() for e in result.errors)

    raw["legend"] = {"show": True, "entries": [{"status": "striped", "label": "pattern A"}]}
    ok = validate_pedigree(raw)
    assert ok.valid, ok.errors
    assert ok.pedigree["legend"]["show"] is True


def test_j_zw_butterfly_sex_aliases():
    raw = {
        "individuals": [
            {"id": 1, "sex": "zw", "generation": 1, "status": "affected"},
            {"id": 2, "sex": "zz", "generation": 1, "status": "unaffected"},
            {"id": 3, "sex": "zw", "generation": 2, "status": "unaffected"},
        ],
        "families": [{"parents": [1, 2], "children": [3]}],
    }
    result = validate_pedigree(raw)
    assert result.valid, result.errors
    by_id = {p["id"]: p for p in result.pedigree["individuals"]}
    assert by_id["1"]["sex"] == "female"
    assert by_id["2"]["sex"] == "male"


def test_k_xy_human_sex_aliases():
    raw = {
        "individuals": [
            {"id": 1, "sex": "xx", "generation": 1, "status": "unaffected"},
            {"id": 2, "sex": "xy", "generation": 1, "status": "affected"},
            {"id": 3, "sex": "xx", "generation": 2, "status": "carrier"},
        ],
        "families": [{"parents": [1, 2], "children": [3]}],
    }
    result = validate_pedigree(raw)
    assert result.valid, result.errors
    by_id = {p["id"]: p for p in result.pedigree["individuals"]}
    assert by_id["1"]["sex"] == "female"
    assert by_id["2"]["sex"] == "male"


def test_l_duplicate_id():
    raw = {
        "individuals": [
            {"id": 1, "sex": "female", "generation": 1, "status": "unaffected"},
            {"id": 1, "sex": "male", "generation": 1, "status": "unaffected"},
        ],
        "families": [],
    }
    result = validate_pedigree(raw)
    assert not result.valid
    assert any("Duplicate" in e for e in result.errors)


def test_m_missing_parent():
    raw = {
        "individuals": [
            {"id": 1, "sex": "female", "generation": 1, "status": "unaffected"},
            {"id": 3, "sex": "male", "generation": 2, "status": "unaffected"},
        ],
        "families": [{"parents": [1, 2], "children": [3]}],
    }
    result = validate_pedigree(raw)
    assert not result.valid
    assert any("does not exist" in e for e in result.errors)


def test_n_three_person_mating_rejected():
    raw = {
        "individuals": [
            {"id": 1, "sex": "female", "generation": 1, "status": "unaffected"},
            {"id": 2, "sex": "male", "generation": 1, "status": "unaffected"},
            {"id": 3, "sex": "female", "generation": 1, "status": "unaffected"},
            {"id": 4, "sex": "male", "generation": 2, "status": "unaffected"},
        ],
        "families": [{"parents": [1, 2, 3], "children": [4]}],
    }
    result = validate_pedigree(raw)
    assert not result.valid
    assert any("3 parents" in e or "exactly 2" in e for e in result.errors)


def test_o_many_siblings_layout():
    kids = list(range(3, 12))
    raw = {
        "individuals": [
            {"id": 1, "sex": "female", "generation": 1, "status": "unaffected"},
            {"id": 2, "sex": "male", "generation": 1, "status": "unaffected"},
            *[{"id": k, "sex": "male" if k % 2 else "female", "generation": 2, "status": "unaffected"} for k in kids],
        ],
        "families": [{"parents": [1, 2], "children": kids}],
        "legend": {"show": False, "entries": []},
    }
    result = validate_pedigree(raw)
    assert result.valid, result.errors
    coords = layout_pedigree(result.pedigree)
    xs = [coords[str(k)][0] for k in kids]
    assert xs == sorted(xs)
    for i in range(1, len(xs)):
        assert xs[i] - xs[i - 1] >= 1.0


def test_p_no_third_person_between_mating_pair():
    raw = _simple_family()
    result = validate_pedigree(raw)
    coords = layout_pedigree(result.pedigree)
    x1, x2 = sorted([coords["1"][0], coords["2"][0]])
    for pid, (x, y) in coords.items():
        if pid in {"1", "2"}:
            continue
        if abs(y - coords["1"][1]) < 1e-6:
            assert not (x1 < x < x2), f"{pid} sits on mating line between parents"


def test_q_legend_omitted_when_unused():
    result = validate_pedigree(_simple_family())
    assert result.valid
    assert result.pedigree["legend"]["show"] is False


def test_legacy_people_unions_still_accepted():
    raw = {
        "people": [
            {"id": "I1", "sex": "female", "affected": True, "generation": 1, "label": "1"},
            {"id": "I2", "sex": "male", "affected": False, "generation": 1, "label": "2"},
            {"id": "II1", "sex": "female", "affected": False, "generation": 2, "label": "3"},
        ],
        "unions": [{"a": "I1", "b": "I2"}],
        "children": [{"parents": ["I1", "I2"], "offspring": ["II1"]}],
    }
    result = validate_pedigree(raw)
    assert result.valid, result.errors
    coords = layout_pedigree(result.pedigree)
    assert set(coords) == {"I1", "I2", "II1"}
    spec = pedigree_spec(raw)
    assert spec["objects"][0]["type"] == "pedigree"
    assert "individuals" in spec["objects"][0]


def test_invalid_pedigree_spec_raises():
    with pytest.raises(VisualSpecError):
        pedigree_spec({"individuals": [], "families": []})
