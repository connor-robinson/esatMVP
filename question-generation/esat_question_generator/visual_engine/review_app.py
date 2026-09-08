"""Lightweight local reviewer for generated questions and diagrams.

Run from ``esat_question_generator``:

  streamlit run visual_engine/review_app.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import streamlit as st
import streamlit.components.v1 as components

from visual_engine.diagram_designer import DiagramDesignerInput
from visual_engine.generation import MAX_AUTO_ATTEMPTS, MAX_MANUAL_ATTEMPTS, regenerate_diagram
from visual_engine.question_designer import NSAA_DIAGRAM_MODEL
from visual_engine.review_store import FILTERS, ReviewStore

FEEDBACK_TAGS = [
    "axis/ticks",
    "dimensions",
    "labels",
    "geometry",
    "graph shape",
    "missing information",
    "clutter/overlap",
    "wrong diagram",
    "wrong question",
    "other",
]


def _store() -> ReviewStore:
    return ReviewStore()


def _parse_choices(raw: str) -> dict:
    try:
        data = json.loads(raw or "{}")
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def _parse_source(item: dict) -> dict:
    try:
        data = json.loads(item.get("source_json") or "{}")
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def _keyboard_script() -> None:
    components.html(
        """
        <script>
        const doc = window.parent.document;
        if (doc.dataset.reviewKeysBound === "1") {} else {
          doc.dataset.reviewKeysBound = "1";
          doc.addEventListener("keydown", (e) => {
            const t = e.target;
            const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
            if (typing && e.key !== "Escape") return;
            const map = {
              a: "APPROVE",
              A: "APPROVE",
              r: "REGENERATE DIAGRAM",
              R: "REGENERATE DIAGRAM",
              q: "REGENERATE QUESTION",
              Q: "REGENERATE QUESTION",
              x: "REJECT",
              X: "REJECT",
              s: "SKIP",
              S: "SKIP",
              ArrowLeft: "PREV",
              ArrowRight: "NEXT",
            };
            const label = map[e.key];
            if (!label) return;
            const buttons = Array.from(doc.querySelectorAll("button"));
            const btn = buttons.find((b) => (b.innerText || "").trim().toUpperCase().startsWith(label));
            if (btn) { e.preventDefault(); btn.click(); }
          });
        }
        </script>
        """,
        height=0,
        width=0,
    )


def _show_image(path_str: str, caption: str) -> None:
    path = Path(path_str or "")
    if path.is_file():
        st.image(str(path), caption=caption, width=480)
    else:
        st.info(f"No {caption.lower()} image")


def _regenerate_diagram_only(store: ReviewStore, item: dict, *, feedback: str, tags: list[str]) -> str | None:
    diagram = item.get("diagram") or {}
    attempt = int(diagram.get("attempt") or 1)
    attempt_id = diagram.get("id")
    if attempt >= MAX_MANUAL_ATTEMPTS:
        return "Hard cap reached (3 attempts). Reject instead."
    if not attempt_id:
        return "No diagram attempt to regenerate."
    spec = {}
    spec_path = Path(diagram.get("spec_path") or "")
    if spec_path.is_file():
        spec = json.loads(spec_path.read_text(encoding="utf-8"))
    orig = json.loads(diagram.get("original_spec_json") or diagram.get("generation_spec_json") or "{}")
    source_json = _parse_source(item)
    source_img = Path(diagram.get("source_image_path") or source_json.get("source_image_path") or "")
    mode = str(item.get("variation_mode") or source_json.get("variation_mode") or item.get("topic") or "sibling")
    qid = item["question_id"]
    choices = _parse_choices(item.get("choices_json") or "{}")
    inp = DiagramDesignerInput(
        reference_question=item.get("stem") or "",
        diagram_image_path=source_img if source_img.is_file() else None,
        variation_mode=mode,
        math_paper=str(item.get("subject") or "Math 1"),
        source_question_id=qid,
        idea_plan=source_json.get("idea_plan") if isinstance(source_json.get("idea_plan"), dict) else None,
        prior_spec=orig or spec,
    )
    out_dir = spec_path.parent.parent if spec_path else Path("visual_engine/review_data/artifacts") / qid
    result = regenerate_diagram(
        inp,
        out_dir,
        critique=feedback,
        tags=tags,
        prior_spec=orig or spec,
        attempt=attempt + 1,
        parent_attempt_id=int(attempt_id),
        allow_manual_third=attempt >= MAX_AUTO_ATTEMPTS,
        choices=choices,
        correct_answer=item.get("correct_answer") or "",
        designer_model=NSAA_DIAGRAM_MODEL,
    )
    store.add_diagram_attempt(
        question_id=qid,
        attempt=result.attempt,
        image_path=str(result.png_path or ""),
        spec_path=str(result.spec_path or ""),
        source_image_path=str(source_img) if source_img.is_file() else "",
        original_spec=orig or spec,
        generation_spec=result.spec or {},
        status="pending",
        feedback=feedback,
        parent_attempt_id=int(attempt_id),
        previous_attempt_ids=[int(attempt_id)],
    )
    store.upsert_question(
        question_id=qid,
        subject=item.get("subject") or "",
        topic=item.get("topic") or mode,
        variation_mode=mode,
        difficulty=item.get("difficulty") or "",
        stem=item.get("stem") or "",
        choices=choices,
        correct_answer=item.get("correct_answer") or "",
        explanation=item.get("explanation") or "",
        diagram_required=True,
        diagram_status="pending",
        question_status="pending",
        auto_flags=result.auto_flags,
        source=source_json,
    )
    return None


def main() -> None:
    st.set_page_config(page_title="Diagram review", layout="wide")
    st.markdown(
        """
        <style>
        button { outline: none !important; box-shadow: none !important; }
        div[data-testid="stButton"] button { border: none !important; }
        </style>
        """,
        unsafe_allow_html=True,
    )
    _keyboard_script()
    store = _store()
    counts = store.counts()
    subjects = ["All"] + sorted(k for k in store.subject_counts() if k)

    if "idx" not in st.session_state:
        st.session_state.idx = 0
    if "filter" not in st.session_state:
        st.session_state.filter = "pending"
    if "latest_only" not in st.session_state:
        st.session_state.latest_only = True
    if "subject" not in st.session_state:
        st.session_state.subject = "NSAA" if "NSAA" in subjects else "All"
    if "pipeline" not in st.session_state:
        st.session_state.pipeline = "nsaa"

    st.caption(
        f"Pending {counts['pending']} | Approved {counts['approved']} | "
        f"Rejected {counts['rejected']} | Regenerated {counts['regenerated']}"
    )

    cols = st.columns([2, 2, 2, 2, 3])
    with cols[0]:
        status_filter = st.selectbox(
            "Filter",
            FILTERS,
            index=FILTERS.index(st.session_state.filter) if st.session_state.filter in FILTERS else 0,
        )
    with cols[1]:
        subject_choice = st.selectbox(
            "Subject",
            subjects,
            index=subjects.index(st.session_state.subject) if st.session_state.subject in subjects else 0,
        )
    with cols[2]:
        pipeline_choice = st.selectbox(
            "Source",
            ["nsaa", "all"],
            index=0 if st.session_state.pipeline == "nsaa" else 1,
        )
    with cols[3]:
        latest_only = st.checkbox("Only show latest attempt", value=st.session_state.latest_only)
    st.session_state.filter = status_filter
    st.session_state.latest_only = latest_only
    st.session_state.subject = subject_choice
    st.session_state.pipeline = pipeline_choice

    items = store.list_items(
        status_filter=status_filter,
        latest_only=latest_only,
        subject=None if subject_choice == "All" else subject_choice,
        pipeline=None if pipeline_choice == "all" else pipeline_choice,
    )
    if not items:
        st.write("Nothing in this filter.")
        st.caption("Generate NSAA diagram questions with: python -m visual_engine.nsaa_batch --n 10")
        return

    if st.session_state.idx >= len(items):
        st.session_state.idx = 0
    item = items[st.session_state.idx]
    diagram = item.get("diagram") or {}
    choices = _parse_choices(item.get("choices_json") or "{}")
    source_json = _parse_source(item)
    attempt = int(diagram.get("attempt") or 1)
    mode = str(item.get("variation_mode") or source_json.get("variation_mode") or item.get("topic") or "")
    is_nsaa = str(source_json.get("pipeline") or "") == "nsaa"

    nav = st.columns([1, 1, 6])
    with nav[0]:
        if st.button("PREV"):
            st.session_state.idx = (st.session_state.idx - 1) % len(items)
            st.rerun()
    with nav[1]:
        if st.button("NEXT"):
            st.session_state.idx = (st.session_state.idx + 1) % len(items)
            st.rerun()
    st.write(
        f"{st.session_state.idx + 1}/{len(items)}  |  {item.get('question_id')}  |  "
        f"{item.get('subject') or ''}  {mode}  {item.get('difficulty') or ''}  |  "
        f"visual {source_json.get('visual_type') or 'n/a'}  |  "
        f"Q {item.get('question_status')} / diagram {diagram.get('status') or 'none'}"
    )

    flags_raw = item.get("auto_flags_json") or "[]"
    try:
        flags = json.loads(flags_raw)
    except json.JSONDecodeError:
        flags = []
    if flags:
        st.warning("Auto-check: " + "; ".join(f.get("message", "") for f in flags))

    tags = st.multiselect("Quick feedback", FEEDBACK_TAGS)
    feedback = st.text_area("What's wrong?", key="feedback_box", height=70)
    qid = item["question_id"]
    attempt_id = diagram.get("id")

    b1, b2, b3, b4, b5 = st.columns(5)
    with b1:
        if st.button("APPROVE"):
            store.set_question_status(qid, "approved")
            if attempt_id:
                store.set_diagram_status(
                    int(attempt_id), "approved", feedback=feedback, reviewer_status="approved"
                )
            st.session_state.idx = min(st.session_state.idx, max(len(items) - 2, 0))
            st.rerun()
    with b2:
        if st.button("REJECT"):
            store.set_question_status(qid, "rejected", feedback=feedback)
            if attempt_id:
                store.set_diagram_status(
                    int(attempt_id), "rejected", feedback=feedback, reviewer_status="rejected"
                )
            st.session_state.idx = min(st.session_state.idx, max(len(items) - 2, 0))
            st.rerun()
    with b3:
        if st.button("REGENERATE diagram"):
            err = _regenerate_diagram_only(store, item, feedback=feedback, tags=tags)
            if err:
                st.error(err)
            else:
                st.rerun()
    with b4:
        if st.button("REGENERATE question"):
            if not is_nsaa:
                st.error("Question regen is only for NSAA-sourced items.")
            elif attempt >= MAX_MANUAL_ATTEMPTS:
                st.error("Hard cap reached (3 attempts). Reject instead.")
            else:
                from visual_engine.nsaa_batch import regenerate_nsaa_question

                try:
                    regenerate_nsaa_question(store, item, feedback=feedback, model=NSAA_DIAGRAM_MODEL)
                    st.rerun()
                except Exception as exc:
                    st.error(str(exc))
    with b5:
        if st.button("SKIP"):
            st.session_state.idx = (st.session_state.idx + 1) % len(items)
            st.rerun()
    st.caption("Keys: A approve, R regenerate diagram, Q regenerate question, X reject, S skip, arrows prev/next")

    left, right = st.columns(2)
    with left:
        st.subheader("Generated question")
        st.markdown(item.get("stem") or "(no stem)")
        correct = str(item.get("correct_answer") or "").strip().upper()
        if choices:
            for letter, text in choices.items():
                mark = " (correct)" if str(letter).upper() == correct else ""
                st.write(f"**{letter}.** {text}{mark}")
        if item.get("explanation"):
            with st.expander("Explanation"):
                st.write(item.get("explanation"))
        if source_json.get("source_stem") or source_json.get("mode_reason"):
            with st.expander("Original NSAA source"):
                if source_json.get("mode_reason"):
                    st.caption(f"{mode}: {source_json.get('mode_reason')}")
                meta = (
                    f"NSAA {source_json.get('exam_year') or ''} "
                    f"{source_json.get('paper_name') or ''} "
                    f"Q{source_json.get('question_number') or ''} "
                    f"(id {source_json.get('source_question_id') or ''})"
                )
                st.caption(meta)
                st.write(source_json.get("source_stem") or "")
        _show_image(
            diagram.get("source_image_path") or source_json.get("source_image_path") or "",
            "Source diagram",
        )

    with right:
        visual_type = str(source_json.get("visual_type") or "")
        st.subheader(f"Generated visual  ({visual_type or mode or 'diagram'}, attempt {attempt})")
        image_path = diagram.get("image_path") or ""
        if image_path:
            _show_image(image_path, "Generated")
        else:
            st.caption("No rendered diagram (plain text or table).")


if __name__ == "__main__":
    main()
