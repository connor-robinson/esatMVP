"""Per-question local run folder under ``generated/physics/<bucket>/<qid>/``.

We keep this isolated from the legacy ``runs/<timestamp>/`` tree so the V4
trial does not collide with existing backups. The legacy backup_manager and
db_sync paths still run from the orchestrator when the question is accepted.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import os
import re
import uuid
from pathlib import Path
from typing import Any, Dict, Optional


_BAD_FS_CHARS = re.compile(r"[^A-Za-z0-9._-]+")


def _safe_segment(value: str, fallback: str = "x") -> str:
    s = _BAD_FS_CHARS.sub("_", str(value or "").strip())
    return s or fallback


def _now_stamp() -> str:
    return datetime.datetime.now().strftime("%Y%m%d_%H%M%S")


class RunStore:
    """A lightweight per-question folder.

    Layout::

        generated/physics/<bucket>/<qid>/
            stage_jsons here...
            manifest.json
            assets/
    """

    def __init__(self, root: Path, qid: str):
        self.root = root
        self.qid = qid
        self.assets_dir = root / "assets"
        self.root.mkdir(parents=True, exist_ok=True)
        self.assets_dir.mkdir(parents=True, exist_ok=True)

    # ---- writers ----
    def write_json(self, name: str, payload: Any) -> Path:
        safe = _safe_segment(name) + (".json" if not name.endswith(".json") else "")
        p = self.root / safe
        with open(p, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2, default=str)
        return p

    def write_text(self, name: str, text: str) -> Path:
        p = self.root / _safe_segment(name)
        with open(p, "w", encoding="utf-8") as f:
            f.write(text or "")
        return p

    def write_asset_bytes(self, name: str, data: bytes) -> Path:
        p = self.assets_dir / _safe_segment(name)
        with open(p, "wb") as f:
            f.write(data)
        return p

    def write_asset_text(self, name: str, text: str) -> Path:
        p = self.assets_dir / _safe_segment(name)
        with open(p, "w", encoding="utf-8") as f:
            f.write(text or "")
        return p

    @staticmethod
    def checksum(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()[:16]


def _bucket(status: str) -> str:
    return {
        "accepted": "accepted",
        "rejected": "rejected",
    }.get(status, "pending")


def create_run_store(
    base_dir: str,
    *,
    subject: str = "physics",
    qid: Optional[str] = None,
    status: str = "pending",
) -> RunStore:
    qid = qid or f"q_{_now_stamp()}_{uuid.uuid4().hex[:6]}"
    root = (
        Path(base_dir)
        / "generated"
        / _safe_segment(subject, "physics")
        / _bucket(status)
        / _safe_segment(qid, "q_unknown")
    )
    return RunStore(root=root, qid=qid)
