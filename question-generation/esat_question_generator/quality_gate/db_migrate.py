"""Apply quality-gate database migrations via Supabase CLI (linked project)."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent

MIGRATIONS: dict[str, Path] = {
    "move_to_math2": _REPO_ROOT
    / "supabase"
    / "migrations"
    / "20260524210000_quality_gate_action_move_to_math2.sql",
}


def _npx_cmd(*args: str) -> list[str]:
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if not npx:
        raise SystemExit("npx not found on PATH — install Node.js or run the SQL in Supabase dashboard.")
    return [npx, *args]


def _run_supabase_query(args: list[str], *, capture: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        _npx_cmd("supabase", "db", "query", *args),
        cwd=str(_REPO_ROOT),
        check=False,
        capture_output=capture,
        text=capture,
    )


def apply_migration(name: str, *, verify: bool = True) -> None:
    key = (name or "").strip().lower().replace("-", "_")
    if key not in MIGRATIONS:
        known = ", ".join(sorted(MIGRATIONS))
        raise SystemExit(f"Unknown migration {name!r}. Known: {known}")

    sql_path = MIGRATIONS[key]
    if not sql_path.is_file():
        raise SystemExit(f"Migration file not found: {sql_path}")

    print(f"Applying {key} via Supabase CLI (linked project)...")
    print(f"  SQL: {sql_path}")
    cmd = _npx_cmd("supabase", "db", "query", "--linked", "--yes", "-f", str(sql_path))
    proc = subprocess.run(cmd, cwd=str(_REPO_ROOT), check=False)
    if proc.returncode != 0:
        raise SystemExit(proc.returncode)

    print("Migration applied.")
    if verify and key == "move_to_math2":
        verify_move_to_math2_constraint()


def verify_move_to_math2_constraint() -> None:
    sql = (
        "SELECT conname, pg_get_constraintdef(oid) AS def "
        "FROM pg_constraint "
        "WHERE conrelid = 'ai_generated_questions'::regclass "
        "AND conname LIKE '%quality_gate_action%';"
    )
    proc = _run_supabase_query(
        ["--linked", "--yes", sql],
        capture=True,
    )
    if proc.returncode != 0:
        print("Warning: could not verify constraint (migration may still have succeeded).")
        if proc.stderr:
            print(proc.stderr.strip())
        return
    out = proc.stdout or ""
    if "move_to_math2" in out:
        print("Verified: quality_gate_action check constraint includes move_to_math2.")
    else:
        print("Warning: verification output did not mention move_to_math2:")
        print(out.strip())


if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "move_to_math2"
    apply_migration(name)
