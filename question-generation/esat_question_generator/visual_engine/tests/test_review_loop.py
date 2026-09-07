"""Tests for review store, auto-checks, regeneration prompts, and batch helpers."""

from __future__ import annotations

import json
from pathlib import Path

from visual_engine.auto_checks import has_reject, run_auto_checks
from visual_engine.diagram_designer import DiagramDesignerInput, build_user_payload
from visual_engine.eval.taxonomy import classify_failures, classify_issue
from visual_engine.generation import MAX_AUTO_ATTEMPTS, MAX_MANUAL_ATTEMPTS, build_correction_prompt, regenerate_diagram
from visual_engine.production_batch import question_needs_matplotlib_diagram
from visual_engine.review_store import ReviewStore


def test_correction_prompt_asks_for_smallest_change():
    text = build_correction_prompt("the 6 cm dimension is inside the polygon", tags=["dimensions"])
    assert "smallest possible correction" in text.lower()
    assert "do not redesign" in text.lower()
    assert "6 cm" in text
    assert "dimensions" in text


def test_regenerate_caps_automatic_attempts(tmp_path: Path):
    inp = DiagramDesignerInput(reference_question="Q", source_question_id="q1")
    try:
        regenerate_diagram(inp, tmp_path, critique="fix labels", attempt=3, allow_manual_third=False)
        raise AssertionError("expected ValueError")
    except ValueError as exc:
        assert "manual" in str(exc).lower()
    try:
        regenerate_diagram(inp, tmp_path, critique="fix labels", attempt=4, allow_manual_third=True)
        raise AssertionError("expected ValueError")
    except ValueError as exc:
        assert str(MAX_MANUAL_ATTEMPTS) in str(exc)
    assert MAX_AUTO_ATTEMPTS == 2


def test_repair_payload_overrides_instructions():
    payload = build_user_payload(
        DiagramDesignerInput(
            reference_question="Q",
            repair_feedback="move the dimension outside",
            prior_spec={"spec_version": "1.0"},
        )
    )
    assert "smallest possible correction" in payload["instructions"].lower()
    assert payload["repair_feedback"] == "move the dimension outside"
    assert payload["prior_visual_spec"]["spec_version"] == "1.0"


def test_auto_checks_duplicate_and_correct_answers(tmp_path: Path):
    flags = run_auto_checks(
        png_path=None,
        diagram_required=False,
        choices={"A": "2", "B": "3", "C": "2", "D": "4"},
        correct_answer="",
    )
    codes = {f["code"] for f in flags}
    assert "duplicate_options" in codes
    assert "correct_answer_count" in codes
    assert has_reject(flags)


def test_auto_checks_blank_and_missing_png(tmp_path: Path):
    missing = run_auto_checks(png_path=tmp_path / "nope.png", diagram_required=True)
    assert any(f["code"] == "png_missing" for f in missing)
    from PIL import Image

    blank = tmp_path / "blank.png"
    Image.new("RGB", (80, 80), "white").save(blank)
    blank_flags = run_auto_checks(png_path=blank, diagram_required=True)
    assert any(f["code"] == "png_blank" for f in blank_flags)


def test_review_store_supersede_never_deletes(tmp_path: Path):
    store = ReviewStore(tmp_path / "review.db")
    store.upsert_question(question_id="q1", stem="A triangle has sides 3, 4, 5.", subject="Math 1")
    first = store.add_diagram_attempt(question_id="q1", attempt=1, image_path="a.png", status="pending")
    second = store.add_diagram_attempt(
        question_id="q1",
        attempt=2,
        image_path="b.png",
        status="pending",
        parent_attempt_id=int(first["id"]),
        previous_attempt_ids=[int(first["id"])],
    )
    item = store.get_item("q1")
    assert item is not None
    assert len(item["attempts"]) == 2
    assert item["attempts"][0]["status"] == "superseded"
    assert item["attempts"][1]["id"] == second["id"]
    assert item["diagram"]["attempt"] == 2
    pending = store.list_items(status_filter="pending", latest_only=True)
    assert len(pending) == 1
    regen = store.list_items(status_filter="regenerated", latest_only=True)
    assert len(regen) == 1
    store.set_question_status("q1", "approved")
    store.set_diagram_status(int(second["id"]), "approved")
    counts = store.counts()
    assert counts["approved"] == 1
    assert store.get_item("q1")["attempts"][0]["status"] == "superseded"


def test_taxonomy_axis_class():
    assert classify_issue("The x-axis tick labels are floating").startswith("A.")
    out = classify_failures(
        [{"question_id": 1, "variation_mode": "far", "issues": ["tick labels float"]}]
    )
    assert out["counts"]["A. Axis ticks/titles"] == 1


def test_question_needs_diagram_heuristic():
    assert question_needs_matplotlib_diagram("In triangle ABC, angle A is 30 degrees.", {})
    assert not question_needs_matplotlib_diagram("The circuit contains a battery and a resistor.", {})
    assert question_needs_matplotlib_diagram("A particle moves on a line.", {"visual_need": "graph of velocity"})
    assert not question_needs_matplotlib_diagram("Solve 2x+3=11.", {"visual_need": "none"})


def test_eval_report_includes_sibling_far_split():
    from visual_engine.eval.report import AttemptRecord, EvalReport

    report = EvalReport(run_id="t", total_cases=2)
    report.records = [
        AttemptRecord(1, "sibling", "ENGAA", 1, True, True, False, verifier_verdict="PASS"),
        AttemptRecord(2, "far", "NSAA", 1, True, True, False, verifier_verdict="FIX", verifier_issues=["ticks"]),
    ]
    summary = report.summarize()
    assert summary["sibling_pass_rate"] == 1.0
    assert summary["far_pass_rate"] == 0.0
    assert summary["failures"][0]["question_id"] == 2
