#!/usr/bin/env python3
"""Apply past-paper text conversion migration via direct Postgres (bypasses Supabase CLI pooler)."""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MIGRATION = PROJECT_ROOT / "supabase" / "migrations" / "20260627100000_past_paper_text_conversion.sql"

load_dotenv(PROJECT_ROOT / ".env.local", override=True)

try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    print("Installing psycopg2-binary...")
    os.system(f"{sys.executable} -m pip install psycopg2-binary -q")
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT


def project_ref() -> str:
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or ""
    m = re.search(r"https://([^.]+)\.supabase\.co", url)
    if not m:
        raise SystemExit("Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in .env.local")
    return m.group(1)


def connection_urls(ref: str, password: str) -> list[str]:
    urls = []
    if os.getenv("DATABASE_URL"):
        urls.append(os.getenv("DATABASE_URL", ""))
    if os.getenv("SUPABASE_DB_URL"):
        urls.append(os.getenv("SUPABASE_DB_URL", ""))
    # Direct connection (bypasses CLI login-role pooler handshake)
    urls.append(
        f"postgresql://postgres:{password}@db.{ref}.supabase.co:5432/postgres?sslmode=require"
    )
    # Session pooler (eu-west-2 for this project)
    urls.append(
        f"postgresql://postgres.{ref}:{password}@aws-1-eu-west-2.pooler.supabase.com:5432/postgres?sslmode=require"
    )
    return [u for u in urls if u]


def connect():
    password = os.getenv("SUPABASE_DB_PASSWORD") or os.getenv("DATABASE_PASSWORD")
    if not password:
        raise SystemExit(
            "Missing SUPABASE_DB_PASSWORD in .env.local\n"
            "Get it from Supabase Dashboard → Settings → Database → Database password\n"
            "Then run: python scripts/apply_past_paper_migration.py"
        )

    ref = project_ref()
    last_err = None
    for url in connection_urls(ref, password):
        try:
            conn = psycopg2.connect(url)
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            print(f"Connected via {url.split('@')[-1]}")
            return conn
        except Exception as exc:
            last_err = exc
            print(f"Connection failed ({url.split('@')[-1]}): {exc}")
    raise SystemExit(f"All connection attempts failed. Last error: {last_err}")


def verify(cur) -> None:
    cur.execute(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'question_conversions')"
    )
    if not cur.fetchone()[0]:
        raise SystemExit("Verification failed: question_conversions table missing")

    cur.execute(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'questions' AND column_name IN ('question_stem', 'options', 'content_format')"
    )
    cols = {r[0] for r in cur.fetchall()}
    expected = {"question_stem", "options", "content_format"}
    if not expected.issubset(cols):
        raise SystemExit(f"Verification failed: questions columns missing {expected - cols}")

    print("Verified: question_conversions table + questions text columns exist.")


def main() -> None:
    if not MIGRATION.is_file():
        raise SystemExit(f"Migration not found: {MIGRATION}")

    sql = MIGRATION.read_text(encoding="utf-8")
    print(f"Applying {MIGRATION.name} ...")
    conn = connect()
    cur = conn.cursor()
    try:
        cur.execute(sql)
        verify(cur)
        print("Migration applied successfully.")
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
