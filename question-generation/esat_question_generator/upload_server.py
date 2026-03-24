#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lightweight HTTP server for iPad: upload a screen recording and link it by 4-character code.

Run on a host your iPad can reach (same Wi‑Fi), with the same Supabase credentials as the review app:

  python upload_server.py

Env:
  UPLOAD_SERVER_HOST (default 0.0.0.0)
  UPLOAD_SERVER_PORT (default 8765; match this in the review app’s iPad URL — same default is used there)
  Optional UPLOADER_HOST on the PC running the review app if the auto-detected LAN IP is wrong
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — same as question review

Create Storage bucket "question-media" (private) and run migrations/add_question_media.sql.
"""

from __future__ import annotations

import mimetypes
import os
import sys
import time
from pathlib import Path

from flask import Flask, redirect, render_template_string, request, url_for

# Package root: esat_question_generator/
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _load_env() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    for candidate in (
        ROOT.parent.parent / ".env.local",
        ROOT / ".env.local",
    ):
        if candidate.exists():
            load_dotenv(candidate)


_load_env()

from question_review.database import Database  # noqa: E402

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024

_db: Database | None = None


def get_db() -> Database:
    global _db
    if _db is None:
        _db = Database()
    return _db


UPLOAD_PAGE = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <title>Upload screen recording</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      margin: 0; padding: 1rem 1.25rem 2rem;
      background: #0f172a; color: #e2e8f0; min-height: 100vh;
    }
    h1 { font-size: 1.35rem; margin: 0 0 0.35rem; font-weight: 700; }
    .hint { color: #94a3b8; font-size: 0.95rem; line-height: 1.45; margin-bottom: 1rem; }
    label { display: block; margin-top: 1.1rem; font-weight: 600; font-size: 0.9rem; color: #cbd5e1; }
    input[type="text"] {
      width: 100%; font-size: clamp(2rem, 8vw, 3rem); letter-spacing: 0.25em; text-align: center;
      padding: 0.85rem 0.5rem; border-radius: 14px; border: 3px solid #38bdf8; background: #1e293b;
      color: #fff; font-weight: 800; text-transform: uppercase;
    }
    input[type="file"] { margin-top: 0.6rem; font-size: 1rem; width: 100%; color: #cbd5e1; }
    button {
      margin-top: 1.75rem; width: 100%; font-size: 1.2rem; padding: 1rem 1rem; border: none; border-radius: 14px;
      background: linear-gradient(180deg, #38bdf8, #0ea5e9); color: #0f172a; font-weight: 800; cursor: pointer;
    }
    button:active { transform: scale(0.99); }
    .msg { margin-top: 1.1rem; padding: 1rem 1.1rem; border-radius: 12px; line-height: 1.4; font-size: 0.95rem; }
    .ok { background: #14532d; color: #dcfce7; border: 1px solid #22c55e; }
    .err { background: #7f1d1d; color: #fee2e2; border: 1px solid #f87171; }
  </style>
</head>
<body>
  <h1>Upload walkthrough video</h1>
  <p class="hint">Record <strong>screen + microphone</strong> in one file (e.g. iPad Control Centre → Screen Recording with mic on). Enter the code from your laptop (2 letters + 2 digits), then pick that video.</p>
  {% if message %}
  <div class="msg {{ mtype }}">{{ message }}</div>
  {% endif %}
  <form method="post" enctype="multipart/form-data" action="{{ url_for('uploader') }}">
    <label for="code">Code</label>
    <input type="text" name="code" id="code" maxlength="4" autocomplete="off" placeholder="AB12" value="{{ code_e }}" />
    <label for="video">Video</label>
    <input type="file" name="video" id="video" accept="video/*,.mov,.mp4,.m4v,.webm" />
    <button type="submit">Upload</button>
  </form>
</body>
</html>
"""


@app.route("/")
def index():
    return redirect(url_for("uploader"))


@app.route("/uploader", methods=["GET", "POST"])
def uploader():
    message = ""
    mtype = ""
    code_e = request.form.get("code", "") if request.method == "POST" else request.args.get("code", "")

    if request.method == "GET":
        return render_template_string(
            UPLOAD_PAGE, message="", mtype="", code_e=code_e or ""
        )

    db = get_db()
    code_raw = request.form.get("code", "") or ""
    code = Database.normalize_media_upload_code(code_raw)
    if not code:
        return render_template_string(
            UPLOAD_PAGE,
            message="Invalid code. Use exactly 2 letters and 2 digits (example: AB12).",
            mtype="err",
            code_e=code_raw.strip().upper()[:4],
        )

    upload = request.files.get("video")
    if not upload or not upload.filename:
        return render_template_string(
            UPLOAD_PAGE,
            message="Please choose a video file.",
            mtype="err",
            code_e=code,
        )

    qid = db.get_question_id_by_media_code(code)
    if not qid:
        return render_template_string(
            UPLOAD_PAGE,
            message="No question matches this code. Check the code on your laptop and try again.",
            mtype="err",
            code_e=code,
        )

    data = upload.read()
    if not data:
        return render_template_string(
            UPLOAD_PAGE,
            message="Empty file.",
            mtype="err",
            code_e=code,
        )

    suffix = Path(upload.filename).suffix.lower()
    if suffix not in (".mp4", ".mov", ".webm", ".m4v", ".mkv"):
        suffix = ".mp4"
    content_type = mimetypes.guess_type(upload.filename)[0] or "video/mp4"
    storage_path = f"{qid}/screen_{int(time.time())}{suffix}"

    try:
        db.upload_bytes_to_question_media(storage_path, data, content_type)
        db.update_question_media_fields(qid, screen_video_storage_path=storage_path)
    except Exception as e:
        return render_template_string(
            UPLOAD_PAGE,
            message=f"Upload failed: {e!s}. Ensure Storage bucket 'question-media' exists and SQL migration was applied.",
            mtype="err",
            code_e=code,
        )

    return render_template_string(
        UPLOAD_PAGE,
        message="Uploaded. On your laptop, click Refresh on the question to see the video link.",
        mtype="ok",
        code_e="",
    )


def main():
    host = os.environ.get("UPLOAD_SERVER_HOST", "0.0.0.0")
    port = int(os.environ.get("UPLOAD_SERVER_PORT", "8765"))
    print(f"Upload server: http://{host}:{port}/uploader (use your PC LAN IP on iPad)")
    app.run(host=host, port=port, debug=False, threaded=True)


if __name__ == "__main__":
    main()
