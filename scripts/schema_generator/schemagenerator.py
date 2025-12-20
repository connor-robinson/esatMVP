"""
schema_hil_tool.py
Human-in-the-loop schema generator for ENGAA/NSAA/TMUA style schema libraries.

Features:
- Indexes PDFs under scripts/schema_generator/papers/ (with incremental per-PDF caching)
- Extracts question text (best-effort, with fallback patterns)
- SKIPS questions with diagrams/graphs (keyword + PDF image/drawing heuristic + overrides)
- Uses Gemini to propose schema candidates
- Compares candidates to existing Schemas.md (embeddings + fuzzy similarity)
- Tkinter UI with multiple actions:
  * Accept NEW: validates schema, checks recurrence, appends to Schemas.md
  * Ignore: logs rejection
  * Merge: marks as duplicate (no file change)
  * Enrich: replaces bullets in existing schemas (replacement-only, respects locking)
  * Split: splits candidate into two
  * Compress: rewrites schema to enforce bullet limits
- Schema validation: enforces max 4 bullets per section
- Schema meta tracking: edit counts, locking, fullness
- Recurrence gate: requires evidence from multiple papers
- Stratified sampling: distributes questions across multiple PDFs
- Preview window: inspect extracted questions
- TMUA tracking: Code is in place for future TMUA support (currently TMUA papers are filtered out):
  * TMUA papers are excluded from indexing (filtered by PDF path and exam type)
  * TMUA detection code remains for when TMUA is re-enabled
  * When enabled: TMUA evidence detected from question IDs, labeled in schemas, tracked in metadata

Usage:
1. Set GEMINI_API_KEY in .env.local (project root)
2. Run: python schemagenerator.py
3. Click "Index PDFs" to scan papers
4. Set batch filter (optional) and click "Generate candidates"
5. Review candidates, select one, and choose action

Author: (you + GPT)
"""

from __future__ import annotations

import os
import re
import json
import time
import math
import glob
import threading
import hashlib
import tempfile
import shutil
import random
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    # Fallback cosine similarity without numpy
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Callable, Any

import fitz  # PyMuPDF
from dotenv import load_dotenv
from rapidfuzz import fuzz

import google.generativeai as genai
import tkinter as tk
from tkinter import ttk, messagebox, filedialog


# ----------------------------
# Config
# ----------------------------

PROJECT_ROOT_DEFAULT = Path(r"c:\Users\anson\Desktop\nocalcMVP2_real")
PAPERS_DIR_DEFAULT = PROJECT_ROOT_DEFAULT / "scripts" / "schema_generator" / "papers"
SCHEMAS_MD_DEFAULT = PROJECT_ROOT_DEFAULT / "scripts" / "esat_question_generator" / "1. Designer" / "Schemas.md"
TMUA_SCHEMAS_MD_DEFAULT = PROJECT_ROOT_DEFAULT / "scripts" / "esat_question_generator" / "1. Designer" / "Schemas_TMUA.md"

CACHE_DIR_DEFAULT = PROJECT_ROOT_DEFAULT / "scripts" / "schema_generator" / "_cache"
LOG_DIR_DEFAULT = PROJECT_ROOT_DEFAULT / "scripts" / "schema_generator" / "_logs"

CACHE_DIR_DEFAULT.mkdir(parents=True, exist_ok=True)
LOG_DIR_DEFAULT.mkdir(parents=True, exist_ok=True)

INDEX_JSON = CACHE_DIR_DEFAULT / "papers_index.json"
CANDIDATES_JSONL = LOG_DIR_DEFAULT / "schema_candidates.jsonl"
DECISIONS_JSONL = LOG_DIR_DEFAULT / "schema_decisions.jsonl"
SCHEMAS_META_JSON = CACHE_DIR_DEFAULT / "schemas_meta.json"
SCHEMA_EMBEDDINGS_JSON = CACHE_DIR_DEFAULT / "schema_embeddings.json"
DIAGRAM_OVERRIDES_JSON = CACHE_DIR_DEFAULT / "diagram_overrides.json"
SCHEMA_COVERAGE_JSON = CACHE_DIR_DEFAULT / "schema_coverage.json"
USED_QUESTIONS_JSON = CACHE_DIR_DEFAULT / "used_questions.json"
PDF_CACHE_DIR = CACHE_DIR_DEFAULT / "pdf_cache"
PDF_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Diagram/graph skip policy:
DIAGRAM_KEYWORDS = [
    "diagram", "[diagram", "not to scale", "graph", "sketch", "shown", "see figure",
    "the diagram shows", "the graph shows", "the sketch graph", "as shown",
]
# If a page contains drawings/images, we treat it as "likely diagram page"
DRAWING_COUNT_THRESHOLD = 10


# ----------------------------
# Data models
# ----------------------------

@dataclass
class QuestionItem:
    paper_id: str
    pdf_path: str
    year: Optional[str]
    exam: Optional[str]
    section: Optional[str]
    qnum: int
    text: str
    skipped_diagram: bool

@dataclass
class SchemaSummary:
    schema_id: str
    title: str
    core_move: str

@dataclass
class Candidate:
    candidate_id: str
    title: str
    prefix: str  # M, P, B, C (Maths/Physics/Biology/Chemistry) or R (TMUA Paper 2 Reasoning)
    core_move: str
    evidence: List[str]  # e.g. ["ENGAA_S1_2021_Q11", ...]
    collision_guess: List[str]  # existing schema IDs
    confidence: float  # 0..1

@dataclass
class SimilarityHit:
    schema_id: str
    score: float  # 0..100
    title: str


# ----------------------------
# Utilities
# ----------------------------

def find_and_load_env(project_root: Path) -> None:
    # Load .env.local from project root if present
    env_path = project_root / ".env.local"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        # fallback: attempt current directory
        load_dotenv()


def safe_read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="replace")


def safe_write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def append_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(content)


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime())


def normalize_spaces(s: str) -> str:
    s = s.replace("\r", "\n")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


# ----------------------------
# Schema library parser
# ----------------------------

SCHEMA_HEADER_RE = re.compile(r"^##\s+\*\*(([MPBCR])\d+)\.\s*(.+?)\*\*\s*$", re.MULTILINE)
SCHEMA_HEADER_RE_LENIENT = re.compile(r"^##\s+\*\*([MPBCR])\.\s*(.+?)\*\*\s*$", re.MULTILINE)  # For M./P./B./C./R. without number
SCHEMA_HEADER_RE_PLACEHOLDER = re.compile(r"^##\s+\*\*\{ID\}\.\s*(.+?)\*\*\s*$", re.MULTILINE)  # For {ID}. placeholder

def parse_schema_summaries(schemas_md: str) -> List[SchemaSummary]:
    """
    Extract (id, title, core thinking move) from Schemas.md.
    Assumes your canonical structure.
    """
    lines = schemas_md.splitlines()
    summaries: List[SchemaSummary] = []

    i = 0
    while i < len(lines):
        m = SCHEMA_HEADER_RE.match(lines[i].strip())
        if not m:
            i += 1
            continue

        schema_id = m.group(1)
        title = m.group(2).strip()
        core_move = ""

        # scan forward for "**Core thinking move**" then next non-empty line
        j = i + 1
        while j < len(lines):
            if lines[j].strip().lower() == "**core thinking move**":
                # core move is usually on the next line, maybe blank then text
                k = j + 1
                while k < len(lines) and not lines[k].strip():
                    k += 1
                if k < len(lines):
                    core_move = lines[k].strip()
                break
            # stop at next schema
            if SCHEMA_HEADER_RE.match(lines[j].strip()):
                break
            j += 1

        summaries.append(SchemaSummary(schema_id=schema_id, title=title, core_move=core_move))
        i = j

    return summaries


def get_next_schema_id(summaries: List[SchemaSummary], prefix: str) -> str:
    nums = []
    for s in summaries:
        if s.schema_id.startswith(prefix):
            try:
                nums.append(int(s.schema_id[1:]))
            except ValueError:
                pass
    n = max(nums) + 1 if nums else 1
    return f"{prefix}{n}"


# ----------------------------
# Feature A: Schema validation
# ----------------------------

def parse_schema_block(markdown: str) -> Dict:
    """
    Parse a single schema block into structured data.
    Returns dict with: schema_id, title, core_move, seen_context, wrong_paths, notes
    """
    lines = markdown.splitlines()
    result = {
        "schema_id": "",
        "title": "",
        "core_move": "",
        "seen_context": [],
        "wrong_paths": [],
        "notes": []
    }
    
    i = 0
    # Find header - try strict first, then lenient, then placeholder
    while i < len(lines):
        m = SCHEMA_HEADER_RE.match(lines[i].strip())
        if m:
            result["schema_id"] = m.group(1)  # e.g. M3, P2, B1, C4
            result["title"] = m.group(3).strip()
            break
        # Try lenient match (M. or P. without number)
        m2 = SCHEMA_HEADER_RE_LENIENT.match(lines[i].strip())
        if m2:
            result["schema_id"] = m2.group(1)  # Just "M" or "P"
            result["title"] = m2.group(2).strip()
            break
        # Try placeholder match ({ID}.)
        m3 = SCHEMA_HEADER_RE_PLACEHOLDER.match(lines[i].strip())
        if m3:
            result["schema_id"] = "{ID}"  # Placeholder
            result["title"] = m3.group(1).strip()
            break
        i += 1
    
    if not result["schema_id"]:
        return result
    
    # Find core thinking move
    current_section = None
    i += 1
    while i < len(lines):
        line = lines[i].strip()
        
        # Check for core thinking move
        if line.lower() == "**core thinking move**" or line.lower().startswith("**core thinking move"):
            # Next non-empty line is core_move
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            if j < len(lines):
                result["core_move"] = lines[j].strip()
            i = j + 1
            continue
        
        # Check for section headers
        if "seen in / context" in line.lower() or "seen in/context" in line.lower():
            current_section = "seen_context"
            i += 1
            continue
        elif "possible wrong paths" in line.lower():
            current_section = "wrong_paths"
            i += 1
            continue
        elif "notes for generation" in line.lower():
            current_section = "notes"
            i += 1
            continue
        
        # Check for bullets
        if line.startswith("- ") and current_section:
            bullet_text = line[2:].strip()
            if bullet_text:
                result[current_section].append(bullet_text)
        
        # Stop at next schema or separator
        if line.startswith("##") or line.strip() == "---":
            if line.strip() == "---":
                break
            if SCHEMA_HEADER_RE.match(line):
                break
        
        i += 1
    
    return result


def validate_schema_block(markdown: str, auto_fix: bool = True) -> Tuple[bool, List[str], Optional[str]]:
    """
    Validate a schema block. Returns (is_valid, list_of_errors, fixed_markdown).
    Accepts: M1/P2/B3/C4 (with number), M./P./B./C. (without number), or {ID} (placeholder).
    """
    errors = []
    parsed = parse_schema_block(markdown)
    fixed_markdown = None
    
    # Check header format - accept M1/P2/B3/C4/R5, M./P./B./C./R., or {ID} placeholder
    if not parsed["schema_id"]:
        errors.append(
            "Missing or invalid schema header "
            "(expected: ## **M\\d+|P\\d+|B\\d+|C\\d+|R\\d+. Title** or "
            "## **M. Title** / **P. Title** / **B. Title** / **C. Title** / **R. Title** or "
            "## **{ID}. Title**)"
        )
    elif parsed["schema_id"] == "{ID}":
        # Placeholder is valid - will be replaced on accept
        pass
    elif parsed["schema_id"] in ("M", "P", "B", "C", "R"):
        # Just prefix without number - convert to {ID} placeholder for consistency
        if auto_fix:
            lines = markdown.splitlines()
            for i, line in enumerate(lines):
                if SCHEMA_HEADER_RE_LENIENT.match(line.strip()):
                    # Replace M./P./B./C. with {ID}.
                    fixed_line = re.sub(r"##\s+\*\*([MPBCR])\.\s*(.+?)\*\*\s*$", r"## **{ID}. \2**", line)
                    lines[i] = fixed_line
                    fixed_markdown = "\n".join(lines)
                    break
    elif not re.match(r"^[MPBCR]\d+$", parsed["schema_id"]):
        errors.append(f"Invalid schema ID format: {parsed['schema_id']}")
    
    # Check core_move
    if not parsed["core_move"]:
        errors.append("Missing core thinking move")
    
    # Check bullet limits
    if len(parsed["seen_context"]) > 4:
        errors.append(f"Seen in / context has {len(parsed['seen_context'])} bullets (max 4)")
    if len(parsed["wrong_paths"]) > 4:
        errors.append(f"Possible wrong paths has {len(parsed['wrong_paths'])} bullets (max 4)")
    if len(parsed["notes"]) > 4:
        errors.append(f"Notes for generation has {len(parsed['notes'])} bullets (max 4)")
    
    return (len(errors) == 0, errors, fixed_markdown)


def schema_similarity(candidate_title: str, candidate_core: str, existing: SchemaSummary, 
                     candidate_embedding: Optional[List[float]] = None,
                     existing_embedding: Optional[List[float]] = None) -> float:
    """
    Combined similarity score 0..100.
    Uses embeddings (0.65) + fuzzy (0.35) if embeddings available, else fuzzy only.
    """
    # Fuzzy score (always available)
    a = (candidate_title + " " + candidate_core).lower()
    b = (existing.title + " " + existing.core_move).lower()
    fuzzy_score = float(fuzz.token_set_ratio(a, b))
    
    # Embedding score if available
    if candidate_embedding and existing_embedding:
        try:
            # Cosine similarity
            if NUMPY_AVAILABLE:
                vec1 = np.array(candidate_embedding)
                vec2 = np.array(existing_embedding)
                dot_product = np.dot(vec1, vec2)
                norm1 = np.linalg.norm(vec1)
                norm2 = np.linalg.norm(vec2)
            else:
                # Manual cosine similarity
                dot_product = sum(a * b for a, b in zip(candidate_embedding, existing_embedding))
                norm1 = math.sqrt(sum(a * a for a in candidate_embedding))
                norm2 = math.sqrt(sum(b * b for b in existing_embedding))
            
            if norm1 > 0 and norm2 > 0:
                cosine_sim = dot_product / (norm1 * norm2)
                embed_score = cosine_sim * 100  # Scale to 0-100
                # Combined: 0.65 * embed + 0.35 * fuzzy
                return 0.65 * embed_score + 0.35 * fuzzy_score
        except Exception:
            pass
    
    # Fallback to fuzzy only
    return fuzzy_score


# ----------------------------
# Feature C: Schema meta and fullness
# ----------------------------

def load_schemas_meta() -> Dict[str, Dict[str, any]]:
    """Load schemas_meta.json, return default if missing."""
    if SCHEMAS_META_JSON.exists():
        try:
            return json.loads(safe_read_text(SCHEMAS_META_JSON))
        except Exception:
            pass
    return {}


def save_schemas_meta(meta: Dict[str, Dict[str, any]]) -> None:
    """Save schemas_meta.json."""
    safe_write_text(SCHEMAS_META_JSON, json.dumps(meta, indent=2))


def compute_schema_fullness(schemas_md: str) -> Dict[str, Dict[str, int]]:
    """Compute bullets per section for each schema."""
    fullness = {}
    lines = schemas_md.splitlines()
    
    i = 0
    while i < len(lines):
        m = SCHEMA_HEADER_RE.match(lines[i].strip())
        if not m:
            i += 1
            continue
        
        schema_id = m.group(1)
        fullness[schema_id] = {"seen": 0, "wrong": 0, "notes": 0}
        
        current_section = None
        j = i + 1
        while j < len(lines):
            line = lines[j].strip()
            
            if "seen in / context" in line.lower() or "seen in/context" in line.lower():
                current_section = "seen"
            elif "possible wrong paths" in line.lower():
                current_section = "wrong"
            elif "notes for generation" in line.lower():
                current_section = "notes"
            elif line.startswith("- ") and current_section:
                fullness[schema_id][current_section] += 1
            elif line.startswith("##") or (line.strip() == "---" and current_section):
                break
            
            j += 1
        
        i = j
    
    return fullness


# ----------------------------
# Feature F: Embeddings
# ----------------------------

def load_embeddings() -> Dict[str, List[float]]:
    """Load schema embeddings cache."""
    if SCHEMA_EMBEDDINGS_JSON.exists():
        try:
            return json.loads(safe_read_text(SCHEMA_EMBEDDINGS_JSON))
        except Exception:
            pass
    return {}


def save_embeddings(embeddings: Dict[str, List[float]]) -> None:
    """Save schema embeddings cache."""
    safe_write_text(SCHEMA_EMBEDDINGS_JSON, json.dumps(embeddings, indent=2))


def compute_embedding(text: str, gemini_client) -> Optional[List[float]]:
    """Compute embedding using Gemini API. Returns None on failure."""
    try:
        # Try different embedding model names
        embedding_models = ["models/text-embedding-004", "text-embedding-004", "models/embedding-001"]
        for model_name in embedding_models:
            try:
                result = genai.embed_content(
                    model=model_name,
                    content=text,
                    task_type="retrieval_document"
                )
                if result and hasattr(result, 'embedding'):
                    return result.embedding
                elif isinstance(result, dict) and 'embedding' in result:
                    return result['embedding']
            except Exception:
                continue
        print(f"[WARN] All embedding models failed")
    except Exception as e:
        print(f"[WARN] Embedding computation failed: {e}")
    return None


# ----------------------------
# Feature G: Diagram overrides
# ----------------------------

def load_diagram_overrides() -> Dict[str, Dict[int, bool]]:
    """Load diagram overrides: {pdf_path: {qnum: bool}}"""
    if DIAGRAM_OVERRIDES_JSON.exists():
        try:
            data = json.loads(safe_read_text(DIAGRAM_OVERRIDES_JSON))
            # Convert string keys to int for qnum
            result = {}
            for pdf_path, qnums in data.items():
                result[pdf_path] = {int(k): bool(v) for k, v in qnums.items()}
            return result
        except Exception:
            pass
    return {}


def save_diagram_overrides(overrides: Dict[str, Dict[int, bool]]) -> None:
    """Save diagram overrides."""
    # Convert int keys to str for JSON
    data = {pdf_path: {str(k): v for k, v in qnums.items()} 
            for pdf_path, qnums in overrides.items()}
    safe_write_text(DIAGRAM_OVERRIDES_JSON, json.dumps(data, indent=2))


# ----------------------------
# Feature: TMUA tracking
# ----------------------------

def has_tmua_evidence(candidate: Candidate) -> bool:
    """Check if candidate has any TMUA evidence questions."""
    for qid in candidate.evidence:
        if "TMUA" in qid.upper():
            return True
    return False


def get_tmua_prefix_from_evidence(candidate: Candidate) -> Optional[str]:
    """Determine prefix for TMUA candidate based on paper type in evidence.
    Returns 'M' for Paper 1 (maths) or 'R' for Paper 2 (reasoning), None if unclear."""
    paper1_count = 0
    paper2_count = 0
    
    for qid in candidate.evidence:
        qid_upper = qid.upper()
        if "TMUA" in qid_upper:
            if "PAPER1" in qid_upper or "PAPER 1" in qid_upper:
                paper1_count += 1
            elif "PAPER2" in qid_upper or "PAPER 2" in qid_upper:
                paper2_count += 1
    
    if paper1_count > 0 and paper2_count == 0:
        return "M"  # Paper 1 = Maths
    elif paper2_count > 0 and paper1_count == 0:
        return "R"  # Paper 2 = Reasoning
    elif paper1_count > paper2_count:
        return "M"  # Mostly Paper 1
    elif paper2_count > paper1_count:
        return "R"  # Mostly Paper 2
    else:
        return None  # Mixed or unclear


# ----------------------------
# Feature: Used questions tracking
# ----------------------------

def load_used_questions() -> set[str]:
    """Load used question IDs from cache."""
    if USED_QUESTIONS_JSON.exists():
        try:
            data = json.loads(safe_read_text(USED_QUESTIONS_JSON))
            if isinstance(data, list):
                return set(data)
            elif isinstance(data, dict) and "used_question_ids" in data:
                return set(data["used_question_ids"])
        except Exception:
            pass
    return set()


def save_used_questions(used_question_ids: set[str]) -> None:
    """Save used question IDs to cache."""
    # Convert set to sorted list for JSON
    data = sorted(list(used_question_ids))
    safe_write_text(USED_QUESTIONS_JSON, json.dumps(data, indent=2))


# ----------------------------
# Feature D: Recurrence checking
# ----------------------------

def map_evidence_to_papers(candidate: Candidate, index: List[QuestionItem]) -> Dict[str, List[str]]:
    """Map evidence question IDs to PDF paths."""
    mapping = {}
    for qid in candidate.evidence:
        # Parse qid format: ENGAA_Section1_2021_Q11
        parts = qid.split("_")
        if len(parts) >= 4:
            exam = parts[0]
            section = parts[1]
            year = parts[2]
            qnum_str = parts[3].replace("Q", "")
            try:
                qnum = int(qnum_str)
                # Find matching question in index
                for q in index:
                    if (q.exam == exam and q.section == section and 
                        q.year == year and q.qnum == qnum):
                        pdf_path = q.pdf_path
                        if pdf_path not in mapping:
                            mapping[pdf_path] = []
                        mapping[pdf_path].append(qid)
                        break
            except ValueError:
                pass
    return mapping


def check_recurrence(candidate: Candidate, index: List[QuestionItem]) -> Tuple[bool, Dict]:
    """Check if candidate evidence spans multiple papers."""
    mapping = map_evidence_to_papers(candidate, index)
    distinct_pdfs = len(mapping)
    total_questions = len(candidate.evidence)
    
    stats = {
        "distinct_pdfs": distinct_pdfs,
        "total_questions": total_questions,
        "pdfs": list(mapping.keys())
    }
    
    # Require: >=2 distinct PDFs OR (>=3 questions AND >=2 PDFs preferred)
    satisfied = distinct_pdfs >= 2 or (total_questions >= 3 and distinct_pdfs >= 2)
    
    return satisfied, stats


# ----------------------------
# Feature I: Schema coverage & weights
# ----------------------------

def load_schema_coverage() -> Dict[str, Any]:
    """Load per-schema coverage stats from JSON cache."""
    if SCHEMA_COVERAGE_JSON.exists():
        try:
            return json.loads(safe_read_text(SCHEMA_COVERAGE_JSON))
        except Exception:
            pass
    return {}


def save_schema_coverage(coverage: Dict[str, Any]) -> None:
    """Save per-schema coverage stats to JSON cache."""
    safe_write_text(SCHEMA_COVERAGE_JSON, json.dumps(coverage, indent=2))


def update_schema_coverage(schema_id: str, candidate: Candidate, index: List[QuestionItem]) -> None:
    """Update coverage counts for a newly accepted schema based on its evidence.

    Coverage structure:
    {
        "M1": {
            "total": 5,
            "by_paper": {
                "ENGAA_Section1_2019": 3,
                "NSAA_Section2_2021": 2
            }
        },
        ...
    }
    """
    coverage = load_schema_coverage()
    entry = coverage.get(schema_id) or {"total": 0, "by_paper": {}}

    # Use evidence → pdf_path mapping to count by paper
    evidence_by_pdf = map_evidence_to_papers(candidate, index)
    added_total = 0
    for pdf_path, qids in evidence_by_pdf.items():
        exam, section, year = infer_exam_section_from_path(Path(pdf_path))
        paper_key = f"{exam or 'UNK'}_{(section or 'UNK').replace(' ', '')}_{year or 'UNK'}"
        count = len(qids)
        added_total += count
        current = entry["by_paper"].get(paper_key, 0)
        entry["by_paper"][paper_key] = current + count

    # Fallback: if mapping fails for some reason, still count total evidence
    if added_total == 0:
        added_total = len(candidate.evidence)

    entry["total"] = entry.get("total", 0) + added_total
    coverage[schema_id] = entry
    save_schema_coverage(coverage)


# ----------------------------
# Feature H: Per-PDF caching
# ----------------------------

def compute_pdf_hash(pdf_path: Path) -> str:
    """Compute hash from mtime and size."""
    try:
        stat = pdf_path.stat()
        hash_input = f"{stat.st_mtime}_{stat.st_size}"
        return hashlib.md5(hash_input.encode()).hexdigest()[:12]
    except Exception:
        return hashlib.md5(str(pdf_path).encode()).hexdigest()[:12]


# ----------------------------
# PDF indexing and question extraction
# ----------------------------

QSTART_RE = re.compile(r"^\s*(\d{1,2})\s+(.*)$")  # question number at line start
QSTART_RE_FALLBACK1 = re.compile(r"^\s*Q(\d+)\s+(.*)$", re.IGNORECASE)  # Q1, Q2, etc.
QSTART_RE_FALLBACK2 = re.compile(r"^\s*Question\s+(\d+)\s+(.*)$", re.IGNORECASE)  # Question 1
QSTART_RE_FALLBACK3 = re.compile(r"^\s*(\d+)\)\s+(.*)$")  # 1), 2), etc.

def detect_page_has_diagram(page: fitz.Page) -> bool:
    """
    Heuristic: if there are images OR many vector drawings.
    """
    try:
        imgs = page.get_images(full=True)
        if imgs and len(imgs) > 0:
            return True
    except Exception:
        pass

    try:
        drawings = page.get_drawings()
        if drawings and len(drawings) >= DRAWING_COUNT_THRESHOLD:
            return True
    except Exception:
        pass

    return False


def question_contains_diagram_keywords(text: str) -> bool:
    t = text.lower()
    return any(k in t for k in DIAGRAM_KEYWORDS)


def infer_exam_section_from_path(pdf_path: Path) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Very lightweight inference from directory names like:
      .../ENGAA Section 1/ENGAA Section 1 2021 Past Paper.pdf
    """
    parts = [p.lower() for p in pdf_path.parts]
    exam = None
    section = None
    year = None

    # exam
    for ex in ["engaa", "nsaa", "tmua"]:
        if any(ex in p for p in parts):
            exam = ex.upper()
            break

    # section/paper
    # look for "section 1", "section 2", "paper 1", "paper 2"
    for p in parts:
        if "section 1" in p:
            section = "Section 1"
            break
        if "section 2" in p:
            section = "Section 2"
            break
        if "paper 1" in p:
            section = "Paper 1"
            break
        if "paper 2" in p:
            section = "Paper 2"
            break

    # year
    m = re.search(r"(201\d|202\d)", str(pdf_path))
    if m:
        year = m.group(1)

    return exam, section, year


def extract_questions_from_pdf(pdf_path: Path, overrides: Optional[Dict[int, bool]] = None) -> List[QuestionItem]:
    """
    Best-effort question extraction:
    - Reads page text
    - Splits by question-number lines (with fallback patterns)
    - Annotates diagram skip (with overrides)
    """
    exam, section, year = infer_exam_section_from_path(pdf_path)
    paper_id = f"{exam or 'UNKNOWN'}_{(section or 'UNKNOWN').replace(' ', '')}_{year or 'UNK'}_{pdf_path.stem[:40]}"

    doc = fitz.open(pdf_path)
    items: List[QuestionItem] = []
    overrides = overrides or {}

    for pi in range(doc.page_count):
        page = doc.load_page(pi)
        raw = page.get_text("text") or ""
        text = normalize_spaces(raw)
        if not text:
            continue

        page_has_diagram = detect_page_has_diagram(page)

        # Split into question blocks - try primary pattern first
        lines = text.splitlines()
        starts: List[Tuple[int, int, str]] = []
        pattern_used = "primary"
        
        for idx, line in enumerate(lines):
            m = QSTART_RE.match(line)
            if m:
                qnum = int(m.group(1))
                starts.append((idx, qnum, m.group(2)))
        
        # Try fallback patterns if primary found nothing
        if not starts:
            for idx, line in enumerate(lines):
                for pattern_name, pattern_re in [
                    ("fallback1", QSTART_RE_FALLBACK1),
                    ("fallback2", QSTART_RE_FALLBACK2),
                    ("fallback3", QSTART_RE_FALLBACK3),
                ]:
                    m = pattern_re.match(line)
                    if m:
                        qnum = int(m.group(1))
                        rest = m.group(2) if pattern_re.groups >= 2 else ""
                        starts.append((idx, qnum, rest))
                        pattern_used = pattern_name
                        break
                if starts:
                    break

        if not starts:
            continue

        for si, (start_idx, qnum, first_line_rest) in enumerate(starts):
            end_idx = starts[si + 1][0] if si + 1 < len(starts) else len(lines)
            block_lines = [f"{qnum} {first_line_rest}"] + lines[start_idx + 1:end_idx]
            qtext = normalize_spaces("\n".join(block_lines))

            # Diagram rule: check override first, then keywords/page heuristic
            if qnum in overrides:
                # override True = force include (i.e. not skipped)
                skipped = not overrides[qnum]
            else:
                skipped = page_has_diagram or question_contains_diagram_keywords(qtext)

            item = QuestionItem(
                paper_id=paper_id,
                pdf_path=str(pdf_path),
                year=year,
                exam=exam,
                section=section,
                qnum=qnum,
                text=qtext,
                skipped_diagram=skipped,
            )
            items.append(item)

    doc.close()
    return items


def build_or_load_index(papers_dir: Path, force_rebuild: bool = False, 
                       include_non_papers: bool = False,
                       progress_callback: Optional[Callable[[int, int, str]]] = None) -> List[QuestionItem]:
    """Build index with incremental per-PDF caching.
    
    Args:
        progress_callback: Optional function(current, total, current_file) called during indexing
    """
    # Load diagram overrides
    overrides_map = load_diagram_overrides()
    
    # Load aggregated index if exists and not forcing rebuild
    if INDEX_JSON.exists() and not force_rebuild:
        data = json.loads(safe_read_text(INDEX_JSON))
        items = [QuestionItem(**x) for x in data]
        # Only include TMUA questions
        items = [q for q in items if q.exam == "TMUA"]
        return items

    pdfs = [Path(p) for p in glob.glob(str(papers_dir / "**" / "*.pdf"), recursive=True)]

    # Only include TMUA papers (filter out everything else)
    pdfs = [p for p in pdfs if "tmua" in str(p).lower()]

    # Filter out answer keys/conversion tables unless include_non_papers is True
    if not include_non_papers:
        pdfs = [p for p in pdfs if not any(
            keyword in p.name for keyword in ["Answer Key", "Conversion Table", "Official Solutions"]
        )]
    
    total_pdfs = len(pdfs)
    all_items: List[QuestionItem] = []

    for i, pdf in enumerate(pdfs, 1):
        try:
            # Update progress
            if progress_callback:
                progress_callback(i, total_pdfs, pdf.name)
            
            # Check per-PDF cache
            pdf_hash = compute_pdf_hash(pdf)
            cache_file = PDF_CACHE_DIR / f"{pdf.stem}_{pdf_hash}.json"
            
            if cache_file.exists() and not force_rebuild:
                # Load from cache
                cached_data = json.loads(safe_read_text(cache_file))
                items = [QuestionItem(**x) for x in cached_data]
            else:
                # Extract and cache
                pdf_overrides = overrides_map.get(str(pdf), {})
                items = extract_questions_from_pdf(pdf, pdf_overrides)
                # Save to per-PDF cache
                safe_write_text(cache_file, json.dumps([asdict(x) for x in items], indent=2))
            
            # Only include TMUA questions (filter out everything else)
            items = [q for q in items if q.exam == "TMUA"]
            all_items.extend(items)
        except Exception as e:
            print(f"[WARN] Failed to parse {pdf}: {e}")
            if progress_callback:
                progress_callback(i, total_pdfs, f"{pdf.name} (ERROR: {e})")

    # Save aggregated cache
    safe_write_text(INDEX_JSON, json.dumps([asdict(x) for x in all_items], indent=2))
    return all_items


# ----------------------------
# Gemini client
# ----------------------------

class Gemini:
    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        genai.configure(api_key=api_key)
        # Try to create the model, fallback to gemini-1.5-flash if not available
        try:
            self.model = genai.GenerativeModel(model)
        except Exception as e:
            print(f"[WARN] Model {model} not available, trying gemini-1.5-flash: {e}")
            try:
                self.model = genai.GenerativeModel("gemini-1.5-flash")
            except Exception:
                # Last resort: try gemini-pro
                self.model = genai.GenerativeModel("gemini-pro")
        self.api_key = api_key
        self._last_request_time = 0
        self._request_lock = threading.Lock()
        self._min_delay = 1.0  # Minimum delay between requests (seconds) - increased to avoid rate limits

    def _rate_limit(self):
        """Enforce rate limiting with minimum delay between requests."""
        with self._request_lock:
            current_time = time.time()
            time_since_last = current_time - self._last_request_time
            if time_since_last < self._min_delay:
                time.sleep(self._min_delay - time_since_last)
            self._last_request_time = time.time()

    def _retry_with_backoff(self, func, max_retries: int = 3, initial_delay: float = 1.0):
        """Retry function with exponential backoff for rate limit errors."""
        delay = initial_delay
        for attempt in range(max_retries):
            try:
                return func()
            except Exception as e:
                error_str = str(e)
                # Check if it's a rate limit error
                if "429" in error_str or "ResourceExhausted" in error_str or "Resource exhausted" in error_str:
                    if attempt < max_retries - 1:
                        wait_time = delay * (2 ** attempt)  # Exponential backoff
                        print(f"[WARN] Rate limit hit, waiting {wait_time:.1f}s before retry {attempt + 1}/{max_retries}")
                        time.sleep(wait_time)
                        continue
                    else:
                        raise Exception(f"Rate limit exceeded after {max_retries} retries. Please wait and try again later.")
                else:
                    # Not a rate limit error, re-raise immediately
                    raise
        raise Exception("Max retries exceeded")

    def generate_json(self, prompt: str) -> dict:
        """Generate JSON response with rate limiting and retry logic."""
        self._rate_limit()
        
        def _generate():
            resp = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.4,
                    "top_p": 0.9,
                    "max_output_tokens": 4000,
                    "response_mime_type": "application/json",
                },
            )
            return resp
        
        try:
            resp = self._retry_with_backoff(_generate)
        except Exception as e:
            raise Exception(f"Failed to generate JSON after retries: {e}")
        
        # Try to parse JSON with better error handling
        try:
            return json.loads(resp.text)
        except json.JSONDecodeError as e:
            # Try to extract JSON object from response
            text = resp.text.strip()
            # Try to find JSON object boundaries
            m = re.search(r"\{.*\}", text, re.DOTALL)
            if m:
                try:
                    return json.loads(m.group(0))
                except json.JSONDecodeError:
                    pass
            
            # If still failing, try to fix common JSON issues
            # Remove trailing commas, fix unclosed strings, etc.
            fixed_text = text
            # Remove trailing commas before closing braces/brackets
            fixed_text = re.sub(r',(\s*[}\]])', r'\1', fixed_text)
            
            try:
                return json.loads(fixed_text)
            except json.JSONDecodeError:
                raise Exception(f"Failed to parse JSON response. Error: {e}. Response preview: {text[:200]}...")
    
    def generate_text(self, prompt: str, temperature: float = 0.35, max_tokens: int = 1800) -> str:
        """Generate plain text response with rate limiting and retry logic."""
        self._rate_limit()
        
        def _generate():
            resp = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                },
            )
            return resp
        
        try:
            resp = self._retry_with_backoff(_generate)
            return resp.text.strip()
        except Exception as e:
            raise Exception(f"Failed to generate text after retries: {e}")


# ----------------------------
# Prompts
# ----------------------------

def prompt_candidates(
    questions: List[QuestionItem],
    schema_summaries: List[SchemaSummary],
    n_candidates: int = 12,
) -> str:
    """
    The model produces *candidates* (not final schemas).
    We explicitly tell it: ignore diagram questions already filtered,
    and still it must not invent diagram-based patterns.
    """

    # Existing schema summaries (short)
    existing = "\n".join(
        [f"- {s.schema_id}: {s.title} | {s.core_move}".strip() for s in schema_summaries]
    )

    # Evidence corpus: short question IDs + text
    # Keep this short-ish: you can increase batch size later.
    corpus_lines = []
    for q in questions:
        qid = f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "")
        corpus_lines.append(f"[{qid}] {q.text}")

    corpus = "\n\n".join(corpus_lines)

    # Check if we're working with TMUA questions
    is_tmua = any(q.exam == "TMUA" for q in questions)
    
    if is_tmua:
        prefix_instructions = """Prefix assignment (CRITICAL - use the correct prefix based on TMUA paper type):
- M = TMUA Paper 1 (Mathematical Knowledge - pure maths, algebra, calculus, geometry, etc.)
- R = TMUA Paper 2 (Mathematical Reasoning - logical reasoning, problem-solving strategies, etc.)

IMPORTANT: 
- If evidence contains "TMUA_Paper1" or "TMUA Paper 1", use prefix "M"
- If evidence contains "TMUA_Paper2" or "TMUA Paper 2", use prefix "R"
- Do NOT mix Paper 1 and Paper 2 in the same candidate - they are different types of schemas
- Paper 1 (M) = mathematical knowledge and techniques
- Paper 2 (R) = reasoning and problem-solving approaches"""
        exam_type = "TMUA"
        prefix_json = '"M" | "R"'
    else:
        prefix_instructions = """Prefix assignment (CRITICAL - use the correct prefix based on question content):
- M = Maths (mathematical reasoning, algebra, calculus, geometry, etc.)
- P = Physics (mechanics, waves, electricity, thermodynamics, etc.)
- B = Biology (cellular processes, genetics, ecology, physiology, biochemistry, etc.)
- C = Chemistry (organic reactions, bonding, equilibria, kinetics, etc.)

IMPORTANT: NSAA papers contain biology and chemistry questions (especially NSAA Section 2).
When you see biology or chemistry questions in the corpus, you MUST generate B and C schemas.
Do not default to only M and P schemas - actively look for biology/chemistry thinking patterns."""
        exam_type = "ESAT/ENGAA/NSAA"
        prefix_json = '"M" | "P" | "B" | "C"'

    return f"""
You are helping build a compact schema library for {exam_type}-style questions.

A "schema" is a THINKING PATTERN, not a topic.
You must propose CANDIDATES only (title + core move + evidence), not full schema blocks.

{prefix_instructions}

Hard constraints:
- IGNORE any question that involves a diagram, graph, sketch, or figure.
- Do NOT create diagram-dependent schemas.
- Candidate title: 3–8 words, not topic-named (avoid "Integration", "Transformers", etc.).
- Candidate core_move: exactly ONE sentence, actionable ("Infer...", "Exploit...", "Constrain...").
- Evidence must cite question IDs from the corpus below. Do not hallucinate.
- If a candidate overlaps strongly with existing schemas, list the overlapping schema IDs in collision_guess.
- Prefer reusable patterns that could appear across multiple papers.
- Ensure a diverse mix of prefixes when the corpus contains questions from multiple subjects.

Existing schemas:
{existing}

Corpus (questions without diagrams only):
{corpus}

Return ONLY valid JSON with this structure:
{{
  "candidates": [
    {{
      "candidate_id": "C1",
      "prefix": {prefix_json},
      "title": "...",
      "core_move": "...",
      "evidence": ["<qid>", "..."],
      "collision_guess": ["M3", "P5"],
      "confidence": 0.0
    }}
  ]
}}

Produce exactly {n_candidates} candidates if possible. If not possible, produce fewer.
Ensure you generate B and C schemas when biology/chemistry questions are present in the corpus.
"""


def prompt_full_schema(candidate: Candidate, enforce_max4: bool = True) -> str:
    limit_text = ""
    if enforce_max4:
        limit_text = """
Hard formatting constraints:
- Seen in / context: 3–4 bullets max
- Possible wrong paths: 3–4 bullets max
- Notes for generation: 2–4 bullets max
- DO NOT exceed 4 bullets in any section.
"""

    # Check if candidate has TMUA evidence and determine paper type
    is_tmua = has_tmua_evidence(candidate)
    tmua_paper_type = None
    if is_tmua:
        tmua_prefix = get_tmua_prefix_from_evidence(candidate)
        if tmua_prefix == "M":
            tmua_paper_type = "Paper 1 (Mathematical Knowledge)"
        elif tmua_prefix == "R":
            tmua_paper_type = "Paper 2 (Mathematical Reasoning)"
    
    # Build prefix description
    if is_tmua:
        if candidate.prefix == "M":
            prefix_desc = "M = TMUA Paper 1 (Mathematical Knowledge)"
        elif candidate.prefix == "R":
            prefix_desc = "R = TMUA Paper 2 (Mathematical Reasoning)"
        else:
            prefix_desc = f"{candidate.prefix} = TMUA"
    else:
        prefix_desc = "M = maths, P = physics, B = biology, C = chemistry"
    
    tmua_note = ""
    if is_tmua and tmua_paper_type:
        tmua_note = f"""
IMPORTANT: This schema is from TMUA {tmua_paper_type}.
Include a clear note in the "Notes for generation" section indicating this:
- For Paper 1 (M): "- From TMUA Paper 1 (Mathematical Knowledge)"
- For Paper 2 (R): "- From TMUA Paper 2 (Mathematical Reasoning)"
Keep it concise and as the last bullet point if possible.
"""

    return f"""
You are writing a single schema block for {"Schemas_TMUA.md" if is_tmua else "Schemas.md"}.

Candidate:
- Prefix: {candidate.prefix}  ({prefix_desc})
- Title: {candidate.title}
- Core move: {candidate.core_move}
- Evidence question IDs: {candidate.evidence}
{tmua_note}

Write the schema in EXACT markdown format:

## **{candidate.prefix}. {candidate.title}**

**Core thinking move**
{candidate.core_move}

**Seen in / context**
- ...
- ...
- ...

**Possible wrong paths**
- ...
- ...
- ...

**Notes for generation**
- ...
- ...

---

{limit_text}

Important:
- This must describe a thinking pattern, not a syllabus topic.
- Keep bullets short and general.
- Do not mention diagrams/graphs/figures.
- For biology (B) and chemistry (C) schemas: focus on reasoning patterns, not just factual recall.
- Biology schemas should capture patterns like: interpreting experimental data, applying biological principles, reasoning about cellular processes, etc.
- Chemistry schemas should capture patterns like: predicting reaction outcomes, applying bonding principles, reasoning about equilibria, etc.
Return ONLY the markdown block (no commentary).
"""


def prompt_compress_schema(schema_markdown: str) -> str:
    """Prompt for compressing a schema to enforce bullet limits."""
    return f"""
Rewrite this schema block to enforce:
- Maximum 4 bullets per section (Seen in/context, Possible wrong paths, Notes)
- Preserve all meaning and thinking patterns
- Keep exact markdown format
- Do not add new content, only compress existing bullets
- Keep the header format exactly as is (if it has {{ID}}, keep {{ID}}; if it has M. or P., keep that; if it has M1/P2, keep that)

Schema to compress:
{schema_markdown}

Return ONLY the compressed markdown block (no commentary).
"""


def prompt_split_candidate(candidate: Candidate) -> str:
    """Prompt for splitting a candidate into two."""
    return f"""
Split this candidate into TWO distinct candidates:
- Each should be a separate thinking pattern
- Both should have same JSON structure as the original
- Provide evidence question IDs for each
- Use candidate_id "C1" and "C2" for the two new candidates

Original candidate:
{json.dumps(asdict(candidate), indent=2)}

Return ONLY valid JSON with this structure:
{{
  "candidates": [
    {{
      "candidate_id": "C1",
      "prefix": "M" | "P",
      "title": "...",
      "core_move": "...",
      "evidence": ["<qid>", "..."],
      "collision_guess": [],
      "confidence": 0.0
    }},
    {{
      "candidate_id": "C2",
      ...
    }}
  ]
}}
"""


def prompt_enrich_bullet(candidate: Candidate, target_schema_id: str, section: str, 
                         existing_bullet: str) -> str:
    """Prompt for generating a replacement bullet."""
    return f"""
Generate ONE replacement bullet for an existing schema.

Target schema: {target_schema_id}
Section: {section}
Existing bullet to replace: {existing_bullet}

Candidate evidence:
{json.dumps(candidate.evidence, indent=2)}

Candidate title: {candidate.title}
Candidate core move: {candidate.core_move}

Generate a single bullet point that:
- Is general and reusable (not specific to the candidate's evidence)
- Describes a thinking pattern, not a topic
- Does not mention diagrams/graphs/figures
- Fits naturally in the "{section}" section
- Is concise (one line, no more than 20 words)

Return ONLY the bullet text (starting with "- "), no other commentary.
"""


# ----------------------------
# Feature E: Stratified sampling
# ----------------------------

def stratified_sample_questions(pool: List[QuestionItem], batch_size: int, 
                                max_per_paper: int, shuffle: bool = False, 
                                seed: Optional[int] = None) -> List[QuestionItem]:
    """Sample questions across multiple PDFs."""
    if seed is not None:
        random.seed(seed)
    
    # Group by PDF
    by_pdf: Dict[str, List[QuestionItem]] = {}
    for q in pool:
        pdf_path = q.pdf_path
        if pdf_path not in by_pdf:
            by_pdf[pdf_path] = []
        by_pdf[pdf_path].append(q)
    
    # Shuffle within each PDF if requested
    if shuffle:
        for pdf_path in by_pdf:
            random.shuffle(by_pdf[pdf_path])
    
    # Sample up to max_per_paper from each PDF
    sampled: List[QuestionItem] = []
    pdfs = list(by_pdf.keys())
    if shuffle:
        random.shuffle(pdfs)
    
    pdf_idx = 0
    while len(sampled) < batch_size and pdfs:
        pdf_path = pdfs[pdf_idx % len(pdfs)]
        pdf_questions = by_pdf[pdf_path]
        
        # Take up to max_per_paper from this PDF
        remaining = batch_size - len(sampled)
        take = min(max_per_paper, remaining, len(pdf_questions))
        
        sampled.extend(pdf_questions[:take])
        pdf_questions[:] = pdf_questions[take:]  # Remove taken questions
        
        # Remove PDF if exhausted
        if not pdf_questions:
            pdfs.remove(pdf_path)
            if pdfs:
                pdf_idx = pdf_idx % len(pdfs)
        else:
            pdf_idx += 1
    
    return sampled


# ----------------------------
# Tkinter UI
# ----------------------------

class App(tk.Tk):
    def __init__(self, project_root: Path, papers_dir: Path, schemas_md: Path):
        super().__init__()
        self.title("Schema Generator (HITL) — Diagram-free questions only")
        self.geometry("1250x700")

        self.project_root = project_root
        self.papers_dir = papers_dir
        self.schemas_md_path = schemas_md

        find_and_load_env(project_root)
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            messagebox.showerror("Missing GEMINI_API_KEY", "Set GEMINI_API_KEY in .env.local")
            raise SystemExit(1)

        self.gemini = Gemini(api_key=api_key, model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"))

        self.index: List[QuestionItem] = []
        self.schema_summaries: List[SchemaSummary] = []
        self.candidates: List[Candidate] = []
        self.sim_hits: Dict[str, List[SimilarityHit]] = {}
        self.schema_embeddings: Dict[str, List[float]] = {}
        self.schemas_meta: Dict[str, Dict[str, any]] = {}
        self.schema_fullness: Dict[str, Dict[str, int]] = {}
        self.diagram_overrides: Dict[str, Dict[int, bool]] = {}
        self.used_question_ids: set = set()  # Track questions already used in batches

        self._build_ui()
        self._load_schemas()
        self._load_embeddings()
        self._load_meta()
        self._load_used_questions()
        
        # Save used questions when app closes
        self.protocol("WM_DELETE_WINDOW", self._on_closing)

    # UI layout
    def _build_ui(self):
        # Top row: Main actions and filters
        top = ttk.Frame(self)
        top.pack(fill="x", padx=10, pady=(8, 4))

        self.force_rebuild_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(top, text="Force rebuild index", variable=self.force_rebuild_var).pack(side="left")

        ttk.Button(top, text="Index PDFs", command=self.on_index).pack(side="left", padx=6)
        ttk.Button(top, text="Generate candidates (batch)", command=self.on_generate).pack(side="left", padx=6)
        ttk.Button(top, text="Reload Schemas.md", command=self._load_schemas).pack(side="left", padx=6)

        ttk.Label(top, text="Batch filter:").pack(side="left", padx=(10, 2))
        self.batch_filter = ttk.Entry(top, width=30)
        self.batch_filter.pack(side="left")

        ttk.Label(top, text="N candidates:").pack(side="left", padx=10)
        self.n_candidates_var = tk.IntVar(value=12)
        ttk.Spinbox(top, from_=5, to=30, textvariable=self.n_candidates_var, width=5).pack(side="left")
        
        # Feature G: Preview button
        ttk.Button(top, text="Preview questions", command=self.on_preview_questions).pack(side="left", padx=6)

        # Feature I: Schema coverage view
        ttk.Button(top, text="Show coverage", command=self.on_show_coverage).pack(side="left", padx=6)

        # Second row: Batch controls and similarity thresholds
        top2 = ttk.Frame(self)
        top2.pack(fill="x", padx=10, pady=(0, 8))
        
        # Feature E: Batch controls
        ttk.Label(top2, text="Batch size:").pack(side="left", padx=(0, 2))
        self.batch_size_var = tk.IntVar(value=50)
        ttk.Spinbox(top2, from_=10, to=200, textvariable=self.batch_size_var, width=5).pack(side="left", padx=(0, 10))
        
        ttk.Label(top2, text="Max per paper:").pack(side="left", padx=(0, 2))
        self.max_per_paper_var = tk.IntVar(value=6)
        ttk.Spinbox(top2, from_=1, to=20, textvariable=self.max_per_paper_var, width=5).pack(side="left", padx=(0, 10))
        
        self.shuffle_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(top2, text="Shuffle", variable=self.shuffle_var).pack(side="left", padx=(0, 10))
        
        ttk.Label(top2, text="Seed:").pack(side="left", padx=(0, 2))
        self.random_seed_var = tk.StringVar(value="")
        ttk.Entry(top2, textvariable=self.random_seed_var, width=8).pack(side="left", padx=(0, 10))
        
        # Feature E: Include non-papers
        self.include_non_papers_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(top2, text="Include non-papers", variable=self.include_non_papers_var).pack(side="left", padx=(0, 15))
        
        # Similarity thresholds (subject-specific) - more prominent
        ttk.Label(top2, text="Auto-ignore thresholds:").pack(side="left", padx=(0, 5))
        ttk.Label(top2, text="M/P:").pack(side="left", padx=(0, 2))
        self.sim_threshold_mp_var = tk.DoubleVar(value=75.0)
        ttk.Spinbox(top2, from_=0, to=100, increment=1, textvariable=self.sim_threshold_mp_var, width=5).pack(side="left", padx=(0, 10))
        ttk.Label(top2, text="B/C:").pack(side="left", padx=(0, 2))
        self.sim_threshold_bc_var = tk.DoubleVar(value=85.0)
        ttk.Spinbox(top2, from_=0, to=100, increment=1, textvariable=self.sim_threshold_bc_var, width=5).pack(side="left", padx=(0, 10))
        ttk.Label(top2, text="R:").pack(side="left", padx=(0, 2))
        self.sim_threshold_r_var = tk.DoubleVar(value=75.0)
        ttk.Spinbox(top2, from_=0, to=100, increment=1, textvariable=self.sim_threshold_r_var, width=5).pack(side="left")

        main = ttk.PanedWindow(self, orient="horizontal")
        main.pack(fill="both", expand=True, padx=10, pady=10)

        # Left: candidate list
        left = ttk.Frame(main)
        main.add(left, weight=1)

        ttk.Label(left, text="Candidates").pack(anchor="w")
        self.cand_list = tk.Listbox(left, height=20)
        self.cand_list.pack(fill="both", expand=True)
        self.cand_list.bind("<<ListboxSelect>>", self.on_select_candidate)

        btn_row = ttk.Frame(left)
        btn_row.pack(fill="x", pady=8)

        ttk.Button(btn_row, text="Accept as NEW", command=self.on_accept_new).pack(side="left")
        ttk.Button(btn_row, text="Ignore", command=self.on_ignore).pack(side="left", padx=8)
        ttk.Button(btn_row, text="Accept All", command=self.on_accept_all).pack(side="left", padx=8)
        
        # Feature B: Additional decision buttons
        btn_row2 = ttk.Frame(left)
        btn_row2.pack(fill="x", pady=4)
        ttk.Button(btn_row2, text="Merge", command=self.on_merge).pack(side="left")
        ttk.Button(btn_row2, text="Enrich", command=self.on_enrich_show).pack(side="left", padx=4)
        ttk.Button(btn_row2, text="Split", command=self.on_split).pack(side="left", padx=4)

        # Middle: candidate detail
        mid = ttk.Frame(main)
        main.add(mid, weight=2)

        ttk.Label(mid, text="Candidate detail").pack(anchor="w")
        self.cand_text = tk.Text(mid, wrap="word", height=15)
        self.cand_text.pack(fill="both", expand=True)

        # Right: similarity hits + preview schema
        right = ttk.Frame(main)
        main.add(right, weight=2)

        ttk.Label(right, text="Closest existing schemas").pack(anchor="w")
        self.hit_text = tk.Text(right, height=6, wrap="word")
        self.hit_text.pack(fill="x")

        ttk.Label(right, text="Generated schema preview (editable)").pack(anchor="w", pady=(10, 0))
        
        # Feature A: Compress button
        preview_controls = ttk.Frame(right)
        preview_controls.pack(fill="x", pady=(0, 4))
        ttk.Button(preview_controls, text="Compress preview", command=self.on_compress_preview).pack(side="left")
        self.validation_status = ttk.Label(preview_controls, text="", foreground="red")
        self.validation_status.pack(side="left", padx=10)
        
        self.schema_preview = tk.Text(right, wrap="word", height=15)
        self.schema_preview.pack(fill="both", expand=True)
        
        # Feature B: Enrich controls (initially hidden)
        enrich_frame = ttk.LabelFrame(right, text="Enrich existing schema")
        enrich_frame.pack(fill="x", pady=(10, 0))
        
        enrich_row1 = ttk.Frame(enrich_frame)
        enrich_row1.pack(fill="x", padx=5, pady=2)
        ttk.Label(enrich_row1, text="Target schema:").pack(side="left")
        self.enrich_schema_var = tk.StringVar(value="")
        self.enrich_schema_combo = ttk.Combobox(enrich_row1, textvariable=self.enrich_schema_var, width=15, state="readonly")
        self.enrich_schema_combo.pack(side="left", padx=5)
        
        ttk.Label(enrich_row1, text="Section:").pack(side="left", padx=(10, 0))
        self.enrich_section_var = tk.StringVar(value="Seen in / context")
        self.enrich_section_combo = ttk.Combobox(enrich_row1, textvariable=self.enrich_section_var, 
                                                  values=["Seen in / context", "Possible wrong paths", "Notes for generation"],
                                                  width=20, state="readonly")
        self.enrich_section_combo.pack(side="left", padx=5)
        self.enrich_section_combo.bind("<<ComboboxSelected>>", lambda e: self._update_enrich_bullet_combo())
        self.enrich_schema_combo.bind("<<ComboboxSelected>>", lambda e: self._update_enrich_bullet_combo())
        
        enrich_row2 = ttk.Frame(enrich_frame)
        enrich_row2.pack(fill="x", padx=5, pady=2)
        ttk.Label(enrich_row2, text="Bullet index:").pack(side="left")
        self.enrich_bullet_var = tk.StringVar(value="1")
        self.enrich_bullet_combo = ttk.Combobox(enrich_row2, textvariable=self.enrich_bullet_var, width=10, state="readonly")
        self.enrich_bullet_combo.pack(side="left", padx=5)
        
        ttk.Button(enrich_row2, text="Generate replacement", command=self.on_generate_replacement).pack(side="left", padx=5)
        ttk.Button(enrich_row2, text="Apply replacement", command=self.on_apply_enrich).pack(side="left", padx=5)
        
        self.enrich_replacement_text = tk.Text(enrich_frame, height=3, wrap="word")
        self.enrich_replacement_text.pack(fill="x", padx=5, pady=2)
        
        self.enrich_frame = enrich_frame
        self.enrich_frame.pack_forget()  # Hide initially

        bottom = ttk.Frame(self)
        bottom.pack(fill="x", padx=10, pady=6, side="bottom")
        
        # Progress bar for indexing (shown only while indexing)
        self.progress_frame = ttk.Frame(bottom)
        self.progress_frame.pack(fill="x", pady=(0, 5))
        self.progress_label = ttk.Label(self.progress_frame, text="")
        self.progress_label.pack(anchor="w")
        self.progress_bar = ttk.Progressbar(self.progress_frame, mode='determinate')
        self.progress_bar.pack(fill="x", pady=(2, 0))
        self.progress_frame.pack_forget()  # Hide initially

        # Persistent progress: questions used vs total available
        progress_row = ttk.Frame(bottom)
        progress_row.pack(fill="x", pady=(2, 0))
        self.paper_progress_label = ttk.Label(progress_row, text="Questions used: 0/0")
        self.paper_progress_label.pack(side="left")
        ttk.Button(progress_row, text="Reset tracking", command=self.on_reset_used_questions, width=12).pack(side="left", padx=(10, 0))
        self.paper_progress = ttk.Progressbar(bottom, mode="determinate")
        self.paper_progress.pack(fill="x", pady=(0, 4))
        
        self.status = ttk.Label(bottom, text="Ready.")
        self.status.pack(anchor="w")

    def _set_status(self, s: str):
        self.status.config(text=s)
        self.update_idletasks()

    def _load_schemas(self):
        if not self.schemas_md_path.exists():
            messagebox.showerror("Schemas.md not found", f"Missing: {self.schemas_md_path}")
            return
        md = safe_read_text(self.schemas_md_path)
        self.schema_summaries = parse_schema_summaries(md)
        self.schema_fullness = compute_schema_fullness(md)
        self._set_status(f"Loaded {len(self.schema_summaries)} schemas from Schemas.md")
        # Update enrich schema combo
        self._update_enrich_controls()
    
    def _load_embeddings(self):
        """Load schema embeddings cache."""
        self.schema_embeddings = load_embeddings()
        # Compute missing embeddings
        if self.schema_summaries:
            self._compute_missing_embeddings()
    
    def _load_meta(self):
        """Load schemas meta and initialize if needed."""
        self.schemas_meta = load_schemas_meta()
        # Initialize missing entries
        for s in self.schema_summaries:
            if s.schema_id not in self.schemas_meta:
                self.schemas_meta[s.schema_id] = {"edits_count": 0, "locked": False}
        save_schemas_meta(self.schemas_meta)
        # Update papers progress in case schemas/index changed
        self._update_paper_progress()
    
    def _load_used_questions(self):
        """Load used question IDs from cache."""
        self.used_question_ids = load_used_questions()
        count = len(self.used_question_ids)
        if count > 0:
            self._set_status(f"Loaded {count} previously used questions from cache.")
    
    def _save_used_questions(self):
        """Save used question IDs to cache."""
        save_used_questions(self.used_question_ids)
    
    def _on_closing(self):
        """Handle app closing - save used questions."""
        self._save_used_questions()
        self.destroy()
    
    def _compute_missing_embeddings(self):
        """Compute embeddings for schemas that don't have them."""
        missing = []
        for s in self.schema_summaries:
            if s.schema_id not in self.schema_embeddings:
                missing.append(s)
        
        if missing:
            def work():
                self._set_status(f"Computing embeddings for {len(missing)} schemas...")
                for s in missing:
                    text = f"{s.title} {s.core_move}"
                    embedding = compute_embedding(text, self.gemini)
                    if embedding:
                        self.schema_embeddings[s.schema_id] = embedding
                save_embeddings(self.schema_embeddings)
                self._set_status("Embeddings computed.")
            
            threading.Thread(target=work, daemon=True).start()

    def _update_paper_progress(self) -> None:
        """Update the progress bar based on questions used vs total available."""
        if not self.index:
            self.paper_progress.config(maximum=1, value=0)
            self.paper_progress_label.config(text="Questions used: 0/0")
            return

        # Total available = diagram-free questions in the index
        total_questions = sum(1 for q in self.index if not q.skipped_diagram)
        
        # Only count used questions that actually exist in the current index
        # This prevents counting questions from different filters or removed papers
        used_in_index = 0
        for q in self.index:
            if not q.skipped_diagram:
                qid = f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "")
                if qid in self.used_question_ids:
                    used_in_index += 1

        if total_questions <= 0:
            self.paper_progress.config(maximum=1, value=0)
            self.paper_progress_label.config(text="Questions used: 0/0")
            return

        used_clamped = min(used_in_index, total_questions)
        self.paper_progress.config(maximum=total_questions, value=used_clamped)
        self.paper_progress_label.config(
            text=f"Questions used: {used_clamped}/{total_questions}"
        )
    
    def _cleanup_stale_used_questions(self) -> None:
        """Remove question IDs from used_question_ids that don't exist in current index."""
        if not self.index:
            return
        
        # Build set of valid question IDs from current index
        valid_qids = set()
        for q in self.index:
            if not q.skipped_diagram:
                qid = f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "")
                valid_qids.add(qid)
        
        # Remove stale question IDs
        before_count = len(self.used_question_ids)
        self.used_question_ids = self.used_question_ids & valid_qids  # Intersection
        after_count = len(self.used_question_ids)
        
        if before_count != after_count:
            # Save cleaned up set
            self._save_used_questions()
            removed = before_count - after_count
            if removed > 0:
                self._set_status(f"Cleaned up {removed} stale question IDs from tracking.")
    
    def on_reset_used_questions(self):
        """Reset the used questions tracking."""
        count = len(self.used_question_ids)
        if count == 0:
            messagebox.showinfo("Already empty", "No questions are currently marked as used.")
            return
        
        if messagebox.askyesno("Reset question tracking", 
            f"Reset tracking for {count} used questions?\n\nThis will allow all questions to be used again in future batches."):
            self.used_question_ids.clear()
            self._save_used_questions()
            self._update_paper_progress()
            self._set_status(f"Reset question tracking. {count} questions are now available again.")
    
    def _update_enrich_controls(self):
        """Update enrich UI controls based on selected candidate."""
        c = self._selected_candidate()
        if not c:
            return
        
        # Update schema combo with similarity hits
        hits = self.sim_hits.get(c.candidate_id, [])
        schema_ids = [h.schema_id for h in hits[:10]] if hits else []
        self.enrich_schema_combo['values'] = schema_ids
        if schema_ids:
            self.enrich_schema_var.set(schema_ids[0])
        
        # Update bullet combo based on selected schema and section
        self._update_enrich_bullet_combo()
    
    def _update_enrich_bullet_combo(self):
        """Update bullet index combo based on selected schema and section."""
        schema_id = self.enrich_schema_var.get()
        section = self.enrich_section_var.get()
        
        if not schema_id or schema_id not in self.schema_fullness:
            self.enrich_bullet_combo['values'] = []
            return
        
        # Map section name to key
        section_key = "seen" if "seen" in section.lower() else ("wrong" if "wrong" in section.lower() else "notes")
        count = self.schema_fullness[schema_id].get(section_key, 0)
        
        if count == 0:
            self.enrich_bullet_combo['values'] = []
            self.enrich_bullet_var.set("")
        else:
            bullet_indices = [str(i+1) for i in range(count)]
            self.enrich_bullet_combo['values'] = bullet_indices
            if bullet_indices:
                self.enrich_bullet_var.set(bullet_indices[0])

    # Index action
    def on_index(self):
        def work():
            self._set_status("Indexing PDFs… (may take a while the first time)")
            
            # Show progress bar
            self.after(0, lambda: self.progress_frame.pack(fill="x", pady=(5, 0)))
            self.after(0, lambda: self.progress_bar.config(maximum=100, value=0))
            
            def update_progress(current: int, total: int, current_file: str):
                """Update progress bar from background thread."""
                percent = int((current / total) * 100) if total > 0 else 0
                self.after(0, lambda: self.progress_bar.config(value=percent))
                self.after(0, lambda: self.progress_label.config(
                    text=f"Processing {current}/{total}: {current_file[:50]}..."
                ))
            
            self.index = build_or_load_index(
                self.papers_dir, 
                force_rebuild=self.force_rebuild_var.get(),
                include_non_papers=self.include_non_papers_var.get(),
                progress_callback=update_progress
            )
            
            total = len(self.index)
            kept = sum(1 for q in self.index if not q.skipped_diagram)
            
            # Check if we're working with TMUA and switch schemas file if needed
            if self.index:
                is_tmua = any(q.exam == "TMUA" for q in self.index)
                if is_tmua:
                    self.schemas_md_path = TMUA_SCHEMAS_MD_DEFAULT
                    # Ensure the file exists (create empty if needed)
                    if not self.schemas_md_path.exists():
                        self.schemas_md_path.write_text("# TMUA Schemas\n\n", encoding="utf-8")
                    # Reload schemas with the new path
                    self.after(0, self._load_schemas)
                    self.after(0, self._load_embeddings)
                    self.after(0, self._load_meta)
            
            # Hide progress bar and show final status
            self.after(0, lambda: self.progress_frame.pack_forget())
            self.after(0, lambda: self.progress_bar.config(value=0))
            # Clean up stale question IDs and update progress after (re)indexing
            self.after(0, self._cleanup_stale_used_questions)
            self.after(0, self._update_paper_progress)
            exam_type = "TMUA" if self.index and any(q.exam == "TMUA" for q in self.index) else "ENGAA/NSAA"
            self._set_status(f"Indexed {total} question blocks ({exam_type}). Diagram-free kept: {kept}. Cache: {INDEX_JSON}")

        threading.Thread(target=work, daemon=True).start()

    # Candidate generation
    def on_generate(self):
        if not self.index:
            messagebox.showinfo("Index first", "Click 'Index PDFs' first.")
            return

        # Ensure correct schemas file path (check if TMUA)
        if self.index:
            is_tmua = any(q.exam == "TMUA" for q in self.index)
            if is_tmua:
                self.schemas_md_path = TMUA_SCHEMAS_MD_DEFAULT
                # Ensure the file exists
                if not self.schemas_md_path.exists():
                    self.schemas_md_path.parent.mkdir(parents=True, exist_ok=True)
                    self.schemas_md_path.write_text("# TMUA Schemas\n\n", encoding="utf-8")
                # Reload schemas with correct path
                self._load_schemas()

        filt = self.batch_filter.get().strip().lower()
        n = int(self.n_candidates_var.get())

        # Select a batch: filter by path substring
        pool = self.index
        if filt:
            pool = [q for q in pool if filt in q.pdf_path.lower()]

        # Only diagram-free
        pool = [q for q in pool if not q.skipped_diagram]

        if len(pool) < 10:
            messagebox.showwarning("Small batch", f"Only {len(pool)} diagram-free questions matched. Try a broader filter.")
            return

        # Feature E: Stratified sampling (excluding already used questions)
        # Filter out questions that have already been used
        unused_pool = [q for q in pool if f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "") not in self.used_question_ids]
        
        if len(unused_pool) < 10:
            # If too few unused, reset and use all
            if messagebox.askyesno("Reset batch tracking?", 
                f"Only {len(unused_pool)} unused questions. Reset tracking and use all questions?"):
                self.used_question_ids.clear()
                self._save_used_questions()
                self._update_paper_progress()
                unused_pool = pool
            else:
                messagebox.showwarning("Small batch", f"Only {len(unused_pool)} unused questions available.")
                return
        
        batch_size = int(self.batch_size_var.get())
        max_per_paper = int(self.max_per_paper_var.get())
        shuffle = self.shuffle_var.get()
        seed_str = self.random_seed_var.get().strip()
        seed = int(seed_str) if seed_str and seed_str.isdigit() else None
        
        batch = stratified_sample_questions(unused_pool, batch_size, max_per_paper, shuffle, seed)
        
        # Mark these questions as used
        for q in batch:
            qid = f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "")
            self.used_question_ids.add(qid)

        # Save used questions to disk
        self._save_used_questions()
        
        # Update global questions-used progress after sampling
        self._update_paper_progress()

        def work():
            self._set_status("Calling Gemini for candidates…")
            prompt = prompt_candidates(batch, self.schema_summaries, n_candidates=n)
            data = self.gemini.generate_json(prompt)

            cands = []
            for obj in data.get("candidates", []):
                try:
                    cands.append(Candidate(
                        candidate_id=str(obj.get("candidate_id", "")),
                        title=str(obj.get("title", "")).strip(),
                        prefix=str(obj.get("prefix", "")).strip().upper(),
                        core_move=str(obj.get("core_move", "")).strip(),
                        evidence=list(obj.get("evidence", [])),
                        collision_guess=list(obj.get("collision_guess", [])),
                        confidence=float(obj.get("confidence", 0.0)),
                    ))
                except Exception:
                    continue

            # Log raw candidates
            append_text(CANDIDATES_JSONL, json.dumps({
                "ts": now_iso(),
                "batch_filter": filt,
                "n_candidates": n,
                "candidates": [asdict(c) for c in cands],
            }) + "\n")

            self.candidates = cands
            
            # Fix TMUA prefixes based on paper type in evidence
            fixed_prefixes = 0
            for c in self.candidates:
                if has_tmua_evidence(c):
                    tmua_prefix = get_tmua_prefix_from_evidence(c)
                    if tmua_prefix:
                        if c.prefix != tmua_prefix:
                            # Update prefix to match paper type
                            old_prefix = c.prefix
                            c.prefix = tmua_prefix
                            fixed_prefixes += 1
                            append_text(CANDIDATES_JSONL, json.dumps({
                                "ts": now_iso(),
                                "action": "prefix_fixed",
                                "candidate_id": c.candidate_id,
                                "old_prefix": old_prefix,
                                "new_prefix": tmua_prefix,
                                "evidence": c.evidence,
                            }) + "\n")
                        # Ensure prefix is valid
                        if c.prefix not in ("M", "R"):
                            # If still invalid, try to infer from evidence
                            if any("Paper1" in e or "Paper 1" in e for e in c.evidence):
                                c.prefix = "M"
                            elif any("Paper2" in e or "Paper 2" in e for e in c.evidence):
                                c.prefix = "R"
            
            if fixed_prefixes > 0:
                self._set_status(f"Fixed {fixed_prefixes} TMUA candidate prefix(es) based on paper type.")
            
            self._compute_similarity_hits()
            
            # Auto-ignore candidates with high similarity (using adjustable thresholds, prefix-specific)
            auto_ignored_count = self._auto_ignore_high_similarity()
            
            self._render_candidate_list()
            status_msg = f"Generated {len(cands)} candidates."
            if auto_ignored_count > 0:
                mp_thresh = self.sim_threshold_mp_var.get()
                bc_thresh = self.sim_threshold_bc_var.get()
                r_thresh = self.sim_threshold_r_var.get()
                status_msg += f" Auto-ignored {auto_ignored_count} as near-duplicates (M/P: >{mp_thresh:.0f}, B/C: >{bc_thresh:.0f}, R: >{r_thresh:.0f}, same prefix only)."
            status_msg += f" {len(self.candidates)} remaining. Select one to preview."
            self._set_status(status_msg)

        threading.Thread(target=work, daemon=True).start()

    def _compute_similarity_hits(self):
        """Compute similarity hits using embeddings + fuzzy."""
        self.sim_hits.clear()
        
        # Compute candidate embeddings
        candidate_embeddings = {}
        for c in self.candidates:
            text = f"{c.title} {c.core_move}"
            embedding = compute_embedding(text, self.gemini)
            if embedding:
                candidate_embeddings[c.candidate_id] = embedding
        
        # Compute similarities
        for c in self.candidates:
            hits = []
            cand_emb = candidate_embeddings.get(c.candidate_id)
            for s in self.schema_summaries:
                existing_emb = self.schema_embeddings.get(s.schema_id)
                score = schema_similarity(c.title, c.core_move, s, cand_emb, existing_emb)
                hits.append(SimilarityHit(schema_id=s.schema_id, score=score, title=s.title))
            hits.sort(key=lambda x: x.score, reverse=True)
            self.sim_hits[c.candidate_id] = hits[:5]
    
    def _auto_ignore_high_similarity(self) -> int:
        """Auto-ignore candidates with similarity > threshold, prefix-specific.
        Uses adjustable thresholds from UI (M/P, B/C, and R).
        Only compares within same prefix (M with M, P with P, B with B, C with C, R with R).
        Returns count ignored."""
        ignored_count = 0
        to_remove = []
        
        # Get thresholds from UI
        threshold_mp = self.sim_threshold_mp_var.get()
        threshold_bc = self.sim_threshold_bc_var.get()
        threshold_r = self.sim_threshold_r_var.get()
        
        for c in self.candidates:
            # Get threshold based on prefix
            if c.prefix in ("M", "P"):
                threshold = threshold_mp
            elif c.prefix in ("B", "C"):
                threshold = threshold_bc
            elif c.prefix == "R":
                threshold = threshold_r
            else:
                # Unknown prefix, skip
                continue
            
            # Filter hits to only include schemas with the same prefix
            hits = self.sim_hits.get(c.candidate_id, [])
            same_prefix_hits = [h for h in hits if h.schema_id.startswith(c.prefix)]
            
            if same_prefix_hits and same_prefix_hits[0].score > threshold:
                top_hit = same_prefix_hits[0]
                append_text(DECISIONS_JSONL, json.dumps({
                    "ts": now_iso(),
                    "decision": "ignore",
                    "candidate": asdict(c),
                    "note": "auto_ignored_high_similarity",
                    "similarity_score": top_hit.score,
                    "top_match_schema_id": top_hit.schema_id,
                    "threshold_used": threshold,
                    "prefix": c.prefix,
                }) + "\n")
                to_remove.append(c)
                ignored_count += 1
        
        # Remove auto-ignored candidates
        for c in to_remove:
            if c in self.candidates:
                self.candidates.remove(c)
        
        return ignored_count

    def _render_candidate_list(self):
        self.cand_list.delete(0, tk.END)
        for c in self.candidates:
            hits = self.sim_hits.get(c.candidate_id, [])
            if hits:
                top_hit = hits[0]
            else:
                top_hit = SimilarityHit("?", 0, "?")
            
            tag = "NEW?"
            # Only suggest MERGE when similarity is very high (>90)
            if top_hit.score > 90:
                tag = "MERGE?"
            elif top_hit.score >= 72:
                tag = "ENRICH?"
            self.cand_list.insert(tk.END, f"[{c.prefix}] {c.title} — {tag} (top {top_hit.schema_id} {top_hit.score:.0f})")

    def _selected_candidate(self) -> Optional[Candidate]:
        sel = self.cand_list.curselection()
        if not sel:
            return None
        idx = sel[0]
        if idx < 0 or idx >= len(self.candidates):
            return None
        return self.candidates[idx]

    def on_select_candidate(self, _evt=None):
        c = self._selected_candidate()
        if not c:
            return

        # Candidate detail
        self.cand_text.delete("1.0", tk.END)
        self.cand_text.insert(tk.END, json.dumps(asdict(c), indent=2))

        # Similarity hits
        self.hit_text.delete("1.0", tk.END)
        hits = self.sim_hits.get(c.candidate_id, [])
        for h in hits:
            self.hit_text.insert(tk.END, f"{h.schema_id} ({h.score:.1f}): {h.title}\n")

        # Generate preview schema (only when selected)
        def work():
            self._set_status("Generating schema preview…")
            md = self.gemini.generate_text(prompt_full_schema(c))
            md = md.strip()

            # Ensure trailing separator for clean append
            if not md.endswith("---"):
                # some models already include it; if not, add it safely
                if not md.endswith("\n"):
                    md += "\n"
                md += "\n---\n"

            self.schema_preview.delete("1.0", tk.END)
            self.schema_preview.insert(tk.END, md)
            
            # Feature A: Validate and show status (with auto-fix for M./P. format)
            is_valid, errors, fixed_md = validate_schema_block(md, auto_fix=True)
            if fixed_md:
                # Auto-fix applied (M. or P. -> {ID}.)
                md = fixed_md
                self.schema_preview.delete("1.0", tk.END)
                self.schema_preview.insert(tk.END, md)
            if is_valid:
                self.validation_status.config(text="✓ Valid", foreground="green")
            else:
                self.validation_status.config(text=f"✗ {len(errors)} error(s)", foreground="red")
            
            self._set_status("Preview ready (edit if needed).")
            self.after(0, self._update_enrich_controls)

        threading.Thread(target=work, daemon=True).start()

    def on_ignore(self):
        c = self._selected_candidate()
        if not c:
            return
        append_text(DECISIONS_JSONL, json.dumps({
            "ts": now_iso(),
            "decision": "ignore",
            "candidate": asdict(c),
            "note": "user ignored",
        }) + "\n")
        # Remove from list
        if c in self.candidates:
            self.candidates.remove(c)
        self._render_candidate_list()
        self._set_status(f"Ignored {c.candidate_id}. {len(self.candidates)} candidates remaining.")
    
    # Feature A: Compress preview
    def on_compress_preview(self):
        preview = self.schema_preview.get("1.0", tk.END).strip()
        if not preview:
            messagebox.showinfo("No preview", "Generate a schema preview first.")
            return
        
        def work():
            self._set_status("Compressing schema preview...")
            compressed = self.gemini.generate_text(prompt_compress_schema(preview))
            compressed = compressed.strip()
            
            # Ensure trailing separator
            if not compressed.endswith("---"):
                if not compressed.endswith("\n"):
                    compressed += "\n"
                compressed += "\n---\n"
            
            self.schema_preview.delete("1.0", tk.END)
            self.schema_preview.insert(tk.END, compressed)
            
            # Re-validate (with auto-fix)
            is_valid, errors, fixed_compressed = validate_schema_block(compressed, auto_fix=True)
            if fixed_compressed:
                compressed = fixed_compressed
                self.schema_preview.delete("1.0", tk.END)
                self.schema_preview.insert(tk.END, compressed)
            if is_valid:
                self.validation_status.config(text="✓ Valid (compressed)", foreground="green")
            else:
                self.validation_status.config(text=f"✗ {len(errors)} error(s)", foreground="red")
            
            self._set_status("Preview compressed.")
        
        threading.Thread(target=work, daemon=True).start()
    
    def on_accept_all(self):
        """Accept all remaining candidates as NEW schemas."""
        if not self.candidates:
            messagebox.showinfo("No candidates", "No candidates remaining to accept.")
            return
        
        # Determine which file will be used
        schemas_file = self.schemas_md_path.name
        if self.index and any(q.exam == "TMUA" for q in self.index):
            schemas_file = "Schemas_TMUA.md"
        
        if not messagebox.askyesno("Accept All", 
            f"Accept all {len(self.candidates)} remaining candidates as NEW schemas?\n\n"
            f"This will generate previews and append each to {schemas_file}."):
            return
        
        def work():
            self._set_status(f"Accepting {len(self.candidates)} candidates...")
            
            # Ensure correct schemas file path (check if TMUA)
            if self.index:
                is_tmua = any(q.exam == "TMUA" for q in self.index)
                if is_tmua:
                    self.schemas_md_path = TMUA_SCHEMAS_MD_DEFAULT
                    # Ensure the file exists
                    if not self.schemas_md_path.exists():
                        self.schemas_md_path.parent.mkdir(parents=True, exist_ok=True)
                        self.schemas_md_path.write_text("# TMUA Schemas\n\n", encoding="utf-8")
                    # Reload schemas with correct path
                    self._load_schemas()
            
            # Initialize counters
            accepted_count = 0
            failed_count = 0
            failed_details = []
            
            # Process each candidate
            candidates_to_process = list(self.candidates)  # Copy list
            for i, c in enumerate(candidates_to_process):
                if c not in self.candidates:  # Skip if already removed
                    continue
                
                try:
                    self._set_status(f"Processing {i+1}/{len(candidates_to_process)}: {c.title}...")
                    
                    # For TMUA, ensure prefix is correct based on paper type
                    if has_tmua_evidence(c):
                        tmua_prefix = get_tmua_prefix_from_evidence(c)
                        if tmua_prefix:
                            c.prefix = tmua_prefix
                        elif c.prefix not in ("M", "R"):
                            # If we can't determine and prefix is wrong, skip with error
                            raise ValueError(f"TMUA candidate {c.candidate_id} has invalid prefix '{c.prefix}'. Expected M (Paper 1) or R (Paper 2) based on evidence.")
                    
                    # Validate prefix
                    if c.prefix not in ("M", "P", "B", "C", "R"):
                        raise ValueError(f"Invalid prefix '{c.prefix}' for candidate {c.candidate_id}. Must be M, P, B, C, or R.")
                    
                    # Generate preview (rate limiting handled internally)
                    md = self.gemini.generate_text(prompt_full_schema(c))
                    md = md.strip()
                    
                    # Ensure trailing separator
                    if not md.endswith("---"):
                        if not md.endswith("\n"):
                            md += "\n"
                        md += "\n---\n"
                    
                    # Validate and auto-fix (soft in Accept All: never block, just log)
                    is_valid, errors, fixed_preview = validate_schema_block(md, auto_fix=True)
                    if fixed_preview:
                        md = fixed_preview

                    if not is_valid:
                        # Log but do NOT block in Accept All
                        append_text(DECISIONS_JSONL, json.dumps({
                            "ts": now_iso(),
                            "decision": "accept_new",
                            "candidate": asdict(c),
                            "status": "accepted_with_validation_issues",
                            "errors": errors,
                        }) + "\n")

                    # Check recurrence (soft in Accept All: log but do not block)
                    satisfied, stats = check_recurrence(c, self.index)
                    if not satisfied:
                        append_text(DECISIONS_JSONL, json.dumps({
                            "ts": now_iso(),
                            "decision": "accept_new",
                            "candidate": asdict(c),
                            "status": "accepted_low_recurrence",
                            "recurrence_stats": stats,
                        }) + "\n")
                    
                    # Ensure correct schemas file path (double-check for TMUA)
                    if has_tmua_evidence(c):
                        self.schemas_md_path = TMUA_SCHEMAS_MD_DEFAULT
                    
                    # Ensure schemas file exists
                    if not self.schemas_md_path.exists():
                        self.schemas_md_path.parent.mkdir(parents=True, exist_ok=True)
                        if has_tmua_evidence(c):
                            initial_content = "# TMUA Schemas\n\n"
                        else:
                            initial_content = "# Schemas\n\n"
                        self.schemas_md_path.write_text(initial_content, encoding="utf-8")
                    
                    # Assign schema ID
                    schemas_md = safe_read_text(self.schemas_md_path)
                    summaries = parse_schema_summaries(schemas_md)
                    new_id = get_next_schema_id(summaries, c.prefix)
                    
                    # Replace {ID} placeholder
                    preview_lines = md.splitlines()
                    if preview_lines and preview_lines[0].startswith("## **"):
                        if "{ID}" in preview_lines[0]:
                            preview_lines[0] = preview_lines[0].replace("{ID}", new_id)
                        else:
                            preview_lines[0] = re.sub(r"^##\s+\*\*.*?\.\s*(.+?)\*\*\s*$", 
                                                     rf"## **{new_id}. \1**", preview_lines[0])
                    md = "\n".join(preview_lines).strip()
                    if not md.endswith("\n"):
                        md += "\n"
                    
                    # Atomic write
                    temp_file = self.schemas_md_path.with_suffix('.tmp')
                    try:
                        current_content = safe_read_text(self.schemas_md_path)
                        new_content = current_content + "\n" + md + "\n"
                        safe_write_text(temp_file, new_content)
                        shutil.move(str(temp_file), str(self.schemas_md_path))
                    except Exception as e:
                        failed_count += 1
                        error_msg = f"Failed to write to {self.schemas_md_path}: {str(e)}"
                        append_text(DECISIONS_JSONL, json.dumps({
                            "ts": now_iso(),
                            "decision": "accept_new",
                            "candidate": asdict(c),
                            "status": "write_failed",
                            "error": error_msg,
                            "schemas_file": str(self.schemas_md_path),
                            "file_exists": self.schemas_md_path.exists(),
                        }) + "\n")
                        # Clean up temp file if it exists
                        if temp_file.exists():
                            try:
                                temp_file.unlink()
                            except:
                                pass
                        continue
                    
                    # Update meta
                    if new_id not in self.schemas_meta:
                        self.schemas_meta[new_id] = {"edits_count": 0, "locked": False}
                    # Track if schema has TMUA evidence
                    self.schemas_meta[new_id]["has_tmua_evidence"] = has_tmua_evidence(c)
                    save_schemas_meta(self.schemas_meta)

                    # Update coverage stats for this schema
                    update_schema_coverage(new_id, c, self.index)
                    
                    # Log success
                    hits = self.sim_hits.get(c.candidate_id, [])
                    top_hit = hits[0] if hits else SimilarityHit("?", 0, "?")
                    append_text(DECISIONS_JSONL, json.dumps({
                        "ts": now_iso(),
                        "decision": "accept_new",
                        "assigned_schema_id": new_id,
                        "candidate": asdict(c),
                        "top_hit": asdict(top_hit),
                        "recurrence_stats": stats,
                        "auto_accepted": True,
                        "has_tmua_evidence": has_tmua_evidence(c),
                        "schemas_file": str(self.schemas_md_path),
                    }) + "\n")
                    
                    # Remove from list
                    if c in self.candidates:
                        self.candidates.remove(c)
                    
                    accepted_count += 1
                    
                    # Reload schemas periodically (every 5 accepts)
                    if accepted_count % 5 == 0:
                        self._load_schemas()
                
                except Exception as e:
                    failed_count += 1
                    error_msg = str(e)
                    error_type = type(e).__name__
                    failed_details.append(f"{c.candidate_id} ({c.title}): {error_type}: {error_msg}")
                    append_text(DECISIONS_JSONL, json.dumps({
                        "ts": now_iso(),
                        "decision": "accept_new",
                        "candidate": asdict(c),
                        "status": "error",
                        "error_type": error_type,
                        "error": error_msg,
                        "schemas_file": str(self.schemas_md_path),
                    }) + "\n")
            
            # Final reload
            self._load_schemas()

            # Clear remaining candidates from the list after processing
            self.candidates.clear()
            self.sim_hits.clear()
            self._render_candidate_list()
            
            status_msg = f"Accepted {accepted_count} schemas."
            if failed_count > 0:
                status_msg += f" {failed_count} failed/skipped."
                if failed_details:
                    # Show first 3 errors in status, full list in messagebox
                    status_msg += f" Check details for errors."
                    error_summary = "\n".join(failed_details[:10])  # Show first 10 errors
                    if len(failed_details) > 10:
                        error_summary += f"\n... and {len(failed_details) - 10} more (see logs)"
                    messagebox.showerror("Accept All - Some Failed", 
                        f"{status_msg}\n\nFailed candidates:\n{error_summary}\n\nCheck {DECISIONS_JSONL} for full details.")
                else:
                    messagebox.showwarning("Accept All - Some Failed", status_msg)
            else:
                # Show a clear success message
                schemas_file_name = self.schemas_md_path.name
                messagebox.showinfo("Accept All Complete", 
                    f"{status_msg}\n\nSchemas saved to: {schemas_file_name}")
            self._set_status(status_msg)
        
        threading.Thread(target=work, daemon=True).start()

    def on_accept_new(self):
        c = self._selected_candidate()
        if not c:
            return

        # Basic checks
        if c.prefix not in ("M", "P", "B", "C", "R"):
            messagebox.showerror("Bad prefix", f"Candidate prefix must be M, P, B, C, or R, got: {c.prefix}")
            return

        # Feature A: Validate preview (with auto-fix)
        preview = self.schema_preview.get("1.0", tk.END).strip()
        if not preview:
            messagebox.showinfo("No preview", "Wait for the schema preview to generate first.")
            return
        
        is_valid, errors, fixed_preview = validate_schema_block(preview, auto_fix=True)
        if fixed_preview:
            # Apply auto-fix
            preview = fixed_preview
            self.schema_preview.delete("1.0", tk.END)
            self.schema_preview.insert(tk.END, preview)
        if not is_valid:
            error_msg = "Schema validation failed:\n" + "\n".join(f"- {e}" for e in errors)
            messagebox.showerror("Validation failed", error_msg + "\n\nUse 'Compress preview' to fix.")
            return

        # Feature D: Recurrence gate
        satisfied, stats = check_recurrence(c, self.index)
        if not satisfied:
            msg = (f"Recurrence check failed:\n"
                   f"- Distinct PDFs: {stats['distinct_pdfs']} (need >=2)\n"
                   f"- Total questions: {stats['total_questions']} (need >=3)\n\n"
                   f"Accept anyway?")
            if not messagebox.askyesno("Low recurrence", msg):
                return

        # Strong overlap? Warn but allow.
        top_hit = self.sim_hits.get(c.candidate_id, [SimilarityHit("?", 0, "?")])[0]
        if top_hit.score >= 84:
            if not messagebox.askyesno("Likely merge", f"Top similarity is {top_hit.schema_id} at {top_hit.score:.0f}.\nStill append as NEW?"):
                return

        # Assign real schema ID and append
        md = safe_read_text(self.schemas_md_path)
        summaries = parse_schema_summaries(md)
        new_id = get_next_schema_id(summaries, c.prefix)

        # Replace {ID} placeholder if present, otherwise rewrite header line.
        # Expect first header like: ## **{ID}. Title** or ## **M. Title** or ## **P. Title**
        preview_lines = preview.splitlines()
        if preview_lines:
            if preview_lines[0].startswith("## **"):
                # Try to replace {ID} placeholder first
                if "{ID}" in preview_lines[0]:
                    preview_lines[0] = preview_lines[0].replace("{ID}", new_id)
                # Otherwise try regex replacement
                else:
                    preview_lines[0] = re.sub(r"^##\s+\*\*.*?\.\s*(.+?)\*\*\s*$", rf"## **{new_id}. \1**", preview_lines[0])
            else:
                preview_lines.insert(0, f"## **{new_id}. {c.title}**")
        preview = "\n".join(preview_lines).strip()
        if not preview.endswith("\n"):
            preview += "\n"

        # Atomic write
        temp_file = self.schemas_md_path.with_suffix('.tmp')
        try:
            current_content = safe_read_text(self.schemas_md_path)
            new_content = current_content + "\n" + preview + "\n"
            safe_write_text(temp_file, new_content)
            shutil.move(str(temp_file), str(self.schemas_md_path))
        except Exception as e:
            messagebox.showerror("Write failed", f"Failed to write Schemas.md: {e}")
            if temp_file.exists():
                temp_file.unlink()
            return

        # Update meta
        if new_id not in self.schemas_meta:
            self.schemas_meta[new_id] = {"edits_count": 0, "locked": False}
        # Track if schema has TMUA evidence
        self.schemas_meta[new_id]["has_tmua_evidence"] = has_tmua_evidence(c)
        save_schemas_meta(self.schemas_meta)

        # Update coverage stats for this schema
        update_schema_coverage(new_id, c, self.index)

        append_text(DECISIONS_JSONL, json.dumps({
            "ts": now_iso(),
            "decision": "accept_new",
            "assigned_schema_id": new_id,
            "candidate": asdict(c),
            "top_hit": asdict(top_hit),
            "recurrence_stats": stats,
            "validation_errors": [] if is_valid else errors,
            "has_tmua_evidence": has_tmua_evidence(c),
        }) + "\n")

        self._load_schemas()
        self._set_status(f"Appended NEW schema {new_id} to Schemas.md")

        messagebox.showinfo("Appended", f"Appended {new_id} to Schemas.md")

    # Feature B: Merge
    def on_merge(self):
        c = self._selected_candidate()
        if not c:
            return
        
        hits = self.sim_hits.get(c.candidate_id, [])
        if not hits:
            messagebox.showinfo("No matches", "No similar schemas found.")
            return
        
        # Show dialog to select target
        target = hits[0].schema_id  # Default to best match
        if len(hits) > 1:
            # Simple dialog - could be improved
            choices = "\n".join(f"{i+1}. {h.schema_id} ({h.score:.1f}): {h.title}" for i, h in enumerate(hits[:5]))
            result = messagebox.askyesno("Merge candidate", 
                f"Merge into which schema?\n\n{choices}\n\nUse {target}?")
            if not result:
                return
        
        append_text(DECISIONS_JSONL, json.dumps({
            "ts": now_iso(),
            "decision": "merge",
            "candidate": asdict(c),
            "merged_into": target,
        }) + "\n")
        
        self._set_status(f"Merged {c.candidate_id} into {target}.")
        # Remove from list
        idx = self.candidates.index(c)
        self.candidates.pop(idx)
        self._render_candidate_list()
    
    # Feature B: Split
    def on_split(self):
        c = self._selected_candidate()
        if not c:
            return
        
        def work():
            self._set_status("Splitting candidate...")
            try:
                data = self.gemini.generate_json(prompt_split_candidate(c))
                new_candidates = []
                for obj in data.get("candidates", []):
                    try:
                        new_c = Candidate(
                            candidate_id=str(obj.get("candidate_id", "")),
                            title=str(obj.get("title", "")).strip(),
                            prefix=str(obj.get("prefix", "")).strip().upper(),
                            core_move=str(obj.get("core_move", "")).strip(),
                            evidence=list(obj.get("evidence", [])),
                            collision_guess=list(obj.get("collision_guess", [])),
                            confidence=float(obj.get("confidence", 0.0)),
                        )
                        new_candidates.append(new_c)
                    except Exception:
                        continue
                
                if len(new_candidates) >= 2:
                    # Remove original, add new ones
                    idx = self.candidates.index(c)
                    self.candidates.pop(idx)
                    self.candidates.extend(new_candidates)
                    
                    # Recompute similarities
                    self._compute_similarity_hits()
                    self._render_candidate_list()
                    
                    append_text(DECISIONS_JSONL, json.dumps({
                        "ts": now_iso(),
                        "decision": "split",
                        "original_candidate": asdict(c),
                        "split_into": [asdict(nc) for nc in new_candidates],
                    }) + "\n")
                    
                    self._set_status(f"Split into {len(new_candidates)} candidates.")
                else:
                    messagebox.showerror("Split failed", "Could not split into 2 candidates.")
            except Exception as e:
                messagebox.showerror("Split error", f"Error splitting candidate: {e}")
        
        threading.Thread(target=work, daemon=True).start()
    
    # Feature B: Enrich
    def on_enrich_show(self):
        """Show/hide enrich controls."""
        if self.enrich_frame.winfo_viewable():
            self.enrich_frame.pack_forget()
        else:
            self.enrich_frame.pack(fill="x", pady=(10, 0))
            self._update_enrich_controls()
    
    def on_generate_replacement(self):
        """Generate replacement bullet for enrich."""
        c = self._selected_candidate()
        if not c:
            messagebox.showinfo("No candidate", "Select a candidate first.")
            return
        
        schema_id = self.enrich_schema_var.get()
        section = self.enrich_section_var.get()
        bullet_idx_str = self.enrich_bullet_var.get()
        
        if not schema_id or not bullet_idx_str:
            messagebox.showinfo("Missing info", "Select target schema, section, and bullet index.")
            return
        
        # Check if schema is locked or full
        meta = self.schemas_meta.get(schema_id, {})
        if meta.get("locked", False) or meta.get("edits_count", 0) >= 3:
            messagebox.showwarning("Schema locked", 
                f"Schema {schema_id} is locked or has too many edits. Cannot enrich.")
            return
        
        # Get existing bullet from Schemas.md
        md = safe_read_text(self.schemas_md_path)
        # Find the specific schema block
        schema_blocks = md.split("---")
        existing_bullet = ""
        for block in schema_blocks:
            if f"**{schema_id}." in block:
                parsed_block = parse_schema_block(block)
                section_key = "seen_context" if "seen" in section.lower() else (
                    "wrong_paths" if "wrong" in section.lower() else "notes")
                bullets = parsed_block.get(section_key, [])
                bullet_idx = int(bullet_idx_str) - 1
                if 0 <= bullet_idx < len(bullets):
                    existing_bullet = bullets[bullet_idx]
                break
        
        if not existing_bullet:
            messagebox.showerror("Bullet not found", f"Could not find bullet {bullet_idx_str} in {section}.")
            return
        
        def work():
            self._set_status("Generating replacement bullet...")
            replacement = self.gemini.generate_text(
                prompt_enrich_bullet(c, schema_id, section, existing_bullet),
                temperature=0.4,
                max_tokens=200
            )
            replacement = replacement.strip()
            if not replacement.startswith("- "):
                replacement = "- " + replacement
            
            self.enrich_replacement_text.delete("1.0", tk.END)
            self.enrich_replacement_text.insert(tk.END, replacement)
            self._set_status("Replacement generated. Review and click 'Apply replacement'.")
        
        threading.Thread(target=work, daemon=True).start()
    
    def on_apply_enrich(self):
        """Apply enrichment replacement to Schemas.md."""
        c = self._selected_candidate()
        if not c:
            return
        
        schema_id = self.enrich_schema_var.get()
        section = self.enrich_section_var.get()
        bullet_idx_str = self.enrich_bullet_var.get()
        replacement = self.enrich_replacement_text.get("1.0", tk.END).strip()
        
        if not all([schema_id, section, bullet_idx_str, replacement]):
            messagebox.showinfo("Missing info", "Fill in all enrich fields.")
            return
        
        # Check locking
        meta = self.schemas_meta.get(schema_id, {})
        if meta.get("locked", False) or meta.get("edits_count", 0) >= 3:
            messagebox.showwarning("Schema locked", f"Schema {schema_id} is locked or has too many edits.")
            return
        
        # Read and patch Schemas.md
        md = safe_read_text(self.schemas_md_path)
        lines = md.splitlines()
        
        # Find schema block
        schema_start = None
        for i, line in enumerate(lines):
            if f"**{schema_id}." in line:
                schema_start = i
                break
        
        if schema_start is None:
            messagebox.showerror("Schema not found", f"Could not find schema {schema_id}.")
            return
        
        # Find section and bullet
        section_key = "seen_context" if "seen" in section.lower() else (
            "wrong_paths" if "wrong" in section.lower() else "notes")
        section_header = "Seen in / context" if "seen" in section.lower() else (
            "Possible wrong paths" if "wrong" in section.lower() else "Notes for generation")
        
        bullet_idx = int(bullet_idx_str) - 1
        in_target_section = False
        bullet_count = 0
        target_line_idx = None
        
        for i in range(schema_start, len(lines)):
            line = lines[i]
            if section_header.lower() in line.lower():
                in_target_section = True
                bullet_count = 0
                continue
            if in_target_section:
                if line.strip().startswith("- "):
                    if bullet_count == bullet_idx:
                        target_line_idx = i
                        break
                    bullet_count += 1
                elif line.strip().startswith("**") or line.strip() == "---" or line.strip().startswith("##"):
                    break
        
        if target_line_idx is None:
            messagebox.showerror("Bullet not found", f"Could not find bullet {bullet_idx_str} in {section}.")
            return
        
        # Replace the line
        old_bullet = lines[target_line_idx]
        lines[target_line_idx] = replacement
        
        # Atomic write
        temp_file = self.schemas_md_path.with_suffix('.tmp')
        try:
            new_content = "\n".join(lines)
            safe_write_text(temp_file, new_content)
            shutil.move(str(temp_file), str(self.schemas_md_path))
        except Exception as e:
            messagebox.showerror("Write failed", f"Failed to write Schemas.md: {e}")
            if temp_file.exists():
                temp_file.unlink()
            return
        
        # Update meta
        if schema_id not in self.schemas_meta:
            self.schemas_meta[schema_id] = {"edits_count": 0, "locked": False}
        self.schemas_meta[schema_id]["edits_count"] = self.schemas_meta[schema_id].get("edits_count", 0) + 1
        if self.schemas_meta[schema_id]["edits_count"] >= 5:
            self.schemas_meta[schema_id]["locked"] = True
        save_schemas_meta(self.schemas_meta)
        
        append_text(DECISIONS_JSONL, json.dumps({
            "ts": now_iso(),
            "decision": "enrich_replace",
            "candidate": asdict(c),
            "target_schema_id": schema_id,
            "section": section,
            "bullet_index": bullet_idx_str,
            "old_bullet": old_bullet,
            "new_bullet": replacement,
        }) + "\n")
        
        self._load_schemas()
        self._set_status(f"Enriched {schema_id} - replaced bullet {bullet_idx_str} in {section}.")
        messagebox.showinfo("Enriched", f"Replaced bullet in {schema_id}.")
    
    # Feature G: Preview questions
    def on_preview_questions(self):
        """Open preview window for extracted questions."""
        if not self.index:
            messagebox.showinfo("Index first", "Click 'Index PDFs' first.")
            return
        
        # Filter by batch filter if set
        filt = self.batch_filter.get().strip().lower()
        pdfs = set(q.pdf_path for q in self.index)
        if filt:
            pdfs = {p for p in pdfs if filt in p.lower()}
        
        # Create preview window
        preview_win = tk.Toplevel(self)
        preview_win.title("Preview Extracted Questions")
        preview_win.geometry("1000x700")
        
        main_pane = ttk.PanedWindow(preview_win, orient="horizontal")
        main_pane.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Left: PDF list
        left_frame = ttk.Frame(main_pane)
        main_pane.add(left_frame, weight=1)
        
        ttk.Label(left_frame, text="PDFs").pack(anchor="w")
        pdf_listbox = tk.Listbox(left_frame)
        pdf_listbox.pack(fill="both", expand=True)
        
        for pdf_path in sorted(pdfs):
            pdf_listbox.insert(tk.END, Path(pdf_path).name)
        
        # Right: Questions for selected PDF
        right_frame = ttk.Frame(main_pane)
        main_pane.add(right_frame, weight=2)
        
        ttk.Label(right_frame, text="Questions").pack(anchor="w")
        questions_text = tk.Text(right_frame, wrap="word")
        questions_text.pack(fill="both", expand=True)
        
        def on_pdf_select(evt):
            sel = pdf_listbox.curselection()
            if not sel:
                return
            pdf_name = pdf_listbox.get(sel[0])
            pdf_path = next((p for p in pdfs if Path(p).name == pdf_name), None)
            if not pdf_path:
                return
            
            # Get questions for this PDF
            pdf_questions = [q for q in self.index if q.pdf_path == pdf_path]
            pdf_questions.sort(key=lambda x: x.qnum)
            
            questions_text.delete("1.0", tk.END)
            total = len(pdf_questions)
            skipped = sum(1 for q in pdf_questions if q.skipped_diagram)
            kept = total - skipped
            
            questions_text.insert(tk.END, f"Total: {total}, Skipped: {skipped}, Kept: {kept}\n\n")
            
            for q in pdf_questions:
                status = "✗ SKIPPED" if q.skipped_diagram else "✓"
                questions_text.insert(tk.END, f"{status} Q{q.qnum}: {q.text[:200]}...\n\n")
        
        pdf_listbox.bind("<<ListboxSelect>>", on_pdf_select)
        
        # Load diagram overrides
        self.diagram_overrides = load_diagram_overrides()
        
        # Add override buttons (simplified - could be enhanced)
        override_frame = ttk.Frame(right_frame)
        override_frame.pack(fill="x", pady=5)
        ttk.Label(override_frame, text="Note: Overrides can be set by editing diagram_overrides.json").pack()

    def on_show_coverage(self):
        """Show a simple view of schema coverage/weights."""
        coverage = load_schema_coverage()
        if not coverage:
            messagebox.showinfo("Schema coverage", "No coverage data yet. Accept some schemas first.")
            return

        # Build a sorted list of (schema_id, total, top papers...)
        rows = []
        for schema_id, data in coverage.items():
            total = data.get("total", 0)
            by_paper = data.get("by_paper", {})
            # Top 3 papers by count
            top_papers = sorted(by_paper.items(), key=lambda kv: kv[1], reverse=True)[:3]
            rows.append((schema_id, total, top_papers))

        rows.sort(key=lambda r: r[1], reverse=True)

        win = tk.Toplevel(self)
        win.title("Schema coverage")
        win.geometry("700x500")

        text = tk.Text(win, wrap="word")
        text.pack(fill="both", expand=True)

        text.insert(tk.END, "Schema coverage (higher total = appears more in evidence):\n\n")
        for schema_id, total, top_papers in rows:
            text.insert(tk.END, f"{schema_id}: total evidence = {total}\n")
            if top_papers:
                text.insert(tk.END, "  Top papers:\n")
                for paper_key, count in top_papers:
                    text.insert(tk.END, f"    - {paper_key}: {count}\n")
            text.insert(tk.END, "\n")

        text.config(state="disabled")


def main():
    # Let you override with env vars if you want
    project_root = Path(os.getenv("SCHEMA_PROJECT_ROOT", str(PROJECT_ROOT_DEFAULT)))
    papers_dir = Path(os.getenv("SCHEMA_PAPERS_DIR", str(PAPERS_DIR_DEFAULT)))
    schemas_md = Path(os.getenv("SCHEMA_SCHEMAS_MD", str(SCHEMAS_MD_DEFAULT)))

    app = App(project_root=project_root, papers_dir=papers_dir, schemas_md=schemas_md)
    app.mainloop()


if __name__ == "__main__":
    main()

