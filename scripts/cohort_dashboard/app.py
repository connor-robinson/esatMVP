"""Cohort usage dashboard (Arkwright / Elephant / Other / General).

Live stats from Supabase Postgres. Loads credentials from repo-root `.env.local`.

Run from repo root:

  pip install -r scripts/cohort_dashboard/requirements.txt
  streamlit run scripts/cohort_dashboard/app.py
"""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from data import fetch_bundle  # noqa: E402

st.set_page_config(
    page_title="Cohort usage",
    page_icon=None,
    layout="wide",
    initial_sidebar_state="collapsed",
)

SEG_LABEL = {
    "arkwright": "Arkwright",
    "elephant": "Elephant",
    "other": "Other",
    "all": "General",
}

DEFAULT_SINCE = date(2026, 8, 24)

FEATURE_COLORS = {
    "Question bank": "#2E79B5",
    "Mental maths": "#1F8A65",
    "Past papers": "#F0A040",
}


@st.cache_data(ttl=300, show_spinner="Loading cohort data…")
def load_bundle(since_iso: str) -> dict[str, pd.DataFrame]:
    return fetch_bundle(since_iso)


def _row(df: pd.DataFrame, segment: str) -> pd.Series:
    hit = df[df["segment"] == segment]
    if hit.empty:
        return pd.Series(dtype=object)
    return hit.iloc[0]


def _all_feat(feat: pd.DataFrame) -> pd.Series:
    cols = [
        "qb_attempts",
        "qb_users",
        "paper_sessions",
        "paper_users",
        "drill_sessions",
        "drill_users",
        "cal_attempts",
        "cal_users",
        "fermi_sessions",
        "fermi_users",
        "bug_reports",
        "support_requests",
    ]
    return feat[cols].sum()


def _metric_row(values: list[tuple[str, str | int | float]]) -> None:
    cols = st.columns(len(values))
    for col, (label, value) in zip(cols, values):
        col.metric(label, value)


def _pie_three(qb: int, mm: int, papers: int, title: str) -> None:
    df = pd.DataFrame(
        {
            "feature": ["Question bank", "Mental maths", "Past papers"],
            "events": [int(qb), int(mm), int(papers)],
        }
    )
    df = df[df["events"] > 0]
    if df.empty:
        st.caption("No QB / mental maths / past paper usage in window.")
        return
    fig = px.pie(
        df,
        names="feature",
        values="events",
        color="feature",
        color_discrete_map=FEATURE_COLORS,
        hole=0.45,
        title=title,
    )
    fig.update_layout(
        margin=dict(l=10, r=10, t=40, b=10),
        height=280,
        legend=dict(orientation="h", y=-0.05),
    )
    st.plotly_chart(fig, use_container_width=True)


def _bar_h(df: pd.DataFrame, x: str, y: str, title: str, color: str = "#1F8A65") -> None:
    if df.empty:
        st.caption("No data.")
        return
    fig = px.bar(
        df,
        x=x,
        y=y,
        orientation="h",
        title=title,
        text=x,
    )
    fig.update_traces(marker_color=color, textposition="outside", cliponaxis=False)
    fig.update_layout(
        margin=dict(l=10, r=40, t=40, b=10),
        height=max(280, 28 * len(df) + 80),
        yaxis=dict(categoryorder="total ascending"),
        xaxis_title=None,
        yaxis_title=None,
    )
    st.plotly_chart(fig, use_container_width=True)


def _bar_v(df: pd.DataFrame, x: str, y: str, title: str, color: str = "#2E79B5") -> None:
    if df.empty:
        st.caption("No data.")
        return
    fig = px.bar(df, x=x, y=y, title=title, text=y)
    fig.update_traces(marker_color=color, textposition="outside", cliponaxis=False)
    fig.update_layout(
        margin=dict(l=10, r=10, t=40, b=10),
        height=280,
        xaxis_title=None,
        yaxis_title=None,
    )
    st.plotly_chart(fig, use_container_width=True)


def _segment_page(
    key: str,
    *,
    head: pd.DataFrame,
    feat: pd.DataFrame,
    seats: pd.DataFrame,
    prefs: pd.DataFrame,
    pract: pd.DataFrame,
    mm: pd.DataFrame,
    daily: pd.DataFrame,
    papers: pd.DataFrame,
    exam: pd.DataFrame,
    joins: pd.DataFrame,
) -> None:
    h = _row(head, key)
    f = _row(feat, key)
    users = int(h.get("users", 0) or 0)
    active = int(h.get("active_in_window", 0) or 0)
    activated = int(h.get("activated", 0) or 0)

    qb = int(f.get("qb_attempts", 0) or 0)
    mm_n = int(f.get("drill_sessions", 0) or 0)
    pp = int(f.get("paper_sessions", 0) or 0)
    qb_u = int(f.get("qb_users", 0) or 0)
    mm_u = int(f.get("drill_users", 0) or 0)
    pp_u = int(f.get("paper_users", 0) or 0)
    cal = int(f.get("cal_attempts", 0) or 0)
    cal_u = int(f.get("cal_users", 0) or 0)
    fermi = int(f.get("fermi_sessions", 0) or 0)
    bugs = int(f.get("bug_reports", 0) or 0)
    support = int(f.get("support_requests", 0) or 0)

    metrics: list[tuple[str, str | int | float]] = [
        ("Users", users),
        ("Active in window", f"{active} ({_pct(active, users)})"),
        ("QB attempts", qb),
        ("Mental maths", mm_n),
        ("Past papers", pp),
        ("Calibration", cal),
    ]
    if key in ("arkwright", "elephant"):
        metrics.insert(1, ("Activated", f"{activated} ({_pct(activated, users)})"))
    _metric_row(metrics)

    c1, c2, c3 = st.columns([1.2, 1, 1])
    with c1:
        _pie_three(qb, mm_n, pp, "QB vs mental maths vs papers")
    with c2:
        pen = pd.DataFrame(
            {
                "feature": ["QB", "Mental maths", "Past papers", "Calibration"],
                "users": [qb_u, mm_u, pp_u, cal_u],
            }
        )
        _bar_h(pen, "users", "feature", "Unique users", color="#2E79B5")
    with c3:
        st.markdown("**Reports / extras**")
        _metric_row(
            [
                ("Bugs", bugs),
                ("Support", support),
                ("Fermi", fermi),
            ]
        )
        slug_map = {
            "arkwright": "arkwright-2026",
            "elephant": "elephant26",
        }
        if key in slug_map:
            seat = seats[seats["slug"] == slug_map[key]]
            if not seat.empty:
                used = int(seat.iloc[0]["cohort_used"])
                cap = int(seat.iloc[0]["cohort_cap"])
                st.progress(
                    min(1.0, used / cap) if cap else 0.0,
                    text=f"Seats {used} / {cap}",
                )

    mm_seg = mm[mm["segment"] == key].head(12).copy()
    left, right = st.columns([1.4, 1])
    with left:
        _bar_h(
            mm_seg,
            "sessions",
            "section",
            "Mental maths sections (sessions)",
            color="#1F8A65",
        )
    with right:
        if mm_seg.empty:
            st.caption("No mental maths sessions in window.")
        else:
            st.dataframe(
                mm_seg[["section", "sessions", "users", "questions"]].rename(
                    columns={
                        "section": "Section",
                        "sessions": "Sessions",
                        "users": "Users",
                        "questions": "Questions",
                    }
                ),
                use_container_width=True,
                hide_index=True,
                height=360,
            )

    p1, p2, p3 = st.columns(3)
    with p1:
        pref = prefs[prefs["segment"] == key].copy()
        _bar_v(pref, "subject", "n", "Subjects preferred", color="#2E79B5")
    with p2:
        prac = pract[pract["segment"] == key].copy()
        _bar_v(prac, "subject", "attempts", "Subjects practised (QB)", color="#F0A040")
    with p3:
        pap = papers[papers["segment"] == key].copy()
        if pap.empty:
            st.caption("No past papers in window.")
        else:
            fig = px.pie(
                pap,
                names="paper_name",
                values="sessions",
                hole=0.4,
                title="Past papers",
            )
            fig.update_layout(margin=dict(l=10, r=10, t=40, b=10), height=280)
            st.plotly_chart(fig, use_container_width=True)

    d1, d2 = st.columns([1.5, 1])
    with d1:
        day = daily[daily["segment"] == key].copy()
        if day.empty:
            st.caption("No QB daily activity.")
        else:
            fig = px.area(
                day,
                x="day",
                y="qb_attempts",
                title="QB attempts / day",
            )
            fig.update_traces(line_color="#2E79B5")
            fig.update_layout(
                margin=dict(l=10, r=10, t=40, b=10),
                height=260,
                xaxis_title=None,
                yaxis_title=None,
            )
            st.plotly_chart(fig, use_container_width=True)
    with d2:
        ex = exam[exam["segment"] == key].copy()
        _bar_v(ex, "exam", "n", "Exam preference", color="#7B64B8")
        if key in ("arkwright", "elephant"):
            slug = "arkwright-2026" if key == "arkwright" else "elephant26"
            j = joins[joins["slug"] == slug].copy()
            if not j.empty:
                j["week"] = pd.to_datetime(j["week"]).dt.strftime("%Y-%m-%d")
                _bar_v(j, "week", "joins", "Joins by week", color="#2E79B5")


def _general_page(bundle: dict[str, pd.DataFrame]) -> None:
    head = bundle["head"]
    feat = bundle["feat"]
    mm = bundle["mm"]
    pract = bundle["pract"]
    papers = bundle["papers"]
    seats = bundle["seats"]

    total_users = int(head["users"].sum())
    active = int(head["active_in_window"].sum())
    f_all = _all_feat(feat)

    _metric_row(
        [
            ("All users", total_users),
            ("Partner entitled", int(seats["entitled"].sum())),
            ("Active in window", active),
            ("QB attempts", int(f_all["qb_attempts"])),
            ("Mental maths", int(f_all["drill_sessions"])),
            ("Past papers", int(f_all["paper_sessions"])),
        ]
    )

    c1, c2, c3 = st.columns([1.2, 1.2, 1])
    with c1:
        _pie_three(
            int(f_all["qb_attempts"]),
            int(f_all["drill_sessions"]),
            int(f_all["paper_sessions"]),
            "Most used of the three (All)",
        )
    with c2:
        vol = feat.copy()
        vol["segment"] = vol["segment"].map(SEG_LABEL)
        melt = vol.melt(
            id_vars=["segment"],
            value_vars=["qb_attempts", "drill_sessions", "paper_sessions"],
            var_name="feature",
            value_name="events",
        )
        melt["feature"] = melt["feature"].map(
            {
                "qb_attempts": "Question bank",
                "drill_sessions": "Mental maths",
                "paper_sessions": "Past papers",
            }
        )
        fig = px.bar(
            melt,
            x="segment",
            y="events",
            color="feature",
            barmode="group",
            color_discrete_map=FEATURE_COLORS,
            title="Volume by segment",
        )
        fig.update_layout(
            margin=dict(l=10, r=10, t=40, b=10),
            height=300,
            xaxis_title=None,
            yaxis_title=None,
            legend=dict(orientation="h", y=-0.15),
        )
        st.plotly_chart(fig, use_container_width=True)
    with c3:
        hc = head.copy()
        hc["segment"] = hc["segment"].map(SEG_LABEL)
        _bar_v(hc, "segment", "users", "Headcount", color="#2E79B5")

    mm_all = (
        mm.groupby(["topic_id", "section"], as_index=False)
        .agg(sessions=("sessions", "sum"), users=("users", "sum"), questions=("questions", "sum"))
        .sort_values("sessions", ascending=False)
        .head(12)
    )
    left, right = st.columns([1.4, 1])
    with left:
        _bar_h(
            mm_all,
            "sessions",
            "section",
            "Mental maths sections · All",
            color="#1F8A65",
        )
    with right:
        st.dataframe(
            mm_all[["section", "sessions", "users", "questions"]].rename(
                columns={
                    "section": "Section",
                    "sessions": "Sessions",
                    "users": "Users",
                    "questions": "Questions",
                }
            ),
            use_container_width=True,
            hide_index=True,
            height=360,
        )

    p1, p2 = st.columns(2)
    with p1:
        prac = (
            pract.groupby("subject", as_index=False)["attempts"]
            .sum()
            .sort_values("attempts", ascending=False)
        )
        _bar_v(prac, "subject", "attempts", "Subjects practised (All QB)", color="#F0A040")
    with p2:
        pap = (
            papers.groupby("paper_name", as_index=False)["sessions"]
            .sum()
            .sort_values("sessions", ascending=False)
        )
        if pap.empty:
            st.caption("No past papers.")
        else:
            fig = px.pie(
                pap,
                names="paper_name",
                values="sessions",
                hole=0.4,
                title="Past papers (All)",
            )
            fig.update_layout(margin=dict(l=10, r=10, t=40, b=10), height=280)
            st.plotly_chart(fig, use_container_width=True)

    summary = feat.merge(head[["segment", "users", "activated", "active_in_window"]], on="segment")
    summary["segment"] = summary["segment"].map(SEG_LABEL)
    top_mm = (
        mm.sort_values("sessions", ascending=False)
        .groupby("segment", as_index=False)
        .first()[["segment", "section"]]
        .rename(columns={"section": "top_mm"})
    )
    top_mm["segment"] = top_mm["segment"].map(SEG_LABEL)
    summary = summary.merge(top_mm, on="segment", how="left")
    show = summary[
        [
            "segment",
            "users",
            "activated",
            "active_in_window",
            "qb_attempts",
            "drill_sessions",
            "top_mm",
            "paper_sessions",
            "cal_attempts",
            "bug_reports",
            "support_requests",
        ]
    ].rename(
        columns={
            "segment": "Segment",
            "users": "Users",
            "activated": "Activated",
            "active_in_window": "Active",
            "qb_attempts": "QB",
            "drill_sessions": "MM",
            "top_mm": "Top MM section",
            "paper_sessions": "Papers",
            "cal_attempts": "Calibration",
            "bug_reports": "Bugs",
            "support_requests": "Support",
        }
    )
    st.dataframe(show, use_container_width=True, hide_index=True)


def _pct(part: int, whole: int) -> str:
    if not whole:
        return "0%"
    return f"{round(100 * part / whole)}%"


def main() -> None:
    top = st.columns([3, 1, 1])
    with top[0]:
        st.title("Cohort usage")
    with top[1]:
        since = st.date_input("Since", value=DEFAULT_SINCE, max_value=date.today())
    with top[2]:
        if st.button("Refresh", use_container_width=True):
            load_bundle.clear()
            st.rerun()

    st.caption(
        "Live Supabase · Arkwright = arkwright-2026 · Elephant = elephant26 · "
        "Other = everyone else · General = all users · MM = drill_sessions.topic_id"
    )

    try:
        bundle = load_bundle(since.isoformat())
    except Exception as exc:  # noqa: BLE001
        st.error(f"Could not load data: {exc}")
        st.stop()

    tabs = st.tabs(["Arkwright", "Elephant", "Other", "General"])
    with tabs[0]:
        _segment_page("arkwright", **{k: bundle[k] for k in (
            "head", "feat", "seats", "prefs", "pract", "mm", "daily", "papers", "exam", "joins"
        )})
    with tabs[1]:
        _segment_page("elephant", **{k: bundle[k] for k in (
            "head", "feat", "seats", "prefs", "pract", "mm", "daily", "papers", "exam", "joins"
        )})
    with tabs[2]:
        _segment_page("other", **{k: bundle[k] for k in (
            "head", "feat", "seats", "prefs", "pract", "mm", "daily", "papers", "exam", "joins"
        )})
    with tabs[3]:
        _general_page(bundle)


if __name__ == "__main__":
    main()
