"""Review exam-text KaTeX normalize + ESAT cycle math ratio."""

from __future__ import annotations

from collections import Counter

from visual_engine.eval.question_selector import EvalQuestion
from visual_engine.nsaa_esat_batch import MATH_SLOT_PERIOD, RATIO, _schedule_jobs
from visual_engine.review_app import _exam_text_height, _normalize_exam_math


def _eq(qid: int) -> EvalQuestion:
    return EvalQuestion(
        question_id=qid,
        exam_name="NSAA",
        exam_year=2020,
        paper_name="Section 1",
        question_number=qid,
        question_stem="stem",
        diagram_url="https://example.com/d.png",
        diagram_asset_id="a",
        source_image_url="",
    )


def test_normalize_unbraced_degree_c():
    assert _normalize_exam_math(r"$25\,^\circ\text{C}$") == r"$25^{\circ}\mathrm{C}$"
    assert _normalize_exam_math(r"$35\,^\circ\text{C}$") == r"$35^{\circ}\mathrm{C}$"
    assert _normalize_exam_math(r"$40^{\circ}\text{C}$") == r"$40^{\circ}\mathrm{C}$"
    out = _normalize_exam_math(r"at $25\,^\circ\text{C}$ and $35\,^\circ\text{C}$.")
    assert r"^\circ" not in out.replace(r"^{\circ}", "")
    assert r"$25^{\circ}\mathrm{C}$" in out
    assert r"$35^{\circ}\mathrm{C}$" in out


def test_exam_text_height_fits_markdown_table():
    stem = (
        "Intro paragraph.\n\n"
        "Which row in the table?\n\n"
        "| | Curve P | Curve Q | Curve R |\n"
        "| :--- | :--- | :--- | :--- |\n"
        "| **A** | Experiment 1 | Experiment 2 | Experiment 3 |\n"
        "| **B** | Experiment 1 | Experiment 3 | Experiment 2 |\n"
        "| **C** | Experiment 2 | Experiment 1 | Experiment 3 |\n"
        "| **D** | Experiment 2 | Experiment 3 | Experiment 1 |\n"
        "| **E** | Experiment 3 | Experiment 1 | Experiment 2 |\n"
        "| **F** | Experiment 3 | Experiment 2 | Experiment 1 |"
    )
    # Old formula capped near 800 and clipped this table; keep clear headroom.
    assert _exam_text_height(stem) >= 900


def test_math_slots_follow_ratio_each_cycle():
    assert MATH_SLOT_PERIOD == 1
    assert RATIO["Math 1"] == 2
    assert RATIO["Physics"] == 1
    assert RATIO["Biology"] == 3
    assert RATIO["Chemistry"] == 4
    queues = {lab: [_eq(10_000 + i * 100 + j) for j in range(40)] for i, lab in enumerate(RATIO)}
    text = {"Math 1": [], "Math 2": []}
    far = {lab: [] for lab in RATIO}
    jobs = _schedule_jobs(
        queues={k: list(v) for k, v in queues.items()},
        text_math_queues=text,
        far_queues=far,
        target_cycles=2,
    )
    by = Counter((j["cycle"], j["review_label"]) for j in jobs)
    assert by[(1, "Math 1")] == 2
    assert by[(1, "Math 2")] == 2
    assert by[(1, "Physics")] == 1
    assert by[(1, "Biology")] == 3
    assert by[(1, "Chemistry")] == 4
    assert by[(2, "Math 1")] == 2
    assert by[(2, "Physics")] == 1
    assert sum(1 for j in jobs if j["review_label"] == "Math 1") == 4


def test_unused_text_sources_allow_non_diagram():
    """Text-only unused sources must be scheduled with allow_non_diagram."""
    from visual_engine.eval.question_selector import EvalQuestion

    def text_eq(qid: int) -> EvalQuestion:
        return EvalQuestion(
            question_id=qid,
            exam_name="NSAA",
            exam_year=2020,
            paper_name="Section 1",
            question_number=qid,
            question_stem="stem",
            diagram_url="",
            diagram_asset_id="",
            source_image_url="",
        )

    queues = {
        "Math 1": [text_eq(1), text_eq(2)],
        "Math 2": [text_eq(3), text_eq(4)],
        "Physics": [text_eq(5)],
        "Biology": [text_eq(6), text_eq(7), text_eq(8)],
        "Chemistry": [text_eq(9), text_eq(10), text_eq(11), text_eq(12)],
    }
    jobs = _schedule_jobs(
        queues={k: list(v) for k, v in queues.items()},
        text_math_queues={"Math 1": [], "Math 2": []},
        far_queues={lab: [] for lab in RATIO},
        target_cycles=1,
    )
    assert jobs
    assert all(j["allow_non_diagram"] for j in jobs)
    assert all(j["phase"] == "unused-text" for j in jobs)