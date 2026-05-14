"""
Local web UI to run the ESAT question quality checker (scores + optional database updates).

Run from ``esat_question_generator``:

  pip install -r requirements_quality_gate.txt
  streamlit run quality_gate/streamlit_app.py
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Optional

import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from quality_gate.defaults import DEFAULT_QUALITY_GATE_BATCH_MODEL, default_sync_model

CLI = ROOT / "quality_gate" / "cli.py"
LOG_PATH = ROOT / "quality_gate" / "cli_subprocess.log"
STATE_PATH = ROOT / "quality_gate" / "run_state.json"


def _load_state() -> dict | None:
    if not STATE_PATH.is_file():
        return None
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return None


_SVG_OPERATOR_LABELS = ("Undecided", "Queue for SVG generation", "Skip (no diagram)")


def _svg_operator_db_to_label(raw: Any) -> str:
    if raw == "queue":
        return "Queue for SVG generation"
    if raw == "skip":
        return "Skip (no diagram)"
    return "Undecided"


def _svg_operator_label_to_db(label: str) -> Any:
    if label == "Queue for SVG generation":
        return "queue"
    if label == "Skip (no diagram)":
        return "skip"
    return None


def _review_base_url() -> str:
    raw = (
        os.environ.get("REVIEW_APP_URL")
        or os.environ.get("NEXT_PUBLIC_REVIEW_APP_URL")
        or "http://localhost:3000"
    )
    return raw.rstrip("/")


def _quality_gate_action_label(action: Optional[str]) -> str:
    if not action:
        return "—"
    return {
        "approve": "Keep (approve)",
        "human_review": "Human review",
        "regenerate": "Regenerate / rewrite",
        "delete": "Delete",
    }.get(action, action)


def _graph_mode_label(row: dict[str, Any]) -> str:
    mode = str(row.get("quality_gate_graph_mode") or "").strip().lower()
    if mode == "missing_expected":
        return "Missing graph"
    if mode == "candidate" or row.get("quality_gate_graph_candidate") is True:
        return "Graph add"
    return "—"


def _sort_rows_for_results_table(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Review workload first: Major → Minor → Pass with graph candidate → rest; then by AI action urgency."""

    def key(r: dict[str, Any]) -> tuple:
        v = (r.get("quality_gate_verdict") or "").strip().lower()
        gc = r.get("quality_gate_graph_candidate") is True
        if v == "major":
            tier = 0
        elif v == "minor":
            tier = 1
        elif v == "pass" and gc:
            tier = 2
        else:
            tier = 3
        action = (r.get("quality_gate_action") or "").strip().lower()
        action_rank = {"delete": 0, "regenerate": 1, "human_review": 2, "approve": 3}.get(action, 4)
        qid = str(r.get("id") or "")
        return (tier, action_rank, qid)

    return sorted(rows, key=key)


def _build_results_dataframe(rows: list[dict[str, Any]], review_base: str) -> pd.DataFrame:
    base = review_base.rstrip("/")
    records: list[dict[str, Any]] = []
    for r in _sort_rows_for_results_table(rows):
        qid = str(r.get("id") or "")
        code_raw = (r.get("media_upload_code") or "").strip().upper()
        # Walkthrough code when present; otherwise full question id for lookup / links
        code = code_raw if code_raw else (qid if qid else "—")
        tier = r.get("quality_gate_calibration_tier")
        gold = "Gold" if tier == "gold" else "—"
        graph = _graph_mode_label(r)
        verdict = (r.get("quality_gate_verdict") or "—").strip() or "—"
        action = r.get("quality_gate_action")
        wf = (r.get("status") or "—").strip() or "—"
        records.append(
            {
                "Code or id": code,
                "Verdict": verdict,
                "AI suggestion": _quality_gate_action_label(action),
                "Gold": gold,
                "Graph": graph,
                "Status": wf,
                "Open": f"{base}/review?id={qid}" if qid else "",
            }
        )
    return pd.DataFrame.from_records(records)


def _build_overview_dataframe(rows: list[dict[str, Any]], review_base: str) -> pd.DataFrame:
    """Combined DB-wide overview: rows must already be in review order; adds last job and assessed time."""
    base = review_base.rstrip("/")
    records: list[dict[str, Any]] = []
    for r in rows:
        qid = str(r.get("id") or "")
        code_raw = (r.get("media_upload_code") or "").strip().upper()
        code = code_raw if code_raw else (qid if qid else "—")
        tier = r.get("quality_gate_calibration_tier")
        gold = "Gold" if tier == "gold" else "—"
        graph = _graph_mode_label(r)
        verdict = (r.get("quality_gate_verdict") or "—").strip() or "—"
        action = r.get("quality_gate_action")
        wf = (r.get("status") or "—").strip() or "—"
        lj = (r.get("quality_gate_job_id") or "").strip()
        last_job = (lj[:40] + "…") if len(lj) > 40 else (lj if lj else "—")
        at = r.get("quality_gate_assessed_at")
        assessed_s = str(at)[:22] if at else "—"
        records.append(
            {
                "Code or id": code,
                "Verdict": verdict,
                "AI suggestion": _quality_gate_action_label(action),
                "Gold": gold,
                "Graph": graph,
                "Status": wf,
                "Last job": last_job,
                "Assessed": assessed_s,
                "Open": f"{base}/review?id={qid}" if qid else "",
            }
        )
    return pd.DataFrame.from_records(records)


def _format_qg_run_row(r: dict[str, Any]) -> str:
    jid = str(r.get("id") or "")
    sa = r.get("started_at")
    sa_s = str(sa)[:22] if sa else "unknown time"
    stats = r.get("stats") or {}
    proc = stats.get("processed")
    proc_s = f" · {proc} scored" if isinstance(proc, int) else ""
    src = (r.get("source") or "").strip()
    tag = "job table" if src == "jobs" else ("from questions" if src == "questions_only" else src)
    tail = jid if len(jid) <= 48 else jid[:45] + "…"
    return f"{sa_s}{proc_s} [{tag}] — {tail}"


def _tail_log(path: Path, n: int = 120) -> str:
    if not path.is_file():
        return "(no log file yet)"
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    return "\n".join(lines[-n:])


def _terminate_if_running() -> None:
    proc = st.session_state.get("subproc")
    if proc is not None and proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
    st.session_state.subproc = None


st.set_page_config(page_title="ESAT question checker", layout="wide")
st.title("ESAT question checker")
st.caption(
    "Uses AI to score questions in your database. This page starts a background task and shows progress — "
    "you can stop it safely with **Stop scoring**."
)

tab_score, tab_after, tab_cli = st.tabs(["Score questions", "After a run", "Technical / CLI"])

with tab_score:
    st.markdown(
        "### How it works\n"
        "1. Optionally narrow **which** questions to score (subject, difficulty, etc.).\n"
        "2. Choose **how many** to process and what to **save** to the database.\n"
        "3. Click **Start scoring**. Watch **Live progress** and the log below."
    )

    st.markdown("---")
    st.markdown("### 1. Which questions? (all optional)")
    st.caption(
        "Leave filters empty to include **all** matching questions (within your limit). "
        "Subject names must match your database exactly, e.g. `Math 1`, `Physics`."
    )
    col_f1, col_f2 = st.columns(2)
    with col_f1:
        test_type = st.selectbox(
            "Exam",
            ["ESAT", "TMUA", "any"],
            index=0,
            help="'any' = do not filter by exam type.",
        )
        subjects = st.text_input(
            "Subject filter",
            value="",
            placeholder="Example: Math 1, Chemistry",
            help="Comma-separated. Leave empty for every subject.",
        )
    with col_f2:
        difficulties = st.text_input(
            "Difficulty filter",
            value="",
            placeholder="Example: Medium, Hard",
            help="Comma-separated: Easy, Medium, Hard, Extreme. Leave empty for every difficulty.",
        )
        schema_prefix = st.text_input(
            "Question-type code prefix",
            value="",
            placeholder="Example: M_ for math codes",
            help="Matches the start of each row's schema id. Leave empty for all types.",
        )

    st.markdown("---")
    st.markdown("### 2. How many & AI model")
    col_a, col_b = st.columns(2)
    with col_a:
        how_many = st.number_input(
            "How many questions to score (maximum)",
            min_value=1,
            max_value=50_000,
            value=50,
            step=1,
            help="Stops after this many questions have been processed (or when no more match your filters).",
        )
        chunk_size = st.number_input(
            "Questions loaded per round from the database",
            min_value=1,
            max_value=500,
            value=25,
            step=1,
            help="Technical: how many rows are fetched at once. Leave at 25 unless support told you otherwise.",
        )
    with col_b:
        llm_backend = st.radio(
            "AI backend",
            ("vertex", "anthropic"),
            format_func=lambda x: (
                "Gemini (Vertex AI — default)" if x == "vertex" else "Claude (Anthropic)"
            ),
            index=0,
            horizontal=True,
            help="Vertex needs GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, and ADC login. "
            "Claude needs ANTHROPIC_API_KEY. The **Advanced → batch API** option always uses Gemini (AI Studio key).",
        )
        try:
            _model_hint = default_sync_model()
        except ValueError:
            _model_hint = "set QUALITY_GATE_LLM and MODEL_QUALITY_GATE in .env"
        model = st.text_input(
            "Model id (optional)",
            value="",
            placeholder=f"Leave empty — default here: {_model_hint}",
            help="Claude example: claude-3-5-haiku-20241022. Gemini example: gemini-2.5-flash. "
            "Leave empty unless support asked you to pin a version.",
        )

    st.markdown("---")
    st.markdown("### 3. What to save to the database")
    save_mode = st.radio(
        "After the AI scores each question…",
        [
            "recommended_save",
            "scores_only",
            "practice",
        ],
        format_func=lambda x: {
            "recommended_save": "Save everything — including auto-approving questions the AI marks as clearly good (recommended)",
            "scores_only": "Save AI scores only — do not auto-approve; you decide later in the review app",
            "practice": "Practice only — run the AI but do not change the database (safest for first try)",
        }[x],
        index=0,
        help="“Auto-approve” means setting status to approved when the AI gives a strong Pass.",
    )
    dry_run = save_mode == "practice"
    record_only = save_mode == "scores_only"

    st.markdown("---")
    st.markdown("### 4. Extra options")
    job_id = st.text_input(
        "Run name (optional)",
        value="",
        placeholder="Leave empty — one will be created for you",
        help="Stored on each scored question so you can find them later. Empty = auto-generated id.",
    )
    rescore = st.checkbox(
        "Re-score questions that were already scored",
        value=False,
        help="Normally already-scored questions are skipped. Turn on to run the AI again on them.",
    )
    auto_svg = st.checkbox(
        "Auto-generate exam-style SVG for graph-candidate questions",
        value=False,
        help="After scoring, uses Vertex Gemini (ADC) to draw an SVG from the gate’s graph notes and "
        "merges it into the question stem (extra cost). Works even if scoring runs on Claude. "
        "Not used in “Practice only” runs (no database writes).",
        disabled=dry_run,
    )
    diagram_model_in = st.text_input(
        "Diagram model (optional)",
        value="",
        placeholder="Default: gemini-2.5-pro — try gemini-3.1-pro-preview if your project has access",
        disabled=dry_run or not auto_svg,
        help="Gemini model id for SVG + stem merge. Override with MODEL_QUALITY_GATE_SVG in .env.",
    )
    with st.expander("Advanced (rarely needed)", expanded=False):
        include_deleted = st.checkbox(
            "Include deleted questions in the pool",
            value=False,
            help="Normally deleted questions are ignored.",
        )
        use_batch_api = st.checkbox(
            "Use cheaper batch API (needs a Google AI Studio API key)",
            value=False,
            help="Requires GEMINI_API_KEY or GOOGLE_API_KEY in the environment. Not the same as Vertex. "
            "One batch job per “loaded per round” chunk above.",
        )
        batch_poll = st.number_input(
            "How often to check batch job status (seconds)",
            min_value=5.0,
            max_value=300.0,
            value=15.0,
            step=5.0,
            disabled=not use_batch_api,
        )
        svg_single_shot_pipeline = st.checkbox(
            "Single-shot SVG for this run only (QUALITY_GATE_SVG_PIPELINE=0)",
            value=False,
            key="qg_svg_single_shot_pipeline",
            help="Only applies when Auto-SVG is on. Subprocess gets QUALITY_GATE_SVG_PIPELINE=0 → "
            "single prompt (prompt_svg_diagram.md) instead of scene→layout→collision→render. "
            "For A/B comparison; default pipeline is usually better on complex figures.",
        )

    st.markdown("---")
    st.markdown("### 5. Start or stop")
    c1, c2, c3 = st.columns(3)
    with c1:
        if st.button("Start scoring", type="primary"):
            _terminate_if_running()
            LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
            LOG_PATH.write_text("", encoding="utf-8")
            cmd = [
                sys.executable,
                str(CLI),
                "run",
                "--limit",
                str(int(how_many)),
                "--page-size",
                str(int(chunk_size)),
                "--test-type",
                test_type,
                "--llm",
                llm_backend,
            ]
            if model.strip():
                cmd += ["--model", model.strip()]
            if use_batch_api:
                cmd.append("--batch-api")
                cmd += ["--batch-poll-interval", str(float(batch_poll))]
            if subjects.strip():
                cmd += ["--subjects", subjects.strip()]
            if difficulties.strip():
                cmd += ["--difficulties", difficulties.strip()]
            if schema_prefix.strip():
                cmd += ["--schema-prefix", schema_prefix.strip()]
            if job_id.strip():
                cmd += ["--job-id", job_id.strip()]
            if dry_run:
                cmd.append("--dry-run")
            if record_only:
                cmd.append("--record-only")
            if rescore:
                cmd.append("--force-reassess")
            if include_deleted:
                cmd.append("--include-deleted")
            if auto_svg and not dry_run:
                cmd.append("--auto-svg")
                if diagram_model_in.strip():
                    cmd += ["--diagram-model", diagram_model_in.strip()]
            cmd += ["--state-file", str(STATE_PATH)]

            run_env = os.environ.copy()
            if auto_svg and not dry_run and svg_single_shot_pipeline:
                run_env["QUALITY_GATE_SVG_PIPELINE"] = "0"

            lf = open(LOG_PATH, "w", encoding="utf-8", buffering=1)
            proc = subprocess.Popen(
                cmd,
                cwd=str(ROOT),
                stdout=lf,
                stderr=subprocess.STDOUT,
                env=run_env,
            )
            st.session_state.subproc = proc
            st.session_state.last_cmd = " ".join(cmd)
            st.success("Scoring started in the background.")
    with c2:
        if st.button("Stop scoring"):
            _terminate_if_running()
            st.warning("Stop requested. If a run was active, it should end shortly.")
    with c3:
        if st.button("Refresh screen"):
            st.rerun()

    if st.session_state.get("last_cmd"):
        with st.expander("Technical: exact command that was run", expanded=False):
            st.code(st.session_state.last_cmd, language="bash")

    state = _load_state()
    st.subheader("Live progress")
    if state:
        st.json(state)
    else:
        st.info("No progress file yet — start a run above, or run the checker from the command line once.")

    st.subheader("Log output")
    st.text_area("log_output", _tail_log(LOG_PATH), height=260, label_visibility="collapsed")

    proc = st.session_state.get("subproc")
    if proc is not None:
        code = proc.poll()
        if code is not None:
            st.success(f"Background scoring finished (exit code **{code}**).")
            st.session_state.subproc = None
        else:
            st.info(
                "Scoring is **still running** in the background. "
                "Use **Refresh screen** (above) or **Refresh progress** below to update the log and state — "
                "no automatic reloads by default (avoids page flicker)."
            )
            ar1, ar2 = st.columns([1, 1])
            with ar1:
                if st.button("Refresh progress", key="qg_refresh_subproc_progress"):
                    st.rerun()
            with ar2:
                auto_refresh = st.checkbox(
                    "Auto-refresh while running (whole app every 3s — may flicker)",
                    value=False,
                    key="qg_subproc_autorefresh",
                )
            if auto_refresh:
                time.sleep(3.0)
                st.rerun()

with tab_after:
    st.markdown(
        "### After a run\n"
        "**Overview** — all assessed questions in the pool, sorted for review (no run id needed). "
        "**Single run** — pick a job below for run-specific CSV, deletes, and exports."
    )
    _qg_client: Any = None
    try:
        from quality_gate.runner import init_env
        from quality_gate.supabase_io import (
            clear_quality_gate_for_graph_flagged_rows,
            count_graph_flagged_rows,
            count_questions_gate_overview,
            fetch_all_assessed_rows_for_overview,
            fetch_graph_candidates_missing_embedded_svg,
            get_supabase,
            list_quality_gate_run_choices,
        )

        init_env()
        _qg_client = get_supabase()
    except Exception as e:
        st.warning(f"Supabase (this tab): {e}")

    review_base = st.text_input(
        "Review app base URL",
        value=_review_base_url(),
        key="review_app_base",
        help="No trailing slash. Opens `/review?id=<uuid>`. Set REVIEW_APP_URL in .env to default this.",
    )
    overview_tt = st.selectbox(
        "Question pool for stats & combined overview",
        ["ESAT", "TMUA", "any"],
        index=0,
        key="qg_overview_tt",
        help="ESAT includes rows with null test_type (generator default). “any” = all non-deleted types.",
    )
    tt_param: Optional[str] = None if overview_tt == "any" else overview_tt

    if _qg_client is not None:
        try:
            st.subheader("Database vs ESAT question checker")
            ov_stats = count_questions_gate_overview(_qg_client, test_type=tt_param)
            m1, m2, m3, m4 = st.columns(4)
            with m1:
                st.metric("Questions in pool", f"{ov_stats['total']:,}")
            with m2:
                st.metric("Through checker", f"{ov_stats['assessed']:,}")
            with m3:
                st.metric("Not yet assessed", f"{ov_stats['unassessed']:,}")
            with m4:
                st.metric("Share assessed", f"{ov_stats['pct_assessed']}%")
            st.caption(
                "Non-deleted rows only. **Through checker** = `quality_gate_assessed_at` is set. "
                "Each question appears **once** (one DB row per id — no duplicate questions)."
            )

            st.subheader("Combined review queue (all runs)")
            ov_scan_cap = st.number_input(
                "Safety scan cap (assessed rows loaded before sorting)",
                min_value=5_000,
                max_value=200_000,
                value=50_000,
                step=5_000,
                key="qg_overview_scan_cap",
                help="Loads up to this many assessed rows from the DB, sorts by review priority, then shows the top “Max rows” below.",
            )
            ov_limit = st.number_input(
                "Max rows to show after priority sort",
                min_value=100,
                max_value=15_000,
                value=2500,
                step=100,
                key="qg_overview_limit",
                help="Global sort: Major → Minor → Pass+Graph → … then action urgency.",
            )
            with st.spinner("Loading assessed questions for combined overview…"):
                all_assessed = fetch_all_assessed_rows_for_overview(
                    _qg_client,
                    test_type=tt_param,
                    max_scan=int(ov_scan_cap),
                    page_size=500,
                )
            ov_rows = _sort_rows_for_results_table(all_assessed)[: int(ov_limit)]
            if len(all_assessed) >= int(ov_scan_cap):
                st.warning(
                    f"Hit scan cap ({ov_scan_cap:,} rows). Priority sort applies only within this subset — "
                    "raise the cap if you need lower-priority older items."
                )
            st.caption(
                f"Loaded **{len(all_assessed):,}** assessed question(s); showing top **{len(ov_rows):,}** after review-priority sort. "
                "One row per question id. **Status** reflects the DB workflow field (including **approved** from the question reviewer)."
            )
            if ov_rows:
                df_ov = _build_overview_dataframe(ov_rows, review_base)
                st.dataframe(
                    df_ov,
                    use_container_width=True,
                    hide_index=True,
                    column_config={
                        "Open": st.column_config.LinkColumn(
                            "Review",
                            display_text="Open",
                            help="Opens the Next.js review queue for this question",
                        )
                    },
                )
                st.download_button(
                    label="Download combined overview as CSV",
                    data=df_ov.to_csv(index=False).encode("utf-8"),
                    file_name="quality_gate_combined_overview.csv",
                    mime="text/csv",
                    key="qg_download_overview_csv",
                )
        except Exception as e:
            st.exception(e)

    st.divider()
    st.markdown("#### Single run id")
    run_id = ""
    manual = st.text_input(
        "Run id (when using first dropdown row)",
        key="batch_job_manual",
        placeholder="Paste job id only if it is not in the list or you left the dropdown on “Choose…”",
    )
    if _qg_client is not None:
        try:
            _runs = list_quality_gate_run_choices(_qg_client)
        except Exception as e:
            _runs = []
            st.caption(f"Run list failed: {e}")
        _labels = ["— Choose a run (or type id above) —"]
        _vals: list[str] = [""]
        for r in _runs:
            _labels.append(_format_qg_run_row(r))
            _vals.append(str(r.get("id") or ""))
        _ix = st.selectbox(
            "Previous runs",
            range(len(_vals)),
            format_func=lambda i: _labels[i],
            key="qg_run_ix",
        )
        run_id = _vals[_ix] if _ix > 0 else (manual or "").strip()
        st.caption("When a run is selected in the dropdown, that id is used (typed id is used only with the first “Choose…” row).")
    else:
        run_id = (manual or "").strip()

    table_row_limit = st.number_input(
        "Max rows in single-run results table",
        min_value=50,
        max_value=10_000,
        value=500,
        step=50,
        key="qg_single_run_table_limit",
        help="Large runs are capped here so the page stays responsive. Full-job counts above the table still include every row.",
    )

    st.divider()
    st.markdown("### Reset graph-flagged rows for re-scoring")
    st.caption(
        "Clears **only** quality-gate fields on questions that still have **Graph** flagged, so the next scorer run "
        "picks them up again. **Does not** change verdicts or scores on other questions."
    )
    if _qg_client is not None:
        try:
            _n_graph = count_graph_flagged_rows(_qg_client)
        except Exception:
            _n_graph = None
        if _n_graph is not None:
            st.caption(f"Rows currently graph-flagged (non-deleted): **{_n_graph}** (capped at 10k count).")
    confirm_graph_reset = st.checkbox(
        "I understand: only graph-flagged questions lose their quality-gate fields.",
        key="confirm_graph_reset",
    )
    if st.button("Clear quality gate for graph-flagged questions only", disabled=not confirm_graph_reset or _qg_client is None):
        try:
            n_cleared = clear_quality_gate_for_graph_flagged_rows(_qg_client)
            st.success(f"Cleared quality gate on **{n_cleared}** row(s). Re-run scoring with your usual filters.")
        except Exception as e:
            st.exception(e)

    st.divider()
    st.markdown("### SVG diagram backfill (queue, choices, history)")
    st.caption(
        "Graph-flagged rows whose stem still has **no** ``<svg``. Set each row to **Queue** or **Skip**, "
        "save to Supabase, then run backfill — by default only **Queue** rows are processed. "
        "Requires migration ``add_svg_operator_backfill_choice.sql`` and **Vertex / ADC** for Gemini."
    )

    if _qg_client is not None:
        try:
            _n_all_miss = len(
                fetch_graph_candidates_missing_embedded_svg(
                    _qg_client, limit=500, page_size=80, require_operator_queue=False
                )
            )
            _n_queued = len(
                fetch_graph_candidates_missing_embedded_svg(
                    _qg_client, limit=500, page_size=80, require_operator_queue=True
                )
            )
            st.info(
                f"Missing embedded SVG (sample up to 500): **{_n_all_miss}** total · "
                f"**{_n_queued}** currently marked **Queue for SVG generation**."
            )
        except Exception as _e:
            st.warning(
                f"Could not load SVG queue counts (did you run ``add_svg_operator_backfill_choice.sql``?). {_e}"
            )

    review_base = _review_base_url()

    st.markdown("#### 1. Operator queue — who needs a diagram?")
    st.caption(
        "Load rows, set the **SVG operator choice** column, then **Save choices to Supabase**. "
        "Use **Queue** only when you want the next backfill run to generate an SVG for that question."
    )
    q_cap = st.number_input(
        "Max rows to load into the table",
        min_value=20,
        max_value=800,
        value=200,
        step=20,
        key="svg_queue_load_cap",
    )
    if st.button("Load / refresh queue table", disabled=_qg_client is None, key="svg_queue_load_btn"):
        try:
            from quality_gate.supabase_io import fetch_graph_candidates_missing_embedded_svg as _fetch_miss

            rows = _fetch_miss(_qg_client, limit=int(q_cap), page_size=80, require_operator_queue=False)
            df_rows = []
            for r in rows:
                qid = str(r.get("id") or "")
                if not qid:
                    continue
                notes = str(r.get("quality_gate_graph_notes") or "")
                prev = notes[:160] + ("…" if len(notes) > 160 else "")
                code = (r.get("media_upload_code") or "").strip() or "—"
                df_rows.append(
                    {
                        "question_id": qid,
                        "Walkthrough code": code,
                        "Review": f"{review_base}/review?id={qid}",
                        "Verdict": (r.get("quality_gate_verdict") or "—"),
                        "Graph notes (preview)": prev or "—",
                        "SVG operator choice": _svg_operator_db_to_label(r.get("svg_operator_backfill_choice")),
                    }
                )
            st.session_state["svg_queue_df"] = pd.DataFrame(df_rows)
            st.session_state["svg_queue_baseline"] = {
                str(r["question_id"]): r["SVG operator choice"] for r in df_rows
            }
            st.session_state["svg_queue_v"] = int(st.session_state.get("svg_queue_v", 0)) + 1
            st.success(f"Loaded **{len(df_rows)}** row(s). Edit choices below, then save.")
        except Exception as e:
            st.session_state.pop("svg_queue_df", None)
            st.session_state.pop("svg_queue_baseline", None)
            st.exception(e)

    if st.session_state.get("svg_queue_df") is not None and not st.session_state["svg_queue_df"].empty:
        edited = st.data_editor(
            st.session_state["svg_queue_df"],
            column_config={
                "question_id": st.column_config.TextColumn("Question id", disabled=True, width="medium"),
                "Walkthrough code": st.column_config.TextColumn("Code", disabled=True, width="small"),
                "Review": st.column_config.LinkColumn("Review", display_text="Open"),
                "Verdict": st.column_config.TextColumn("Verdict", disabled=True, width="small"),
                "Graph notes (preview)": st.column_config.TextColumn("Graph notes", disabled=True, width="large"),
                "SVG operator choice": st.column_config.SelectboxColumn(
                    "SVG operator choice",
                    options=list(_SVG_OPERATOR_LABELS),
                    required=True,
                    help="Queue = include in backfill · Skip = no diagram · Undecided = not queued",
                ),
            },
            hide_index=True,
            use_container_width=True,
            num_rows="fixed",
            key=f"svg_queue_data_editor_v{st.session_state.get('svg_queue_v', 0)}",
        )
        c_save, c_dl = st.columns([1, 1])
        with c_save:
            if st.button("Save choices to Supabase", key="svg_queue_save_btn", disabled=_qg_client is None):
                try:
                    from quality_gate.supabase_io import update_question_assessment

                    baseline = st.session_state.get("svg_queue_baseline") or {}
                    n_up = 0
                    for _, row in edited.iterrows():
                        qid = str(row.get("question_id") or "")
                        new_l = row.get("SVG operator choice")
                        if pd.isna(new_l) or not qid:
                            continue
                        new_s = str(new_l).strip()
                        old_l = baseline.get(qid, "Undecided")
                        if new_s == old_l:
                            continue
                        update_question_assessment(
                            _qg_client,
                            qid,
                            {"svg_operator_backfill_choice": _svg_operator_label_to_db(new_s)},
                        )
                        n_up += 1
                    st.session_state["svg_queue_baseline"] = {
                        str(row.get("question_id")): row.get("SVG operator choice")
                        for _, row in edited.iterrows()
                        if row.get("question_id")
                    }
                    st.session_state["svg_queue_df"] = edited
                    st.success(f"Updated **{n_up}** row(s) in the database.")
                except Exception as e:
                    st.exception(e)
        with c_dl:
            st.download_button(
                label="Download queue as CSV",
                data=edited.to_csv(index=False).encode("utf-8"),
                file_name="svg_backfill_queue.csv",
                mime="text/csv",
                key="svg_queue_csv_dl",
            )
    elif st.session_state.get("svg_queue_df") is not None:
        st.caption("Queue is empty — no graph-flagged rows missing ``<svg`` in the loaded window.")

    st.markdown("#### 2. Run backfill")
    st.caption(
        "Default: only rows with **SVG operator choice = Queue** (and still no ``<svg``). "
        "Enable legacy mode to process every missing-svg graph candidate (old behaviour)."
    )
    bf_legacy = st.checkbox(
        "Legacy: ignore operator column — process all graph-flagged rows missing SVG",
        value=False,
        key="svg_bf_legacy_all",
    )
    bf_limit = st.number_input(
        "Max questions to process this run",
        min_value=1,
        max_value=500,
        value=15,
        step=1,
        key="svg_bf_limit",
        help="Stops after this many successful inserts or when the pool is empty.",
    )
    bf_model = st.text_input(
        "Diagram Gemini model (optional)",
        value="",
        key="svg_bf_model",
        placeholder="Default from MODEL_QUALITY_GATE_SVG or gemini-2.5-pro",
    )
    bf_dry = st.checkbox(
        "Dry run (log ids only; no LLM, no stem updates)",
        value=False,
        key="svg_bf_dry",
    )
    bf_verbose_llm = st.checkbox(
        "Verbose: append raw LLM debug tail per row to the backfill log (large; for diagnosis)",
        value=False,
        key="svg_bf_verbose_llm",
    )
    if st.button("Run SVG backfill now", disabled=_qg_client is None, key="svg_bf_run_btn"):
        try:
            from quality_gate.svg_backfill import run_missing_svg_backfill

            log_bf: list[str] = []
            with st.status("SVG backfill: running…", expanded=True) as bf_status:

                def _bf_progress(msg: str) -> None:
                    bf_status.write(msg)

                try:
                    stats = run_missing_svg_backfill(
                        limit=int(bf_limit),
                        diagram_model=(bf_model or "").strip(),
                        dry_run=bool(bf_dry),
                        page_size=40,
                        log_lines=log_bf,
                        require_operator_queue=not bool(bf_legacy),
                        progress_callback=_bf_progress,
                        verbose_llm_trace=bool(bf_verbose_llm),
                    )
                except Exception:
                    bf_status.update(
                        label="SVG backfill failed — see traceback below",
                        state="error",
                        expanded=True,
                    )
                    raise

                n_cand = int(stats.get("candidates_missing_svg") or 0)
                ins = int(stats.get("inserted") or 0)
                err_n = int(stats.get("errors") or 0)
                if n_cand == 0:
                    done_label = "SVG backfill finished — no rows to process"
                elif err_n and not ins:
                    done_label = f"SVG backfill finished — {err_n} error(s), no inserts"
                elif err_n:
                    done_label = f"SVG backfill finished — inserted {ins}, {err_n} error(s)"
                else:
                    done_label = f"SVG backfill finished — inserted {ins} stem(s)"

                bf_status.update(label=done_label, state="complete", expanded=False)

            if err_n and not bool(bf_dry):
                st.warning(
                    f"Backfill completed with **{err_n}** error(s). "
                    "Expand the status box above for the live log, or use the full log below."
                )
            else:
                st.success(done_label)

            st.json(stats)
            st.text_area("Backfill log", "\n".join(log_bf[-120:]), height=220, label_visibility="visible")
        except Exception as e:
            st.exception(e)

    st.markdown("#### 3. Backfill run history (local log)")
    st.caption(
        "Each run appends one line to ``quality_gate/svg_backfill_history.jsonl`` (this machine). "
        "Useful to see what was processed, when, and with which model."
    )
    try:
        from quality_gate.svg_backfill import read_svg_backfill_history

        hist = read_svg_backfill_history(max_lines=60)
        if not hist:
            st.caption("No history yet — run a backfill above.")
        else:
            hdf = pd.DataFrame(hist)
            # Flatten for display
            disp_cols = [c for c in hdf.columns if c != "processed_ids"]
            st.dataframe(
                hdf[disp_cols] if disp_cols else hdf,
                use_container_width=True,
                hide_index=True,
            )
            with st.expander("Processed question ids (latest run)", expanded=False):
                ids = hist[0].get("processed_ids") if hist else []
                st.write(ids[:80] if isinstance(ids, list) else ids)
    except Exception as e:
        st.caption(f"Could not read history file: {e}")

    st.divider()
    if st.button("Show summary for this run"):
        if not run_id:
            st.error("Choose a run from the list or type a run id.")
        else:
            try:
                from quality_gate.runner import init_env
                from quality_gate.supabase_io import (
                    fetch_quality_gate_job_result_rows,
                    get_supabase,
                    summarize_quality_gate_job,
                )

                init_env()
                client = get_supabase()
                jid = run_id
                cts = summarize_quality_gate_job(client, jid)
                detail = fetch_quality_gate_job_result_rows(
                    client, jid, max_rows=int(table_row_limit)
                )

                st.subheader("Run totals")
                m1, m2, m3, m4 = st.columns(4)
                with m1:
                    st.metric("Questions in this run", sum(cts.get("by_action", {}).values()))
                with m2:
                    st.metric("Gold (calibration)", cts.get("calibration_gold", 0))
                with m3:
                    st.metric("Graph candidates", cts.get("graph_candidates", 0))
                with m4:
                    parts = [f"{k}: {v}" for k, v in sorted(cts.get("by_action", {}).items())]
                    st.caption("By AI action")
                    st.caption("\n".join(parts) if parts else "—")
                st.caption(
                    f"Graph modes — add: {cts.get('graph_candidates', 0)}, "
                    f"missing expected: {cts.get('graph_missing_expected', 0)}"
                )

                with st.expander("Raw summary JSON", expanded=False):
                    st.json(cts)

                st.subheader("Per-question results")
                st.caption(
                    "Rows are sorted for review load: **Major** verdict first, then **Minor**, then **Pass** with "
                    "**Graph**, then the rest. Within each band, **delete / regenerate / human review** before **approve**. "
                    "**Code or id** is the walkthrough code when set; otherwise the full question id. "
                    "**Status** is the row workflow in Supabase (e.g. **approved** after Approve in the question reviewer); refresh this page to reload."
                )
                if not detail:
                    st.info("No rows found for this run id (or all are deleted).")
                else:
                    total_in_run = sum(cts.get("by_action", {}).values())
                    if len(detail) >= int(table_row_limit) and total_in_run > len(detail):
                        st.warning(
                            f"Showing the first **{len(detail)}** questions only (limit). "
                            f"The run has **{total_in_run}** rows — raise “Max rows” if you need more in this table."
                        )
                    df = _build_results_dataframe(detail, review_base)
                    st.dataframe(
                        df,
                        use_container_width=True,
                        hide_index=True,
                        column_config={
                            "Open": st.column_config.LinkColumn(
                                "Review",
                                display_text="Open",
                                help="Opens the Next.js review queue for this question",
                            )
                        },
                    )
                    safe_slug = "".join(c if c.isalnum() else "_" for c in jid)[:48] or "run"
                    st.download_button(
                        label="Download results as CSV",
                        data=df.to_csv(index=False).encode("utf-8"),
                        file_name=f"quality_gate_{safe_slug}.csv",
                        mime="text/csv",
                        key=f"qg_csv_{safe_slug}",
                    )
            except Exception as e:
                st.exception(e)

    st.divider()
    st.markdown("### Remove questions the AI said to delete")
    st.caption(
        "This marks matching questions as **deleted** in the database (they can usually be restored by support). "
        "Only affects questions from this run that the AI recommended deleting."
    )
    confirm_del = st.checkbox("I understand these questions will be hidden/deleted.", key="confirm_del")
    if st.button("Apply AI-suggested deletes", disabled=not confirm_del or not run_id):
        try:
            from quality_gate.runner import init_env
            from quality_gate.supabase_io import fetch_ids_for_job_action, get_supabase, soft_delete_questions

            init_env()
            client = get_supabase()
            ids = fetch_ids_for_job_action(client, run_id, "delete")
            n = soft_delete_questions(client, ids)
            st.success(f"Marked {n} question(s) as deleted.")
        except Exception as e:
            st.exception(e)

    st.divider()
    st.markdown("### Export list for regeneration")
    st.caption("Writes a small file listing question ids the AI said should be regenerated.")
    out_path = st.text_input("Where to save the file", str(ROOT / "quality_gate" / "regen_export.jsonl"))
    if st.button("Write file"):
        if not run_id:
            st.error("Choose a run from the list or type a run id.")
        else:
            try:
                from quality_gate.runner import init_env
                from quality_gate.supabase_io import fetch_ids_for_job_action, get_supabase

                init_env()
                client = get_supabase()
                ids = fetch_ids_for_job_action(client, run_id, "regenerate")
                p = Path(out_path).expanduser()
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text("\n".join(json.dumps({"id": qid}) for qid in ids) + ("\n" if ids else ""), encoding="utf-8")
                st.success(f"Wrote {len(ids)} line(s) to {p}")
            except Exception as e:
                st.exception(e)

with tab_cli:
    st.markdown(
        "### Command line (for automation or support)\n"
        "The buttons on **Score questions** build commands like these. Flag names stay technical here."
    )
    st.markdown(
        """
```bash
cd esat_question_generator

# Practice (no DB) — same as “Practice only” (default: Vertex Gemini 2.5 Flash)
python quality_gate/cli.py run --limit 100 --test-type ESAT --llm vertex --dry-run

# Claude instead of Vertex
python quality_gate/cli.py run --limit 100 --test-type ESAT --llm anthropic --dry-run

# Scores only — same as “Save AI scores only”
python quality_gate/cli.py run --limit 100 --job-id my-run-1 --llm vertex --record-only

# Summary for one run
python quality_gate/cli.py counts --job-id my-run-1

# Delete questions the AI marked delete (preview first)
python quality_gate/cli.py apply-deletes --job-id my-run-1 --dry-run
python quality_gate/cli.py apply-deletes --job-id my-run-1

# Export ids to regenerate
python quality_gate/cli.py export-regen --job-id my-run-1 -o regen.jsonl

# After scoring: auto SVG for graph candidates (Vertex Gemini + stem merge)
python quality_gate/cli.py run --limit 20 --job-id svg-run-1 --llm vertex --auto-svg
python quality_gate/cli.py run --limit 20 --auto-svg --diagram-model gemini-3.1-pro-preview

# Clear quality gate only on graph-flagged questions (dry-run then apply)
python quality_gate/cli.py reset-graph-gate --dry-run
python quality_gate/cli.py reset-graph-gate

# Graph-flagged but stem still has no <svg>: backfill diagrams only (no gate re-score)
python quality_gate/cli.py generate-missing-svgs --limit 20 --dry-run
python quality_gate/cli.py generate-missing-svgs --limit 20 --diagram-model gemini-2.5-pro
# Same as Streamlit “Queue” only (needs svg_operator_backfill_choice column):
python quality_gate/cli.py generate-missing-svgs --limit 20 --operator-queue-only
```
"""
    )
    st.markdown(
        "**Database setup:** run `migrations/add_quality_gate.sql`, then "
        "`migrations/add_quality_gate_calibration_graph.sql` in Supabase if you use calibration/graph columns. "
        "For the SVG backfill **operator queue** UI: `migrations/add_svg_operator_backfill_choice.sql`. "
        "Optional stem snapshot: `migrations/add_question_stem_before_auto_diagram.sql`.\n\n"
        "**Review links in Streamlit:** set `REVIEW_APP_URL` (e.g. `http://localhost:3000`) so the results table "
        "“Open” links point at your Next.js review app. **After a run** needs `pandas` (see `requirements_quality_gate.txt`).\n\n"
        "**Auto-SVG:** diagram generation uses a **4-phase pipeline** (scene → layout → collision → render) plus an "
        "**archetype library** (`quality_gate/svg_archetypes.md`). Set env `QUALITY_GATE_SVG_PIPELINE=0` (or use "
        "**Advanced → Single-shot SVG for this run only** when Auto-SVG is on) for legacy single-shot "
        "(`prompt_svg_diagram.md` only).\n\n"
        "**Normal scoring (Vertex, default):** `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, ADC; "
        "default model `gemini-2.5-flash`. If `GOOGLE_CLOUD_LOCATION` is `global`, the GenAI client remaps to "
        "`us-central1` unless you set `VERTEX_GENAI_NO_GLOBAL_REMAP=1`.\n\n"
        "**Claude:** pass `--llm anthropic` or set `QUALITY_GATE_LLM=anthropic` and set `ANTHROPIC_API_KEY`.\n\n"
        "**Batch API (Advanced):** always Gemini Developer API — `GEMINI_API_KEY` or `GOOGLE_API_KEY`; "
        f"default model `{DEFAULT_QUALITY_GATE_BATCH_MODEL}` via `MODEL_QUALITY_GATE_BATCH` or `--model`."
    )
