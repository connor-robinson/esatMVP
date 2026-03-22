import sqlite3
import os
from pathlib import Path
from typing import List, Dict, Any, Optional

_DEFAULT_DB_PATH = str(Path(__file__).resolve().parent / "nsaa_state.db")


class NSAASchemaDB:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or _DEFAULT_DB_PATH
        self._init_db()

    def _get_connection(self):
        return sqlite3.connect(self.db_path)

    def _init_db(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Schemas table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS schemas (
                    id TEXT PRIMARY KEY,
                    subject TEXT NOT NULL,
                    title TEXT NOT NULL,
                    core_move TEXT NOT NULL,
                    context TEXT,
                    wrong_paths TEXT,
                    notes TEXT
                )
            """)
            
            # Exemplars table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS exemplars (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    schema_id TEXT NOT NULL,
                    question_id TEXT NOT NULL,
                    justification TEXT,
                    FOREIGN KEY (schema_id) REFERENCES schemas (id)
                )
            """)
            
            # Questions queue table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS questions_queue (
                    question_id TEXT PRIMARY KEY,
                    text TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    status TEXT DEFAULT 'pending', -- pending, processing, done, skipped
                    worker_id TEXT,
                    ts_updated DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()

    def add_question_to_queue(self, qid: str, text: str, subject: str):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR IGNORE INTO questions_queue (question_id, text, subject) VALUES (?, ?, ?)",
                (qid, text, subject)
            )
            conn.commit()

    def get_next_pending_question(self, worker_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            conn.execute("BEGIN IMMEDIATE")
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT question_id, text, subject FROM questions_queue WHERE status = 'pending' LIMIT 1"
            )
            row = cursor.fetchone()
            
            if row:
                qid, text, subject = row
                cursor.execute(
                    "UPDATE questions_queue SET status = 'processing', worker_id = ?, ts_updated = CURRENT_TIMESTAMP WHERE question_id = ?",
                    (worker_id, qid)
                )
                conn.commit()
                return {"question_id": qid, "text": text, "subject": subject}
            
            conn.rollback()
            return None

    def mark_question_done(self, qid: str):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE questions_queue SET status = 'done', ts_updated = CURRENT_TIMESTAMP WHERE question_id = ?",
                (qid,)
            )
            conn.commit()

    def mark_question_skipped(self, qid: str):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE questions_queue SET status = 'skipped', ts_updated = CURRENT_TIMESTAMP WHERE question_id = ?",
                (qid,)
            )
            conn.commit()

    def add_schema(self, schema_id: str, subject: str, title: str, core_move: str, context: str, wrong_paths: str, notes: str):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO schemas (id, subject, title, core_move, context, wrong_paths, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (schema_id, subject, title, core_move, context, wrong_paths, notes)
            )
            conn.commit()

    def add_exemplar(self, schema_id: str, question_id: str, justification: str):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO exemplars (schema_id, question_id, justification) VALUES (?, ?, ?)",
                (schema_id, question_id, justification)
            )
            conn.commit()

    def get_schemas_by_subject(self, subject: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, title, core_move, context, wrong_paths, notes FROM schemas WHERE subject = ?",
                (subject,)
            )
            rows = cursor.fetchall()
            return [
                {
                    "id": row[0],
                    "title": row[1],
                    "core_move": row[2],
                    "context": row[3],
                    "wrong_paths": row[4],
                    "notes": row[5]
                }
                for row in rows
            ]

    def get_stats(self) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT status, COUNT(*) FROM questions_queue GROUP BY status")
            queue_stats = dict(cursor.fetchall())
            
            cursor.execute("SELECT subject, COUNT(*) FROM schemas GROUP BY subject")
            schema_stats = dict(cursor.fetchall())
            
            cursor.execute("SELECT schema_id, COUNT(*) FROM exemplars GROUP BY schema_id")
            exemplar_counts = [row[1] for row in cursor.fetchall()]
            
            density_stats = {
                "1": sum(1 for c in exemplar_counts if c == 1),
                "2": sum(1 for c in exemplar_counts if c == 2),
                "3": sum(1 for c in exemplar_counts if c == 3),
                "4+": sum(1 for c in exemplar_counts if c >= 4),
            }
            
            return {
                "queue": queue_stats,
                "schemas": schema_stats,
                "density": density_stats
            }

    def get_all_data_for_export(self) -> List[Dict[str, Any]]:
        """Returns all schemas with their exemplars for Markdown export."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, subject, title, core_move, context, wrong_paths, notes FROM schemas ORDER BY subject, id")
            schema_rows = cursor.fetchall()
            
            results = []
            for s in schema_rows:
                cursor.execute("SELECT question_id, justification FROM exemplars WHERE schema_id = ?", (s[0],))
                exemplars = [{"id": row[0], "justification": row[1]} for row in cursor.fetchall()]
                results.append({
                    "id": s[0],
                    "subject": s[1],
                    "title": s[2],
                    "core_move": s[3],
                    "context": s[4],
                    "wrong_paths": s[5],
                    "notes": s[6],
                    "exemplars": exemplars
                })
            return results

    def _init_schema_pipeline_tables(self):
        """Initialize tables for the new schema generation pipeline."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # MicroSchemas table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS micro_schemas (
                    question_id TEXT PRIMARY KEY,
                    subject_assigned TEXT NOT NULL,
                    subject_final TEXT NOT NULL,
                    subject_confidence TEXT,
                    discard BOOLEAN DEFAULT 0,
                    discard_reason TEXT,
                    core_move TEXT,
                    trigger_signals TEXT,
                    type_bucket TEXT,
                    common_wrong_path TEXT,
                    minimal_prerequisite TEXT,
                    difficulty_estimate TEXT,
                    quality_score REAL DEFAULT 0.0,
                    embedding TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (question_id) REFERENCES questions_queue (question_id)
                )
            """)
            
            # Schemas table (new format)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS schemas_new (
                    schema_id TEXT PRIMARY KEY,
                    subject TEXT NOT NULL,
                    title TEXT NOT NULL,
                    core_move TEXT NOT NULL,
                    trigger_signals TEXT,
                    boundary_definition TEXT,
                    possible_wrong_paths TEXT,
                    generation_notes TEXT,
                    difficulty_profile TEXT,
                    exemplar_question_ids TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_micro_schemas_subject_final 
                ON micro_schemas(subject_final, discard, quality_score DESC)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_schemas_new_subject 
                ON schemas_new(subject)
            """)
            
            conn.commit()

    def save_micro_schema(self, question_id: str, subject_assigned: str, subject_final: str, 
                         subject_confidence: str, discard: bool, discard_reason: Optional[str],
                         core_move: Optional[str], trigger_signals: List[str], type_bucket: Optional[str],
                         common_wrong_path: Optional[str], minimal_prerequisite: Optional[str],
                         difficulty_estimate: Optional[str], quality_score: float, embedding: Optional[List[float]]):
        """Save a micro-schema to the database."""
        import json
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO micro_schemas 
                (question_id, subject_assigned, subject_final, subject_confidence, discard, discard_reason,
                 core_move, trigger_signals, type_bucket, common_wrong_path, minimal_prerequisite,
                 difficulty_estimate, quality_score, embedding)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                question_id, subject_assigned, subject_final, subject_confidence, 
                1 if discard else 0, discard_reason, core_move,
                json.dumps(trigger_signals) if trigger_signals else None,
                type_bucket, common_wrong_path, minimal_prerequisite, difficulty_estimate,
                quality_score, json.dumps(embedding) if embedding else None
            ))
            conn.commit()

    # (helper methods for micro_schemas / schemas_new previously used for
    # ad-hoc reclassification and backup have been removed as we are
    # restarting the pipeline design to do classification up front.)

    def get_unassigned_micro_schemas(self, subject: str, exclude_assigned: set, limit: int = 30) -> List[Dict[str, Any]]:
        """Get unassigned micro-schemas for a subject, sorted by quality_score DESC."""
        import json
        with self._get_connection() as conn:
            cursor = conn.cursor()
            placeholders = ','.join(['?'] * len(exclude_assigned)) if exclude_assigned else '?'
            query = f"""
                SELECT question_id, subject_assigned, subject_final, subject_confidence,
                       core_move, trigger_signals, type_bucket, common_wrong_path,
                       minimal_prerequisite, difficulty_estimate, quality_score, embedding
                FROM micro_schemas
                WHERE subject_final = ? AND discard = 0
                {'AND question_id NOT IN (' + placeholders + ')' if exclude_assigned else 'AND 1=1'}
                ORDER BY quality_score DESC
                LIMIT ?
            """
            params = [subject]
            if exclude_assigned:
                params.extend(exclude_assigned)
            params.append(limit)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                results.append({
                    "question_id": row[0],
                    "subject_assigned": row[1],
                    "subject_final": row[2],
                    "subject_confidence": row[3],
                    "core_move": row[4],
                    "trigger_signals": json.loads(row[5]) if row[5] else [],
                    "type_bucket": row[6],
                    "common_wrong_path": row[7],
                    "minimal_prerequisite": row[8],
                    "difficulty_estimate": row[9],
                    "quality_score": row[10],
                    "embedding": json.loads(row[11]) if row[11] else None
                })
            return results

    def save_schema(self, schema_id: str, subject: str, title: str, core_move: str,
                   trigger_signals: List[str], boundary_definition: str,
                   possible_wrong_paths: List[str], generation_notes: List[str],
                   difficulty_profile: Dict[str, Any], exemplar_question_ids: List[str]):
        """Save a new schema to the database."""
        import json
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO schemas_new
                (schema_id, subject, title, core_move, trigger_signals, boundary_definition,
                 possible_wrong_paths, generation_notes, difficulty_profile, exemplar_question_ids)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                schema_id, subject, title, core_move,
                json.dumps(trigger_signals) if trigger_signals else None,
                boundary_definition,
                json.dumps(possible_wrong_paths) if possible_wrong_paths else None,
                json.dumps(generation_notes) if generation_notes else None,
                json.dumps(difficulty_profile) if difficulty_profile else None,
                json.dumps(exemplar_question_ids) if exemplar_question_ids else None
            ))
            conn.commit()
















