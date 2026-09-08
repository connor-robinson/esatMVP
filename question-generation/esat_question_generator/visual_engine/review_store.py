"""SQLite review store for diagram attempts and generated questions."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_DB_PATH = Path(__file__).resolve().parent / "review_data" / "review.db"

DIAGRAM_STATUSES = ("pending", "approved", "rejected", "superseded")
QUESTION_STATUSES = ("pending", "approved", "rejected", "needs_edit")
FILTERS = ("pending", "approved", "rejected", "regenerated", "all")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _connect(db_path: Path | None = None) -> sqlite3.Connection:
    path = Path(db_path or DEFAULT_DB_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(db_path: Path | None = None) -> Path:
    path = Path(db_path or DEFAULT_DB_PATH)
    with _connect(path) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_id TEXT NOT NULL UNIQUE,
                subject TEXT,
                topic TEXT,
                difficulty TEXT,
                stem TEXT,
                choices_json TEXT,
                correct_answer TEXT,
                explanation TEXT,
                diagram_required INTEGER DEFAULT 0,
                diagram_status TEXT DEFAULT 'none',
                question_status TEXT DEFAULT 'pending',
                auto_flags_json TEXT DEFAULT '[]',
                source_json TEXT,
                created_at TEXT,
                reviewed_at TEXT
            );

            CREATE TABLE IF NOT EXISTS diagram_reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_id TEXT NOT NULL,
                attempt INTEGER NOT NULL,
                image_path TEXT,
                spec_path TEXT,
                source_image_path TEXT,
                original_spec_json TEXT,
                generation_spec_json TEXT,
                status TEXT DEFAULT 'pending',
                feedback TEXT,
                reviewer_status TEXT,
                previous_attempt_ids TEXT DEFAULT '[]',
                parent_attempt_id INTEGER,
                created_at TEXT,
                reviewed_at TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_diagram_qid ON diagram_reviews(question_id);
            CREATE INDEX IF NOT EXISTS idx_diagram_status ON diagram_reviews(status);
            CREATE INDEX IF NOT EXISTS idx_question_status ON questions(question_status);
            """
        )
        _ensure_columns(conn)
        conn.commit()
    return path


def _ensure_columns(conn: sqlite3.Connection) -> None:
    cols = {row[1] for row in conn.execute("PRAGMA table_info(questions)")}
    if "variation_mode" not in cols:
        conn.execute("ALTER TABLE questions ADD COLUMN variation_mode TEXT DEFAULT ''")


def _row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return dict(row)


class ReviewStore:
    def __init__(self, db_path: Path | None = None):
        self.db_path = init_db(db_path)

    def upsert_question(
        self,
        *,
        question_id: str,
        subject: str = "",
        topic: str = "",
        difficulty: str = "",
        stem: str = "",
        choices: dict[str, Any] | None = None,
        correct_answer: str = "",
        explanation: str = "",
        diagram_required: bool = False,
        diagram_status: str = "none",
        question_status: str = "pending",
        auto_flags: list[dict[str, Any]] | None = None,
        source: dict[str, Any] | None = None,
        variation_mode: str = "",
    ) -> dict[str, Any]:
        now = _now()
        mode = (variation_mode or topic or "").strip().lower()
        with _connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO questions (
                    question_id, subject, topic, difficulty, stem, choices_json,
                    correct_answer, explanation, diagram_required, diagram_status,
                    question_status, auto_flags_json, source_json, created_at,
                    variation_mode
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(question_id) DO UPDATE SET
                    subject=excluded.subject,
                    topic=excluded.topic,
                    difficulty=excluded.difficulty,
                    stem=excluded.stem,
                    choices_json=excluded.choices_json,
                    correct_answer=excluded.correct_answer,
                    explanation=excluded.explanation,
                    diagram_required=excluded.diagram_required,
                    diagram_status=excluded.diagram_status,
                    question_status=excluded.question_status,
                    auto_flags_json=excluded.auto_flags_json,
                    source_json=excluded.source_json,
                    variation_mode=excluded.variation_mode
                """,
                (
                    question_id,
                    subject,
                    topic,
                    difficulty,
                    stem,
                    json.dumps(choices or {}, ensure_ascii=False),
                    correct_answer,
                    explanation,
                    1 if diagram_required else 0,
                    diagram_status,
                    question_status,
                    json.dumps(auto_flags or [], ensure_ascii=False),
                    json.dumps(source or {}, ensure_ascii=False),
                    now,
                    mode,
                ),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM questions WHERE question_id = ?", (question_id,)).fetchone()
        return dict(row)

    def add_diagram_attempt(
        self,
        *,
        question_id: str,
        attempt: int,
        image_path: str = "",
        spec_path: str = "",
        source_image_path: str = "",
        original_spec: dict[str, Any] | None = None,
        generation_spec: dict[str, Any] | None = None,
        status: str = "pending",
        feedback: str = "",
        parent_attempt_id: int | None = None,
        previous_attempt_ids: list[int] | None = None,
    ) -> dict[str, Any]:
        now = _now()
        with _connect(self.db_path) as conn:
            cur = conn.execute(
                """
                INSERT INTO diagram_reviews (
                    question_id, attempt, image_path, spec_path, source_image_path,
                    original_spec_json, generation_spec_json, status, feedback,
                    previous_attempt_ids, parent_attempt_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    question_id,
                    attempt,
                    image_path,
                    spec_path,
                    source_image_path,
                    json.dumps(original_spec or {}, ensure_ascii=False),
                    json.dumps(generation_spec or {}, ensure_ascii=False),
                    status,
                    feedback,
                    json.dumps(previous_attempt_ids or [], ensure_ascii=False),
                    parent_attempt_id,
                    now,
                ),
            )
            new_id = int(cur.lastrowid)
            if parent_attempt_id:
                conn.execute(
                    "UPDATE diagram_reviews SET status = 'superseded', reviewed_at = ? WHERE id = ? AND status != 'approved'",
                    (now, parent_attempt_id),
                )
            diagram_status = "pending" if status == "pending" else status
            conn.execute(
                "UPDATE questions SET diagram_required = 1, diagram_status = ? WHERE question_id = ?",
                (diagram_status, question_id),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM diagram_reviews WHERE id = ?", (new_id,)).fetchone()
        return dict(row)

    def set_diagram_status(
        self,
        attempt_id: int,
        status: str,
        *,
        feedback: str = "",
        reviewer_status: str = "",
    ) -> dict[str, Any] | None:
        if status not in DIAGRAM_STATUSES:
            raise ValueError(f"Invalid diagram status: {status}")
        now = _now()
        with _connect(self.db_path) as conn:
            conn.execute(
                """
                UPDATE diagram_reviews
                SET status = ?, feedback = ?, reviewer_status = ?, reviewed_at = ?
                WHERE id = ?
                """,
                (status, feedback, reviewer_status or status, now, attempt_id),
            )
            row = conn.execute("SELECT * FROM diagram_reviews WHERE id = ?", (attempt_id,)).fetchone()
            if row:
                conn.execute(
                    "UPDATE questions SET diagram_status = ? WHERE question_id = ?",
                    (status, row["question_id"]),
                )
            conn.commit()
        return _row_to_dict(row)

    def set_question_status(self, question_id: str, status: str, *, feedback: str = "") -> dict[str, Any] | None:
        if status not in QUESTION_STATUSES:
            raise ValueError(f"Invalid question status: {status}")
        now = _now()
        with _connect(self.db_path) as conn:
            conn.execute(
                """
                UPDATE questions
                SET question_status = ?, reviewed_at = ?,
                    auto_flags_json = CASE
                        WHEN ? = '' THEN auto_flags_json
                        ELSE json('[]')
                    END
                WHERE question_id = ?
                """,
                (status, now, feedback, question_id),
            )
            if feedback:
                latest = conn.execute(
                    """
                    SELECT id FROM diagram_reviews
                    WHERE question_id = ? AND status != 'superseded'
                    ORDER BY attempt DESC LIMIT 1
                    """,
                    (question_id,),
                ).fetchone()
                if latest:
                    conn.execute(
                        "UPDATE diagram_reviews SET feedback = ? WHERE id = ?",
                        (feedback, latest["id"]),
                    )
            conn.commit()
            row = conn.execute("SELECT * FROM questions WHERE question_id = ?", (question_id,)).fetchone()
        return _row_to_dict(row)

    def counts(self) -> dict[str, int]:
        with _connect(self.db_path) as conn:
            q_counts = {
                row["question_status"]: row["n"]
                for row in conn.execute(
                    "SELECT question_status, COUNT(*) AS n FROM questions GROUP BY question_status"
                )
            }
            d_counts = {
                row["status"]: row["n"]
                for row in conn.execute(
                    "SELECT status, COUNT(*) AS n FROM diagram_reviews GROUP BY status"
                )
            }
            regenerated = conn.execute(
                "SELECT COUNT(*) AS n FROM diagram_reviews WHERE attempt > 1"
            ).fetchone()["n"]
        return {
            "questions": q_counts,
            "diagrams": d_counts,
            "pending": int(q_counts.get("pending", 0)),
            "approved": int(q_counts.get("approved", 0)),
            "rejected": int(q_counts.get("rejected", 0)),
            "needs_edit": int(q_counts.get("needs_edit", 0)),
            "regenerated": int(regenerated),
            "diagram_pending": int(d_counts.get("pending", 0)),
            "diagram_approved": int(d_counts.get("approved", 0)),
            "diagram_rejected": int(d_counts.get("rejected", 0)),
        }

    def list_items(
        self,
        *,
        status_filter: str = "pending",
        latest_only: bool = True,
        subject: str | None = None,
        pipeline: str | None = None,
    ) -> list[dict[str, Any]]:
        filt = (status_filter or "pending").strip().lower()
        with _connect(self.db_path) as conn:
            questions = [dict(r) for r in conn.execute("SELECT * FROM questions ORDER BY id").fetchall()]
            diagrams = [dict(r) for r in conn.execute("SELECT * FROM diagram_reviews ORDER BY question_id, attempt").fetchall()]

        by_qid: dict[str, list[dict[str, Any]]] = {}
        for d in diagrams:
            by_qid.setdefault(d["question_id"], []).append(d)

        items: list[dict[str, Any]] = []
        for q in questions:
            if subject and (q.get("subject") or "") != subject:
                continue
            if pipeline:
                source = {}
                try:
                    source = json.loads(q.get("source_json") or "{}")
                except json.JSONDecodeError:
                    source = {}
                if not isinstance(source, dict) or str(source.get("pipeline") or "") != pipeline:
                    continue
            attempts = by_qid.get(q["question_id"]) or []
            latest = attempts[-1] if attempts else None
            shown = [latest] if latest_only and latest else attempts
            if not shown:
                shown = [None]
            for attempt in shown:
                item = {**q, "diagram": attempt, "attempts": attempts}
                if not _matches_filter(item, filt, latest_only=latest_only):
                    continue
                items.append(item)
        return items

    def get_item(self, question_id: str) -> dict[str, Any] | None:
        with _connect(self.db_path) as conn:
            q = conn.execute("SELECT * FROM questions WHERE question_id = ?", (question_id,)).fetchone()
            if not q:
                return None
            attempts = [
                dict(r)
                for r in conn.execute(
                    "SELECT * FROM diagram_reviews WHERE question_id = ? ORDER BY attempt",
                    (question_id,),
                ).fetchall()
            ]
        return {**dict(q), "diagram": attempts[-1] if attempts else None, "attempts": attempts}

    def subject_counts(self) -> dict[str, int]:
        with _connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT subject, COUNT(*) AS n FROM questions GROUP BY subject"
            ).fetchall()
        return {str(row["subject"] or ""): int(row["n"]) for row in rows}

    def latest_diagram(self, question_id: str) -> dict[str, Any] | None:
        with _connect(self.db_path) as conn:
            row = conn.execute(
                """
                SELECT * FROM diagram_reviews
                WHERE question_id = ?
                ORDER BY attempt DESC LIMIT 1
                """,
                (question_id,),
            ).fetchone()
        return _row_to_dict(row)


def _matches_filter(item: dict[str, Any], filt: str, *, latest_only: bool) -> bool:
    q_status = (item.get("question_status") or "pending").lower()
    diagram = item.get("diagram") or {}
    d_status = (diagram.get("status") or "").lower()
    attempt = int(diagram.get("attempt") or 1)
    if filt == "all":
        return True
    if filt == "pending":
        return q_status == "pending" or d_status == "pending"
    if filt == "approved":
        return q_status == "approved" or d_status == "approved"
    if filt == "rejected":
        return q_status == "rejected" or d_status == "rejected"
    if filt == "regenerated":
        return attempt > 1 or bool(diagram.get("parent_attempt_id"))
    return True
