"""Live data for the cohort Streamlit dashboard.

Prefers the `cohort_usage_dashboard` RPC via the service role key
(works without a DB password). Falls back to direct Postgres if
`DATABASE_URL` / `SUPABASE_DB_PASSWORD` is set.
"""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import quote_plus, urlparse

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

TOPIC_LABELS = {
    "addition": "Addition",
    "subtraction": "Subtraction",
    "multiplication": "Multiplication",
    "division": "Division",
    "squaring": "Squaring",
    "trig-recall": "Trig Recall",
    "geometry-circle-theorems": "Circle Theorems",
    "algebra-quadratics": "Quadratics",
    "unit-circle": "Unit Circle",
    "triangles-trig": "Triangles",
    "algebra-equations": "Equations",
    "algebra-indices": "Indices",
    "algebra-polynomials": "Polynomials",
    "algebra-calculus": "Calculus",
    "arithmetic-percentages": "Percentages",
    "arithmetic-notation": "Notation",
    "fractions-group": "Fractions",
    "nt-divisibility": "Divisibility",
    "nt-primes-factors": "Primes & Factors",
}


def load_env() -> None:
    root = Path(__file__).resolve().parents[2]
    for name in (".env.local", ".env"):
        path = root / name
        if path.exists():
            load_dotenv(path, override=False)


def label_topics(df: pd.DataFrame, col: str = "topic_id") -> pd.DataFrame:
    out = df.copy()
    if out.empty:
        out["section"] = []
        return out
    out["section"] = out[col].map(lambda t: TOPIC_LABELS.get(str(t), str(t)))
    return out


def _records_df(payload: dict, key: str) -> pd.DataFrame:
    rows = payload.get(key) or []
    return pd.DataFrame(rows)


def fetch_bundle(since: str) -> dict[str, pd.DataFrame]:
    """One RPC round-trip; returns the same keys the Streamlit app expects."""
    load_env()
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local"
        )

    client = create_client(url, key)
    response = client.rpc(
        "cohort_usage_dashboard",
        {"p_since": since},
    ).execute()
    payload = response.data
    if not isinstance(payload, dict):
        raise RuntimeError(f"Unexpected RPC payload type: {type(payload)}")

    mm = label_topics(_records_df(payload, "mm"))
    daily = _records_df(payload, "daily")
    if not daily.empty and "day" in daily.columns:
        daily["day"] = pd.to_datetime(daily["day"])

    joins = _records_df(payload, "joins")
    if not joins.empty and "week" in joins.columns:
        joins["week"] = pd.to_datetime(joins["week"])

    return {
        "head": _records_df(payload, "head"),
        "feat": _records_df(payload, "feat"),
        "seats": _records_df(payload, "seats"),
        "prefs": _records_df(payload, "prefs"),
        "pract": _records_df(payload, "pract"),
        "mm": mm,
        "daily": daily,
        "papers": _records_df(payload, "papers"),
        "exam": _records_df(payload, "exam"),
        "joins": joins,
        "_meta": pd.DataFrame(
            [
                {
                    "since": payload.get("since"),
                    "generated_at": payload.get("generated_at"),
                }
            ]
        ),
    }


# ---------------------------------------------------------------------------
# Optional direct-Postgres helpers (if DB password is later filled in)
# ---------------------------------------------------------------------------

def db_dsn() -> str | None:
    load_env()
    explicit = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    if explicit:
        return explicit

    password = os.getenv("SUPABASE_DB_PASSWORD")
    if not password:
        return None

    project_url = (
        os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        or os.getenv("SUPABASE_URL")
        or ""
    )
    host = urlparse(project_url).hostname or ""
    if host.startswith("db."):
        db_host = host
    elif host.endswith(".supabase.co"):
        ref = host.split(".")[0]
        db_host = f"db.{ref}.supabase.co"
    else:
        return None

    return (
        f"postgresql://postgres:{quote_plus(password)}"
        f"@{db_host}:5432/postgres?sslmode=require"
    )
