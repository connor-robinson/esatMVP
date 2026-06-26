"""Local KaTeX validation via Node (uses project katex package)."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Tuple

PROJECT_ROOT = Path(__file__).resolve().parents[2]
VALIDATE_SCRIPT = PROJECT_ROOT / "scripts" / "validate_katex.js"


def validate_katex_fields(fields: Dict[str, str]) -> List[Dict[str, str]]:
    """Return list of {field, error} for fields that fail KaTeX render."""
    if not VALIDATE_SCRIPT.exists():
        return []

    payload = json.dumps(fields, ensure_ascii=False)
    try:
        result = subprocess.run(
            ["node", str(VALIDATE_SCRIPT)],
            input=payload,
            capture_output=True,
            text=True,
            cwd=str(PROJECT_ROOT),
            timeout=30,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return []

    if result.returncode != 0 and not result.stdout.strip():
        return [{"field": "_script", "error": result.stderr or "validate_katex failed"}]

    try:
        data = json.loads(result.stdout or "[]")
    except json.JSONDecodeError:
        return [{"field": "_script", "error": "invalid JSON from validate_katex"}]

    return data if isinstance(data, list) else []


def validate_question_content(
    stem: str,
    options: Dict[str, str],
) -> List[Dict[str, str]]:
    fields: Dict[str, str] = {"stem": stem or ""}
    for letter, text in (options or {}).items():
        fields[f"option_{letter}"] = text or ""
    return validate_katex_fields(fields)
