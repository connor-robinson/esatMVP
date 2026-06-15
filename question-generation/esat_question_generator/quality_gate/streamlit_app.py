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

# Streamlit puts ``quality_gate/`` on sys.path[0], which breaks ``import quality_gate``.
ROOT = Path(__file__).resolve().parent.parent
_PKG_DIR = Path(__file__).resolve().parent
_root_s = str(ROOT)
_pkg_s = str(_PKG_DIR)
for _p in (_pkg_s, _root_s):
    while _p in sys.path:
        sys.path.remove(_p)
sys.path.insert(0, _root_s)

import pandas as pd
import streamlit as st

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


_IMAGE_QUEUE_LABEL = "Generate"
_SKIP_QUEUE_LABEL = "Skip"
_DIAGRAM_QUEUE_LABELS = ("Undecided", _IMAGE_QUEUE_LABEL, _SKIP_QUEUE_LABEL)
_DIAGRAM_QUEUE_COLUMN = "Queue"


def _diagram_queue_db_to_label(raw: Any) -> str:
    if raw == "queue":
        return _IMAGE_QUEUE_LABEL
    if raw == "skip":
        return _SKIP_QUEUE_LABEL
    return "Undecided"


def _diagram_queue_label_to_db(label: str) -> Any:
    if label == _IMAGE_QUEUE_LABEL:
        return "queue"
    if label == _SKIP_QUEUE_LABEL:
        return "skip"
    return None


def _build_diagram_queue_row(r: dict[str, Any], review_base: str) -> dict[str, Any]:
    qid = str(r.get("id") or "")
    notes = str(r.get("quality_gate_graph_notes") or "")
    prev = notes[:160] + ("…" if len(notes) > 160 else "")
    code = (r.get("media_upload_code") or "").strip() or "—"
    return {
        "question_id": qid,
        "Walkthrough code": code,
        "Review": f"{review_base.rstrip('/')}/review?id={qid}",
        "Verdict": (r.get("quality_gate_verdict") or "—"),
        "Backfill review": _backfill_review_label(r),
        "Graph notes (preview)": prev or "—",
        _DIAGRAM_QUEUE_COLUMN: _diagram_queue_db_to_label(r.get("svg_operator_backfill_choice")),
    }


def _review_base_url() -> str:
    raw = (
        os.environ.get("REVIEW_APP_URL")
        or os.environ.get("NEXT_PUBLIC_REVIEW_APP_URL")
        or "https://questions-reviewer.vercel.app"
    )
    return raw.rstrip("/")


def _quality_gate_action_label(action: Optional[str]) -> str:
    if not action:
        return "—"
    return {
        "approve": "Keep (approve)",
        "human_review": "Human review",
        "regenerate": "Regenerate / rewrite",
        "move_to_math2": "Move to Math 2",
        "delete": "Delete",
    }.get(action, action)


def _graph_mode_label(row: dict[str, Any]) -> str:
    mode = str(row.get("quality_gate_graph_mode") or "").strip().lower()
    if mode == "missing_expected":
        return "Missing graph"
    if mode == "candidate" or row.get("quality_gate_graph_candidate") is True:
        return "Graph add"
    return "—"


def _backfill_review_label(row: dict[str, Any]) -> str:
    from quality_gate.diagram_backfill_review import backfill_review_label

    return backfill_review_label(row.get("quality_gate_diagram_backfill_kind")) or "—"


def _parse_quality_gate_payload(row: dict[str, Any]) -> dict[str, Any]:
    p = row.get("quality_gate_payload")
    if isinstance(p, dict):
        return p
    if isinstance(p, str) and p.strip():
        try:
            parsed = json.loads(p)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _ai_why_from_row(row: dict[str, Any]) -> str:
    """Full AI reasoning for tables — do not truncate (Streamlit may wrap in-cell)."""
    payload = _parse_quality_gate_payload(row)
    rd = payload.get("review_disposition") if isinstance(payload.get("review_disposition"), dict) else {}
    parts: list[str] = []
    for val in (
        row.get("quality_gate_reason"),
        payload.get("reasoning"),
        rd.get("notes") if isinstance(rd, dict) else None,
    ):
        s = str(val or "").strip()
        if s and s not in parts:
            parts.append(s)
    return " — ".join(parts) if parts else ""


def _curriculum_cols(row: dict[str, Any]) -> dict[str, Any]:
    from quality_gate.schemas import curriculum_fields_from_payload

    p = row.get("quality_gate_payload")
    if isinstance(p, str):
        try:
            p = json.loads(p)
        except Exception:
            p = {}
    fields = curriculum_fields_from_payload(p if isinstance(p, dict) else None)
    return {
        "Curriculum": fields.get("curriculum_match") or "—",
        "Syllabus fit": fields.get("syllabus_fit_score") if fields.get("syllabus_fit_score") is not None else "—",
        "Required codes": fields.get("required_topic_codes") or "—",
        "Suspicious": fields.get("suspicious_topics") or "—",
        "Curriculum reason": fields.get("curriculum_reason") or "—",
        "Curriculum flags": fields.get("curriculum_flags") or "—",
        "Formatting": fields.get("formatting_score") if fields.get("formatting_score") is not None else "—",
        "Format issues": fields.get("formatting_issues") or "—",
        "Disposition": fields.get("disposition") or "—",
        "Labels": fields.get("disposition_labels") or "—",
        "_off_syllabus": fields.get("curriculum_match") == "off_syllabus",
        "_math1_mm": bool(fields.get("math1_mm_required")),
        "_calculus_math1": bool(fields.get("calculus_in_math1")),
        "_likely_too_long": False,
        "_missing_primary_tag": bool(fields.get("missing_primary_tag")),
    }


def _apply_curriculum_filters(rows: list[dict[str, Any]], filters: dict[str, bool]) -> list[dict[str, Any]]:
    if not any(filters.values()):
        return rows
    out: list[dict[str, Any]] = []
    for r in rows:
        c = _curriculum_cols(r)
        if filters.get("off_syllabus") and not c["_off_syllabus"]:
            continue
        if filters.get("math1_mm") and not c["_math1_mm"]:
            continue
        if filters.get("calculus_math1") and not c["_calculus_math1"]:
            continue
        if filters.get("likely_too_long"):
            p = r.get("quality_gate_payload")
            if isinstance(p, str):
                try:
                    p = json.loads(p)
                except Exception:
                    p = {}
            scores = (p or {}).get("scores") if isinstance(p, dict) else {}
            pacing = int((scores or {}).get("esat_realism_pacing") or 5)
            if pacing > 2:
                continue
        if filters.get("missing_primary_tag") and not c["_missing_primary_tag"]:
            continue
        out.append(r)
    return out


def _audit_route_label(audit: dict[str, Any]) -> str:
    """How this row was (or would be) generated: SVG graph vs Imagen diagram."""
    if audit.get("renderer") == "svg" or audit.get("reason") == "graph_svg_ok":
        return "SVG · graph"
    if audit.get("renderer") == "imagen":
        return "Imagen · diagram"
    vk = str(audit.get("visual_kind") or "").lower()
    if vk == "graph":
        return "SVG · graph"
    if vk == "diagram":
        return "Imagen · diagram"
    need = str(audit.get("diagram_need") or "").lower()
    if need in ("qualitative_graph", "graph", "plot", "chart", "axes"):
        return "SVG · graph (expected)"
    if need in ("ray", "forces", "container", "circuit", "schematic", "geometry", "other"):
        return "Imagen · diagram (expected)"
    return "—"


def _audit_backfill_review_label(audit: dict[str, Any]) -> str:
    if str(audit.get("final_status") or "") != "merged":
        return "—"
    if audit.get("renderer") == "svg" or audit.get("reason") == "graph_svg_ok":
        return "Backgen · SVG"
    return "Backgen · image"


def _sort_rows_for_results_table(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Review workload first: backgenerated diagram → Major → Minor → Pass+graph → rest."""

    def key(r: dict[str, Any]) -> tuple:
        bf = (r.get("quality_gate_diagram_backfill_kind") or "").strip().lower()
        v = (r.get("quality_gate_verdict") or "").strip().lower()
        gc = r.get("quality_gate_graph_candidate") is True
        if bf:
            tier = 0
        elif v == "major":
            tier = 1
        elif v == "minor":
            tier = 2
        elif v == "pass" and gc:
            tier = 3
        else:
            tier = 4
        action = (r.get("quality_gate_action") or "").strip().lower()
        action_rank = {"delete": 0, "regenerate": 1, "move_to_math2": 2, "human_review": 3, "approve": 4}.get(action, 5)
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
        backfill = _backfill_review_label(r)
        cur = _curriculum_cols(r)
        records.append(
            {
                "Code or id": code,
                "Verdict": verdict,
                "AI suggestion": _quality_gate_action_label(action),
                "Backfill review": backfill,
                "Curriculum": cur["Curriculum"],
                "Syllabus fit": cur["Syllabus fit"],
                "Required codes": cur["Required codes"],
                "Suspicious": cur["Suspicious"],
                "Curriculum reason": cur["Curriculum reason"],
                "Curriculum flags": cur["Curriculum flags"],
                "Formatting": cur["Formatting"],
                "Format issues": cur["Format issues"],
                "Disposition": cur["Disposition"],
                "Labels": cur["Labels"],
                "Why": _ai_why_from_row(r) or "—",
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
        backfill = _backfill_review_label(r)
        cur = _curriculum_cols(r)
        records.append(
            {
                "Code or id": code,
                "Verdict": verdict,
                "AI suggestion": _quality_gate_action_label(action),
                "Backfill review": backfill,
                "Curriculum": cur["Curriculum"],
                "Syllabus fit": cur["Syllabus fit"],
                "Required codes": cur["Required codes"],
                "Suspicious": cur["Suspicious"],
                "Curriculum reason": cur["Curriculum reason"],
                "Curriculum flags": cur["Curriculum flags"],
                "Formatting": cur["Formatting"],
                "Format issues": cur["Format issues"],
                "Disposition": cur["Disposition"],
                "Labels": cur["Labels"],
                "Why": _ai_why_from_row(r) or "—",
                "Gold": gold,
                "Graph": graph,
                "Status": wf,
                "Last job": last_job,
                "Assessed": assessed_s,
                "Open": f"{base}/review?id={qid}" if qid else "",
            }
        )
    return pd.DataFrame.from_records(records)


def _wide_text_column(label: str, *, help_text: str = "") -> Any:
    kwargs: dict[str, Any] = {"width": "large"}
    if help_text:
        kwargs["help"] = help_text
    return st.column_config.TextColumn(label, **kwargs)


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


_REVIEW_BUCKET_OPTIONS: tuple[tuple[str, str, Optional[str]], ...] = (
    ("all", "All processed", None),
    ("needs_operator", "Needs operator (review / remove / regen / move)", "__needs_operator__"),
    ("human_review", "Human review", "human_review"),
    ("delete", "AI says remove", "delete"),
    ("regenerate", "Regenerate", "regenerate"),
    ("move_to_math2", "Move to Math 2", "move_to_math2"),
    ("approve", "Keep (approve)", "approve"),
)


def _filter_assessed_bucket(rows: list[dict[str, Any]], bucket: str) -> list[dict[str, Any]]:
    if bucket in ("", "all"):
        return rows
    if bucket == "needs_operator":
        ops = {"human_review", "delete", "regenerate", "move_to_math2"}
        return [r for r in rows if (r.get("quality_gate_action") or "").strip().lower() in ops]
    want = bucket.strip().lower()
    return [r for r in rows if (r.get("quality_gate_action") or "").strip().lower() == want]


def _overview_table_column_config() -> dict[str, Any]:
    return {
        "Open": st.column_config.LinkColumn(
            "Review",
            display_text="Open",
            help="Opens the Next.js review queue for this question",
        ),
        "Why": _wide_text_column("Why"),
        "Curriculum reason": _wide_text_column("Curriculum reason"),
        "Curriculum flags": _wide_text_column("Curriculum flags"),
        "Format issues": _wide_text_column("Format issues"),
    }


def _render_assessed_table(rows: list[dict[str, Any]], review_base: str, *, csv_name: str, csv_key: str) -> None:
    if not rows:
        st.info("No questions in this category.")
        return
    df_ov = _build_overview_dataframe(rows, review_base)
    st.dataframe(
        df_ov,
        use_container_width=True,
        hide_index=True,
        column_config=_overview_table_column_config(),
    )
    st.download_button(
        label=f"Download CSV ({len(rows):,} rows)",
        data=df_ov.to_csv(index=False).encode("utf-8"),
        file_name=csv_name,
        mime="text/csv",
        key=csv_key,
    )


def _init_qg_supabase() -> tuple[Any | None, str | None]:
    try:
        from quality_gate.runner import init_env
        from quality_gate.supabase_io import get_supabase

        init_env()
        return get_supabase(), None
    except Exception as e:
        return None, str(e)


def _render_diagram_generation_tab(client: Any, review_base: str) -> None:
    """Dedicated tab: queue → run diagram backfill (SVG graphs + Imagen diagrams) → history."""
    st.markdown(
        "Add or replace diagrams on **graph-flagged** questions. "
        "You choose which rows to process; the pipeline picks **SVG** for plots/graphs and **Imagen** for apparatus diagrams."
    )

    m1, m2, m3 = st.columns(3)
    try:
        from quality_gate.supabase_io import count_graph_candidates_missing_image_diagram

        n_all = count_graph_candidates_missing_image_diagram(
            client, max_scan=500, require_operator_queue=False
        )
        n_queued = count_graph_candidates_missing_image_diagram(
            client, max_scan=500, require_operator_queue=True
        )
        with m1:
            st.metric("Need a diagram", n_all)
        with m2:
            st.metric(f"Queued ({_IMAGE_QUEUE_LABEL})", n_queued)
        with m3:
            st.metric("Review app", "linked", help=review_base)
    except Exception as e:
        st.warning(f"Could not load counts: {e}")

    st.info(
        "**How routing works (automatic)**\n"
        "- **Graph / plot** (axes, curves, intercepts) → inline **SVG** (Gemini)\n"
        "- **Apparatus** (rays, forces, containers, circuits) → **Imagen** + vision check\n"
        "- **Skip** in the queue → not processed\n\n"
        "Restart Streamlit after code updates: **Ctrl+C** in the terminal, then `run_quality_gate_ui.bat`."
    )

    # --- Step 1: Queue ---
    with st.expander("**Step 1 — Queue** (choose which questions to process)", expanded=True):
        st.caption(
            f"Load candidates, set **{_DIAGRAM_QUEUE_COLUMN}** to **{_IMAGE_QUEUE_LABEL}** or **{_SKIP_QUEUE_LABEL}**, then save."
        )
        q_cap = st.number_input(
            "Max rows to load",
            min_value=20,
            max_value=800,
            value=200,
            step=20,
            key="diag_queue_cap",
        )
        b1, b2, b3 = st.columns(3)
        with b1:
            if st.button(
                f"Queue all (up to {int(q_cap)}) → DB",
                key="diag_queue_all_db",
                help=f"Marks every eligible row in the window as **{_IMAGE_QUEUE_LABEL}** without opening the table.",
            ):
                try:
                    from quality_gate.supabase_io import bulk_set_image_backfill_queue

                    n = bulk_set_image_backfill_queue(client, limit=int(q_cap), choice="queue")
                    st.success(f"Queued **{n}** row(s).")
                    st.session_state.pop("svg_queue_df", None)
                    st.session_state.pop("svg_queue_baseline", None)
                    st.rerun()
                except Exception as e:
                    st.exception(e)
        with b2:
            if st.button("Load / refresh table", key="diag_queue_load"):
                try:
                    from quality_gate.supabase_io import fetch_graph_candidates_for_diagram_backfill

                    rows = fetch_graph_candidates_for_diagram_backfill(
                        client,
                        limit=int(q_cap),
                        page_size=80,
                        diagram_kind="image",
                    )
                    df_rows = [_build_diagram_queue_row(r, review_base) for r in rows if r.get("id")]
                    st.session_state["svg_queue_df"] = pd.DataFrame(df_rows)
                    st.session_state["svg_queue_baseline"] = {
                        str(r["question_id"]): r[_DIAGRAM_QUEUE_COLUMN] for r in df_rows
                    }
                    st.session_state["svg_queue_v"] = int(st.session_state.get("svg_queue_v", 0)) + 1
                    st.success(f"Loaded **{len(df_rows)}** row(s).")
                except Exception as e:
                    st.session_state.pop("svg_queue_df", None)
                    st.session_state.pop("svg_queue_baseline", None)
                    st.exception(e)
        with b3:
            st.markdown(f"[Open review app →]({review_base})")

        if st.session_state.get("svg_queue_df") is not None and not st.session_state["svg_queue_df"].empty:
            t1, t2, t3 = st.columns(3)
            with t1:
                if st.button(f"Table → all {_IMAGE_QUEUE_LABEL}", key="diag_tbl_all_gen"):
                    df = st.session_state["svg_queue_df"].copy()
                    df[_DIAGRAM_QUEUE_COLUMN] = _IMAGE_QUEUE_LABEL
                    st.session_state["svg_queue_df"] = df
                    st.session_state["svg_queue_v"] = int(st.session_state.get("svg_queue_v", 0)) + 1
                    st.rerun()
            with t2:
                if st.button(f"Table → all {_SKIP_QUEUE_LABEL}", key="diag_tbl_all_skip"):
                    df = st.session_state["svg_queue_df"].copy()
                    df[_DIAGRAM_QUEUE_COLUMN] = _SKIP_QUEUE_LABEL
                    st.session_state["svg_queue_df"] = df
                    st.session_state["svg_queue_v"] = int(st.session_state.get("svg_queue_v", 0)) + 1
                    st.rerun()
            with t3:
                if st.button(f"Save table → DB ({_IMAGE_QUEUE_LABEL})", key="diag_tbl_save_all"):
                    try:
                        from quality_gate.supabase_io import update_question_assessment

                        df = st.session_state["svg_queue_df"]
                        n_up = 0
                        for _, row in df.iterrows():
                            qid = str(row.get("question_id") or "")
                            if qid:
                                update_question_assessment(
                                    client, qid, {"svg_operator_backfill_choice": "queue"}
                                )
                                n_up += 1
                        st.session_state["svg_queue_baseline"] = {
                            str(r["question_id"]): _IMAGE_QUEUE_LABEL
                            for _, r in df.iterrows()
                            if r.get("question_id")
                        }
                        df[_DIAGRAM_QUEUE_COLUMN] = _IMAGE_QUEUE_LABEL
                        st.session_state["svg_queue_df"] = df
                        st.success(f"Saved **{n_up}** row(s).")
                    except Exception as e:
                        st.exception(e)

            edited = st.data_editor(
                st.session_state["svg_queue_df"],
                column_config={
                    "question_id": st.column_config.TextColumn("ID", disabled=True, width="medium"),
                    "Walkthrough code": st.column_config.TextColumn("Code", disabled=True, width="small"),
                    "Review": st.column_config.LinkColumn("Review", display_text="Open"),
                    "Verdict": st.column_config.TextColumn("Verdict", disabled=True, width="small"),
                    "Backfill review": st.column_config.TextColumn("Done?", disabled=True, width="small"),
                    "Graph notes (preview)": st.column_config.TextColumn("Notes", disabled=True, width="large"),
                    _DIAGRAM_QUEUE_COLUMN: st.column_config.SelectboxColumn(
                        _DIAGRAM_QUEUE_COLUMN,
                        options=list(_DIAGRAM_QUEUE_LABELS),
                        required=True,
                        help=f"{_IMAGE_QUEUE_LABEL} = include in next run",
                    ),
                },
                hide_index=True,
                use_container_width=True,
                num_rows="fixed",
                key=f"diag_queue_editor_v{st.session_state.get('svg_queue_v', 0)}",
            )
            s1, s2 = st.columns(2)
            with s1:
                if st.button("Save queue changes", key="diag_queue_save", type="primary"):
                    try:
                        from quality_gate.supabase_io import update_question_assessment

                        baseline = st.session_state.get("svg_queue_baseline") or {}
                        n_up = 0
                        for _, row in edited.iterrows():
                            qid = str(row.get("question_id") or "")
                            new_l = row.get(_DIAGRAM_QUEUE_COLUMN)
                            if pd.isna(new_l) or not qid:
                                continue
                            new_s = str(new_l).strip()
                            if new_s == baseline.get(qid, "Undecided"):
                                continue
                            update_question_assessment(
                                client,
                                qid,
                                {"svg_operator_backfill_choice": _diagram_queue_label_to_db(new_s)},
                            )
                            n_up += 1
                        st.session_state["svg_queue_baseline"] = {
                            str(row.get("question_id")): row.get(_DIAGRAM_QUEUE_COLUMN)
                            for _, row in edited.iterrows()
                            if row.get("question_id")
                        }
                        st.session_state["svg_queue_df"] = edited
                        st.success(f"Updated **{n_up}** row(s).")
                    except Exception as e:
                        st.exception(e)
            with s2:
                st.download_button(
                    "Download queue CSV",
                    edited.to_csv(index=False).encode("utf-8"),
                    "diagram_queue.csv",
                    "text/csv",
                    key="diag_queue_csv",
                )
        elif st.session_state.get("svg_queue_df") is not None:
            st.caption("No rows in this window — try a larger load limit or check graph flags in the DB.")

    # --- Step 2: Run ---
    with st.expander("**Step 2 — Run generation**", expanded=True):
        run_col, opt_col = st.columns([1, 2])
        with run_col:
            run_btn = st.button(
                "Run diagram backfill",
                type="primary",
                key="diag_run_btn",
                help=f"Processes rows marked **{_IMAGE_QUEUE_LABEL}** (unless legacy mode is on).",
            )
        with opt_col:
            bf_legacy = st.checkbox(
                "Process all eligible (ignore queue)",
                value=False,
                key="diag_bf_legacy",
            )

        with st.popover("Run options"):
            bf_limit = st.number_input("Max questions", 1, 500, 15, 1, key="diag_bf_limit")
            bf_dry = st.checkbox("Dry run (no DB writes)", key="diag_bf_dry")
            bf_replace = st.checkbox("Replace existing diagram", key="diag_bf_replace")
            bf_max_retry = st.number_input("Imagen retries on verify fail", 0, 3, 1, key="diag_bf_max_retry")
            bf_allow_prec = st.checkbox("Allow high-precision Imagen override", key="diag_bf_allow_prec")
            img_bf_model = st.text_input("Imagen model override", "", key="diag_img_model")
            img_brief_model = st.text_input("Brief / verify / integrate override", "", key="diag_brief_model")

        if run_btn:
            try:
                from quality_gate.image_backfill import run_missing_image_backfill

                log_img: list[str] = []
                with st.status("Running…", expanded=True) as status:

                    def _prog(msg: str) -> None:
                        status.write(msg)

                    stats = run_missing_image_backfill(
                        limit=int(bf_limit),
                        image_model=(img_bf_model or "").strip(),
                        brief_model=(img_brief_model or "").strip(),
                        verify_model=(img_brief_model or "").strip(),
                        integrate_model=(img_brief_model or "").strip(),
                        dry_run=bool(bf_dry),
                        page_size=40,
                        log_lines=log_img,
                        require_operator_queue=not bool(bf_legacy),
                        progress_callback=_prog,
                        max_retries=int(bf_max_retry),
                        allow_high_precision_image=bool(bf_allow_prec),
                        replace_existing_diagram=bool(bf_replace),
                        diagram_mode="image",
                    )
                    merged = int(stats.get("merged") or 0)
                    skipped = int(stats.get("skipped") or 0)
                    failed = int(stats.get("failed") or 0)
                    merged_svg = int(stats.get("merged_svg") or 0)
                    merged_img = int(stats.get("merged_imagen") or 0)
                    status.update(
                        label=(
                            f"Done — merged {merged} (SVG {merged_svg}, Imagen {merged_img}), "
                            f"skipped {skipped}, failed {failed}"
                        ),
                        state="complete" if failed == 0 else "error",
                        expanded=failed > 0,
                    )
                st.session_state["diag_last_stats"] = stats
                st.session_state["diag_last_log"] = log_img

            except Exception as e:
                st.exception(e)

        if st.session_state.get("diag_last_stats"):
            stats = st.session_state["diag_last_stats"]
            c1, c2, c3, c4 = st.columns(4)
            c1.metric("Merged", int(stats.get("merged") or 0))
            c2.metric("SVG", int(stats.get("merged_svg") or 0))
            c3.metric("Imagen", int(stats.get("merged_imagen") or 0))
            c4.metric("Failed", int(stats.get("failed") or 0))

            audits = stats.get("row_audits") or []
            if audits:
                st.dataframe(
                    pd.DataFrame(
                        [
                            {
                                "id": a.get("question_id"),
                                "status": a.get("final_status"),
                                "route": _audit_route_label(a),
                                "diagram_need": a.get("diagram_need"),
                                "reason": (a.get("reason") or "")[:80],
                            }
                            for a in audits
                        ]
                    ),
                    use_container_width=True,
                    hide_index=True,
                )
                for a in audits[:3]:
                    url = a.get("uploaded_url")
                    if url and a.get("final_status") == "merged" and a.get("renderer") == "imagen":
                        st.image(url, caption=a.get("question_id"), width=360)

        if st.session_state.get("diag_last_log"):
            with st.expander("Run log", expanded=False):
                st.text_area(
                    "log",
                    "\n".join(st.session_state["diag_last_log"][-100:]),
                    height=200,
                    label_visibility="collapsed",
                )

    # --- Step 3: History ---
    with st.expander("**Step 3 — Local history**", expanded=False):
        try:
            from quality_gate.image_backfill import read_image_backfill_history

            ihist = read_image_backfill_history(max_lines=50)
            if not ihist:
                st.caption("No runs logged yet on this machine.")
            else:
                hdf = pd.DataFrame(ihist)
                show_cols = [
                    c
                    for c in (
                        "ts",
                        "question_id",
                        "final_status",
                        "renderer",
                        "visual_kind",
                        "diagram_need",
                        "reason",
                    )
                    if c in hdf.columns
                ]
                st.dataframe(
                    hdf[show_cols] if show_cols else hdf,
                    use_container_width=True,
                    hide_index=True,
                )
        except Exception as e:
            st.caption(f"History unavailable: {e}")


def _tail_log(path: Path, n: int = 120) -> str:
    if not path.is_file():
        return ""
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    return "\n".join(lines[-n:])


def _combined_log_text(state: dict | None, *, n: int = 120) -> str:
    """Prefer subprocess log file; fall back to run_state log_tail (always updated)."""
    file_log = _tail_log(LOG_PATH, n=n)
    if file_log.strip():
        return file_log
    if state:
        tail = state.get("log_tail")
        if isinstance(tail, list) and tail:
            return "\n".join(str(x) for x in tail[-n:])
    return "(no log output yet — check Live progress above; scoring may still be running)"


def _mark_run_state_stopped() -> None:
    """Clear ``running`` so a dead subprocess does not block the next Start click."""
    from datetime import datetime, timezone

    state = _load_state()
    if not state:
        return
    state["running"] = False
    state["last_update"] = datetime.now(timezone.utc).isoformat()
    STATE_PATH.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")


def _subprocess_popen_kwargs() -> dict[str, Any]:
    """
    Background scorer on Windows must not use DETACHED_PROCESS — that spawns a visible
    System32 cmd flash. CREATE_NO_WINDOW keeps the child hidden while Streamlit reruns.
    """
    if sys.platform != "win32":
        return {"start_new_session": True}
    flags = int(getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000))
    if hasattr(subprocess, "CREATE_NEW_PROCESS_GROUP"):
        flags |= int(subprocess.CREATE_NEW_PROCESS_GROUP)  # type: ignore[attr-defined]
    si = subprocess.STARTUPINFO()
    si.dwFlags |= subprocess.STARTF_USESHOWWINDOW  # type: ignore[attr-defined]
    si.wShowWindow = 0
    return {"creationflags": flags, "startupinfo": si}


def _heal_zombie_run_state(proc: Any) -> None:
    """
    Streamlit reruns can orphan/kill the child on Windows while ``run_state.json`` still says running.
  """
    state = _load_state()
    if not state or not state.get("running"):
        return
    if proc is not None and proc.poll() is None:
        return
    updated = _parse_state_timestamp(state.get("last_update"))
    if not updated:
        _mark_run_state_stopped()
        return
    from datetime import datetime, timezone

    age_s = (datetime.now(timezone.utc) - updated).total_seconds()
    stats = state.get("stats") if isinstance(state.get("stats"), dict) else {}
    proc_n = int(stats.get("processed") or 0)
    if proc_n == 0 and age_s > 30:
        _mark_run_state_stopped()
        return
    if age_s > 120:
        _mark_run_state_stopped()


def _parse_state_timestamp(raw: Any) -> Optional["datetime"]:
    from datetime import datetime, timezone

    if not raw:
        return None
    try:
        s = str(raw).replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _scoring_status(proc: Any, state: dict | None) -> dict[str, Any]:
    """
    Unified status for UI: subprocess handle may be lost after refresh while CLI still runs.
    """
    from datetime import datetime, timezone

    out: dict[str, Any] = {
        "subprocess_alive": False,
        "subprocess_exit": None,
        "state_running": False,
        "stale": False,
        "display": "idle",
        "message": "No scoring job detected. Click **Start scoring** above.",
    }
    if proc is not None:
        code = proc.poll()
        if code is None:
            out["subprocess_alive"] = True
        else:
            out["subprocess_exit"] = code

    if state and state.get("running"):
        out["state_running"] = True
        updated = _parse_state_timestamp(state.get("last_update"))
        if updated:
            age_s = (datetime.now(timezone.utc) - updated).total_seconds()
            stats = state.get("stats") if isinstance(state.get("stats"), dict) else {}
            proc_n = int(stats.get("processed") or 0)
            if proc_n == 0 and age_s > 30:
                out["stale"] = True
            elif age_s > 180:
                out["stale"] = True

    alive = out["subprocess_alive"] or (out["state_running"] and not out["stale"])
    if alive and not out["stale"]:
        stats = state.get("stats") if state else {}
        proc_n = stats.get("processed", 0) if isinstance(stats, dict) else 0
        out["display"] = "running"
        out["message"] = (
            f"Scoring **in progress** — **{proc_n}** question(s) processed so far. "
            "Use **Refresh progress** below to update (or enable auto-refresh)."
        )
    elif alive and out["stale"]:
        out["display"] = "stale"
        out["message"] = (
            "Progress file still says **running**, but nothing has updated in **3+ minutes**. "
            "The job may be stuck (slow LLM / tag relabel) or crashed. Check log below; use **Stop scoring** "
            "and start again if needed."
        )
    elif out["subprocess_exit"] is not None:
        out["display"] = "finished"
        out["message"] = f"Background process exited (code **{out['subprocess_exit']}**)."
    elif state and not state.get("running"):
        stats = state.get("stats") if state else {}
        proc_n = stats.get("processed", 0) if isinstance(stats, dict) else 0
        out["display"] = "finished"
        out["message"] = f"Last job finished — **{proc_n}** question(s) processed."
    return out


def _errors_from_state(state: dict | None) -> list[str]:
    if not state:
        return []
    out: list[str] = []
    tail = state.get("log_tail")
    if isinstance(tail, list):
        for line in tail:
            s = str(line)
            if s.startswith("[error]"):
                out.append(s)
    le = (state.get("last_error") or "").strip()
    if le and le not in out:
        out.append(le)
    return out


def _outcome_label(eff: str | None, *, auto_applied: bool, status: str | None) -> str:
    if auto_applied or (status or "").lower() == "approved":
        return "Approved"
    if eff == "delete":
        return "Delete"
    if eff == "regenerate":
        return "Regenerate"
    if eff == "move_to_math2":
        return "Move to Math 2"
    if eff == "human_review":
        return "Human review"
    if eff == "approve":
        return "Keep"
    return eff or "—"


def _build_live_results_dataframe(
    rows: list[dict[str, Any]],
    review_base: str,
) -> pd.DataFrame:
    base = review_base.rstrip("/")
    records: list[dict[str, Any]] = []
    for r in rows:
        qid = str(r.get("id") or "")
        code_raw = (r.get("media_upload_code") or "").strip().upper()
        code = code_raw if code_raw else (qid[:8] + "…" if qid else "—")
        payload = _parse_quality_gate_payload(r)
        cur = _curriculum_cols(r)
        rd = payload.get("review_disposition") if isinstance(payload.get("review_disposition"), dict) else {}
        labels = rd.get("labels") if isinstance(rd, dict) else []
        label_s = ", ".join(str(x) for x in labels) if isinstance(labels, list) and labels else "—"
        reason = _ai_why_from_row(r)
        eff = r.get("quality_gate_action")
        auto = (r.get("status") or "").lower() == "approved" and eff == "approve"
        records.append(
            {
                "Code": code,
                "Verdict": r.get("quality_gate_verdict") or "—",
                "Outcome": _outcome_label(eff, auto_applied=auto, status=r.get("status")),
                "Labels": label_s,
                "Why": reason or "—",
                "Subject": r.get("subjects") or "—",
                "Status": r.get("status") or "—",
                "Open": f"{base}/review?id={qid}" if qid else "",
            }
        )
    return pd.DataFrame.from_records(records)


def _render_export_panel(
    client: Any,
    review_base: str,
    *,
    key_prefix: str,
    job_id: Optional[str] = None,
    test_type: Optional[str] = "ESAT",
    title: str = "Export full report",
) -> None:
    """Download stems + tags + AI reasoning / flags for assessed questions."""
    from quality_gate.export_report import export_csv_bytes, export_html_bytes, export_jsonl_bytes
    from quality_gate.supabase_io import fetch_assessed_questions_for_export

    st.subheader(title)
    scope = "this run only" if (job_id or "").strip() else f"all assessed ({test_type or 'any'})"
    st.caption(
        f"Includes stems (HTML in **HTML** / **JSONL** / `question_stem_html` CSV column), subject, "
        f"difficulty, tags, verdict, AI reasoning, flags, and review link. "
        f"Scope: **{scope}**. Open **Download HTML** in a browser for math + diagrams."
    )
    export_cap = st.number_input(
        "Max questions to export",
        min_value=50,
        max_value=50_000,
        value=5_000 if not (job_id or "").strip() else 2_000,
        step=50,
        key=f"{key_prefix}_export_cap",
    )
    cache_key = f"{key_prefix}_export_rows"
    prep_key = f"{key_prefix}_export_prep"

    if st.button("Load export data", key=prep_key, type="secondary"):
        try:
            with st.spinner("Fetching assessed questions from database…"):
                rows = fetch_assessed_questions_for_export(
                    client,
                    job_id=(job_id or "").strip() or None,
                    test_type=test_type,
                    max_rows=int(export_cap),
                    page_size=80,
                )
            st.session_state[cache_key] = rows
            if rows:
                st.success(f"Loaded **{len(rows):,}** question(s). Use the download buttons below.")
            else:
                st.warning("No assessed questions matched this scope.")
        except Exception as e:
            st.exception(e)

    rows = st.session_state.get(cache_key)
    if not rows:
        return

    st.caption(
        f"**{len(rows):,}** question(s) ready. Use **HTML** for readable stems with math and diagrams."
    )
    slug = "".join(c if c.isalnum() else "_" for c in (job_id or test_type or "export"))[:40]
    c_html, c_csv, c_jsonl = st.columns(3)
    with c_html:
        st.download_button(
            label="Download HTML",
            data=export_html_bytes(rows, review_base=review_base),
            file_name=f"quality_gate_export_{slug}.html",
            mime="text/html",
            key=f"{key_prefix}_dl_html",
        )
    with c_csv:
        st.download_button(
            label="Download CSV",
            data=export_csv_bytes(rows, review_base=review_base),
            file_name=f"quality_gate_export_{slug}.csv",
            mime="text/csv",
            key=f"{key_prefix}_dl_csv",
        )
    with c_jsonl:
        st.download_button(
            label="Download JSONL",
            data=export_jsonl_bytes(rows, review_base=review_base),
            file_name=f"quality_gate_export_{slug}.jsonl",
            mime="application/jsonl",
            key=f"{key_prefix}_dl_jsonl",
        )


def _launch_scoring_subprocess(
    *,
    limit: int,
    page_size: int,
    test_type: str,
    llm_backend: str,
    model: str,
    job_id: str,
) -> None:
    """Start background CLI scorer with project defaults (save all, fix formatting, relabel tags, skip assessed)."""
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOG_PATH.write_text("", encoding="utf-8")
    cmd = [
        sys.executable,
        "-B",
        "-u",
        str(CLI),
        "run",
        "--limit",
        str(int(limit)),
        "--page-size",
        str(int(page_size)),
        "--test-type",
        test_type,
        "--llm",
        llm_backend,
        "--apply-tag-fixes",
        "--state-file",
        str(STATE_PATH),
    ]
    if model.strip():
        cmd += ["--model", model.strip()]
    if job_id.strip():
        cmd += ["--job-id", job_id.strip()]

    child_env = os.environ.copy()
    child_env["PYTHONUNBUFFERED"] = "1"
    root_s = str(ROOT)
    existing = child_env.get("PYTHONPATH", "")
    child_env["PYTHONPATH"] = root_s if not existing else f"{root_s}{os.pathsep}{existing}"
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOG_PATH.write_text("", encoding="utf-8")
    log_handle = open(LOG_PATH, "w", encoding="utf-8")
    proc = subprocess.Popen(
        cmd,
        cwd=str(ROOT),
        stdin=subprocess.DEVNULL,
        stdout=log_handle,
        stderr=subprocess.STDOUT,
        env=child_env,
        **_subprocess_popen_kwargs(),
    )
    st.session_state.subproc = proc
    st.session_state.last_cmd = " ".join(cmd)
    _mark_run_state_stopped()
    from datetime import datetime, timezone

    bootstrap = {
        "job_id": "",
        "running": True,
        "last_update": datetime.now(timezone.utc).isoformat(),
        "stats": {
            "processed": 0,
            "errors": 0,
            "auto_approved": 0,
            "pending_operator": 0,
            "skipped_deleted": 0,
            "calibration_gold": 0,
            "graph_candidates": 0,
            "graph_missing_expected": 0,
            "batch_api_jobs": 0,
            "diagrams_inserted": 0,
            "diagram_errors": 0,
            "formatting_fixed": 0,
            "tags_relabeled": 0,
        },
        "last_error": "",
        "log_tail": ["Subprocess launched — waiting for first question…"],
    }
    STATE_PATH.write_text(json.dumps(bootstrap, indent=2, ensure_ascii=False), encoding="utf-8")


SCORE_ALL_LIMIT = 50_000
SCORE_PAGE_SIZE = 25


def _terminate_if_running() -> None:
    proc = st.session_state.get("subproc")
    if proc is not None and proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
    st.session_state.subproc = None
    _mark_run_state_stopped()


st.set_page_config(page_title="ESAT Quality Gate", layout="wide")
st.title("ESAT Quality Gate")
st.caption("Score questions · review results · generate diagrams")

_qg_client, _qg_err = _init_qg_supabase()
if _qg_err:
    st.sidebar.error(f"Database: {_qg_err}")

tab_score, tab_review, tab_diagrams, tab_cli = st.tabs(
    ["Score questions", "Review results", "Diagram generation", "Technical / CLI"]
)

with tab_score:
    review_base = _review_base_url()
    _heal_zombie_run_state(st.session_state.get("subproc"))
    pool_unassessed = None
    if _qg_client is not None:
        try:
            from quality_gate.supabase_io import count_questions_gate_overview

            pool_unassessed = count_questions_gate_overview(_qg_client, test_type="ESAT").get("unassessed")
        except Exception:
            pool_unassessed = None

    state = _load_state()
    proc = st.session_state.get("subproc")
    status = _scoring_status(proc, state)
    stats = state.get("stats") if isinstance(state, dict) and isinstance(state.get("stats"), dict) else {}
    job_id_live = (state.get("job_id") or "").strip() if state else ""

    st.markdown(
        "Process **all un-scored ESAT questions** — saves scores, auto-approves strong passes, "
        "fixes line breaks, and re-labels bad tags. Already-scored rows are skipped. "
        "**Deterministic regex/tag prechecks are off** — only the LLM rubric decides syllabus and actions."
    )

    c_start, c_stop, c_refresh = st.columns([2, 1, 1])
    with c_start:
        if st.button("Start processing", type="primary", use_container_width=True):
            existing = _load_state()
            ex_stat = _scoring_status(st.session_state.get("subproc"), existing)
            if ex_stat["display"] == "running" and not ex_stat["stale"]:
                st.error("A job is already running. Stop it first or wait for it to finish.")
            else:
                _terminate_if_running()
                _launch_scoring_subprocess(
                    limit=SCORE_ALL_LIMIT,
                    page_size=SCORE_PAGE_SIZE,
                    test_type="ESAT",
                    llm_backend="vertex",
                    model="",
                    job_id="",
                )
                st.success("Processing started.")
                st.rerun()
    with c_stop:
        if st.button("Stop", use_container_width=True):
            _terminate_if_running()
            st.warning("Stop requested.")
            st.rerun()
    with c_refresh:
        if st.button("Refresh", use_container_width=True):
            st.rerun()

    if status["display"] == "running":
        st.success(status["message"])
    elif status["display"] == "stale":
        st.warning(status["message"])
    elif status["display"] == "finished":
        st.info(status["message"])

    m0, m1, m2, m3, m4 = st.columns(5)
    with m0:
        st.metric("Left in pool", f"{pool_unassessed:,}" if pool_unassessed is not None else "—")
    with m1:
        st.metric("Processed (this run)", stats.get("processed", 0))
    with m2:
        st.metric("Auto-approved", stats.get("auto_approved", 0))
    with m3:
        st.metric("Needs review", stats.get("pending_operator", 0))
    with m4:
        st.metric("Errors", stats.get("errors", 0))

    st.subheader("Latest results")
    live_rows: list[dict[str, Any]] = []
    if _qg_client is not None and job_id_live:
        try:
            from quality_gate.supabase_io import fetch_live_job_results

            live_rows = fetch_live_job_results(_qg_client, job_id_live, limit=40)
        except Exception as e:
            st.caption(f"Could not load live results: {e}")

    if live_rows:
        df_live = _build_live_results_dataframe(live_rows, review_base)
        st.caption("**Why** shows the full AI reasoning (not truncated). Click a cell to read long text.")
        st.dataframe(
            df_live,
            use_container_width=True,
            hide_index=True,
            column_config={
                "Open": st.column_config.LinkColumn("Review", display_text="Open"),
                "Why": _wide_text_column(
                    "Why",
                    help_text="Full quality-gate reasoning from the latest assessment",
                ),
                "Labels": _wide_text_column("Labels"),
            },
        )
    elif job_id_live:
        st.info("No rows written for this job yet — they appear here as each question completes.")
    else:
        st.info("Click **Start processing** to begin. Results will stream in here.")

    err_lines = _errors_from_state(state)
    if err_lines or (stats.get("errors", 0) or 0) > 0:
        st.subheader("Errors")
        if err_lines:
            st.code("\n".join(err_lines[-50:]), language="text")
        else:
            st.caption(f"{stats.get('errors', 0)} error(s) recorded in stats — see log below.")

    with st.expander("Technical log", expanded=False):
        st.text_area("log_output", _combined_log_text(state), height=200, label_visibility="collapsed")
        if st.session_state.get("last_cmd"):
            st.code(st.session_state.last_cmd, language="bash")

    if status["display"] in ("running", "stale"):
        auto_refresh = st.checkbox(
            "Auto-refresh every 5s while running",
            value=True,
            key="qg_subproc_autorefresh",
        )
        if auto_refresh:
            time.sleep(5.0)
            st.rerun()
    elif proc is not None and proc.poll() is not None:
        st.session_state.subproc = None

    if _qg_client is not None and job_id_live:
        st.divider()
        _render_export_panel(
            _qg_client,
            review_base,
            key_prefix="score_tab",
            job_id=job_id_live,
            test_type="ESAT",
            title="Export this run (stems + AI notes)",
        )

with tab_review:
    st.markdown(
        "Browse scored questions and open them in the **review app**. "
        "Use **Diagram generation** for adding diagrams to graph-flagged rows."
    )
    if _qg_client is None:
        st.error(_qg_err or "Supabase not connected.")
        st.stop()
    from quality_gate.supabase_io import (
        clear_all_quality_gate_assessments,
        clear_quality_gate_for_graph_flagged_rows,
        count_approved_questions,
        count_assessed_breakdown,
        count_assessed_questions,
        count_graph_flagged_rows,
        count_questions_gate_overview,
        fetch_all_assessed_rows_for_overview,
        list_quality_gate_run_choices,
        reset_approved_to_pending,
    )

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
            st.subheader("Pool overview")
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

            try:
                breakdown = count_assessed_breakdown(_qg_client, test_type=tt_param)
            except Exception as e:
                breakdown = {}
                st.caption(f"Action breakdown unavailable: {e}")

            if breakdown:
                st.markdown("#### All processed — by AI action")
                ba = breakdown.get("by_action") or {}
                c0, c1, c2, c3, c4, c5, c6 = st.columns(7)
                with c0:
                    st.metric("Processed", f"{breakdown.get('total_assessed', 0):,}")
                with c1:
                    st.metric("Human review", f"{ba.get('human_review', 0):,}")
                with c2:
                    st.metric("Remove", f"{ba.get('delete', 0):,}")
                with c3:
                    st.metric("Regenerate", f"{ba.get('regenerate', 0):,}")
                with c4:
                    st.metric("Move to Math 2", f"{ba.get('move_to_math2', 0):,}")
                with c5:
                    st.metric("Keep (approve)", f"{ba.get('approve', 0):,}")
                with c6:
                    st.metric("Needs operator", f"{breakdown.get('needs_operator', 0):,}")
                bs = breakdown.get("by_status") or {}
                st.caption(
                    f"Workflow status (assessed, non-deleted): **pending** {bs.get('pending', 0):,} · "
                    f"**approved** {bs.get('approved', 0):,}. "
                    f"Soft-deleted but previously assessed: **{breakdown.get('soft_deleted_assessed', 0):,}** "
                    "(hidden from table below)."
                )

            st.subheader("Browse all processed questions")
            st.caption(
                "Click **Load all processed** once to fetch every assessed row from the DB, then filter by category. "
                "Tables show **all** rows in the selected bucket (no 2,500-row cap)."
            )
            assessed_total = int(ov_stats.get("assessed") or 0)
            ov_cache_sig = f"{overview_tt}:{assessed_total}"
            b_load_ov, b_clear_ov = st.columns([1, 1])
            with b_load_ov:
                load_overview = st.button(
                    "Load all processed",
                    type="primary",
                    key="qg_load_overview",
                    disabled=assessed_total <= 0,
                )
            with b_clear_ov:
                if st.button("Clear cached table", key="qg_clear_overview"):
                    st.session_state.pop("qg_overview_rows", None)
                    st.session_state.pop("qg_overview_cache_sig", None)
                    st.rerun()

            all_assessed: list[dict[str, Any]] = []
            if load_overview:
                load_cap = max(assessed_total + 500, 5_000)
                with st.spinner(f"Loading all {assessed_total:,} assessed question(s)…"):
                    all_assessed = fetch_all_assessed_rows_for_overview(
                        _qg_client,
                        test_type=tt_param,
                        max_scan=load_cap,
                        page_size=500,
                    )
                st.session_state["qg_overview_rows"] = all_assessed
                st.session_state["qg_overview_cache_sig"] = ov_cache_sig
            elif (
                st.session_state.get("qg_overview_cache_sig") == ov_cache_sig
                and isinstance(st.session_state.get("qg_overview_rows"), list)
            ):
                all_assessed = st.session_state["qg_overview_rows"]
            elif st.session_state.get("qg_overview_cache_sig"):
                st.info("Pool changed — click **Load all processed** to refresh.")
            else:
                st.info(
                    f"**{assessed_total:,}** question(s) processed. Click **Load all processed** to browse by category."
                )

            if all_assessed:
                if len(all_assessed) < assessed_total:
                    st.warning(
                        f"Loaded **{len(all_assessed):,}** of **{assessed_total:,}** assessed rows — "
                        "re-click **Load all processed** or raise the DB scan if counts diverge."
                    )
                sorted_assessed = _sort_rows_for_results_table(all_assessed)

                bucket_labels: list[str] = []
                bucket_keys: list[str] = []
                ba = (breakdown or {}).get("by_action") or {}
                for key, label, _action in _REVIEW_BUCKET_OPTIONS:
                    if key == "all":
                        n = len(sorted_assessed)
                    elif key == "needs_operator":
                        n = int((breakdown or {}).get("needs_operator") or 0)
                    else:
                        n = int(ba.get(key) or 0)
                    bucket_keys.append(key)
                    bucket_labels.append(f"{label} ({n:,})")

                bucket_ix = st.selectbox(
                    "Show category",
                    range(len(bucket_keys)),
                    format_func=lambda i: bucket_labels[i],
                    key="qg_review_bucket",
                )
                bucket = bucket_keys[bucket_ix]

                st.markdown("#### Optional curriculum filters")
                cf1, cf2, cf3, cf4, cf5 = st.columns(5)
                with cf1:
                    f_off = st.checkbox("Off-syllabus only", key="qg_f_off")
                with cf2:
                    f_mm = st.checkbox("Math 1 needs MM", key="qg_f_mm")
                with cf3:
                    f_calc = st.checkbox("Calculus in Math 1", key="qg_f_calc")
                with cf4:
                    f_long = st.checkbox("Likely too long (pacing ≤2)", key="qg_f_long")
                with cf5:
                    f_tag = st.checkbox("Missing primary_tag", key="qg_f_tag")

                bucket_rows = _filter_assessed_bucket(sorted_assessed, bucket)
                filtered_assessed = _apply_curriculum_filters(
                    bucket_rows,
                    {
                        "off_syllabus": f_off,
                        "math1_mm": f_mm,
                        "calculus_math1": f_calc,
                        "likely_too_long": f_long,
                        "missing_primary_tag": f_tag,
                    },
                )
                st.caption(
                    f"Showing **{len(filtered_assessed):,}** question(s) in **{bucket_labels[bucket_ix]}** "
                    f"(of {len(all_assessed):,} loaded). **Status** = workflow in Supabase (pending / approved)."
                )
                _render_assessed_table(
                    filtered_assessed,
                    review_base,
                    csv_name=f"quality_gate_{bucket}.csv",
                    csv_key=f"qg_download_overview_{bucket}",
                )
            st.divider()
            _render_export_panel(
                _qg_client,
                review_base,
                key_prefix="review_all",
                job_id=None,
                test_type=tt_param,
                title="Export all assessed questions (full stems + AI notes)",
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
    st.markdown("### Full reset — clear all checker data")
    st.caption(
        "Wipes **every** quality-gate field on non-deleted questions (verdicts, scores, graph flags, diagram backfill metadata). "
        "Sets **approved** → **pending**. **Deleted** rows and their status are unchanged."
    )
    if _qg_client is not None:
        try:
            _n_assessed = count_assessed_questions(_qg_client)
            _n_approved = count_approved_questions(_qg_client)
        except Exception:
            _n_assessed = _n_approved = None
        if _n_assessed is not None:
            st.caption(f"Currently assessed: **{_n_assessed}** · approved: **{_n_approved}**.")
    confirm_full_reset = st.checkbox(
        "I understand: all quality-gate assessments will be removed and approved questions return to pending.",
        key="confirm_full_qg_reset",
    )
    clear_run_on_full = st.checkbox(
        "Also clear Streamlit run progress (run_state.json)",
        value=True,
        key="clear_run_on_full_reset",
    )
    if st.button(
        "Clear ALL quality gate data",
        disabled=not confirm_full_reset or _qg_client is None,
        key="btn_clear_all_qg",
    ):
        try:
            stats = clear_all_quality_gate_assessments(_qg_client, reset_status_to_pending=True)
            if clear_run_on_full and STATE_PATH.is_file():
                from datetime import datetime, timezone

                payload = {
                    "job_id": "",
                    "running": False,
                    "last_update": datetime.now(timezone.utc).isoformat(),
                    "stats": {
                        "processed": 0,
                        "errors": 0,
                        "auto_approved": 0,
                        "pending_operator": 0,
                        "skipped_deleted": 0,
                        "calibration_gold": 0,
                        "graph_candidates": 0,
                        "graph_missing_expected": 0,
                        "batch_api_jobs": 0,
                        "diagrams_inserted": 0,
                        "diagram_errors": 0,
                        "answer_key_fixed": 0,
                    },
                    "last_error": None,
                    "log_tail": [],
                    "full_reset": True,
                }
                STATE_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
            st.success(
                f"Cleared **{stats.get('assessed_cleared', 0)}** assessed row(s); "
                f"reset **{stats.get('approved_reset', 0)}** approved → pending. Refresh this page."
            )
            st.rerun()
        except Exception as e:
            st.exception(e)

    st.divider()
    st.markdown("### Reset human verification only (approved → pending)")
    st.caption(
        "Sets **Status** back to **pending** for every question currently **approved** (review-app or auto-approve). "
        "**Does not** change AI quality-gate scores, flags, or delete recommendations. **Deleted** rows are untouched."
    )
    if _qg_client is not None:
        try:
            _n_approved = count_approved_questions(_qg_client)
        except Exception:
            _n_approved = None
        if _n_approved is not None:
            st.caption(f"Rows currently approved: **{_n_approved}**.")
    confirm_unverify = st.checkbox(
        "I understand: all approved questions go back to pending for re-review.",
        key="confirm_unverify",
    )
    clear_run_state_on_reset = st.checkbox(
        "Also clear Streamlit run progress (auto_approved counters in run_state.json)",
        value=True,
        key="clear_run_state_on_reset",
    )
    if st.button(
        "Reset all verified questions to pending",
        disabled=not confirm_unverify or _qg_client is None,
        key="btn_reset_verified",
    ):
        try:
            n_reset = reset_approved_to_pending(_qg_client)
            if clear_run_state_on_reset and STATE_PATH.is_file():
                from datetime import datetime, timezone

                payload = {
                    "job_id": "",
                    "running": False,
                    "last_update": datetime.now(timezone.utc).isoformat(),
                    "stats": {
                        "processed": 0,
                        "errors": 0,
                        "auto_approved": 0,
                        "pending_operator": 0,
                        "skipped_deleted": 0,
                        "calibration_gold": 0,
                        "graph_candidates": 0,
                        "graph_missing_expected": 0,
                        "batch_api_jobs": 0,
                        "diagrams_inserted": 0,
                        "diagram_errors": 0,
                    },
                    "last_error": None,
                    "log_tail": [],
                    "verification_reset": True,
                }
                STATE_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
            st.success(
                f"Reset **{n_reset}** approved question(s) to **pending**. "
                "AI quality-gate data unchanged. Refresh this page to update the overview table."
            )
            st.rerun()
        except Exception as e:
            st.exception(e)

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
    if st.button("Show summary for this run", key="review_show_run_summary"):
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
                    "**Graph**, then the rest. Within each band, **delete / regenerate / move to Math 2 / human review** before **approve**. "
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
                        ),
                        "Why": _wide_text_column("Why"),
                        "Curriculum reason": _wide_text_column("Curriculum reason"),
                        "Curriculum flags": _wide_text_column("Curriculum flags"),
                        "Format issues": _wide_text_column("Format issues"),
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
                    st.divider()
                    _render_export_panel(
                        client,
                        review_base,
                        key_prefix=f"run_{safe_slug}",
                        job_id=jid,
                        test_type=None,
                        title="Export this run (full stems + AI notes)",
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
    st.markdown("### Export action lists")
    st.caption("JSONL files of question ids for batch operator workflows.")
    c_regen, c_move = st.columns(2)
    with c_regen:
        regen_path = st.text_input(
            "Regenerate export path",
            str(ROOT / "quality_gate" / "regen_export.jsonl"),
            key="qg_regen_export_path",
        )
    with c_move:
        move_path = st.text_input(
            "Move to Math 2 export path",
            str(ROOT / "quality_gate" / "move_to_math2_export.jsonl"),
            key="qg_move_math2_export_path",
        )
    if st.button("Write export files", key="qg_write_action_exports"):
        if not run_id:
            st.error("Choose a run from the list or type a run id.")
        else:
            try:
                from quality_gate.runner import init_env
                from quality_gate.supabase_io import fetch_ids_for_job_action, get_supabase

                init_env()
                client = get_supabase()
                regen_ids = fetch_ids_for_job_action(client, run_id, "regenerate")
                move_ids = fetch_ids_for_job_action(client, run_id, "move_to_math2")
                for label, ids, path_s in (
                    ("regenerate", regen_ids, regen_path),
                    ("move_to_math2", move_ids, move_path),
                ):
                    p = Path(path_s).expanduser()
                    p.parent.mkdir(parents=True, exist_ok=True)
                    p.write_text(
                        "\n".join(json.dumps({"id": qid}) for qid in ids) + ("\n" if ids else ""),
                        encoding="utf-8",
                    )
                st.success(
                    f"Wrote **{len(regen_ids)}** regenerate and **{len(move_ids)}** move-to-Math-2 id(s)."
                )
            except Exception as e:
                st.exception(e)

with tab_diagrams:
    if _qg_client is None:
        st.error(_qg_err or "Supabase not connected — diagram generation needs the database.")
    else:
        diag_review_base = st.text_input(
            "Review app URL",
            value=_review_base_url(),
            key="diag_review_app_base",
            help="Links in the queue table open `/review?id=…`",
        )
        _render_diagram_generation_tab(_qg_client, diag_review_base)

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

# Image backfill (Imagen Ultra + vision verify + <img> merge) — queue column in Streamlit
python quality_gate/cli.py generate-missing-images --limit 1 --operator-queue-only --diagram-dry-run
python quality_gate/cli.py generate-missing-images --limit 20 --operator-queue-only
python quality_gate/cli.py generate-missing-images --limit 20 --image-model imagen-4.0-ultra-generate-001
```
"""
    )
    st.markdown(
        "**Database setup:** run `migrations/add_quality_gate.sql`, then "
        "`migrations/add_quality_gate_calibration_graph.sql` in Supabase if you use calibration/graph columns. "
        "For the image backfill **operator queue** UI: `migrations/add_svg_operator_backfill_choice.sql`. "
        "Optional image metadata: `migrations/add_quality_gate_diagram_image.sql`. "
        "Create Supabase Storage bucket **`quality-gate-diagrams`** (public). "
        "Optional stem snapshot: `migrations/add_question_stem_before_auto_diagram.sql`.\n\n"
        "**Review links:** set `REVIEW_APP_URL` in `.env`. UI tabs: **Score questions** · **Review results** · **Diagram generation**.\n\n"
        "**Image backfill (default in UI):** `prompt_image_*.md` + env `MODEL_QUALITY_GATE_IMAGE*` (Imagen Ultra default) + "
        "`MODEL_QUALITY_GATE_IMAGE_BRIEF/VERIFY/INTEGRATE` (Gemini 2.5 Pro). Prompts in `quality_gate/`.\n\n"
        "**Normal scoring (Vertex, default):** `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, ADC; "
        "default model `gemini-2.5-flash`. If `GOOGLE_CLOUD_LOCATION` is `global`, the GenAI client remaps to "
        "`us-central1` unless you set `VERTEX_GENAI_NO_GLOBAL_REMAP=1`.\n\n"
        "**Claude:** pass `--llm anthropic` or set `QUALITY_GATE_LLM=anthropic` and set `ANTHROPIC_API_KEY`.\n\n"
        "**Batch API (Advanced):** always Gemini Developer API — `GEMINI_API_KEY` or `GOOGLE_API_KEY`; "
        f"default model `{DEFAULT_QUALITY_GATE_BATCH_MODEL}` via `MODEL_QUALITY_GATE_BATCH` or `--model`."
    )
