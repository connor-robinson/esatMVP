"""Local Flask server for the past-paper conversion studio.

Run from the repo root:  python -m scripts.past_paper_studio.server
Or double-click:         past_paper_studio.bat
"""

from __future__ import annotations

import argparse
import sys
import traceback
import webbrowser
from pathlib import Path
from threading import Timer

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT / "question-generation") not in sys.path:
    sys.path.insert(0, str(ROOT / "question-generation"))
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

try:
    from flask import Flask, Response, jsonify, request, send_from_directory
except ImportError as exc:  # pragma: no cover
    raise SystemExit("Flask is required: pip install flask") from exc

from scripts.past_paper_studio import imaging, store

STATIC_DIR = Path(__file__).resolve().parent / "static"
KATEX_DIR = ROOT / "node_modules" / "katex" / "dist"

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="/static")


def _error(exc: Exception, code: int = 500):
    if code >= 500:
        traceback.print_exc()
    return jsonify({"error": str(exc), "type": type(exc).__name__}), code


@app.after_request
def _no_store(response: Response) -> Response:
    # The source screenshot is immutable, and the crop editor re-requests it on
    # every open, so it keeps its own long cache lifetime.
    if request.path.startswith("/api/") and not request.path.endswith("/source.png"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/")
def page_index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.get("/paper")
def page_paper():
    return send_from_directory(STATIC_DIR, "paper.html")


@app.get("/review")
def page_review():
    return send_from_directory(STATIC_DIR, "review.html")


# Windows mimetypes often maps .woff2 to application/octet-stream, which can
# stop browsers from applying KaTeX fonts and leave math looking like raw text.
_KATEX_MIME = {
    ".css": "text/css",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
}


@app.get("/vendor/katex/<path:filename>")
def vendor_katex(filename: str):
    response = send_from_directory(KATEX_DIR, filename)
    suffix = Path(filename).suffix.lower()
    mime = _KATEX_MIME.get(suffix)
    if mime:
        response.headers["Content-Type"] = mime
    response.headers["Cache-Control"] = "public, max-age=86400"
    return response


def _wants_refresh() -> bool:
    return request.args.get("refresh") == "1"


@app.get("/api/overview")
def api_overview():
    try:
        return jsonify(store.load_overview(refresh=_wants_refresh()))
    except Exception as exc:
        return _error(exc)


@app.get("/api/paper/<int:paper_id>")
def api_paper(paper_id: int):
    try:
        return jsonify(store.load_paper(paper_id, refresh=_wants_refresh()))
    except LookupError as exc:
        return _error(exc, 404)
    except Exception as exc:
        return _error(exc)


@app.post("/api/paper/<int:paper_id>/human-reviewed")
def api_paper_human_reviewed(paper_id: int):
    payload = request.get_json(silent=True) or {}
    reviewed = payload.get("reviewed")
    if not isinstance(reviewed, bool):
        return jsonify({"error": "reviewed must be true or false"}), 400
    try:
        return jsonify(store.set_paper_human_reviewed(paper_id, reviewed))
    except Exception as exc:
        return _error(exc)


@app.get("/api/question/<int:question_id>")
def api_question(question_id: int):
    try:
        return jsonify(
            store.load_question(question_id, refresh=_wants_refresh(), warm_neighbors=True)
        )
    except LookupError as exc:
        return _error(exc, 404)
    except Exception as exc:
        return _error(exc)


@app.post("/api/question/<int:question_id>/save")
def api_save(question_id: int):
    payload = request.get_json(silent=True) or {}
    try:
        return jsonify(store.save_question(question_id, payload))
    except LookupError as exc:
        return _error(exc, 404)
    except ValueError as exc:
        return _error(exc, 400)
    except Exception as exc:
        return _error(exc)


@app.get("/api/question/<int:question_id>/source.png")
def api_source(question_id: int):
    try:
        url = store.source_url_for(question_id)
        if not url:
            return jsonify({"error": "question has no source image"}), 404
        data = imaging.source_bytes(url, refresh=request.args.get("refresh") == "1")
        return Response(data, mimetype="image/png", headers={"Cache-Control": "max-age=3600"})
    except LookupError as exc:
        return _error(exc, 404)
    except Exception as exc:
        return _error(exc)


@app.post("/api/question/<int:question_id>/source")
def api_replace_source(question_id: int):
    uploaded = request.files.get("image") or request.files.get("file")
    if uploaded is None or not uploaded.filename:
        return jsonify({"error": "multipart field 'image' is required"}), 400
    try:
        return jsonify(store.replace_base_image(question_id, uploaded.read()))
    except LookupError as exc:
        return _error(exc, 404)
    except ValueError as exc:
        return _error(exc, 400)
    except Exception as exc:
        return _error(exc)


@app.get("/api/question/<int:question_id>/crop-preview.png")
def api_crop_preview(question_id: int):
    try:
        bbox = [
            request.args.get("x", type=float),
            request.args.get("y", type=float),
            request.args.get("w", type=float),
            request.args.get("h", type=float),
        ]
        if any(value is None for value in bbox):
            return jsonify({"error": "x, y, w, h are required"}), 400
        url = store.source_url_for(question_id)
        if not url:
            return jsonify({"error": "question has no source image"}), 404
        crop_bytes, _ = imaging.crop_norm(imaging.source_bytes(url), bbox)
        return Response(crop_bytes, mimetype="image/png", headers={"Cache-Control": "no-store"})
    except ValueError as exc:
        return _error(exc, 400)
    except Exception as exc:
        return _error(exc)


@app.get("/api/converter-status")
def api_converter_status():
    return jsonify(store.converter_status())


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Past paper conversion studio")
    parser.add_argument("--port", type=int, default=8790)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args(argv)

    url = f"http://{args.host}:{args.port}/"
    print("Past Paper Conversion Studio")
    print(f"Open {url}")
    print("Press Ctrl+C to stop\n")
    if not args.no_browser:
        Timer(1.0, lambda: webbrowser.open(url)).start()
    app.run(host=args.host, port=args.port, debug=False, use_reloader=False, threaded=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
