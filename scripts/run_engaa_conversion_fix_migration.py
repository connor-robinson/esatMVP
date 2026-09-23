"""Run ENGAA 2019-2020 conversion fix migration via direct Postgres."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = (
    ROOT / "supabase" / "migrations" / "20260822100000_fix_engaa_2019_2020_general_mislabel.sql"
)


def load_env() -> dict[str, str]:
    values: dict[str, str] = {}
    env_path = ROOT / ".env.local"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    for key in ("SUPABASE_DB_URL", "DATABASE_URL", "SUPABASE_URL", "SUPABASE_DB_PASSWORD"):
        if os.environ.get(key):
            values[key] = os.environ[key]
    return values


def connection_string(values: dict[str, str]) -> str:
    if values.get("SUPABASE_DB_URL"):
        return values["SUPABASE_DB_URL"]
    if values.get("DATABASE_URL"):
        return values["DATABASE_URL"]
    supabase_url = values.get("SUPABASE_URL")
    password = values.get("SUPABASE_DB_PASSWORD")
    if not supabase_url or not password:
        raise SystemExit(
            "Set SUPABASE_DB_URL or SUPABASE_DB_PASSWORD + SUPABASE_URL in .env.local"
        )
    ref = supabase_url.split("://", 1)[1].split(".", 1)[0]
    return f"postgresql://postgres:{password}@db.{ref}.supabase.co:5432/postgres"


def main() -> None:
    values = load_env()
    dsn = connection_string(values)
    sql = MIGRATION.read_text(encoding="utf-8")

    conn = psycopg2.connect(dsn)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
        print(f"Migration applied successfully from {MIGRATION.name}")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
