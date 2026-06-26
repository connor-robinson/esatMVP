"""Import ENGAA 2023 Section 2 raw→scaled conversion table into Supabase.

Intentionally does NOT import ENGAA S2 2016–2018: those papers were written /
long-answer format, not the later MCQ S2, so official scaled-score tables do not apply.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import requests

# Official FOI-sourced values (exams.ninja collation of Cambridge 2023 grading tables)
SECTION_2_ROWS: list[tuple[int, float]] = [
    (0, 1.0),
    (1, 1.0),
    (2, 1.0),
    (3, 1.3),
    (4, 2.0),
    (5, 2.6),
    (6, 3.1),
    (7, 3.6),
    (8, 4.1),
    (9, 4.5),
    (10, 4.9),
    (11, 5.3),
    (12, 5.8),
    (13, 6.2),
    (14, 6.7),
    (15, 7.2),
    (16, 7.7),
    (17, 8.4),
    (18, 9.0),
    (19, 9.0),
    (20, 9.0),
]

SOURCE_PDF_URL = (
    "https://cdn.prod.website-files.com/647b5b55f3f42fc50b2f6e4e/"
    "6665c12d07c8777c0b7b224d_ENGAA%202023%20Score%20Conversion%20Table.pdf"
)
LOCAL_PDF = Path(__file__).resolve().parent / "tmp_engaa_2023_conv.pdf"
STORAGE_PATH = "engaa-2023-section-2-official/conversion-table.pdf"


def load_env() -> tuple[str, str]:
    env_path = Path(__file__).resolve().parents[1] / ".env.local"
    values: dict[str, str] = {}
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip()

    url = os.environ.get("SUPABASE_URL") or values.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or values.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return url, key


def main() -> None:
    base_url, service_key = load_env()
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    paper_resp = requests.get(
        f"{base_url}/rest/v1/papers",
        headers=headers,
        params={
            "select": "id,has_conversion",
            "exam_name": "eq.ENGAA",
            "exam_year": "eq.2023",
            "paper_name": "eq.Section 2",
            "exam_type": "eq.Official",
        },
        timeout=30,
    )
    paper_resp.raise_for_status()
    papers = paper_resp.json()
    if not papers:
        raise SystemExit("ENGAA 2023 Section 2 Official paper not found")
    paper = papers[0]
    paper_id = paper["id"]
    print(f"paper_id={paper_id}")

    existing = requests.get(
        f"{base_url}/rest/v1/conversion_tables",
        headers=headers,
        params={"select": "id", "paper_id": f"eq.{paper_id}"},
        timeout=30,
    )
    existing.raise_for_status()
    if existing.json():
        print("Conversion table already exists; skipping insert")
        table_id = existing.json()[0]["id"]
    else:
        table_resp = requests.post(
            f"{base_url}/rest/v1/conversion_tables",
            headers=headers,
            json={
                "paper_id": paper_id,
                "display_name": "ENGAA Section 2 Conversion",
                "source_pdf_url": SOURCE_PDF_URL,
                "notes": "2023 entry cycle; Section 2 only (MCQ format)",
            },
            timeout=30,
        )
        table_resp.raise_for_status()
        table_id = table_resp.json()[0]["id"]
        print(f"created conversion_tables.id={table_id}")

    row_resp = requests.get(
        f"{base_url}/rest/v1/conversion_rows",
        headers=headers,
        params={"select": "id", "table_id": f"eq.{table_id}", "limit": 1},
        timeout=30,
    )
    row_resp.raise_for_status()
    if row_resp.json():
        print("Conversion rows already exist; skipping row insert")
    else:
        payload = [
            {
                "table_id": table_id,
                "part_name": "Section 2",
                "raw_score": raw,
                "scaled_score": scaled,
            }
            for raw, scaled in SECTION_2_ROWS
        ]
        rows_resp = requests.post(
            f"{base_url}/rest/v1/conversion_rows",
            headers=headers,
            json=payload,
            timeout=30,
        )
        rows_resp.raise_for_status()
        print(f"inserted {len(payload)} conversion rows")

    if LOCAL_PDF.exists():
        upload_headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/pdf",
            "x-upsert": "true",
        }
        upload_resp = requests.post(
            f"{base_url}/storage/v1/object/question-images/{STORAGE_PATH}",
            headers=upload_headers,
            data=LOCAL_PDF.read_bytes(),
            timeout=60,
        )
        if upload_resp.ok:
            storage_url = (
                f"{base_url}/storage/v1/object/public/question-images/{STORAGE_PATH}"
            )
            print(f"uploaded PDF to {storage_url} (conversion_tables.source_pdf_url left as insert-time URL)")
        else:
            print(f"PDF upload skipped: {upload_resp.status_code} {upload_resp.text[:200]}")

    patch_resp = requests.patch(
        f"{base_url}/rest/v1/papers",
        headers=headers,
        params={"id": f"eq.{paper_id}"},
        json={"has_conversion": True},
        timeout=30,
    )
    patch_resp.raise_for_status()
    print("set papers.has_conversion=true")


if __name__ == "__main__":
    try:
        main()
    except requests.HTTPError as exc:
        print(exc.response.status_code, exc.response.text, file=sys.stderr)
        raise
