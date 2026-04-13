"""
Single JSONL session log for pipeline, UI, and DB sync — keep the console quiet.

- Set ``ESAT_PIPELINE_LOG`` to override the file path (absolute or relative).
- Default: ``<base_dir>/pipeline_session.jsonl`` (first ``init_pipeline_log`` wins).
- Set ``ESAT_CONSOLE_VERBOSE=1`` to mirror most events to stdout as well.

Review everything in one place::

    type pipeline_session.jsonl
    # or jq/JSON viewer
"""

from __future__ import annotations

import datetime
import json
import os
import sys
import threading
from typing import Any, Dict, List, Optional

_lock = threading.Lock()
_log_path: Optional[str] = None


def init_pipeline_log(base_dir: str) -> str:
    """Set log file path from ``base_dir`` (idempotent — keeps first path)."""
    global _log_path
    if _log_path is not None:
        return _log_path
    raw = (os.environ.get("ESAT_PIPELINE_LOG") or "").strip()
    if raw:
        _log_path = os.path.abspath(raw)
    else:
        _log_path = os.path.join(os.path.abspath(base_dir), "pipeline_session.jsonl")
    return _log_path


def get_pipeline_log_path() -> Optional[str]:
    return _log_path


def _verbose_stdout() -> bool:
    return os.environ.get("ESAT_CONSOLE_VERBOSE", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def _truncate_for_console(obj: Any, *, max_str: int = 2400, max_list: int = 40, depth: int = 0) -> Any:
    """Limit size of nested structures printed with ``echo_detail``."""
    if depth > 14:
        return "…"
    if isinstance(obj, str):
        if len(obj) <= max_str:
            return obj
        return obj[:max_str] + f"… ({len(obj)} chars total)"
    if isinstance(obj, dict):
        return {str(k): _truncate_for_console(v, max_str=max_str, max_list=max_list, depth=depth + 1) for k, v in obj.items()}
    if isinstance(obj, list):
        tail: List[Any] = [
            _truncate_for_console(x, max_str=max_str, max_list=max_list, depth=depth + 1)
            for x in obj[:max_list]
        ]
        if len(obj) > max_list:
            tail.append(f"… ({len(obj) - max_list} more items)")
        return tail
    if isinstance(obj, (int, float, bool)) or obj is None:
        return obj
    return str(obj)[:max_str]


def plog(
    source: str,
    message: str,
    *,
    detail: Optional[Dict[str, Any]] = None,
    level: str = "info",
    echo: bool = False,
    echo_detail: bool = False,
    spacer: bool = False,
) -> None:
    """
    Append one JSON object to the session log.

    ``echo``: print a single short line to stdout (use for major milestones only).
    ``echo_detail``: when echoing, also print a truncated pretty-printed ``detail`` block.
    ``spacer``: when echoing, print a blank line first for readability.
    """
    global _log_path
    if _log_path is None:
        init_pipeline_log(os.path.dirname(os.path.abspath(__file__)))

    rec: Dict[str, Any] = {
        "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "level": level,
        "source": source,
        "message": message,
    }
    if detail:
        rec["detail"] = detail

    line = json.dumps(rec, ensure_ascii=False, default=str)
    try:
        with _lock:
            parent = os.path.dirname(_log_path)
            if parent:
                os.makedirs(parent, exist_ok=True)
            with open(_log_path, "a", encoding="utf-8") as f:
                f.write(line + "\n")
    except OSError:
        pass

    to_console = echo or _verbose_stdout() or level in ("error", "critical")
    if not to_console:
        return
    if level == "debug" and not _verbose_stdout():
        return

    try:
        if spacer:
            print("", flush=True)
        tag = {"error": "ERR", "warning": "WRN", "info": "   ", "debug": "DBG"}.get(
            level, "   "
        )
        extra = ""
        if detail and _verbose_stdout():
            # Short preview only on verbose console
            keys = list(detail.keys())[:5]
            extra = f"  ({', '.join(keys)}{'…' if len(detail) > 5 else ''})"
        print(f"{tag} [{source}] {message}{extra}", flush=True)
        if echo_detail and detail:
            try:
                safe = _truncate_for_console(detail)
                print(json.dumps(safe, ensure_ascii=False, indent=2, default=str), flush=True)
            except (TypeError, ValueError):
                print(str(detail)[:8000], flush=True)
    except OSError:
        try:
            sys.stderr.write(f"{source}: {message}\n")
        except OSError:
            pass


def console_banner(lines: list) -> None:
    """Spaced multi-line banner (console only; also logged as one event)."""
    text = "\n".join(lines)
    try:
        print("\n" + "=" * 52, flush=True)
        for ln in lines:
            print(f"  {ln}", flush=True)
        print("=" * 52 + "\n", flush=True)
    except OSError:
        pass
    plog("ui", "console_banner", detail={"lines": lines}, echo=False)
