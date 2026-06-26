"""Local Flask UI for past paper conversion review (standalone, not the main Next.js app)."""

from __future__ import annotations

import json
import subprocess
import sys
import webbrowser
from pathlib import Path
from threading import Timer

ROOT = Path(__file__).resolve().parents[2]
UI_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "question-generation"))
sys.path.insert(0, str(UI_DIR))

from export_for_viewer import export_rows  # noqa: E402
from past_paper_converter.db import make_client  # noqa: E402

STATUS_FILE = ROOT / "question-generation" / "past_paper_converter" / ".conversion_status.json"
QGEN_DIR = ROOT / "question-generation"


def write_status(payload: dict) -> None:
    STATUS_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")

try:
    from flask import Flask, jsonify, request, send_from_directory
except ImportError as exc:
    raise SystemExit(
        "Flask required for the conversion UI. Install: pip install flask"
    ) from exc

app = Flask(__name__)
_run_lock = False


def read_status() -> dict:
    if STATUS_FILE.exists():
        try:
            return json.loads(STATUS_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {
        "status": "idle",
        "total": 0,
        "completed": 0,
        "successful": 0,
        "failed": 0,
    }


@app.get("/")
def index():
    return send_from_directory(UI_DIR, "ui.html")


@app.get("/api/papers")
def api_papers():
    client = make_client()
    resp = (
        client.table("papers")
        .select("id, exam_name, exam_year, paper_name")
        .order("exam_name")
        .order("exam_year", desc=True)
        .execute()
    )
    papers = [
        {
            "id": r["id"],
            "label": f"{r['exam_name']} {r['exam_year']} — {r['paper_name']}",
        }
        for r in (resp.data or [])
    ]
    return jsonify({"papers": papers})


@app.get("/api/conversions")
def api_conversions():
    paper_id = request.args.get("paperId", type=int)
    limit = min(request.args.get("limit", 24, type=int), 100)
    status = request.args.get("status", "all")
    shuffle = request.args.get("shuffle") == "1"

    count = export_rows(
        paper_id=paper_id,
        limit=limit,
        status=status if status in ("all", "auto_approved", "failed") else "all",
        shuffle=shuffle,
    )
    data = json.loads((UI_DIR / "viewer_data.json").read_text(encoding="utf-8"))
    return jsonify(data)


@app.get("/api/status")
def api_status():
    return jsonify(read_status())


@app.get("/api/summary")
def api_summary():
    client = make_client()
    total_q = client.table("questions").select("id", count="exact").execute()
    conv = client.table("question_conversions").select("status, conversion_report").execute()
    rows = conv.data or []
    by_status: dict[str, int] = {}
    for r in rows:
        s = r.get("status") or "unknown"
        by_status[s] = by_status.get(s, 0) + 1
    return jsonify({
        "totalQuestions": total_q.count or 0,
        "conversionRows": len(rows),
        "byStatus": by_status,
    })


@app.post("/api/reset")
def api_reset():
    """Clear a stuck 'running' status so a new batch can start."""
    write_status({
        "status": "idle",
        "total": 0,
        "completed": 0,
        "successful": 0,
        "failed": 0,
        "message": "Reset — ready for new run",
    })
    global _run_lock
    _run_lock = False
    return jsonify({"status": "idle"})


@app.post("/api/run")
def api_run():
    global _run_lock
    body = request.get_json(silent=True) or {}
    paper_id = body.get("paperId")
    limit = body.get("limit")
    dry_run = bool(body.get("dryRun"))

    if not paper_id:
        return jsonify({"error": "paperId required"}), 400

    current = read_status()
    if current.get("status") == "running" or _run_lock:
        return jsonify({"error": "Conversion already running"}), 400

    args = [
        sys.executable,
        "-m",
        "past_paper_converter.run_with_progress",
        "--paper-id",
        str(int(paper_id)),
    ]
    if limit:
        args.extend(["--limit", str(int(limit))])
    if dry_run:
        args.append("--dry-run")

    _run_lock = True

    def _spawn():
        global _run_lock
        try:
            proc = subprocess.run(args, cwd=QGEN_DIR, check=False)
            st = read_status()
            if st.get("status") == "running":
                st["status"] = "error" if proc.returncode else "completed"
                if proc.returncode:
                    st["message"] = f"Process exited with code {proc.returncode}"
                write_status(st)
        finally:
            _run_lock = False

    import threading
    threading.Thread(target=_spawn, daemon=True).start()
    return jsonify({"status": "running"})


def open_browser():
    webbrowser.open("http://127.0.0.1:8777/")


def main():
    print("Past Paper Conversion UI")
    print("Open http://127.0.0.1:8777/ in your browser")
    print("Press Ctrl+C to stop\n")
    Timer(1.0, open_browser).start()
    app.run(host="127.0.0.1", port=8777, debug=False, use_reloader=False)


if __name__ == "__main__":
    main()
