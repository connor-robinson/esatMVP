"""Lightweight local reviewer for generated questions and diagrams.

Run from ``esat_question_generator``:

  streamlit run visual_engine/review_app.py
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import streamlit as st
import streamlit.components.v1 as components

from visual_engine.diagram_designer import DiagramDesignerInput
from visual_engine.generation import MAX_AUTO_ATTEMPTS, MAX_MANUAL_ATTEMPTS, regenerate_diagram
from visual_engine.llm import _load_env as _load_vertex_env
from visual_engine.question_designer import NSAA_DIAGRAM_MODEL
from visual_engine.nsaa_batch import source_id_from_review_item
from visual_engine.nsaa_esat_batch import untick_source
from visual_engine.review_regen_queue import (
    active_regen_qids,
    enqueue_diagram_regen,
    enqueue_question_regen,
    ensure_workers,
    job_statuses,
    regen_snapshot,
    restart_workers,
)
from visual_engine.review_store import FILTERS, ReviewStore
from visual_engine.tables import should_hide_written_options

_load_vertex_env()

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
DIAGRAM_VISUALS = {"graph", "geometry", "chem_structure", "energy_profile", "bio_diagram", "pedigree"}
VISUAL_FILTERS = [
    "All",
    "diagrams only",
    "no diagrams",
    "graph",
    "geometry",
    "chem_structure",
    "energy_profile",
    "bio_diagram",
    "pedigree",
    "table",
    "none",
]


def _store() -> ReviewStore:
    return ReviewStore()


def _defer_qid(qid: str) -> None:
    """Move a question to the end of the review queue so review can continue."""
    qid = str(qid)
    deferred = [x for x in (st.session_state.get("deferred_qids") or []) if x != qid]
    deferred.append(qid)
    st.session_state.deferred_qids = deferred
    st.session_state.defer_keep_idx = int(st.session_state.get("idx") or 0)
    st.session_state.pending_idx_after_defer = True
    st.session_state.show_answer = False


def _apply_defer_queue(items: list[dict]) -> tuple[list[dict], list[dict]]:
    """Put deferred / regenerating qids at the end. Returns (reordered items, front)."""
    deferred = [x for x in (st.session_state.get("deferred_qids") or []) if x]
    # Keep in-progress regenerations at the end until they finish.
    for qid in sorted(active_regen_qids()):
        if qid not in deferred:
            deferred.append(qid)
    if not deferred:
        return items, items
    by_qid = {str(i.get("question_id")): i for i in items}
    present = set(by_qid)
    deferred = [q for q in deferred if q in present]
    st.session_state.deferred_qids = deferred
    deferred_set = set(deferred)
    front = [i for i in items if str(i.get("question_id")) not in deferred_set]
    back = [by_qid[q] for q in deferred if q in by_qid]
    return front + back, front


def _session_identity() -> tuple[str, str]:
    """Stable per-browser-tab id for regen attribution."""
    import uuid

    if "regen_session_id" not in st.session_state:
        st.session_state.regen_session_id = uuid.uuid4().hex[:8]
    sid = str(st.session_state.regen_session_id)
    label = str(st.session_state.get("regen_session_label") or f"session {sid}")
    return sid, label


def _show_regen_status() -> None:
    """Extra pool used only when you press REGENERATE on a reviewed item."""
    ensure_workers()
    snap = regen_snapshot()
    sid, my_label = _session_identity()
    n_workers = int(snap["workers"] or 0)
    active = int(snap["active_total"] or 0)
    title = (
        f"2) REGENERATE during review  ·  "
        f"{n_workers} extra workers ready  ·  "
        f"{active} jobs active"
    )
    with st.expander(title, expanded=active > 0 or bool(snap.get("errors"))):
        st.markdown(
            "These workers are **only** for **REGENERATE diagram / REGENERATE question** "
            "while you review. They do **not** create new NSAA items (that is panel 1 above)."
        )
        st.caption(f"This browser tab: **{my_label}** (`{sid}`). Pool is shared across tabs.")
        btn_cols = st.columns([1.4, 1, 3])
        with btn_cols[0]:
            if st.button("Start regen workers", key="start_regen_workers", type="secondary"):
                n = restart_workers()
                st.success(f"{n} regen workers ready")
                st.rerun()
        with btn_cols[1]:
            if st.button("Refresh", key="refresh_regen_status"):
                ensure_workers()
                st.rerun()
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Regen workers", n_workers)
        c2.metric("Regen running", snap["running"])
        c3.metric("Regen queued", snap["queued"])
        c4.metric("Regen failed", snap["failed"])
        if snap["running_ids"]:
            st.write("Currently regenerating: " + ", ".join(f"`{q}`" for q in snap["running_ids"]))
        sessions = snap.get("sessions") or []
        active_sessions = [s for s in sessions if (s["running"] + s["queued"]) > 0]
        if active_sessions:
            st.write("By session:")
            for s in active_sessions:
                mine = " ← you" if s["session_id"] == sid else ""
                st.write(
                    f"- **{s['label']}**{mine}: running {s['running']}, queued {s['queued']}"
                    + (
                        f"  ({', '.join(s['running_ids'] + s['queued_ids'][:6])})"
                        if (s["running_ids"] or s["queued_ids"])
                        else ""
                    )
                )
        elif active == 0:
            st.caption(
                "Idle until you press **REGENERATE** on a pending question. "
                "That queues a job and moves the item later in the list."
            )
        for qid, job in snap.get("errors") or []:
            st.warning(f"{qid} failed: {job.get('error') or 'unknown error'}")




def _parse_choices(raw: str) -> dict:
    try:
        data = json.loads(raw or "{}")
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def _choices_as_editable_text(choices: dict) -> str:
    lines = []
    for letter in sorted((choices or {}).keys(), key=lambda x: str(x)):
        lines.append(f"{letter}) {choices[letter]}")
    return "\n".join(lines)


def _save_review_edits(
    store: ReviewStore,
    item: dict,
    *,
    stem: str,
    choices_text: str,
    correct_answer: str,
    explanation: str,
    difficulty: str,
) -> None:
    """Persist reviewer text edits before approve/reject."""
    parsed = _parse_pasted_options(choices_text)
    if not parsed:
        parsed = _parse_choices(item.get("choices_json") or "{}")
    source = _parse_source(item)
    flags_raw = item.get("auto_flags_json") or "[]"
    try:
        flags = json.loads(flags_raw) if isinstance(flags_raw, str) else (flags_raw or [])
    except json.JSONDecodeError:
        flags = []
    store.upsert_question(
        question_id=str(item.get("question_id") or ""),
        subject=str(item.get("subject") or ""),
        topic=str(item.get("topic") or ""),
        difficulty=(difficulty or item.get("difficulty") or "").strip(),
        stem=stem,
        choices=parsed,
        correct_answer=(correct_answer or item.get("correct_answer") or "").strip().upper()[:1],
        explanation=explanation,
        diagram_required=bool(item.get("diagram_required")),
        diagram_status=str(item.get("diagram_status") or "none"),
        question_status=str(item.get("question_status") or "pending"),
        auto_flags=flags if isinstance(flags, list) else [],
        source=source,
        variation_mode=str(item.get("variation_mode") or source.get("variation_mode") or ""),
    )


def _parse_source(item: dict) -> dict:
    try:
        data = json.loads(item.get("source_json") or "{}")
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def _visual_of(item: dict) -> str:
    src = _parse_source(item)
    return str(src.get("visual_type") or "").strip().lower() or "none"


def _has_diagram_visual(item: dict) -> bool:
    return _visual_of(item) in DIAGRAM_VISUALS


def _visual_split_counts(items: list[dict]) -> tuple[int, int, dict[str, int]]:
    """Return (diagram_n, no_diagram_n, visual_type_counts) for a queue."""
    diagram_n = 0
    no_diagram_n = 0
    by_type: dict[str, int] = {}
    for item in items:
        vt = _visual_of(item)
        by_type[vt] = by_type.get(vt, 0) + 1
        if vt in DIAGRAM_VISUALS:
            diagram_n += 1
        else:
            no_diagram_n += 1
    return diagram_n, no_diagram_n, by_type


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
              u: "UNDO",
              U: "UNDO",
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
    """Frame height for the KaTeX/Markdown iframe (tables need extra room)."""
    raw = text or ""
    lines = max(1, raw.count("\n") + 1)
    table_rows = sum(1 for line in raw.splitlines() if "|" in line)
    paras = raw.count("\n\n") + 1
    # Row height for GFM tables is larger than a text line; avoid clipping the grid.
    table_extra = 56 * table_rows if table_rows else 0
    return min(2800, max(200, 28 * lines + table_extra + 18 * paras + 80))


def _normalize_exam_math(text: str) -> str:
    """Tighten common LLM temperature / degree patterns for KaTeX."""
    raw = text or ""

    def _temp(m: re.Match[str]) -> str:
        return f"${m.group(1)}^{{\\circ}}\\mathrm{{C}}$"

    # $40 \, ^{\circ}\text{C}$ / $40\,^\circ\text{C}$ -> $40^{\circ}\mathrm{C}$
    raw = re.sub(
        r"\$\s*(\d+(?:\.\d+)?)\s*(?:\\,\s*)?(?:\\text\{\s*\}\s*)?\^\{?\\circ\}?\s*\\text\{C\}\s*\$",
        _temp,
        raw,
    )
    # $20\text{ }^\circ\text{C}$ / $20\text{ }^{\circ}\text{C}$ -> $20^{\circ}\mathrm{C}$
    raw = re.sub(
        r"\$\s*(\d+(?:\.\d+)?)\\text\{\s*\}\s*\\?\^\{?\\circ\}?\s*\\text\{C\}\s*\$",
        _temp,
        raw,
    )
    # $25\,^{\circ}C$ / $25^\circ C$ (no \\text)
    raw = re.sub(
        r"\$\s*(\d+(?:\.\d+)?)\s*(?:\\,\s*)?\^\{?\\circ\}?\s*(?:\\mathrm\{C\}|C)\s*\$",
        _temp,
        raw,
    )

    # KaTeX requires ^{\circ}; bare ^\circ from LLMs renders as a red error.
    def _brace_circ(m: re.Match[str]) -> str:
        return f"${m.group(1).replace('^\\circ', '^{\\circ}')}$"

    raw = re.sub(r"\$([^$\n]+?)\$", _brace_circ, raw)
    return raw


def _normalize_statement_linebreaks(text: str) -> str:
    """Ensure numbered statements render on separate lines.

    Generation often stores ``1 ...\\n2 ...`` (single newlines). Markdown with
    ``breaks: false`` collapses those into one paragraph; force blank lines.
    """
    raw = text or ""
    # Blank line before a numbered statement that follows non-empty content.
    # Accepts "1 ", "1. ", "1) " styles used in NSAA statement questions.
    raw = re.sub(r"(?<!\n)\n(?=\d+(?:[.)])?\s+\S)", "\n\n", raw)
    raw = re.sub(
        r"(Which of the following statements is/are correct\?\s*)\n*(?=\d+(?:[.)])?\s+\S)",
        r"\1\n\n",
        raw,
        flags=re.IGNORECASE,
    )
    raw = re.sub(r"\n{3,}", "\n\n", raw)
    return raw


def _render_exam_text(text: str, *, key: str) -> None:
    """Render stem/options as GFM Markdown with KaTeX (incl. tables and \\ce{})."""
    del key  # reserved for future Streamlit fragment keys
    raw = _normalize_statement_linebreaks(_normalize_exam_math(text or ""))
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
      font-family: "Source Serif 4", "Times New Roman", Georgia, serif;
      font-size: 16px;
      line-height: 1.45;
      color: #111;
    }}
    #exam-text p {{ margin: 0.45em 0; }}
    #exam-text p:first-child {{ margin-top: 0; }}
    #exam-text br {{ display: block; content: ""; margin-top: 0.35em; }}
    table {{
      border-collapse: collapse;
      margin: 0.7em 0;
      width: auto;
      max-width: 100%;
      font-size: 15px;
    }}
    th, td {{
      border: 1px solid #bbb;
      padding: 0.28em 0.65em;
      text-align: left;
      vertical-align: top;
    }}
    th {{ background: #f3f3f3; font-weight: 600; }}
    .katex-error {{ color: #b00020; }}
    .katex {{ font-size: 1.05em; }}
  </style>
</head>
<body>
  <div id="exam-text"></div>
  <script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/mhchem.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
  <script>
    const RAW = {payload};
    function extractMath(src) {{
      const slots = [];
      const push = (m) => {{
        const i = slots.length;
        slots.push(m);
        return "%%MATH" + i + "%%";
      }};
      let s = String(src);
      s = s.replace(/\\$\\$[\\s\\S]+?\\$\\$/g, push);
      s = s.replace(/\\\\\\[[\\s\\S]+?\\\\\\]/g, push);
      s = s.replace(/\\\\\\([\\s\\S]+?\\\\\\)/g, push);
      s = s.replace(/\\$[^$\\n]+?\\$/g, push);
      return {{ text: s, slots }};
    }}
    function restoreMath(html, slots) {{
      return html.replace(/%%MATH(\\d+)%%/g, (_, n) => slots[Number(n)] || "");
    }}
    // breaks:true keeps single newlines between numbered statements visible.
    marked.setOptions({{ gfm: true, breaks: true }});
    const extracted = extractMath(RAW);
    const html = restoreMath(marked.parse(extracted.text), extracted.slots);
    const el = document.getElementById("exam-text");
    el.innerHTML = html;
    renderMathInElement(el, {{
      delimiters: [
        {{left: "$$", right: "$$", display: true}},
        {{left: "\\\\[", right: "\\\\]", display: true}},
        {{left: "$", right: "$", display: false}},
        {{left: "\\\\(", right: "\\\\)", display: false}}
      ],
      throwOnError: false,
      strict: false,
      trust: true
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
    visual = str(source_json.get("visual_type") or "").strip().lower()
    out_dir = spec_path.parent.parent if spec_path else Path("visual_engine/review_data/artifacts") / qid

    # Pedigrees / chem structures are schema-rendered; do not call the free diagram designer.
    if visual == "pedigree":
        from visual_engine.auto_checks import run_auto_checks
        from visual_engine.pedigree_check import check_pedigree_render_consistency
        from visual_engine.render_matplotlib import render_diagram
        from visual_engine.science_visuals import pedigree_spec

        idea = source_json.get("idea_plan") if isinstance(source_json.get("idea_plan"), dict) else {}
        ped = idea.get("pedigree") or source_json.get("pedigree") or {}
        try:
            new_spec = pedigree_spec(ped, source_question_id=qid, variation_mode=mode)
        except Exception as exc:
            return f"Pedigree schema invalid: {exc}"
        attempt_dir = out_dir / f"attempt_{attempt + 1:02d}"
        attempt_dir.mkdir(parents=True, exist_ok=True)
        png_path = attempt_dir / "rendered.png"
        spec_out = attempt_dir / "visual_spec.json"
        spec_out.write_text(json.dumps(new_spec, ensure_ascii=False, indent=2), encoding="utf-8")
        render_diagram(new_spec, png_path)
        (out_dir / "rendered.png").write_bytes(png_path.read_bytes())
        (out_dir / "visual_spec.json").write_text(spec_out.read_text(encoding="utf-8"), encoding="utf-8")
        check = check_pedigree_render_consistency(
            ped,
            rendered_object=(new_spec.get("objects") or [{}])[0],
        )
        auto_flags = run_auto_checks(png_path=png_path, spec=new_spec, render_error="")
        if check.get("status") != "PASS":
            auto_flags = list(auto_flags) + [
                {"code": "pedigree_schema_mismatch", "message": "; ".join(check.get("errors") or []), "severity": "reject"}
            ]
        store.add_diagram_attempt(
            question_id=qid,
            attempt=attempt + 1,
            image_path=str(png_path),
            spec_path=str(spec_out),
            source_image_path=str(source_img) if source_img.is_file() else "",
            original_spec=orig or spec,
            generation_spec=new_spec,
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
            auto_flags=auto_flags,
            source=source_json,
        )
        return None

    inp = DiagramDesignerInput(
        reference_question=item.get("stem") or "",
        diagram_image_path=source_img if source_img.is_file() else None,
        variation_mode=mode,
        math_paper=str(item.get("subject") or "Math 1"),
        source_question_id=qid,
        idea_plan=source_json.get("idea_plan") if isinstance(source_json.get("idea_plan"), dict) else None,
        prior_spec=orig or spec,
    )
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
BATCH_PID_PATH = Path(__file__).resolve().parent / "review_data" / "nsaa_esat_batch.pid"


def _load_esat_progress() -> dict:
    if not STATUS_PATH.is_file():
        return {}
    try:
        data = json.loads(STATUS_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    return data if isinstance(data, dict) else {}


def _pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    if sys.platform == "win32":
        try:
            import ctypes

            handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)
            if handle:
                ctypes.windll.kernel32.CloseHandle(handle)
                return True
            return False
        except Exception:
            return False
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def _find_batch_pids() -> list[int]:
    """Discover live nsaa_esat_batch python processes (Windows-friendly)."""
    found: list[int] = []
    try:
        if sys.platform == "win32":
            out = subprocess.check_output(
                [
                    "powershell",
                    "-NoProfile",
                    "-Command",
                    (
                        "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" "
                        "| Where-Object { $_.CommandLine -match 'nsaa_esat_batch' } "
                        "| Select-Object -ExpandProperty ProcessId"
                    ),
                ],
                text=True,
                stderr=subprocess.DEVNULL,
                timeout=8,
            )
            for line in out.splitlines():
                line = line.strip()
                if line.isdigit():
                    found.append(int(line))
        else:
            out = subprocess.check_output(
                ["pgrep", "-f", "visual_engine.nsaa_esat_batch"],
                text=True,
                stderr=subprocess.DEVNULL,
                timeout=8,
            )
            for line in out.splitlines():
                line = line.strip()
                if line.isdigit():
                    found.append(int(line))
    except (subprocess.SubprocessError, OSError, ValueError):
        pass
    return found


def _batch_process_running() -> tuple[bool, int | None]:
    pids = _find_batch_pids()
    if pids:
        pid = pids[0]
        try:
            BATCH_PID_PATH.parent.mkdir(parents=True, exist_ok=True)
            BATCH_PID_PATH.write_text(str(pid), encoding="utf-8")
        except OSError:
            pass
        return True, pid
    if BATCH_PID_PATH.is_file():
        try:
            pid = int(BATCH_PID_PATH.read_text(encoding="utf-8").strip() or "0")
        except (OSError, ValueError):
            pid = 0
        if pid and _pid_alive(pid):
            return True, pid
        try:
            BATCH_PID_PATH.unlink(missing_ok=True)
        except OSError:
            pass
    return False, None


def _start_esat_batch(cycles: int = 10, workers: int = 4) -> tuple[bool, str]:
    running, pid = _batch_process_running()
    if running:
        return False, f"Already running (pid {pid})."
    pkg_root = Path(__file__).resolve().parent.parent
    log_path = Path(__file__).resolve().parent / "review_data" / "nsaa_esat_batch.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    creationflags = 0
    if sys.platform == "win32":
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS  # type: ignore[attr-defined]
    n_workers = max(1, min(int(workers), 8))
    log_f = open(log_path, "a", encoding="utf-8")
    try:
        log_f.write(f"\n--- start cycles={cycles} workers={n_workers} ---\n")
        log_f.flush()
        proc = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "visual_engine.nsaa_esat_batch",
                "--cycles",
                str(int(cycles)),
                "--workers",
                str(n_workers),
            ],
            cwd=str(pkg_root),
            stdout=log_f,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            creationflags=creationflags,
            close_fds=(sys.platform != "win32"),
        )
    except Exception as exc:
        log_f.close()
        return False, f"Failed to start: {exc}"
    try:
        BATCH_PID_PATH.write_text(str(proc.pid), encoding="utf-8")
    except OSError:
        pass
    return True, f"Started {n_workers} generate workers (pid {proc.pid}, cycles={cycles}). Log: {log_path.name}"


def _show_esat_progress() -> None:
    """Primary GENERATE panel: new NSAA questions into the review DB."""
    running, batch_pid = _batch_process_running()
    data = _load_esat_progress()
    configured = int((data or {}).get("workers") or 4)
    live = int((data or {}).get("workers_running") or 0) if running else 0
    if running and live <= 0:
        live = configured
    gen_workers = live if running else 0
    status = str((data or {}).get("status") or ("running" if running else "idle"))
    title = (
        f"1) GENERATE new questions  ·  "
        f"{gen_workers}/{configured} generate workers "
        f"{'running' if running else 'idle'}  ·  status {status}"
    )
    with st.expander(title, expanded=True):
        st.markdown(
            "This starts **new** NSAA → review questions with **concurrent generate workers**. "
            "Separate from regenerate-during-review (panel 2 below)."
        )
        st.caption(
            "Default is 4 questions generated at the same time. "
            "Click Refresh to update counts; reviewing is not interrupted."
        )
        cols = st.columns([1.0, 1.1, 1.0, 1.3, 1.5])
        with cols[0]:
            refresh = st.button("Refresh", key="refresh_esat_progress")
        with cols[1]:
            cycles = st.number_input(
                "Cycles (0 = run until pools empty)",
                min_value=0,
                max_value=200,
                value=0,
                step=1,
                key="esat_batch_cycles_v3",
                help="0 keeps generating across Math/Physics/Biology/Chemistry until sources run out.",
            )
        with cols[2]:
            workers = st.number_input(
                "Generate workers",
                min_value=1,
                max_value=8,
                value=4,
                step=1,
                key="esat_batch_workers_v1",
            )
        with cols[3]:
            start = st.button(
                "Start generate workers",
                key="start_esat_batch",
                type="primary",
                disabled=running,
            )
        if refresh:
            st.session_state["esat_progress_nonce"] = int(st.session_state.get("esat_progress_nonce") or 0) + 1
        if start:
            ok, msg = _start_esat_batch(int(cycles), workers=int(workers))
            if ok:
                st.success(msg)
            else:
                st.warning(msg)
            st.rerun()

        m1 = m2 = phys = bio = chem = total = 0
        if data:
            generated = data.get("generated") or {}
            m1 = int(generated.get("Math 1") or 0)
            m2 = int(generated.get("Math 2") or 0)
            phys = int(generated.get("Physics") or 0)
            bio = int(generated.get("Biology") or 0)
            chem = int(generated.get("Chemistry") or 0)
            total = int(generated.get("total") or (m1 + m2 + phys + bio + chem))

        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Generate workers running", f"{gen_workers}/{configured}")
        c2.metric("Questions generated (run)", total)
        c3.metric("Skipped", int((data or {}).get("skipped") or 0))
        c4.metric("Errors", int((data or {}).get("errors") or 0))

        if running:
            st.success(
                f"**{gen_workers} of {configured} generate workers running** "
                f"(pid {batch_pid}) creating new questions in parallel."
            )
            inflight = (data or {}).get("in_flight") or []
            if inflight:
                st.caption(
                    "In flight: "
                    + " · ".join(
                        f"w{row.get('worker_id')}:{row.get('review_label')}#{row.get('source_question_id')}"
                        for row in inflight[:8]
                    )
                )
        else:
            st.warning(
                "Generate workers are idle because the last batch finished (or none was started). "
                "Press **Start generate workers** with Cycles **0** to run until pools are empty."
            )

        if not data:
            return
        pools = data.get("pools") or {}
        current = data.get("current") or {}
        phase = str(pools.get("phase") or current.get("phase") or data.get("phase") or "?")
        st.write(
            f"**{status}** · phase **{phase}** · cycles {data.get('completed_cycles', 0)}/"
            f"{data.get('target_cycles', 0)} · workers {data.get('workers') or configured} · "
            f"ratio {data.get('ratio') or '1:1:3'}"
        )
        st.caption(str(data.get("diagram_policy") or "Math=100% diagram; Physics=~75% geometry-or-graph"))
        plan = data.get("phase_plan") or []
        if plan:
            p0 = plan[0]
            m1_n = p0.get("math1_diagram", p0.get("math1_diagram_sources", p0.get("math1")))
            m2_n = p0.get("math2_diagram", p0.get("math2_diagram_sources", p0.get("math2")))
            phys_n = p0.get("physics", p0.get("physics_remaining"))
            bio_n = p0.get("biology", p0.get("biology_remaining"))
            chem_n = p0.get("chemistry", p0.get("chemistry_remaining"))
            st.caption(
                "Plan sources · "
                + f"math1={m1_n} (text {p0.get('math1_text', 0)}, far {p0.get('math1_far', 0)}) · "
                + f"math2={m2_n} (text {p0.get('math2_text', 0)}, far {p0.get('math2_far', 0)}) · "
                + f"physics={phys_n} (far {p0.get('physics_far', 0)}) · "
                + f"biology={bio_n} (far {p0.get('biology_far', 0)}) · "
                + f"chemistry={chem_n} (far {p0.get('chemistry_far', 0)}) · "
                + f"up to {p0.get('max_cycles')} cycles"
            )
        st.write(
            f"By subject · Math 1: {m1}, Math 2: {m2}, Physics: {phys}, Biology: {bio}, Chemistry: {chem}"
        )
        st.write(
            f"Phase remaining · Math1 {pools.get('phase_math1', pools.get('math1_remaining', '?'))} · "
            f"Math2 {pools.get('phase_math2', pools.get('math2_remaining', '?'))} · "
            f"Physics {pools.get('phase_physics', pools.get('physics_remaining', '?'))} · "
            f"Biology {pools.get('phase_biology', pools.get('biology_remaining', '?'))} · "
            f"Chemistry {pools.get('phase_chemistry', pools.get('chemistry_remaining', '?'))} · "
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
    if "show_answer" not in st.session_state:
        st.session_state.show_answer = False
    if "show_answer_qid" not in st.session_state:
        st.session_state.show_answer_qid = ""
    if "deferred_qids" not in st.session_state:
        st.session_state.deferred_qids = []
    if "last_approved_qid" not in st.session_state:
        st.session_state.last_approved_qid = ""
    if "last_approved_attempt_id" not in st.session_state:
        st.session_state.last_approved_attempt_id = None
    _session_identity()
    ensure_workers()

    st.caption(
        f"Pending {counts['pending']} | Needs edit {counts.get('needs_edit', 0)} | "
        f"Approved {counts['approved']} | Rejected {counts['rejected']} | "
        f"Regenerated {counts['regenerated']}"
    )
    _show_esat_progress()
    _show_regen_status()

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
    diagram_n, no_diagram_n, type_counts = _visual_split_counts(items)
    c_diag, c_text, c_queue = st.columns(3)
    c_diag.metric("With diagrams", diagram_n)
    c_text.metric("No diagrams (text/table)", no_diagram_n)
    c_queue.metric("In this status/subject", diagram_n + no_diagram_n)
    if type_counts:
        st.caption(
            "Visual types: "
            + " · ".join(f"{k}={v}" for k, v in sorted(type_counts.items(), key=lambda x: (-x[1], x[0])))
        )
    st.caption(
        "Use **Visual → diagrams only** or **no diagrams** to review each queue separately."
    )

    if visual_choice == "diagrams only":
        items = [item for item in items if _has_diagram_visual(item)]
    elif visual_choice == "no diagrams":
        items = [item for item in items if not _has_diagram_visual(item)]
    elif visual_choice != "All":
        items = [item for item in items if _visual_of(item) == visual_choice]
    if not items:
        st.write("Nothing in this filter.")
        st.caption(
            "For Math1/Math2/Physics: `python -m visual_engine.nsaa_esat_batch --cycles 10`  ·  "
            "For diagrams only: `python -m visual_engine.nsaa_batch --subject biology --diagrams-only --n 5`"
        )
        return

    items, front = _apply_defer_queue(items)
    if st.session_state.pop("pending_idx_after_defer", False):
        keep = int(st.session_state.pop("defer_keep_idx", 0) or 0)
        st.session_state.idx = keep if keep < len(front) else 0
    focus_qid = st.session_state.pop("focus_qid_after_undo", None)
    if focus_qid:
        matched = False
        for i, it in enumerate(items):
            if str(it.get("question_id") or "") == str(focus_qid):
                st.session_state.idx = i
                matched = True
                break
        if not matched and (
            st.session_state.visual != "All" or st.session_state.subject != "All"
        ):
            # Broaden filters once so the un-approved item is visible again.
            st.session_state.visual = "All"
            st.session_state.subject = "All"
            st.session_state.focus_qid_after_undo = focus_qid
            st.rerun()
    if st.session_state.idx >= len(items):
        st.session_state.idx = 0
    deferred_n = len(items) - len(front)
    if deferred_n:
        st.caption(
            f"{deferred_n} regenerated item(s) moved later in this queue. "
            "Keep reviewing; they show up after the rest."
        )
    item = items[st.session_state.idx]
    diagram = item.get("diagram") or {}
    choices = _parse_choices(item.get("choices_json") or "{}")
    source_json = _parse_source(item)
    attempt = int(diagram.get("attempt") or 1)
    mode = str(item.get("variation_mode") or source_json.get("variation_mode") or item.get("topic") or "")

    nav = st.columns([1, 1, 6])
    with nav[0]:
        if st.button("PREV"):
            st.session_state.idx = (st.session_state.idx - 1) % len(items)
            st.session_state.show_answer = False
            st.rerun()
    with nav[1]:
        if st.button("NEXT"):
            st.session_state.idx = (st.session_state.idx + 1) % len(items)
            st.session_state.show_answer = False
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

    with st.expander("Edit text before approve", expanded=False):
        st.caption(
            "Change stem / options / answer / explanation, then APPROVE to save. "
            "For statement lists, keep a blank line between each numbered statement."
        )
        edit_stem = st.text_area(
            "Stem",
            value=_normalize_statement_linebreaks(item.get("stem") or ""),
            key=f"edit_stem_{qid}",
            height=220,
        )
        edit_choices = st.text_area(
            "Options (one per line, e.g. A) ...)",
            value=_choices_as_editable_text(choices),
            key=f"edit_choices_{qid}",
            height=140,
        )
        ec1, ec2 = st.columns(2)
        with ec1:
            edit_correct = st.text_input(
                "Correct option letter",
                value=str(item.get("correct_answer") or ""),
                key=f"edit_correct_{qid}",
            )
        with ec2:
            edit_difficulty = st.text_input(
                "Difficulty",
                value=str(item.get("difficulty") or ""),
                key=f"edit_difficulty_{qid}",
            )
        edit_explanation = st.text_area(
            "Explanation",
            value=item.get("explanation") or "",
            key=f"edit_explanation_{qid}",
            height=120,
        )
        if st.button("Save edits only", key=f"save_edits_{qid}"):
            _save_review_edits(
                store,
                item,
                stem=edit_stem,
                choices_text=edit_choices,
                correct_answer=edit_correct,
                explanation=edit_explanation,
                difficulty=edit_difficulty,
            )
            st.success("Saved text edits.")
            st.rerun()

    b1, b2, b3, b4, b5, b6 = st.columns(6)
    with b1:
        if st.button("APPROVE"):
            _save_review_edits(
                store,
                item,
                stem=str(st.session_state.get(f"edit_stem_{qid}") or item.get("stem") or ""),
                choices_text=str(
                    st.session_state.get(f"edit_choices_{qid}")
                    or _choices_as_editable_text(choices)
                ),
                correct_answer=str(
                    st.session_state.get(f"edit_correct_{qid}") or item.get("correct_answer") or ""
                ),
                explanation=str(
                    st.session_state.get(f"edit_explanation_{qid}") or item.get("explanation") or ""
                ),
                difficulty=str(
                    st.session_state.get(f"edit_difficulty_{qid}") or item.get("difficulty") or ""
                ),
            )
            store.set_question_status(qid, "approved")
            if attempt_id:
                store.set_diagram_status(
                    int(attempt_id), "approved", feedback=feedback, reviewer_status="approved"
                )
            st.session_state.last_approved_qid = qid
            st.session_state.last_approved_attempt_id = (
                int(attempt_id) if attempt_id is not None else None
            )
            st.session_state.idx = min(st.session_state.idx, max(len(items) - 2, 0))
            st.session_state.show_answer = False
            st.rerun()
    with b2:
        if st.button("REJECT"):
            store.set_question_status(qid, "rejected", feedback=feedback)
            if attempt_id:
                store.set_diagram_status(
                    int(attempt_id), "rejected", feedback=feedback, reviewer_status="rejected"
                )
            src_id = source_id_from_review_item(item)
            if src_id is not None:
                untick_source(src_id)
            # Rejecting clears approve-undo (last action was not approve).
            st.session_state.last_approved_qid = ""
            st.session_state.last_approved_attempt_id = None
            st.session_state.idx = min(st.session_state.idx, max(len(items) - 2, 0))
            st.session_state.show_answer = False
            st.rerun()
    with b3:
        if st.button("REGENERATE diagram"):
            sid, label = _session_identity()
            err = enqueue_diagram_regen(
                item,
                feedback=feedback,
                tags=tags,
                session_id=sid,
                session_label=label,
            )
            if err:
                st.error(err)
            else:
                _defer_qid(qid)
                st.rerun()
    with b4:
        if st.button("REGENERATE question"):
            sid, label = _session_identity()
            err = enqueue_question_regen(
                item,
                feedback=feedback,
                session_id=sid,
                session_label=label,
            )
            if err:
                st.error(err)
            else:
                _defer_qid(qid)
                st.rerun()
    with b5:
        if st.button("SKIP"):
            st.session_state.idx = (st.session_state.idx + 1) % len(items)
            st.session_state.show_answer = False
            st.rerun()
    with b6:
        if st.button("UNDO"):
            undo_qid = str(st.session_state.get("last_approved_qid") or "").strip()
            undo_attempt = st.session_state.get("last_approved_attempt_id")
            if not undo_qid:
                st.warning("Nothing to undo. Approve a question first, then press UNDO.")
            else:
                store.set_question_status(undo_qid, "pending")
                if undo_attempt is not None:
                    store.set_diagram_status(
                        int(undo_attempt),
                        "pending",
                        feedback="undo approve",
                        reviewer_status="pending",
                    )
                else:
                    latest = store.latest_diagram(undo_qid) or {}
                    lid = latest.get("id")
                    if lid and str(latest.get("status") or "").lower() == "approved":
                        store.set_diagram_status(
                            int(lid),
                            "pending",
                            feedback="undo approve",
                            reviewer_status="pending",
                        )
                # Return conveyor to that question under Pending so the user can re-act.
                st.session_state.filter = "pending"
                st.session_state.focus_qid_after_undo = undo_qid
                st.session_state.last_approved_qid = ""
                st.session_state.last_approved_attempt_id = None
                st.session_state.show_answer = False
                st.rerun()
    st.caption(
        "Keys: A approve, U undo last approve (back to that question), "
        "R regenerate diagram, Q regenerate question, X reject, S skip, arrows prev/next. "
        "Regenerate queues in the background and moves the item later so you can keep reviewing."
    )

    if qid in active_regen_qids():
        job = job_statuses().get(qid) or {}
        st.warning(
            f"This item is regenerating in the background ({job.get('status') or 'queued'}). "
            "Showing the previous version until the new attempt is ready."
        )

    left, right = st.columns(2)
    with left:
        st.subheader("Generated question")
        _render_exam_text(item.get("stem") or "(no stem)", key="stem")
        correct = str(item.get("correct_answer") or "").strip().upper()
        stem_text = item.get("stem") or ""
        if st.session_state.show_answer_qid != qid:
            st.session_state.show_answer = False
            st.session_state.show_answer_qid = qid
        if choices and not should_hide_written_options(stem_text, choices):
            option_lines = []
            for letter, text in choices.items():
                option_lines.append(f"**{letter}.** {text}")
            _render_exam_text("\n\n".join(option_lines), key="options")
        if st.button("Show answer" if not st.session_state.show_answer else "Hide answer"):
            st.session_state.show_answer = not st.session_state.show_answer
            st.rerun()
        if st.session_state.show_answer:
            difficulty = str(item.get("difficulty") or "").strip() or "unknown"
            bits = []
            if correct:
                bits.append(f"Correct: **{correct}**")
            bits.append(f"Difficulty: **{difficulty}**")
            st.info("  ·  ".join(bits))
            if item.get("explanation"):
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
