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
from visual_engine.tables import should_hide_written_options

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
DIAGRAM_VISUALS = {"graph", "chem_structure", "energy_profile", "bio_diagram", "pedigree"}
VISUAL_FILTERS = [
    "All",
    "diagrams only",
    "graph",
    "chem_structure",
    "energy_profile",
    "bio_diagram",
    "pedigree",
    "table",
    "none",
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


def _visual_of(item: dict) -> str:
    src = _parse_source(item)
    return str(src.get("visual_type") or "").strip().lower() or "none"


def _parse_pasted_options(raw: str) -> dict:
    out = {}
    for line in (raw or "").splitlines():
        text = line.strip()
        if len(text) < 3 or not text[0].isalpha():
            continue
        if text[1] in ".)]:":
            out[text[0].upper()] = text[2:].lstrip(" .)").strip()
    return out


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


def _exam_text_height(text: str) -> int:
    raw = text or ""
    lines = max(1, raw.count("\n") + 1)
    extra = 90 if "|" in raw or "<table" in raw.lower() else 0
    return min(900, max(110, 28 * lines + extra))


def _render_exam_text(text: str, *, key: str) -> None:
    """Render stem/options with KaTeX + mhchem. Streamlit markdown cannot do \\ce{}."""
    raw = text or ""
    payload = json.dumps(raw)
    height = _exam_text_height(raw)
    components.html(
        f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <style>
    body {{
      margin: 0;
      font-family: "Source Serif 4", "Times New Roman", serif;
      font-size: 16px;
      line-height: 1.45;
      color: #111;
    }}
    table {{ border-collapse: collapse; margin: 0.6em 0; }}
    th, td {{ padding: 0.2em 0.7em; text-align: left; }}
    .katex-error {{ color: #b00020; }}
  </style>
</head>
<body>
  <div id="exam-text"></div>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/mhchem.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
  <script>
    const RAW = {payload};
    function escapeHtml(s) {{
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }}
    function renderTables(src) {{
      const lines = src.split(/\\n/);
      const out = [];
      let i = 0;
      while (i < lines.length) {{
        const line = lines[i];
        const next = lines[i + 1] || "";
        const isTable = line.includes("|") && /^\\s*\\|?\\s*:?-{3,}/.test(next.replace(/\\| /g, "|"));
        if (isTable) {{
          const rows = [];
          while (i < lines.length && lines[i].includes("|")) {{
            if (!/^\\s*\\|?\\s*:?-{3,}/.test(lines[i].replace(/\\| /g, "|"))) {{
              rows.push(lines[i].split("|").map((c) => c.trim()).filter((_, idx, arr) => !(idx === 0 && arr[0] === "") && !(idx === arr.length - 1 && arr[arr.length - 1] === "")));
            }}
            i += 1;
          }}
          if (rows.length) {{
            const head = rows[0].map((c) => "<th>" + escapeHtml(c) + "</th>").join("");
            const body = rows.slice(1).map((r) => "<tr>" + r.map((c) => "<td>" + escapeHtml(c) + "</td>").join("") + "</tr>").join("");
            out.push("<table><thead><tr>" + head + "</tr></thead><tbody>" + body + "</tbody></table>");
          }}
          continue;
        }}
        out.push(escapeHtml(line));
        i += 1;
      }}
      return out.join("<br>");
    }}
    const el = document.getElementById("exam-text");
    el.innerHTML = renderTables(RAW).replace(/\\*\\*([^*]+)\\*\\*/g, "<strong>$1</strong>");
    renderMathInElement(el, {{
      delimiters: [
        {{left: "$$", right: "$$", display: true}},
        {{left: "$", right: "$", display: false}}
      ],
      throwOnError: false,
      strict: false
    }});
  </script>
</body>
</html>
""",
        height=height,
        scrolling=True,
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


STATUS_PATH = Path(__file__).resolve().parent / "review_data" / "nsaa_esat_batch_status.json"
USED_PATH = Path(__file__).resolve().parent / "review_data" / "nsaa_esat_used_sources.json"


def _load_esat_progress() -> dict:
    if not STATUS_PATH.is_file():
        return {}
    try:
        data = json.loads(STATUS_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    return data if isinstance(data, dict) else {}


def _show_esat_progress() -> None:
    """Manual progress panel. Does not auto-refresh so reviewing stays stable."""
    with st.expander("NSAA Math1 / Math2 / Physics generation progress", expanded=True):
        st.caption(
            "Progress updates only when you click Refresh progress. "
            "Generation keeps writing in the background; this panel will not interrupt review."
        )
        cols = st.columns([1, 3])
        with cols[0]:
            refresh = st.button("Refresh progress", key="refresh_esat_progress")
        if refresh:
            st.session_state["esat_progress_nonce"] = int(st.session_state.get("esat_progress_nonce") or 0) + 1
        data = _load_esat_progress()
        if not data:
            st.info(
                "No ESAT batch status yet. Start with: "
                "`python -m visual_engine.nsaa_esat_batch --cycles 10`"
            )
            return
        status = str(data.get("status") or "unknown")
        generated = data.get("generated") or {}
        pools = data.get("pools") or {}
        current = data.get("current") or {}
        phase = str(pools.get("phase") or current.get("phase") or data.get("phase") or "?")
        st.write(
            f"**{status}** · phase **{phase}** · cycles {data.get('completed_cycles', 0)}/"
            f"{data.get('target_cycles', 0)} · ratio {data.get('ratio') or '1:1:3'}"
        )
        plan = data.get("phase_plan") or []
        if plan:
            st.caption(
                "Plan: "
                + " · ".join(
                    f"{p.get('phase')}: m1={p.get('math1')} m2={p.get('math2')} "
                    f"p={p.get('physics')} ({p.get('max_cycles')} cycles @ {int(round(float(p.get('diagram_target_ratio') or 0)*100))}%)"
                    for p in plan
                )
            )
        m1 = int(generated.get("Math 1") or 0)
        m2 = int(generated.get("Math 2") or 0)
        phys = int(generated.get("Physics") or 0)
        total = int(generated.get("total") or (m1 + m2 + phys))
        st.write(
            f"Generated **{total}** "
            f"(Math 1: {m1}, Math 2: {m2}, Physics: {phys}) · "
            f"skipped {data.get('skipped', 0)} · errors {data.get('errors', 0)}"
        )
        st.write(
            f"Phase remaining · Math1 {pools.get('phase_math1', pools.get('math1_remaining', '?'))} · "
            f"Math2 {pools.get('phase_math2', pools.get('math2_remaining', '?'))} · "
            f"Physics {pools.get('phase_physics', pools.get('physics_remaining', '?'))} · "
            f"ticked {pools.get('already_ticked', '?')}"
        )
        if pools.get("diagram_math1") is not None:
            st.caption(
                f"Source pools · diagram m1/m2/p="
                f"{pools.get('diagram_math1')}/{pools.get('diagram_math2')}/{pools.get('diagram_physics')} · "
                f"text m1/m2/p="
                f"{pools.get('text_math1')}/{pools.get('text_math2')}/{pools.get('text_physics')}"
            )
        if current:
            st.caption(
                f"Current: {current.get('review_label')} from NSAA "
                f"{current.get('exam_year')} Q{current.get('question_number')} "
                f"(source {current.get('source_question_id')})"
            )
        vcounts = data.get("visual_type_counts") or {}
        dcounts = data.get("difficulty_counts") or {}
        if vcounts:
            st.caption("Visuals: " + ", ".join(f"{k}={v}" for k, v in sorted(vcounts.items())))
        if dcounts:
            st.caption("Difficulty: " + ", ".join(f"{k}={v}" for k, v in sorted(dcounts.items())))
        recent = data.get("recent") or []
        if recent:
            last = recent[-5:]
            st.caption(
                "Recent: "
                + " · ".join(
                    f"{r.get('review_label')}:{r.get('status')}:{r.get('question_id') or r.get('source_question_id')}"
                    for r in last
                )
            )


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
    if "visual" not in st.session_state:
        st.session_state.visual = "diagrams only"

    st.caption(
        f"Pending {counts['pending']} | Approved {counts['approved']} | "
        f"Rejected {counts['rejected']} | Regenerated {counts['regenerated']}"
    )
    _show_esat_progress()

    with st.expander("Paste a question to try diagram generation"):
        st.caption(
            "Paste an NSAA-style stem and optionally its original figure. "
            "This uses the same designer and deterministic renderer. "
            "Plain-text and table outputs are skipped."
        )
        paste_subject = st.selectbox(
            "Paste subject",
            ["biology", "chemistry", "mathematics", "physics"],
            key="paste_subject",
        )
        paste_stem = st.text_area("Question stem", key="paste_stem", height=140)
        paste_opts = st.text_area(
            "Options optional, one per line, e.g. A) ...",
            key="paste_opts",
            height=90,
        )
        paste_img = st.file_uploader(
            "Original diagram image optional",
            type=["png", "jpg", "jpeg", "webp"],
            key="paste_img",
        )
        if st.button("GENERATE from this input"):
            from visual_engine.nsaa_batch import generate_from_input

            with st.spinner("Running designer and renderer..."):
                try:
                    rec = generate_from_input(
                        store=store,
                        stem=paste_stem,
                        subject=paste_subject,
                        options=_parse_pasted_options(paste_opts),
                        source_image_bytes=paste_img.getvalue() if paste_img else None,
                    )
                except Exception as exc:
                    rec = {"status": "error", "error": str(exc)}
            if rec.get("status") == "skipped":
                st.warning(rec.get("skip_reason") or "Designer skipped this input")
            elif rec.get("status") == "error":
                st.error(rec.get("error") or "Generation failed")
            else:
                st.success(
                    f"Queued {rec.get('question_id')} as {rec.get('visual_type')}. "
                    "Set Visual to diagrams only if you do not see it."
                )
                st.rerun()

    cols = st.columns([2, 2, 2, 2, 2, 3])
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
        visual_choice = st.selectbox(
            "Visual",
            VISUAL_FILTERS,
            index=VISUAL_FILTERS.index(st.session_state.visual) if st.session_state.visual in VISUAL_FILTERS else 1,
        )
    with cols[4]:
        latest_only = st.checkbox("Only show latest attempt", value=st.session_state.latest_only)
    st.session_state.filter = status_filter
    st.session_state.latest_only = latest_only
    st.session_state.subject = subject_choice
    st.session_state.pipeline = pipeline_choice
    st.session_state.visual = visual_choice

    items = store.list_items(
        status_filter=status_filter,
        latest_only=latest_only,
        subject=None if subject_choice == "All" else subject_choice,
        pipeline=None if pipeline_choice == "all" else pipeline_choice,
    )
    if visual_choice == "diagrams only":
        items = [item for item in items if _visual_of(item) in DIAGRAM_VISUALS]
    elif visual_choice != "All":
        items = [item for item in items if _visual_of(item) == visual_choice]
    if not items:
        st.write("Nothing in this filter.")
        st.caption(
            "For Math1/Math2/Physics: `python -m visual_engine.nsaa_esat_batch --cycles 10`  ·  "
            "For diagrams only: `python -m visual_engine.nsaa_batch --subject biology --diagrams-only --n 5`"
        )
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
        _render_exam_text(item.get("stem") or "(no stem)", key="stem")
        correct = str(item.get("correct_answer") or "").strip().upper()
        stem_text = item.get("stem") or ""
        if choices and not should_hide_written_options(stem_text, choices):
            option_lines = []
            for letter, text in choices.items():
                mark = " (correct)" if str(letter).upper() == correct else ""
                option_lines.append(f"**{letter}.** {text}{mark}")
            _render_exam_text("\n\n".join(option_lines), key="options")
        elif correct:
            st.caption(f"Correct row: {correct}")
        if item.get("explanation"):
            with st.expander("Explanation"):
                _render_exam_text(item.get("explanation") or "", key="expl")
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
                _render_exam_text(source_json.get("source_stem") or "", key="source")
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
