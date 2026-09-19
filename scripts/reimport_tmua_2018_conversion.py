"""Re-import the TMUA 2018 raw->scaled conversion_rows (clean replace).

Why a clean replace:
    The stored Paper 1 / Paper 2 curves were swapped / corrupted relative to
    the official October 2018 grade conversion. Stored Paper 1 matched the
    official Paper 2 curve (raw 13 -> 7.7 instead of 6.4), and stored Paper 2
    looked like Overall shifted by +20. Overall was already correct.

Source of truth:
    Official TMUA October 2018 grade conversion (Paper 1, Paper 2, Overall),
    republished at:
    https://nextstepmaths.com/downloads/tmua-answer-keys/tmua-2018.pdf

Layout:
    Replaces every conversion_row on each TMUA 2018 conversion_tables entry
    with the three parts:
        Paper 1  : raw 0-20
        Paper 2  : raw 0-20
        Overall  : raw 0-40

Trigger handling:
    Same as reimport_tmua_2023_conversion.py: direct Postgres +
    session_replication_role = replica for one transaction.

Usage:
    python scripts/reimport_tmua_2018_conversion.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg2
import psycopg2.extras

EXAM = "TMUA"
YEAR = 2018

# Official October 2018 grade conversion.
PAPER_1: dict[int, float] = {
    0: 1.0, 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.7, 6: 2.4, 7: 3.0, 8: 3.6,
    9: 4.1, 10: 4.7, 11: 5.3, 12: 5.8, 13: 6.4, 14: 7.0, 15: 7.7, 16: 8.5,
    17: 9.0, 18: 9.0, 19: 9.0, 20: 9.0,
}
PAPER_2: dict[int, float] = {
    0: 1.0, 1: 1.0, 2: 1.0, 3: 1.2, 4: 2.2, 5: 3.0, 6: 3.6, 7: 4.3, 8: 4.9,
    9: 5.5, 10: 6.0, 11: 6.5, 12: 7.1, 13: 7.7, 14: 8.3, 15: 9.0, 16: 9.0,
    17: 9.0, 18: 9.0, 19: 9.0, 20: 9.0,
}
OVERALL: dict[int, float] = {
    0: 1.0, 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0, 7: 1.0, 8: 1.5,
    9: 1.9, 10: 2.3, 11: 2.6, 12: 3.0, 13: 3.3, 14: 3.6, 15: 3.9, 16: 4.2,
    17: 4.5, 18: 4.8, 19: 5.1, 20: 5.4, 21: 5.6, 22: 5.9, 23: 6.2, 24: 6.5,
    25: 6.8, 26: 7.1, 27: 7.4, 28: 7.7, 29: 8.0, 30: 8.4, 31: 8.8, 32: 9.0,
    33: 9.0, 34: 9.0, 35: 9.0, 36: 9.0, 37: 9.0, 38: 9.0, 39: 9.0, 40: 9.0,
}

PARTS: dict[str, dict[int, float]] = {
    "Paper 1": PAPER_1,
    "Paper 2": PAPER_2,
    "Overall": OVERALL,
}

SOURCE_URL = "https://nextstepmaths.com/downloads/tmua-answer-keys/tmua-2018.pdf"


def load_env() -> dict[str, str]:
    env_path = Path(__file__).resolve().parents[1] / ".env.local"
    values: dict[str, str] = {}
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip()
    return values


def connection_string(values: dict[str, str]) -> str:
    url = os.environ.get("SUPABASE_DB_URL") or values.get("SUPABASE_DB_URL")
    if url:
        return url

    supabase_url = os.environ.get("SUPABASE_URL") or values.get("SUPABASE_URL")
    password = (
        os.environ.get("SUPABASE_DB_PASSWORD") or values.get("SUPABASE_DB_PASSWORD")
    )
    if not supabase_url or not password:
        raise SystemExit(
            "Set SUPABASE_DB_URL, or SUPABASE_DB_PASSWORD + SUPABASE_URL, "
            "to reach Postgres directly (PostgREST can't bypass the protective triggers)."
        )
    ref = supabase_url.split("://", 1)[1].split(".", 1)[0]
    return f"postgresql://postgres:{password}@db.{ref}.supabase.co:5432/postgres"


def main() -> None:
    values = load_env()
    dsn = connection_string(values)

    conn = psycopg2.connect(dsn)
    conn.autocommit = False
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("set local session_replication_role = 'replica';")

            cur.execute(
                """
                select ct.id as table_id, p.paper_name
                from papers p
                join conversion_tables ct on ct.paper_id = p.id
                where p.exam_name = %s and p.exam_year = %s
                order by p.paper_name;
                """,
                (EXAM, YEAR),
            )
            tables = cur.fetchall()
            if not tables:
                raise SystemExit("No TMUA 2018 conversion_tables found")
            table_ids = [t["table_id"] for t in tables]
            print(f"target conversion_tables: {[(t['table_id'], t['paper_name']) for t in tables]}")

            cur.execute(
                "delete from conversion_rows where table_id = any(%s);",
                (table_ids,),
            )
            print(f"deleted {cur.rowcount} old rows")

            payload = [
                (table_id, part_name, raw, scaled)
                for table_id in table_ids
                for part_name, mapping in PARTS.items()
                for raw, scaled in sorted(mapping.items())
            ]
            psycopg2.extras.execute_values(
                cur,
                "insert into conversion_rows (table_id, part_name, raw_score, scaled_score) values %s",
                payload,
            )
            print(f"inserted {len(payload)} rows across {len(table_ids)} tables")

            # Spot-check the reported bug: Paper 1 raw 13 must be 6.4.
            cur.execute(
                """
                select part_name, raw_score, scaled_score
                from conversion_rows
                where table_id = any(%s)
                  and part_name in ('Paper 1', 'Paper 2')
                  and raw_score = 13
                order by part_name;
                """,
                (table_ids,),
            )
            for row in cur.fetchall():
                print(
                    f"verify {row['part_name']} raw {row['raw_score']} -> {row['scaled_score']}"
                )

            cur.execute(
                """
                update conversion_tables
                set confidence = 'high',
                    format_type = 'standard_mcq',
                    reliability_note = null,
                    source_pdf_url = coalesce(source_pdf_url, %s)
                where id = any(%s);
                """,
                (SOURCE_URL, table_ids),
            )
            print(f"reset confidence=high on {cur.rowcount} conversion_tables")

        conn.commit()
        print("committed.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
