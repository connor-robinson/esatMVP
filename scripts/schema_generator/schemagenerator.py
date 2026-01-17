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
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import tempfile
import shutil
import random
import uuid
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

# Mode: "ESAT" (default) indexes ENGAA/NSAA/ESAT, "TMUA" indexes TMUA only
MODE = os.getenv("SCHEMA_MODE", "ESAT")  # "ESAT" or "TMUA"

# Portable project root (derived from script location, overridable via env var)
PROJECT_ROOT_DEFAULT = Path(__file__).resolve().parent.parent.parent

# Default papers directory (can be overridden via env var or UI)
PAPERS_DIR_DEFAULT = PROJECT_ROOT_DEFAULT / "scripts" / "schema_generator" / "papers"

# Central schemas directory (replaces legacy "1. Designer" folder)
SCHEMAS_DIR_DEFAULT = PROJECT_ROOT_DEFAULT / "scripts" / "esat_question_generator" / "schemas"

# Select schemas file based on MODE
if MODE == "TMUA":
    # TMUA has TWO separate schema files (Paper 1 and Paper 2 are different exam types)
    SCHEMAS_MD_DEFAULT = SCHEMAS_DIR_DEFAULT / "Schemas_TMUA_Paper1.md"  # Default to Paper 1
else:  # ESAT mode
    SCHEMAS_MD_DEFAULT = SCHEMAS_DIR_DEFAULT / "Schemas_ESAT.md"

# TMUA separate schema files
TMUA_PAPER1_SCHEMAS_MD = SCHEMAS_DIR_DEFAULT / "Schemas_TMUA_Paper1.md"  # Mathematical Knowledge
TMUA_PAPER2_SCHEMAS_MD = SCHEMAS_DIR_DEFAULT / "Schemas_TMUA_Paper2.md"  # Mathematical Reasoning

# Cache + logs now live alongside schemas for easier reasoning about one "schemas" area
CACHE_DIR_DEFAULT = SCHEMAS_DIR_DEFAULT / "_cache"
LOG_DIR_DEFAULT = SCHEMAS_DIR_DEFAULT / "_logs"

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

# Full automation configuration
MAX_QUESTIONS_PER_SCHEMA = 5  # Maximum questions per schema before creating new one (increased from 5)
CONFIDENCE_THRESHOLD = 6.5  # fit_score threshold (0-10) - below this creates new schema (lowered from 7.5 to allow more exemplars)
PARALLEL_WORKERS = 5  # Number of parallel Gemini API workers


# ----------------------------
# Data models
# ----------------------------

@dataclass
class QuestionItem:
    paper_id: str
    pdf_path: str
    year: Optional[str]
    exam: Optional[str]
    section: Optional[str]  # For TMUA: "Paper 1" or "Paper 2"
    qnum: int
    text: str
    skipped_diagram: bool
    # TMUA Official Solutions fields
    solution_text: Optional[str] = None  # Full solution text from Official Solutions PDF
    solution_pdf_path: Optional[str] = None  # Path to the Official Solutions PDF that provided this solution

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
    evidence: List[str]  # e.g. ["ENGAA_S1_2021_Q11", ...] - Now requires 3-8 items
    collision_guess: List[str]  # existing schema IDs
    confidence: float  # 0..1
    exemplar_justifications: Optional[Dict[str, str]] = None  # qid -> one-line reason
    # New fields for designer-ready schemas
    trigger_cues: Optional[List[str]] = None  # 2-5 cues that help detect the schema
    canonical_steps: Optional[List[str]] = None  # 3-6 steps (phrases)
    variation_knobs: Optional[List[str]] = None  # 3-6 ways to generate new questions
    distractor_archetypes: Optional[List[str]] = None  # 2-4 common wrong moves
    answer_form: Optional[str] = None  # "integer|rational|algebraic|logic|multiple_choice_logic|other"
    scope: Optional[str] = None  # "too_broad|good|too_specific"
    collision_reason: Optional[str] = None  # Reason for collision_guess if nonempty

@dataclass
class ReasoningFingerprint:
    """Structured reasoning pattern extracted from a question."""
    object_type: str  # "function", "geometry", "reaction", etc.
    constraint_types: List[str]  # ["value at point", "conservation", etc.]
    asked_type: str  # "compute value", "compare", "count solutions", etc.
    dominant_move: str  # One sentence describing the key reasoning step
    wrong_path_family: List[str]  # Common wrong approaches (2-4 bullets)

@dataclass
class QuestionFingerprint:
    """Enhanced fingerprint for Stage 1 extraction with clustering-friendly fields."""
    qid: str
    eligible: bool
    reasoning_pattern_hint: str  # 3-8 word pattern label (not topic)
    core_move_guess: str  # One imperative sentence
    trigger_cues: List[str]  # 2-5 concrete surface signals
    mini_steps: List[str]  # 3-6 short steps (phrases)
    wrong_move: str  # One sentence describing common incorrect approach
    answer_form: str  # "integer|rational|algebraic|logic|multiple_choice_logic|other"
    confidence: float  # 0.0-1.0

@dataclass
class PDFExtractionStats:
    """Statistics for PDF extraction quality tracking."""
    pdf_path: str
    status: str  # "SUCCESS" | "FAILED_TEXT_EXTRACTION"
    total_chars: int
    question_count: int
    median_question_length: int
    failure_reason: Optional[str]
    extracted_at: str

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

# Support both sequential (M1) and unique (M_a1b2c3d4) formats
SCHEMA_HEADER_RE = re.compile(r"^##\s+\*\*(([MPBCR])(?:\d+|_[a-f0-9]{8}))\.\s*(.+?)\*\*\s*$", re.MULTILINE)
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

        # group(1) = full ID like "M12", group(2) = prefix letter, group(3) = title
        schema_id = m.group(1)
        title = m.group(3).strip()
        core_move = ""

        # scan forward for "**Core thinking move**" then next non-empty line
        j = i + 1
        while j < len(lines):
            low = lines[j].strip().lower()
            if low == "**core thinking move**" or low.startswith("**core move"):
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
    """Legacy function for sequential IDs. Use generate_unique_schema_id() for new schemas."""
    nums = []
    for s in summaries:
        if s.schema_id.startswith(prefix):
            try:
                # Handle both M1 and M_uuid formats
                if "_" in s.schema_id:
                    # Skip unique IDs, only count sequential
                    continue
                nums.append(int(s.schema_id[1:]))
            except ValueError:
                pass
    n = max(nums) + 1 if nums else 1
    return f"{prefix}{n}"


def normalize_prefix(prefix: str) -> str:
    """
    Normalize prefix to a single letter (M, P, B, C, R).
    Handles multi-prefix formats like "M|P|B|C" by taking the first valid prefix.
    """
    # Remove any pipe characters and take first letter
    normalized = prefix.replace("|", "").replace("&", "").strip()
    if normalized:
        first_char = normalized[0].upper()
        if first_char in ("M", "P", "B", "C", "R"):
            return first_char
    # Fallback to M if invalid
    return "M"


def generate_unique_schema_id(prefix: str) -> str:
    """
    Generate a unique schema ID that never conflicts, even with parallel processing.
    Format: {PREFIX}_{8-char-uuid} (e.g., M_a1b2c3d4)
    Prefix is normalized to single letter (M, P, B, C, R).
    """
    normalized_prefix = normalize_prefix(prefix)
    unique_suffix = uuid.uuid4().hex[:8]
    return f"{normalized_prefix}_{unique_suffix}"


def clean_schema_markdown(md: str, unique_id: str, title: str) -> str:
    """
    Clean ALL placeholders from schema markdown before writing to file.
    Replaces:
    - {ID} or {{ID}} with unique_id
    - {{TITLE}} or {TITLE} with title
    - {question_id_1}, {question_id_2}, etc. with empty string
    - {justification_1}, {justification_2}, etc. with empty string
    - {example_question_id_2}, etc. with empty string
    - Any sequential IDs (M1, M12, etc.) with unique_id
    - Multi-prefix IDs (M|P|B|C_xxx) normalized to single prefix
    """
    lines = md.splitlines()
    
    # Process header line FIRST - this is critical
    if lines and lines[0].startswith("## **"):
        # Extract title from header (handle any format: M1, M., {ID}, M|P|B|C_xxx, etc.)
        title_match = re.search(r"^##\s+\*\*.*?\.\s*(.+?)\*\*\s*$", lines[0])
        if title_match:
            extracted_title = title_match.group(1).strip()
            # Clean title of placeholders
            cleaned_title = extracted_title.replace("{{TITLE}}", title).replace("{TITLE}", title)
            # If title is still a placeholder or empty, use the provided title
            if cleaned_title in ("{{TITLE}}", "{TITLE}", "") or not cleaned_title.strip():
                cleaned_title = title
            # ALWAYS use unique_id in header, regardless of what was there
            lines[0] = f"## **{unique_id}. {cleaned_title}**"
        else:
            # No title found, use provided title
            lines[0] = f"## **{unique_id}. {title}**"
    
    # Process all other lines - replace placeholders
    cleaned_lines = []
    for line in lines:
        # Replace {ID} and {{ID}} placeholders
        line = line.replace("{ID}", unique_id).replace("{{ID}}", unique_id)
        
        # Replace {{TITLE}} and {TITLE} placeholders
        line = line.replace("{{TITLE}}", title).replace("{TITLE}", title)
        
        # Replace question ID placeholders (e.g., {question_id_1}, {example_question_id_2})
        line = re.sub(r"\{[^}]*question[^}]*id[^}]*\}", "", line)
        line = re.sub(r"\{[^}]*example[^}]*\}", "", line)
        
        # Replace justification placeholders (e.g., {justification_1}, {justification_2})
        line = re.sub(r"\{[^}]*justification[^}]*\}", "", line)
        
        # Remove empty exemplar question lines (lines with just backticks or empty)
        stripped = line.strip()
        if stripped.startswith("- `") and (stripped == "- ``:" or stripped == "- ``" or ": ``" in stripped or stripped.endswith(": ")):
            continue  # Skip empty exemplar lines
        
        cleaned_lines.append(line)
    
    result = "\n".join(cleaned_lines)
    
    # Ensure proper ending
    if not result.endswith("\n"):
        result += "\n"
    
    return result


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
        "notes": [],
        "exemplar_questions": []  # List of (question_id, justification) tuples
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
        
        # Check for core move (supports both old "Core thinking move" and new "Core move" headings)
        low = line.lower()
        if low == "**core thinking move**" or low.startswith("**core thinking move") or low.startswith("**core move"):
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
        elif "exemplar questions" in line.lower():
            current_section = "exemplar_questions"
            i += 1
            continue
        
        # Check for bullets
        if line.startswith("- ") and current_section:
            bullet_text = line[2:].strip()
            if bullet_text:
                if current_section == "exemplar_questions":
                    # Parse exemplar question format: `question_id`: justification
                    # Handle both with and without backticks
                    if "`" in bullet_text:
                        # Format: - `question_id`: justification
                        parts = bullet_text.split("`")
                        if len(parts) >= 3:
                            qid = parts[1].strip()
                            justification = parts[2].strip().lstrip(":").strip()
                            result["exemplar_questions"].append((qid, justification))
                    else:
                        # Format: - question_id: justification (fallback)
                        if ":" in bullet_text:
                            qid, justification = bullet_text.split(":", 1)
                            result["exemplar_questions"].append((qid.strip(), justification.strip()))
                else:
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
    Accepts: M1/P2/B3/C4 (sequential), M_a1b2c3d4 (unique), M./P./B./C. (without number), or {ID} (placeholder).
    """
    errors = []
    parsed = parse_schema_block(markdown)
    fixed_markdown = None
    
    # Check header format - accept M1/P2/B3/C4/R5, M_a1b2c3d4 (unique), M./P./B./C./R., or {ID} placeholder
    if not parsed["schema_id"]:
        errors.append(
            "Missing or invalid schema header "
            "(expected: ## **M\\d+|P\\d+|B\\d+|C\\d+|R\\d+. Title** or "
            "## **M_[a-f0-9]{8}. Title** (unique) or "
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


def get_tmua_paper_type_from_evidence_ids(evidence_ids: List[str]) -> tuple[str, bool]:
    """
    Determine TMUA paper type from evidence/question IDs.
    Returns: (paper_type, is_mixed) where paper_type is "Paper1", "Paper2", or "Mixed"
    """
    paper1_count = 0
    paper2_count = 0
    
    for qid in evidence_ids:
        qid_upper = str(qid).upper()
        if "TMUA" in qid_upper:
            if "PAPER1" in qid_upper or "PAPER 1" in qid_upper or "_PAPER1" in qid_upper:
                paper1_count += 1
            elif "PAPER2" in qid_upper or "PAPER 2" in qid_upper or "_PAPER2" in qid_upper:
                paper2_count += 1
    
    if paper1_count > 0 and paper2_count == 0:
        return ("Paper1", False)
    elif paper2_count > 0 and paper1_count == 0:
        return ("Paper2", False)
    elif paper1_count > 0 and paper2_count > 0:
        return ("Mixed", True)
    else:
        # No clear TMUA evidence - check prefix
        # M prefix = Paper 1, R prefix = Paper 2 (for schemas already created)
        return ("Unknown", False)


def extract_schema_blocks_from_markdown(markdown: str) -> List[tuple[str, str]]:
    """
    Extract individual schema blocks from markdown.
    Returns: List of (schema_id, block_text) tuples.
    """
    blocks = []
    lines = markdown.splitlines()
    
    i = 0
    while i < len(lines):
        m = SCHEMA_HEADER_RE.match(lines[i].strip())
        if not m:
            i += 1
            continue
        
        schema_id = m.group(1)
        block_start = i
        
        # Find the end of this schema block (next schema header or end of file)
        i += 1
        while i < len(lines):
            line = lines[i].strip()
            # Stop at next schema header
            if SCHEMA_HEADER_RE.match(line):
                break
            # Stop at separator after schema content
            if line == "---" and i > block_start + 5:  # At least a few lines of content
                i += 1  # Include the separator
                break
            i += 1
        
        # Extract the block
        block_lines = lines[block_start:i]
        block_text = "\n".join(block_lines)
        
        # Ensure block ends with separator
        if not block_text.strip().endswith("---"):
            block_text += "\n\n---\n"
        
        blocks.append((schema_id, block_text))
        
        # If we hit a separator, skip it
        if i < len(lines) and lines[i].strip() == "---":
            i += 1
    
    return blocks


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
    """
    Check if candidate evidence spans multiple papers.
    Returns (passes, details) where details includes:
    - pdf_count: number of distinct PDFs
    - pdf_list: list of PDF names
    - evidence_distribution: dict of pdf -> question count
    """
    mapping = map_evidence_to_papers(candidate, index)
    distinct_pdfs = len(mapping)
    total_questions = len(candidate.evidence)
    
    # Build evidence distribution
    evidence_distribution = {}
    pdf_list = []
    for pdf_path, qids in mapping.items():
        pdf_name = Path(pdf_path).name
        pdf_list.append(pdf_name)
        evidence_distribution[pdf_name] = len(qids)
    
    stats = {
        "pdf_count": distinct_pdfs,
        "distinct_pdfs": distinct_pdfs,  # Keep for backward compatibility
        "total_questions": total_questions,
        "pdfs": list(mapping.keys()),  # Full paths
        "pdf_list": pdf_list,  # Just names
        "evidence_distribution": evidence_distribution
    }
    
    # Require: >=2 distinct PDFs OR (>=3 questions AND >=2 PDFs preferred)
    satisfied = distinct_pdfs >= 2 or (total_questions >= 3 and distinct_pdfs >= 2)
    
    return satisfied, stats


def validate_prefix_against_content(candidate: Candidate, index: List[QuestionItem]) -> Tuple[bool, str]:
    """
    Check if prefix matches question content.
    Returns (is_valid, warning_message)
    
    For ESAT mode:
    - M = Math keywords (algebra, calculus, geometry, equation, function, derivative, integral)
    - P = Physics keywords (force, energy, motion, velocity, acceleration, momentum, field)
    - B = Biology keywords (cell, enzyme, DNA, protein, gene, organism, tissue)
    - C = Chemistry keywords (reaction, bond, molecule, atom, compound, element, ion)
    
    For TMUA mode:
    - M = Paper 1 evidence
    - R = Paper 2 evidence
    """
    # Get evidence questions
    evidence_questions = []
    for qid in candidate.evidence:
        for q in index:
            q_id = f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "")
            if q_id == qid:
                evidence_questions.append(q)
                break
    
    if not evidence_questions:
        return True, ""  # Can't validate without questions
    
    # Combine all question text
    all_text = " ".join(q.text.lower() for q in evidence_questions)
    
    if MODE == "TMUA":
        # For TMUA, check paper type matches prefix
        paper_types = set()
        for q in evidence_questions:
            if q.section:
                if "paper 1" in q.section.lower():
                    paper_types.add("M")
                elif "paper 2" in q.section.lower():
                    paper_types.add("R")
        
        if paper_types and candidate.prefix not in paper_types:
            expected = "/".join(sorted(paper_types))
            return False, f"Prefix '{candidate.prefix}' doesn't match evidence paper type (expected {expected})"
    
    elif MODE == "ESAT":
        # For ESAT, check subject keywords
        keyword_counts = {
            "M": ["algebra", "calculus", "geometry", "equation", "function", "derivative", "integral", 
                  "polynomial", "trigonometric", "logarithm", "exponential", "matrix", "vector"],
            "P": ["force", "energy", "motion", "velocity", "acceleration", "momentum", "field", 
                  "mass", "charge", "current", "voltage", "wave", "frequency", "particle"],
            "B": ["cell", "enzyme", "dna", "protein", "gene", "organism", "tissue", "membrane", 
                  "mitochondria", "chloroplast", "photosynthesis", "respiration", "evolution"],
            "C": ["reaction", "bond", "molecule", "atom", "compound", "element", "ion", 
                  "electron", "oxidation", "reduction", "acid", "base", "catalyst", "equilibrium"]
        }
        
        # Count keyword matches for each subject
        subject_scores = {}
        for subject, keywords in keyword_counts.items():
            count = sum(1 for kw in keywords if kw in all_text)
            subject_scores[subject] = count
        
        # Find dominant subject
        if subject_scores:
            max_score = max(subject_scores.values())
            if max_score > 0:
                dominant_subjects = [s for s, score in subject_scores.items() if score == max_score]
                
                if candidate.prefix not in dominant_subjects:
                    expected = "/".join(sorted(dominant_subjects))
                    return False, f"Prefix '{candidate.prefix}' may not match content (found more {expected} keywords)"
    
    return True, ""


def extract_question_fingerprint(question: QuestionItem, gemini: 'Gemini') -> Optional[QuestionFingerprint]:
    """
    Extract enhanced question fingerprint using Stage 1 prompt.
    Returns None if extraction fails.
    """
    try:
        # Load fingerprint extraction prompt
        template = load_prompt_template(FINGERPRINT_EXTRACTION_PROMPT_PATH)
        
        qid = f"{question.exam}_{question.section}_{question.year}_Q{question.qnum}".replace(" ", "")
        question_text = question.text[:1000] if question.text else ""
        solution_text = question.solution_text[:1000] if question.solution_text else ""
        has_diagram = question.skipped_diagram  # Note: skipped_diagram is True if diagram was detected
        
        prompt = template.format(
            qid=qid,
            question_text=question_text,
            solution_text=solution_text,
            has_diagram=has_diagram
        )
        
        resp = gemini.generate_json(prompt)
        if resp and isinstance(resp, dict):
            # Handle list wrapper if present
            if isinstance(resp, list):
                resp = resp[0] if resp else {}
            elif "candidates" in resp and isinstance(resp["candidates"], list):
                resp = resp["candidates"][0] if resp["candidates"] else {}
            
            if resp:
                return QuestionFingerprint(
                    qid=str(resp.get("qid", qid)),
                    eligible=bool(resp.get("eligible", True)),
                    reasoning_pattern_hint=str(resp.get("reasoning_pattern_hint", "")),
                    core_move_guess=str(resp.get("core_move_guess", "")),
                    trigger_cues=list(resp.get("trigger_cues", [])),
                    mini_steps=list(resp.get("mini_steps", [])),
                    wrong_move=str(resp.get("wrong_move", "")),
                    answer_form=str(resp.get("answer_form", "other")),
                    confidence=float(resp.get("confidence", 0.0))
                )
    except Exception as e:
        print(f"[WARN] Failed to extract question fingerprint: {e}")
    
    return None


def extract_reasoning_fingerprint(question: QuestionItem, gemini: 'Gemini') -> Optional[ReasoningFingerprint]:
    """
    Use Gemini to extract structured reasoning fingerprint from question.
    Returns None if extraction fails.
    """
    prompt = f"""Analyze this exam question and extract its reasoning structure.

Question text:
{question.text[:1000]}

Extract and return ONLY valid JSON with this structure:
{{
  "object_type": "function|geometry|reaction|experiment|etc",
  "constraint_types": ["value at point", "conservation", "stoichiometry", "etc"],
  "asked_type": "compute value|compare|count solutions|identify|infer|etc",
  "dominant_move": "One sentence describing the key reasoning step",
  "wrong_path_family": ["Common wrong approach 1", "Common wrong approach 2"]
}}

Focus on the REASONING PATTERN, not the topic.
"""
    
    try:
        resp = gemini.generate_json(prompt)
        if resp and isinstance(resp, dict):
            return ReasoningFingerprint(
                object_type=str(resp.get("object_type", "unknown")),
                constraint_types=list(resp.get("constraint_types", [])),
                asked_type=str(resp.get("asked_type", "unknown")),
                dominant_move=str(resp.get("dominant_move", "")),
                wrong_path_family=list(resp.get("wrong_path_family", []))
            )
    except Exception as e:
        print(f"[WARN] Failed to extract reasoning fingerprint: {e}")
    
    return None


def _extract_fingerprint_worker(question: QuestionItem, gemini: 'Gemini', fingerprints_dir: Path) -> Tuple[str, Optional[QuestionFingerprint], Optional[str]]:
    """
    Worker function for parallel fingerprint extraction.
    Returns (qid, fingerprint, error_message).
    """
    qid = f"{question.exam}_{question.section}_{question.year}_Q{question.qnum}".replace(" ", "")
    fingerprint_file = fingerprints_dir / f"{qid}.json"
    
    # Skip if already exists
    if fingerprint_file.exists():
        try:
            with open(fingerprint_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return (qid, QuestionFingerprint(**data), None)
        except Exception as e:
            # File exists but corrupted, re-extract
            pass
    
    # Extract fingerprint with retries
    max_retries = 3
    for attempt in range(max_retries):
        try:
            fingerprint = extract_question_fingerprint(question, gemini)
            if fingerprint:
                # Save to file
                fingerprint_file.parent.mkdir(parents=True, exist_ok=True)
                with open(fingerprint_file, 'w', encoding='utf-8') as f:
                    json.dump(asdict(fingerprint), f, indent=2)
                return (qid, fingerprint, None)
        except Exception as e:
            if attempt == max_retries - 1:
                return (qid, None, str(e))
            time.sleep(0.5 * (attempt + 1))  # Exponential backoff
    
    return (qid, None, "Failed after retries")


def _wait_for_fingerprints(expected_count: int, fingerprints_dir: Path, max_wait_seconds: int = 300, check_interval: float = 2.0) -> bool:
    """
    Barrier implementation: wait for all expected fingerprints to be written.
    Returns True when all complete, False if timeout.
    """
    start_time = time.time()
    while time.time() - start_time < max_wait_seconds:
        # Count fingerprint files
        fingerprint_files = list(fingerprints_dir.glob("*.json"))
        actual_count = len(fingerprint_files)
        
        if actual_count >= expected_count:
            return True
        
        time.sleep(check_interval)
    
    return False


def compute_schema_fit_score(
    question: QuestionItem,
    schema: SchemaSummary,
    question_fingerprint: Optional[ReasoningFingerprint],
    schema_exemplars: List[QuestionItem],
    gemini: 'Gemini'
) -> Tuple[float, Dict[str, float]]:
    """
    Compute fit score (0-10) with breakdown.
    
    Rubric (0-2 points each):
    1. Core move match
    2. Same decision point
    3. Same error family
    4. Same answer form
    5. Solution compressibility
    
    Returns (total_score, rubric_breakdown)
    """
    rubric = {
        "core_move_match": 0.0,
        "decision_point": 0.0,
        "error_family": 0.0,
        "answer_form": 0.0,
        "compressibility": 0.0
    }
    
    # If no fingerprint, use simpler text-based scoring
    if not question_fingerprint or not schema_exemplars:
        # Fallback: simple text similarity
        q_text = question.text.lower()
        schema_text = f"{schema.title} {schema.core_move}".lower()
        
        # Basic keyword overlap
        q_words = set(q_text.split())
        s_words = set(schema_text.split())
        overlap = len(q_words & s_words) / max(len(q_words), 1)
        
        # Distribute score evenly
        base_score = min(overlap * 10, 2.0)
        for key in rubric:
            rubric[key] = base_score / 5
        
        return sum(rubric.values()), rubric
    
    # Use LLM to score fit
    exemplar_texts = "\n\n".join([f"Exemplar {i+1}: {ex.text[:300]}..." 
                                   for i, ex in enumerate(schema_exemplars[:3])])
    
    prompt = f"""Score how well this question fits the schema pattern (0-2 points each category):

Schema: {schema.title}
Core move: {schema.core_move}

Question fingerprint:
- Object type: {question_fingerprint.object_type}
- Constraints: {', '.join(question_fingerprint.constraint_types)}
- Asked: {question_fingerprint.asked_type}
- Dominant move: {question_fingerprint.dominant_move}

Exemplar questions from schema:
{exemplar_texts}

Score these aspects (0-2 each):
1. core_move_match: Does question use same dominant reasoning move?
2. decision_point: Same critical decision point where weaker candidates branch wrong?
3. error_family: Same types of wrong approaches?
4. answer_form: Same output type (value/count/comparison/etc)?
5. compressibility: Once seen, is solution short and clean like exemplars?

Return ONLY valid JSON:
{{
  "core_move_match": 0.0-2.0,
  "decision_point": 0.0-2.0,
  "error_family": 0.0-2.0,
  "answer_form": 0.0-2.0,
  "compressibility": 0.0-2.0
}}
"""
    
    try:
        resp = gemini.generate_json(prompt)
        if resp and isinstance(resp, dict):
            for key in rubric:
                if key in resp:
                    rubric[key] = float(resp[key])
    except Exception as e:
        print(f"[WARN] Failed to compute fit score: {e}")
    
    total = sum(rubric.values())
    return total, rubric


def match_question_to_schemas(
    question: QuestionItem,
    existing_schemas: List[SchemaSummary],
    schema_exemplars: Dict[str, List[QuestionItem]],
    gemini: 'Gemini',
    top_k: int = 5
) -> List[Tuple[str, float, str]]:
    """
    Match question to existing schemas.
    
    Returns list of (schema_id, fit_score, decision) where decision is:
    - "attach" (score 8-10)
    - "split_candidate" (score 5-7)
    - "new_schema" (score 0-4)
    """
    if not existing_schemas:
        return []
    
    # Extract reasoning fingerprint for question
    question_fingerprint = extract_reasoning_fingerprint(question, gemini)
    
    # Score against all schemas
    results = []
    for schema in existing_schemas[:top_k]:  # Limit to top K for performance
        exemplars = schema_exemplars.get(schema.schema_id, [])
        score, rubric = compute_schema_fit_score(
            question, schema, question_fingerprint, exemplars, gemini
        )
        
        # Determine decision based on score
        if score >= 8.0:
            decision = "attach"
        elif score >= 5.0:
            decision = "split_candidate"
        else:
            decision = "new_schema"
        
        results.append((schema.schema_id, score, decision))
    
    # Sort by score descending
    results.sort(key=lambda x: x[1], reverse=True)
    
    return results[:top_k]


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


def compute_diagram_likelihood(qtext: str, page_has_images: bool) -> float:
    """
    Returns 0.0-1.0 score indicating likelihood question depends on diagram.
    >0.5 = likely diagram-dependent, should skip
    
    Scoring:
    - Diagram keywords in text: +0.6
    - Page has images: +0.2 (weak evidence)
    """
    score = 0.0
    
    if question_contains_diagram_keywords(qtext):
        score += 0.6
    
    if page_has_images:
        score += 0.2  # Weak evidence - page might have unrelated images
    
    return score


def infer_exam_section_from_path(pdf_path: Path) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Very lightweight inference from directory names like:
      .../ENGAA Section 1/ENGAA Section 1 2021 Past Paper.pdf
    """
    parts = [p.lower() for p in pdf_path.parts]
    exam = None
    section = None
    year = None

    # exam - check NSAA before ENGAA to prioritize NSAA detection
    # (though they shouldn't both appear in the same path)
    for ex in ["nsaa", "engaa", "tmua"]:
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


def get_paper_identifier_from_path(pdf_path: Path) -> str:
    """
    Extract normalized paper identifier from path for matching Past Papers with Official Solutions.
    Example: "TMUA 2023 Paper 1 Past Paper.pdf" -> "TMUA_2023_Paper1"
    Example: "TMUA 2023 Paper 1 Official Solutions.pdf" -> "TMUA_2023_Paper1"
    """
    exam, section, year = infer_exam_section_from_path(pdf_path)
    
    # Build normalized identifier
    parts = []
    if exam:
        parts.append(exam.upper())
    if year:
        parts.append(year)
    if section:
        # Normalize section: "Paper 1" -> "Paper1", "Section 1" -> "Section1"
        section_normalized = section.replace(" ", "")
        parts.append(section_normalized)
    
    if not parts:
        # Fallback: try to extract from filename
        name_lower = pdf_path.name.lower()
        # Look for patterns like "tmua 2023 paper 1"
        m = re.search(r"(tmua|nsaa|engaa)\s*(\d{4})\s*(paper|section)\s*(\d)", name_lower)
        if m:
            parts = [m.group(1).upper(), m.group(2), f"{m.group(3).capitalize()}{m.group(4)}"]
        else:
            # Last resort: use stem
            parts = [pdf_path.stem]
    
    return "_".join(parts)


def find_matching_solutions_pdf(past_paper_path: Path, solutions_list: List[Path]) -> Optional[Path]:
    """
    Find Official Solutions PDF that matches a Past Paper.
    Returns the matching solutions PDF path, or None if not found.
    """
    paper_id = get_paper_identifier_from_path(past_paper_path)
    for sol_path in solutions_list:
        sol_id = get_paper_identifier_from_path(sol_path)
        if paper_id == sol_id:
            return sol_path
    return None


def validate_pdf_extraction(items: List[QuestionItem], pdf_path: Path) -> Tuple[bool, str]:
    """
    Validate extracted questions meet quality thresholds.
    Returns (is_valid, failure_reason)
    
    Failure conditions (conservative thresholds):
    - Total non-whitespace chars < 500
    - Zero questions detected
    - Median question length < 40 chars
    - For non-TMUA: No option letters found (A-D)
    - For TMUA: More lenient - options might be on separate answer sheet
    """
    if not items:
        return False, "No questions detected"
    
    # Calculate total non-whitespace characters
    total_chars = sum(len(q.text.replace(" ", "").replace("\n", "").replace("\t", "")) for q in items)
    if total_chars < 500:
        return False, f"Insufficient text content ({total_chars} chars < 500 threshold)"
    
    # Calculate median question length
    question_lengths = [len(q.text.strip()) for q in items]
    question_lengths.sort()
    median_length = question_lengths[len(question_lengths) // 2] if question_lengths else 0
    
    if median_length < 40:
        return False, f"Questions too short (median {median_length} chars < 40 threshold)"
    
    # Check if this is a TMUA paper
    is_tmua = any("TMUA" in str(pdf_path).upper() for item in items if item.exam == "TMUA") or "TMUA" in str(pdf_path).upper()
    
    # For TMUA: More lenient validation - options might be on separate answer sheet
    # Just check that we have reasonable question count (15-25 questions expected)
    if is_tmua:
        if len(items) < 10:
            return False, f"Too few questions extracted ({len(items)} < 10) - likely extraction issue"
        # Don't require option letters for TMUA - they might be on answer sheet
        return True, ""
    
    # For non-TMUA: Check for option letters (A-D)
    all_text = " ".join(q.text for q in items)
    has_options = bool(re.search(r'[A-D]\)|[A-D]\.|\([A-D]\)|[A-D]:', all_text))
    
    if not has_options:
        return False, "No option letters (A-D) found - likely not a question paper"
    
    return True, ""


def extract_questions_from_pdf(pdf_path: Path, overrides: Optional[Dict[int, bool]] = None) -> Tuple[List[QuestionItem], PDFExtractionStats]:
    """
    Best-effort question extraction:
    - For TMUA: Uses per-page extraction (one question per page typically)
    - For others: Splits by question-number lines (with fallback patterns)
    - Annotates diagram skip (with overrides)
    """
    exam, section, year = infer_exam_section_from_path(pdf_path)
    paper_id = f"{exam or 'UNKNOWN'}_{(section or 'UNKNOWN').replace(' ', '')}_{year or 'UNK'}_{pdf_path.stem[:40]}"

    doc = fitz.open(pdf_path)
    items: List[QuestionItem] = []
    overrides = overrides or {}
    
    # Check if this is a TMUA paper - use per-page extraction
    is_tmua = exam == "TMUA"
    
    # For TMUA, skip first page (cover/instructions), then use one question per page
    start_page = 1 if is_tmua else 0
    
    for pi in range(start_page, doc.page_count):
        page = doc.load_page(pi)
        raw = page.get_text("text") or ""
        text = normalize_spaces(raw)
        if not text or len(text.strip()) < 50:  # Skip blank pages
            continue

        page_has_diagram = detect_page_has_diagram(page)
        
        if is_tmua:
            # TMUA: One question per page - extract question number from first few lines
            lines = text.splitlines()
            qnum = None
            
            # Try to find question number in first 5 non-empty lines
            # TMUA question numbers are typically at the very top of the page
            qnum = None
            for line_idx, line in enumerate(lines[:5]):
                line_stripped = line.strip()
                if not line_stripped or line_stripped.lower() in ["blank page", "page", ""]:
                    continue
                
                # Pattern 1: Just number alone on line (most common for TMUA): "1", "2", "3"
                m = re.match(r"^(\d{1,2})\s*$", line_stripped)
                if m:
                    candidate = int(m.group(1))
                    if 1 <= candidate <= 25:
                        qnum = candidate
                        break
                
                # Pattern 2: Number followed by space and text: "1 ", "2 "
                # Must be at start of line and have substantial content after
                m = re.match(r"^(\d{1,2})\s+", line_stripped)
                if m:
                    candidate = int(m.group(1))
                    if 1 <= candidate <= 25 and len(line_stripped) > 5:  # Must have content after number
                        qnum = candidate
                        break
                
                # Pattern 3: "Question N" or "Q N" (explicit)
                m = re.match(r"^Question\s+(\d{1,2})[:\.]?\s*", line_stripped, re.IGNORECASE)
                if m:
                    candidate = int(m.group(1))
                    if 1 <= candidate <= 25:
                        qnum = candidate
                        break
                m = re.match(r"^Q\.?\s*(\d{1,2})[:\.]?\s*", line_stripped, re.IGNORECASE)
                if m:
                    candidate = int(m.group(1))
                    if 1 <= candidate <= 25:
                        qnum = candidate
                        break
            
            # If no explicit question number found, infer from page number
            # (accounting for skipped cover page) - but only for reasonable page numbers
            if qnum is None:
                inferred_qnum = (pi - start_page) + 1
                # Only use inference if it's reasonable (1-25)
                if 1 <= inferred_qnum <= 25:
                    qnum = inferred_qnum
                else:
                    # Skip this page if we can't determine question number
                    continue
            
            # Use entire page text as question text
            qtext = text.strip()
            
            # Skip if page appears to be instructions/cover or too many questions
            if qnum > 25 or len(qtext) < 100:
                continue
            
            # TMUA uses A-J options (10 choices) - but allow through even without explicit options
            # (options might be on separate answer sheet)
            
            # Diagram detection: User requested to ignore diagram filtering for now
            # Always set skipped_diagram = False (don't filter out any questions)
            skipped = False
            
            # Note: We don't skip questions here - we'll handle that in build_or_load_index
            # after extracting solutions, so we can still match solutions to question numbers

            item = QuestionItem(
                paper_id=paper_id,
                pdf_path=str(pdf_path),
                year=year,
                exam=exam,
                section=section,
                qnum=qnum,
                text=qtext,
                skipped_diagram=skipped,  # Always False now
            )
            items.append(item)
                
        else:
            # Non-TMUA: Original multi-question-per-page logic
            lines = text.splitlines()
            starts: List[Tuple[int, int, str]] = []
            
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
                            break
                    if starts:
                        break

            if not starts:
                continue
            
            # Process all questions found on this page
            for si, (start_idx, qnum, first_line_rest) in enumerate(starts):
                end_idx = starts[si + 1][0] if si + 1 < len(starts) else len(lines)
                block_lines = [f"{qnum} {first_line_rest}"] + lines[start_idx + 1:end_idx]
                qtext = normalize_spaces("\n".join(block_lines))
                
                # Sanity filter: skip questions that are too short or malformed
                if len(qtext.strip()) < 40:
                    continue
                
                # Validate options (non-TMUA uses A-D)
                if not re.search(r'[A-D]\)|[A-D]\.|\([A-D]\)', qtext):
                    continue
                
                # Diagram detection: User requested to ignore diagram filtering for now
                # Always set skipped_diagram = False (don't filter out any questions)
                skipped = False

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
    
    # Validate extraction and create stats
    is_valid, failure_reason = validate_pdf_extraction(items, pdf_path)
    
    # Calculate stats
    question_lengths = [len(q.text.strip()) for q in items] if items else [0]
    question_lengths.sort()
    median_length = question_lengths[len(question_lengths) // 2] if question_lengths else 0
    total_chars = sum(len(q.text.replace(" ", "").replace("\n", "").replace("\t", "")) for q in items)
    
    stats = PDFExtractionStats(
        pdf_path=str(pdf_path),
        status="SUCCESS" if is_valid else "FAILED_TEXT_EXTRACTION",
        total_chars=total_chars,
        question_count=len(items),
        median_question_length=median_length,
        failure_reason=failure_reason if not is_valid else None,
        extracted_at=now_iso()
    )
    
    return items, stats


def extract_solutions_from_official_solutions_pdf(pdf_path: Path) -> Dict[int, str]:
    """
    Extract question number -> solution text mappings from Official Solutions PDF.
    Returns: {1: "solution text for Q1", 2: "solution text for Q2", ...}
    Handles multiple solutions per page and various question marker formats.
    """
    doc = fitz.open(pdf_path)
    solutions: Dict[int, str] = {}
    
    # Pattern to match question markers: "Question 1", "Q1", "1.", "1)", etc.
    question_marker_patterns = [
        re.compile(r"^Question\s+(\d{1,2})[:\.]?\s*", re.IGNORECASE),
        re.compile(r"^Q\.?\s*(\d{1,2})[:\.]?\s*", re.IGNORECASE),
        re.compile(r"^(\d{1,2})[:\.\)]\s+", re.IGNORECASE),
        re.compile(r"^(\d{1,2})\s+", re.IGNORECASE),  # Just number + space (like "1 ")
    ]
    
    # Extract all text from all pages
    full_text = ""
    for page_num in range(doc.page_count):
        page = doc.load_page(page_num)
        page_text = page.get_text("text") or ""
        full_text += normalize_spaces(page_text) + "\n"
    
    doc.close()
    
    # Find all question markers and their positions
    lines = full_text.splitlines()
    question_positions: List[Tuple[int, int]] = []  # (line_index, question_num)
    
    for idx, line in enumerate(lines):
        line_stripped = line.strip()
        if not line_stripped:
            continue
            
        for pattern in question_marker_patterns:
            m = pattern.match(line_stripped)
            if m:
                try:
                    qnum = int(m.group(1))
                    # Only accept reasonable question numbers (1-25 for TMUA)
                    if 1 <= qnum <= 25:
                        question_positions.append((idx, qnum))
                        break
                except (ValueError, IndexError):
                    continue
    
    if not question_positions:
        # Fallback: look for numbered sections in text
        print(f"[WARN] No question markers found in {pdf_path.name}, trying alternative patterns")
        return solutions
    
    # Sort by line index to ensure correct order
    question_positions.sort()
    
    # Extract solution text between question markers
    for i, (start_idx, qnum) in enumerate(question_positions):
        # End at next question marker or end of document
        end_idx = question_positions[i + 1][0] if i + 1 < len(question_positions) else len(lines)
        
        # Extract solution text (skip the question marker line itself)
        solution_lines = lines[start_idx + 1:end_idx]
        solution_text = normalize_spaces("\n".join(solution_lines))
        
        # Clean up: remove common prefixes/suffixes that might have been included
        solution_text = re.sub(r"^(Solution|Answer|Solution:?|Answer:?)\s*:?\s*", "", solution_text, flags=re.IGNORECASE)
        solution_text = solution_text.strip()
        
        # Remove trailing dots/dashes that might be from page formatting
        solution_text = re.sub(r"\.+$", "", solution_text)  # Remove trailing dots
        solution_text = solution_text.strip()
        
        if solution_text and len(solution_text) > 10:  # Minimum reasonable solution length
            # If we already have a solution for this question number, append (might be continuation)
            if qnum in solutions:
                solutions[qnum] += "\n\n" + solution_text
            else:
                solutions[qnum] = solution_text
    
    return solutions


def save_extraction_report(stats: List[PDFExtractionStats], total_scanned: int, 
                          solution_coverage: Optional[Dict[str, int]] = None,
                          discarded_papers: int = 0) -> None:
    """Save extraction report to _logs/extraction_report.json"""
    report_path = LOG_DIR_DEFAULT / "extraction_report.json"
    
    success_count = sum(1 for s in stats if s.status == "SUCCESS")
    failed_count = sum(1 for s in stats if s.status == "FAILED_TEXT_EXTRACTION")
    
    report = {
        "created_at": now_iso(),
        "mode": MODE,
        "thresholds": {
            "min_chars": 500,
            "min_question_length": 40
        },
        "summary": {
            "scanned": total_scanned,
            "success": success_count,
            "failed": failed_count
        },
        "per_pdf": [asdict(s) for s in stats]
    }
    
    # Add TMUA-specific stats if available
    if MODE == "TMUA" and solution_coverage:
        report["tmua_stats"] = {
            "discarded_papers_without_solutions": discarded_papers,
            "total_questions": solution_coverage["total_questions"],
            "questions_with_solutions": solution_coverage["questions_with_solutions"],
            "solution_coverage_percent": (solution_coverage["questions_with_solutions"] / solution_coverage["total_questions"] * 100) if solution_coverage["total_questions"] > 0 else 0.0
        }
    
    safe_write_text(report_path, json.dumps(report, indent=2))
    print(f"[INFO] Extraction report saved to {report_path}")


def build_or_load_index(papers_dir: Path, force_rebuild: bool = False, 
                       include_non_papers: bool = False,
                       progress_callback: Optional[Callable[[int, int, str]]] = None) -> List[QuestionItem]:
    """Build index with incremental per-PDF caching.
    
    Args:
        progress_callback: Optional function(current, total, current_file) called during indexing
    """
    # Load diagram overrides
    overrides_map = load_diagram_overrides()
    
    # Debug: Log current mode and papers directory
    print(f"[INDEX] Mode: {MODE}, Papers dir: {papers_dir}, Exists: {papers_dir.exists()}")
    
    # Load aggregated index if exists and not forcing rebuild
    if INDEX_JSON.exists() and not force_rebuild:
        data = json.loads(safe_read_text(INDEX_JSON))
        items = [QuestionItem(**x) for x in data]
        print(f"[INDEX] Loaded {len(items)} questions from cache")
        
        # Debug: Show exam distribution before filtering
        exam_counts = {}
        for q in items:
            exam = q.exam or "None"
            exam_counts[exam] = exam_counts.get(exam, 0) + 1
        print(f"[INDEX] Exam distribution before filtering: {exam_counts}")
        
        # Filter based on MODE
        before_count = len(items)
        if MODE == "TMUA":
            items = [q for q in items if q.exam == "TMUA"]
        elif MODE == "ESAT":
            items = [q for q in items if q.exam != "TMUA"]  # Includes None values
        
        print(f"[INDEX] After filtering: {before_count} -> {len(items)} questions")
        
        # Remove unknown papers (section = None, "?", or empty)
        before_unknown_filter = len(items)
        items = [
            q for q in items
            if q.section  # Must have a section
            and q.section != "?"  # Not unknown
            and (isinstance(q.section, str) and q.section.strip() != "")  # Not empty
        ]
        if before_unknown_filter > len(items):
            print(f"[INDEX] Removed {before_unknown_filter - len(items)} questions from unknown papers")
        
        return items

    # Discover PDFs
    pdfs = [Path(p) for p in glob.glob(str(papers_dir / "**" / "*.pdf"), recursive=True)]
    print(f"[INDEX] Found {len(pdfs)} PDFs before filtering")

    # Filter PDFs based on MODE
    if MODE == "TMUA":
        # Only include TMUA papers
        before_count = len(pdfs)
        pdfs = [p for p in pdfs if "tmua" in str(p).lower()]
        print(f"[INDEX] TMUA filter: {before_count} -> {len(pdfs)} PDFs")
    elif MODE == "ESAT":
        # Exclude TMUA, keep ENGAA/NSAA/ESAT
        before_count = len(pdfs)
        pdfs = [p for p in pdfs if "tmua" not in str(p).lower()]
        print(f"[INDEX] ESAT filter: {before_count} -> {len(pdfs)} PDFs")

    # Filter out "Spec" folders (specifications/specimen papers)
    before_count = len(pdfs)
    pdfs = [p for p in pdfs if " spec" not in str(p).lower() and not str(p).lower().endswith(" spec.pdf")]
    if before_count > len(pdfs):
        print(f"[INDEX] Spec filter: {before_count} -> {len(pdfs)} PDFs (excluded Spec folders)")

    # Track valid paper pairs for TMUA mode (will be used in extraction loop)
    valid_tmua_pairs: List[Tuple[Path, Path]] = []
    discarded_tmua_count = 0
    tmua_solutions_map: Dict[Path, Path] = {}  # Lookup: past_paper_path -> solutions_path
    
    # Filter PDFs based on mode - TMUA mode handles Past Papers and Official Solutions differently
    if MODE == "TMUA":
        # Step 1: Separate Past Papers from Official Solutions
        past_papers = [p for p in pdfs if "past paper" in p.name.lower()]
        official_solutions = [p for p in pdfs if "official solutions" in p.name.lower()]
        
        print(f"[INDEX] TMUA mode: Found {len(past_papers)} Past Papers and {len(official_solutions)} Official Solutions PDFs")
        
        # Step 2: Match Past Papers with Official Solutions and discard unmatched
        for pp in past_papers:
            matching_solution = find_matching_solutions_pdf(pp, official_solutions)
            if matching_solution:
                valid_tmua_pairs.append((pp, matching_solution))
                tmua_solutions_map[pp] = matching_solution
            else:
                paper_id = get_paper_identifier_from_path(pp)
                print(f"[SKIP] No Official Solutions found for {pp.name} (ID: {paper_id}) - discarding paper")
                discarded_tmua_count += 1
        
        print(f"[INDEX] TMUA mode: Matched {len(valid_tmua_pairs)} paper pairs, discarded {discarded_tmua_count} papers without solutions")
        
        # Step 3: Only process Past Papers that have solutions (solutions will be processed with their pairs)
        pdfs = [pp for pp, _ in valid_tmua_pairs]
        
        if len(pdfs) == 0:
            print(f"[WARN] No valid TMUA paper pairs found! Need both Past Papers and matching Official Solutions.")
    
    elif not include_non_papers:
        # ESAT mode: Filter to only include "Past Paper" files (exclude answer keys, conversion tables, etc.)
        before_count = len(pdfs)
        # Only include files with "Past Paper" in the filename
        pdfs = [p for p in pdfs if "past paper" in p.name.lower()]
        if before_count > len(pdfs):
            print(f"[INDEX] Past Paper filter: {before_count} -> {len(pdfs)} PDFs (only Past Papers included)")
        
        # Additional safety: exclude common non-paper keywords (in case some slip through)
        exclude_keywords = ["answer key", "answers", "mark scheme", "conversion table", 
                          "official solutions", "data sheet", "worked", "specimen"]
        before_count = len(pdfs)
        pdfs = [p for p in pdfs if not any(k in p.name.lower() for k in exclude_keywords)]
        if before_count > len(pdfs):
            print(f"[INDEX] Additional safety filter: {before_count} -> {len(pdfs)} PDFs")
    
    if len(pdfs) == 0:
        print(f"[WARN] No PDFs found! Check papers directory: {papers_dir}")
        return []
    
    total_pdfs = len(pdfs)
    all_items: List[QuestionItem] = []
    extraction_stats: List[PDFExtractionStats] = []
    solution_coverage_stats: Dict[str, int] = {"total_questions": 0, "questions_with_solutions": 0}

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
                # Create stats for cached item (mark as success if it was cached)
                stats = PDFExtractionStats(
                    pdf_path=str(pdf),
                    status="SUCCESS",
                    total_chars=sum(len(q.text.replace(" ", "").replace("\n", "").replace("\t", "")) for q in items),
                    question_count=len(items),
                    median_question_length=0,  # Not recalculated for cached
                    failure_reason=None,
                    extracted_at=now_iso()
                )
            else:
                # Extract and cache
                pdf_overrides = overrides_map.get(str(pdf), {})
                items, stats = extract_questions_from_pdf(pdf, pdf_overrides)
                
                # For TMUA mode: Extract solutions and match to questions
                if MODE == "TMUA" and stats.status == "SUCCESS" and pdf in tmua_solutions_map:
                    matching_solutions_path = tmua_solutions_map[pdf]
                    try:
                        solutions_dict = extract_solutions_from_official_solutions_pdf(matching_solutions_path)
                        print(f"[INDEX] Extracted {len(solutions_dict)} solutions from {matching_solutions_path.name}")
                        
                        # Check if this paper should skip questions (unknown papers or TMUA 2017 Paper 1)
                        exam, section, year = infer_exam_section_from_path(pdf)
                        
                        # Check if extracted items have unknown sections (section is None, "?", or empty)
                        # This is the primary check - if items have unknown sections, skip questions
                        items_have_unknown_section = items and any(
                            not q.section or 
                            q.section == "?" or 
                            (isinstance(q.section, str) and q.section.strip() == "")
                            for q in items
                        )
                        
                        # Also check path inference result as fallback
                        has_unknown_section_from_path = not section or section == "?" or (isinstance(section, str) and section.strip() == "")
                        is_unknown = items_have_unknown_section or has_unknown_section_from_path or (not exam and not year)
                        
                        # Check if this is TMUA 2017 Paper 1 (check both path and items)
                        is_2017_paper1_from_path = (exam == "TMUA" and year == "2017" and section and "Paper 1" in section)
                        items_are_2017_paper1 = items and any(
                            q.year == "2017" and q.section and "Paper 1" in q.section
                            for q in items
                        )
                        is_2017_paper1 = is_2017_paper1_from_path or items_are_2017_paper1
                        
                        # For unknown papers: delete everything (don't save anything)
                        # For TMUA 2017 Paper 1: skip questions but save solutions
                        
                        if is_unknown:
                            # Delete unknown papers completely - don't save anything
                            print(f"[INDEX] Deleting unknown paper {pdf.name} completely (including solutions)")
                            items = []  # Clear all items
                        elif is_2017_paper1:
                            # Only save solutions, not questions (for TMUA 2017 Paper 1)
                            print(f"[INDEX] Skipping questions for {pdf.name} (buggy questions), but saving {len(solutions_dict)} solutions")
                            # Create solution-only items (with minimal question text)
                            solution_items = []
                            for qnum, solution_text in solutions_dict.items():
                                solution_item = QuestionItem(
                                    paper_id=f"SOLUTION_ONLY_{pdf.stem}",
                                    pdf_path=str(pdf),
                                    year=year,
                                    exam=exam,
                                    section=section,
                                    qnum=qnum,
                                    text=f"[Question {qnum} - question text not saved due to extraction issues]",
                                    skipped_diagram=False,
                                    solution_text=solution_text,
                                    solution_pdf_path=str(matching_solutions_path)
                                )
                                solution_items.append(solution_item)
                            items = solution_items  # Replace items with solution-only items
                            print(f"[INDEX] Saved {len(solution_items)} solutions (questions skipped)")
                        else:
                            # Normal flow: Match solutions to questions
                            matched_count = 0
                            unmatched_questions = []
                            unmatched_solutions = []
                            
                            for question in items:
                                if question.qnum in solutions_dict:
                                    question.solution_text = solutions_dict[question.qnum]
                                    question.solution_pdf_path = str(matching_solutions_path)
                                    matched_count += 1
                                else:
                                    unmatched_questions.append(question.qnum)
                            
                            # Check which solutions weren't matched
                            matched_qnums = set(q.qnum for q in items if q.solution_text)
                            for sol_qnum in solutions_dict.keys():
                                if sol_qnum not in matched_qnums:
                                    unmatched_solutions.append(sol_qnum)
                            
                            print(f"[INDEX] Matched {matched_count}/{len(items)} solutions to questions for {pdf.name}")
                            if unmatched_questions:
                                print(f"  [WARN] Questions without solutions: {sorted(unmatched_questions)[:10]}{'...' if len(unmatched_questions) > 10 else ''}")
                            if unmatched_solutions:
                                print(f"  [WARN] Solutions without matching questions: {sorted(unmatched_solutions)[:10]}{'...' if len(unmatched_solutions) > 10 else ''}")
                            
                            solution_coverage_stats["questions_with_solutions"] += matched_count
                    except Exception as e:
                        print(f"[WARN] Failed to extract solutions from {matching_solutions_path.name}: {e}")
                
                # Only cache if extraction was successful
                if stats.status == "SUCCESS":
                    # Save to per-PDF cache
                    safe_write_text(cache_file, json.dumps([asdict(x) for x in items], indent=2))
            
            # Track extraction stats
            extraction_stats.append(stats)
            
            # Skip failed PDFs (don't add to index)
            if stats.status == "FAILED_TEXT_EXTRACTION":
                print(f"[SKIP] {pdf.name}: {stats.failure_reason}")
                if progress_callback:
                    progress_callback(i, total_pdfs, f"{pdf.name} (SKIPPED: {stats.failure_reason})")
                continue
            
            # Show clean summary for this PDF (only in TMUA mode for cleaner output)
            if items and MODE == "TMUA":
                # Extract paper info for cleaner output
                paper_info = ""
                if items:
                    first_q = items[0]
                    year = first_q.year or "?"
                    section = first_q.section or "?"
                    paper_info = f"{year} {section}"
                print(f"[INDEX] {paper_info}: {len(items)} questions extracted")
            elif items:
                # For non-TMUA, show detailed info
                exam_counts = {}
                for q in items:
                    exam = q.exam or "None"
                    exam_counts[exam] = exam_counts.get(exam, 0) + 1
                print(f"[INDEX] {pdf.name}: {len(items)} questions, exams: {exam_counts}")
            
            # Filter based on MODE
            before_filter = len(items)
            if MODE == "TMUA":
                items = [q for q in items if q.exam == "TMUA"]
            elif MODE == "ESAT":
                items = [q for q in items if q.exam != "TMUA"]  # Includes None values
            
            if before_filter > len(items):
                print(f"[INDEX] {pdf.name}: Filtered {before_filter} -> {len(items)} questions (mode={MODE})")
            
            # Update solution coverage stats
            solution_coverage_stats["total_questions"] += len(items)
            
            all_items.extend(items)
        except Exception as e:
            print(f"[WARN] Failed to parse {pdf}: {e}")
            # Track failed extraction
            extraction_stats.append(PDFExtractionStats(
                pdf_path=str(pdf),
                status="FAILED_TEXT_EXTRACTION",
                total_chars=0,
                question_count=0,
                median_question_length=0,
                failure_reason=f"Exception: {str(e)}",
                extracted_at=now_iso()
            ))
            if progress_callback:
                progress_callback(i, total_pdfs, f"{pdf.name} (ERROR: {e})")

    # Save aggregated cache
    safe_write_text(INDEX_JSON, json.dumps([asdict(x) for x in all_items], indent=2))
    
    # Save extraction report with solution coverage stats
    save_extraction_report(extraction_stats, total_pdfs, solution_coverage_stats if MODE == "TMUA" else None, discarded_tmua_count if MODE == "TMUA" else 0)
    
    # Final summary - cleaner output for TMUA
    if MODE == "TMUA" and len(all_items) > 0:
        # Group by paper type and year for cleaner output
        paper1_questions = [q for q in all_items if q.section and "Paper 1" in q.section]
        paper2_questions = [q for q in all_items if q.section and "Paper 2" in q.section]
        
        # Group by year
        paper1_by_year = {}
        paper2_by_year = {}
        for q in paper1_questions:
            year = q.year or "Unknown"
            paper1_by_year[year] = paper1_by_year.get(year, 0) + 1
        for q in paper2_questions:
            year = q.year or "Unknown"
            paper2_by_year[year] = paper2_by_year.get(year, 0) + 1
        
        print(f"\n[INDEX] Summary: {total_pdfs} PDFs processed, {len(all_items)} questions indexed")
        if discarded_tmua_count > 0:
            print(f"[INDEX] Discarded {discarded_tmua_count} papers without Official Solutions")
        print(f"[INDEX] Paper 1 (Mathematical Knowledge): {len(paper1_questions)} questions")
        for year in sorted(paper1_by_year.keys()):
            print(f"  - {year}: {paper1_by_year[year]} questions")
        print(f"[INDEX] Paper 2 (Mathematical Reasoning): {len(paper2_questions)} questions")
        for year in sorted(paper2_by_year.keys()):
            print(f"  - {year}: {paper2_by_year[year]} questions")
        
        if solution_coverage_stats["total_questions"] > 0:
            coverage_pct = (solution_coverage_stats["questions_with_solutions"] / solution_coverage_stats["total_questions"]) * 100
            print(f"[INDEX] Solution coverage: {solution_coverage_stats['questions_with_solutions']}/{solution_coverage_stats['total_questions']} questions ({coverage_pct:.1f}%)")
    else:
        print(f"[INDEX] Summary: {total_pdfs} PDFs processed, {len(all_items)} questions indexed")
        if MODE == "TMUA" and discarded_tmua_count > 0:
            print(f"[INDEX] TMUA: Discarded {discarded_tmua_count} papers without Official Solutions")
        if MODE == "TMUA" and solution_coverage_stats["total_questions"] > 0:
            coverage_pct = (solution_coverage_stats["questions_with_solutions"] / solution_coverage_stats["total_questions"]) * 100
            print(f"[INDEX] TMUA: Solution coverage: {solution_coverage_stats['questions_with_solutions']}/{solution_coverage_stats['total_questions']} questions ({coverage_pct:.1f}%)")
    
    if len(all_items) == 0:
        print(f"[WARN] No questions indexed! Possible causes:")
        print(f"  - No PDFs found in {papers_dir}")
        print(f"  - All PDFs failed extraction (check extraction report)")
        print(f"  - All questions filtered out by mode={MODE}")
        if total_pdfs > 0:
            print(f"  - {total_pdfs} PDFs were found but produced 0 questions")
            # Show exam distribution from extraction stats
            exam_counts = {}
            for stat in extraction_stats:
                if stat.status == "SUCCESS":
                    # Try to infer exam from PDF path
                    exam, _, _ = infer_exam_section_from_path(Path(stat.pdf_path))
                    exam = exam or "None"
                    exam_counts[exam] = exam_counts.get(exam, 0) + 1
            if exam_counts:
                print(f"  - Exam detection from PDF paths: {exam_counts}")
    else:
        # Show exam distribution
        exam_counts = {}
        for q in all_items:
            exam = q.exam or "None"
            exam_counts[exam] = exam_counts.get(exam, 0) + 1
        print(f"[INDEX] Final exam distribution: {exam_counts}")
    
    # Remove unknown papers (section = None, "?", or empty) before returning
    before_unknown_filter = len(all_items)
    all_items = [
        q for q in all_items
        if q.section  # Must have a section
        and q.section != "?"  # Not unknown
        and (isinstance(q.section, str) and q.section.strip() != "")  # Not empty
    ]
    if before_unknown_filter > len(all_items):
        print(f"[INDEX] Removed {before_unknown_filter - len(all_items)} questions from unknown papers")
    
    return all_items


# ----------------------------
# Gemini client
# ----------------------------

class Gemini:
    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        genai.configure(api_key=api_key)
        self._requested_model = model
        # Try to create the model, fallback to gemini-1.5-flash if not available
        try:
            self.model = genai.GenerativeModel(model)
            self._actual_model = model
            print(f"[INFO] Using model: {model}")
        except Exception as e:
            print(f"[WARN] Model {model} not available, trying gemini-1.5-flash: {e}")
            try:
                self.model = genai.GenerativeModel("gemini-1.5-flash")
                self._actual_model = "gemini-1.5-flash"
                print(f"[INFO] Using fallback model: gemini-1.5-flash")
            except Exception:
                # Last resort: try gemini-pro
                self.model = genai.GenerativeModel("gemini-pro")
                self._actual_model = "gemini-pro"
                print(f"[INFO] Using fallback model: gemini-pro")
        self.api_key = api_key
        self._last_request_time = 0
        self._request_lock = threading.Lock()
        self._min_delay = 1.0  # Minimum delay between requests (seconds) - increased to avoid rate limits
    
    def get_model_name(self) -> str:
        """Return the actual model name being used."""
        return getattr(self, '_actual_model', self._requested_model)

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
# Prompts - Load from external markdown files
# ----------------------------

PROMPT_DIR = Path(__file__).parent / "prompts"
CANDIDATE_PROMPT_PATH = PROMPT_DIR / "Schema_Candidate_Prompt.md"
FULL_PROMPT_PATH = PROMPT_DIR / "Schema_Full_Prompt.md"
COMPRESS_PROMPT_PATH = PROMPT_DIR / "Schema_Compress_Prompt.md"
SPLIT_PROMPT_PATH = PROMPT_DIR / "Schema_Split_Prompt.md"
ENRICH_PROMPT_PATH = PROMPT_DIR / "Schema_Enrich_Prompt.md"
FINGERPRINT_EXTRACTION_PROMPT_PATH = PROMPT_DIR / "Fingerprint_Extraction_Prompt.md"
SCHEMA_SYNTHESIS_CLUSTER_PROMPT_PATH = PROMPT_DIR / "Schema_Synthesis_Cluster_Prompt.md"

# Fingerprints directory for Stage 1 output
FINGERPRINTS_DIR_DEFAULT = Path(__file__).parent / "fingerprints"
FINGERPRINTS_DIR_DEFAULT.mkdir(parents=True, exist_ok=True)

def load_prompt_template(path: Path) -> str:
    """Load a prompt template from a markdown file."""
    if not path.exists():
        raise FileNotFoundError(f"Prompt template not found: {path}")
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

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

    # Load the template
    template = load_prompt_template(CANDIDATE_PROMPT_PATH)

    # Existing schema summaries (short)
    existing = "\n".join(
        [f"- {s.schema_id}: {s.title} | {s.core_move}".strip() for s in schema_summaries]
    )

    # Evidence corpus: short question IDs + text (with solution if available for TMUA)
    corpus_lines = []
    for q in questions:
        qid = f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "")
        if q.solution_text:
            # Include solution text for TMUA questions
            corpus_lines.append(f"[{qid}] Question: {q.text} | Solution: {q.solution_text}")
        else:
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

    # Replace placeholders in template
    return template.format(
        exam_type=exam_type,
        prefix_instructions=prefix_instructions,
        existing=existing,
        corpus=corpus,
        prefix_json=prefix_json,
        n_candidates=n_candidates
    )


def prompt_full_schema(candidate: Candidate, enforce_max4: bool = True) -> str:
    # Load the template
    template = load_prompt_template(FULL_PROMPT_PATH)
    
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
    
    # For TMUA, schema file depends on paper type (will be set correctly when writing)
    if is_tmua:
        tmua_prefix = get_tmua_prefix_from_evidence(candidate) if has_tmua_evidence(candidate) else "M"
        schema_file = "Schemas_TMUA_Paper1.md" if tmua_prefix == "M" else "Schemas_TMUA_Paper2.md"
    else:
        schema_file = "Schemas.md"
    
    # Build exemplar list text with backticks format
    exemplar_text = ""
    if candidate.exemplar_justifications:
        exemplar_lines = []
        for qid, justification in candidate.exemplar_justifications.items():
            exemplar_lines.append(f"- `{qid}`: {justification}")
        exemplar_text = "\n".join(exemplar_lines)
    else:
        # Fallback: just list evidence IDs with backticks
        exemplar_text = "\n".join(f"- `{qid}`: Exemplifies pattern" for qid in candidate.evidence[:8])
    
    # Replace placeholders in template
    return template.replace("{schema_file}", schema_file) \
                   .replace("{candidate.prefix}", candidate.prefix) \
                   .replace("{prefix_desc}", prefix_desc) \
                   .replace("{candidate.title}", candidate.title) \
                   .replace("{candidate.core_move}", candidate.core_move) \
                   .replace("{candidate.evidence}", str(candidate.evidence)) \
                   .replace("{exemplar_text}", exemplar_text) \
                   .replace("{tmua_note}", tmua_note) \
                   .replace("{limit_text}", limit_text)


def prompt_compress_schema(schema_markdown: str) -> str:
    """Prompt for compressing a schema to enforce bullet limits."""
    template = load_prompt_template(COMPRESS_PROMPT_PATH)
    return template.replace("{schema_markdown}", schema_markdown)


def prompt_split_candidate(candidate: Candidate) -> str:
    """Prompt for splitting a candidate into two."""
    template = load_prompt_template(SPLIT_PROMPT_PATH)
    return template.replace("{candidate.title}", candidate.title) \
                   .replace("{candidate.core_move}", candidate.core_move) \
                   .replace("{candidate.evidence}", str(candidate.evidence)) \
                   .replace("{candidate.prefix}", candidate.prefix)


def prompt_enrich_bullet(candidate: Candidate, target_schema_id: str, section: str, 
                         existing_bullet: str) -> str:
    """Prompt for generating a replacement bullet."""
    template = load_prompt_template(ENRICH_PROMPT_PATH)
    return template.replace("{target_schema_id}", target_schema_id) \
                   .replace("{section}", section) \
                   .replace("{existing_bullet}", existing_bullet) \
                   .replace("{candidate.title}", candidate.title) \
                   .replace("{candidate.core_move}", candidate.core_move) \
                   .replace("{candidate.evidence}", str(candidate.evidence))


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
        
        # Check if TMUA schemas need to be split on startup (before loading)
        if MODE == "TMUA":
            legacy_file = SCHEMAS_DIR_DEFAULT / "Schemas_TMUA.md"
            if legacy_file.exists():
                # Automatically split if legacy file exists
                try:
                    print("[AUTO-SPLIT] Detected legacy Schemas_TMUA.md file. Splitting into Paper 1 and Paper 2...")
                    # Temporarily set schemas_md_path for split function
                    original_path = self.schemas_md_path
                    self.schemas_md_path = TMUA_PAPER1_SCHEMAS_MD  # Default for split function
                    stats = self._split_tmua_schemas_by_paper_type()
                    self.schemas_md_path = original_path
                    if "error" not in stats:
                        print(f"[AUTO-SPLIT] Complete: {stats['paper1_count']} Paper 1, {stats['paper2_count']} Paper 2, {stats['mixed_count']} mixed")
                except Exception as e:
                    print(f"[AUTO-SPLIT] Failed: {e}")
        
        self._load_schemas()  # This will reload after split if it happened
        self._load_embeddings()
        self._load_meta()
        self._load_used_questions()
        
        # Save used questions when app closes
        self.protocol("WM_DELETE_WINDOW", self._on_closing)

    # UI layout
    def _build_ui(self):
        # MODE selection frame (at very top)
        mode_frame = ttk.LabelFrame(self, text="Mode", padding=5)
        mode_frame.pack(fill="x", padx=10, pady=(5, 0))
        
        self.mode_var = tk.StringVar(value=MODE)
        
        def on_mode_change():
            """Update global MODE when UI toggle changes."""
            global MODE
            new_mode = self.mode_var.get()
            if new_mode != MODE:
                MODE = new_mode
                print(f"[MODE] Changed to {MODE}")
                # Update schemas file path based on mode
                if MODE == "TMUA":
                    # Ensure both TMUA schema files exist
                    for schema_path, paper_name in [
                        (TMUA_PAPER1_SCHEMAS_MD, "Paper 1 Schemas (Mathematical Knowledge)"),
                        (TMUA_PAPER2_SCHEMAS_MD, "Paper 2 Schemas (Mathematical Reasoning)")
                    ]:
                        if not schema_path.exists():
                            schema_path.parent.mkdir(parents=True, exist_ok=True)
                            schema_path.write_text(f"# TMUA {paper_name}\n\n", encoding="utf-8")
                    self.schemas_md_path = TMUA_PAPER1_SCHEMAS_MD  # Default to Paper 1 for UI
                else:
                    self.schemas_md_path = SCHEMAS_MD_DEFAULT
                # Reload schemas with new path (for TMUA, loads both Paper 1 and Paper 2)
                self._load_schemas()
                self._load_embeddings()
                self._load_meta()
        
        ttk.Radiobutton(mode_frame, text="ESAT (ENGAA/NSAA/ESAT)", 
                        variable=self.mode_var, value="ESAT",
                        command=on_mode_change).pack(side="left", padx=5)
        ttk.Radiobutton(mode_frame, text="TMUA", 
                        variable=self.mode_var, value="TMUA",
                        command=on_mode_change).pack(side="left", padx=5)
        
        # Top row: Main actions and filters
        top = ttk.Frame(self)
        top.pack(fill="x", padx=10, pady=(8, 4))

        self.force_rebuild_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(top, text="Force rebuild index", variable=self.force_rebuild_var).pack(side="left")

        ttk.Button(top, text="Index PDFs", command=self.on_index).pack(side="left", padx=6)
        ttk.Button(top, text="View Extraction Report", command=self.on_view_extraction_report).pack(side="left", padx=6)
        ttk.Button(top, text="Review Questions & Solutions", command=self.on_review_questions_solutions).pack(side="left", padx=6)
        ttk.Button(top, text="Generate candidates (batch)", command=self.on_generate).pack(side="left", padx=6)
        ttk.Button(top, text="Process All Questions", command=self.on_process_all_questions).pack(side="left", padx=6)
        ttk.Button(top, text="Reload Schemas.md", command=self._load_schemas).pack(side="left", padx=6)
        
        def on_wipe_data():
            """Wipe all schema data after confirmation."""
            # Build mode-specific warning message
            if MODE == "TMUA":
                schema_files_desc = "- Schemas_TMUA_Paper1.md (cleared)\n- Schemas_TMUA_Paper2.md (cleared)"
            else:
                schema_files_desc = "- Schemas_ESAT.md (cleared)"
            
            if messagebox.askyesno("Wipe Schema Data", 
                f"This will DELETE all schemas and cache files:\n\n"
                f"{schema_files_desc}\n"
                "- Schema metadata, embeddings, coverage (deleted)\n"
                "- Used questions tracking (deleted)\n"
                "- Candidates and decisions logs (cleared)\n\n"
                f"Mode: {MODE}\n\n"
                "This cannot be undone!\n\n"
                "Continue?"):
                wiped = self._wipe_schema_data()
                mode_desc = "TMUA (Paper 1 & Paper 2)" if MODE == "TMUA" else MODE
                messagebox.showinfo("Wipe Complete", 
                    f"Wiped {len(wiped)} files ({mode_desc}):\n" + "\n".join(f"- {f}" for f in wiped))
        
        wipe_btn = tk.Button(top, text="Wipe All Data", command=on_wipe_data, 
                            fg="red", bg="white")
        wipe_btn.pack(side="left", padx=6)
        
        def on_renumber_schemas():
            """Renumber all schemas from unique IDs to sequential IDs."""
            if not self.schemas_md_path.exists():
                messagebox.showinfo("No Schemas", "No schemas file found. Create some schemas first.")
                return
            
            # Get current schemas to show preview
            md = safe_read_text(self.schemas_md_path)
            summaries = parse_schema_summaries(md)
            
            # Count unique IDs that need renumbering
            unique_ids = [s for s in summaries if "_" in s.schema_id]
            sequential_ids = [s for s in summaries if re.match(r"^[MPBCR]\d+$", s.schema_id)]
            
            if not unique_ids:
                messagebox.showinfo("Already Renumbered", "All schemas already have sequential IDs (M1, M2, etc.).")
                return
            
            # Group by prefix for preview
            by_prefix = {}
            for s in unique_ids:
                prefix = s.schema_id[0]
                by_prefix.setdefault(prefix, []).append(s.schema_id)
            
            preview_lines = []
            for prefix in sorted(by_prefix.keys()):
                preview_lines.append(f"{prefix}: {len(by_prefix[prefix])} schemas")
            
            preview = "\n".join(preview_lines)
            
            if not messagebox.askyesno("Renumber Schemas", 
                f"This will renumber {len(unique_ids)} schemas from unique IDs to sequential IDs.\n\n"
                f"Preview:\n{preview}\n\n"
                f"All references in cache files will be updated.\n"
                f"A backup will be created before renumbering.\n\n"
                f"Continue?"):
                return
            
            def work():
                self._set_status("Renumbering schemas...")
                try:
                    id_mapping = self._renumber_all_schemas()
                    
                    if id_mapping:
                        # Show summary
                        by_prefix_new = {}
                        for old_id, new_id in id_mapping.items():
                            prefix = new_id[0]
                            by_prefix_new.setdefault(prefix, []).append((old_id, new_id))
                        
                        summary_lines = []
                        for prefix in sorted(by_prefix_new.keys()):
                            pairs = by_prefix_new[prefix]
                            summary_lines.append(f"{prefix}: {len(pairs)} schemas")
                            # Show first few examples
                            for old_id, new_id in pairs[:3]:
                                summary_lines.append(f"  {old_id} → {new_id}")
                            if len(pairs) > 3:
                                summary_lines.append(f"  ... and {len(pairs) - 3} more")
                        
                        summary = "\n".join(summary_lines)
                        self.after(0, lambda: messagebox.showinfo("Renumbering Complete", 
                            f"Successfully renumbered {len(id_mapping)} schemas:\n\n{summary}"))
                        self.after(0, lambda: self._set_status(f"Renumbered {len(id_mapping)} schemas."))
                    else:
                        self.after(0, lambda: messagebox.showinfo("No Changes", "No schemas needed renumbering."))
                        self.after(0, lambda: self._set_status("No renumbering needed."))
                except Exception as e:
                    error_msg = str(e)
                    self.after(0, lambda: messagebox.showerror("Renumbering Failed", 
                        f"Failed to renumber schemas:\n{error_msg}"))
                    self.after(0, lambda: self._set_status(f"Renumbering failed: {error_msg}"))
            
            threading.Thread(target=work, daemon=True).start()
        
        renumber_btn = tk.Button(top, text="Renumber Schemas", command=on_renumber_schemas,
                                fg="blue", bg="white")
        renumber_btn.pack(side="left", padx=6)
        
        def on_split_tmua_schemas():
            """Split TMUA schemas into Paper 1 and Paper 2 files based on evidence."""
            if MODE != "TMUA":
                messagebox.showinfo("TMUA Only", "This function is only available in TMUA mode.")
                return
            
            if not messagebox.askyesno("Split TMUA Schemas", 
                "This will split all TMUA schemas into Paper 1 and Paper 2 files based on evidence:\n\n"
                "- Paper 1 (M prefix) → Schemas_TMUA_Paper1.md\n"
                "- Paper 2 (R prefix) → Schemas_TMUA_Paper2.md\n"
                "- Mixed schemas (both Paper 1 and Paper 2 evidence) will be split into two versions\n"
                "- Schemas with only Paper 2 evidence will be moved to Paper 2 file\n\n"
                "A backup will be created before splitting.\n\n"
                "Continue?"):
                return
            
            def work():
                try:
                    self._set_status("Splitting TMUA schemas by paper type...")
                    
                    # Create backup
                    backup_dir = SCHEMAS_DIR_DEFAULT / "_backups"
                    backup_dir.mkdir(parents=True, exist_ok=True)
                    timestamp = now_iso().replace(":", "-").replace("T", "_").split(".")[0]
                    
                    for schema_file in [TMUA_PAPER1_SCHEMAS_MD, TMUA_PAPER2_SCHEMAS_MD]:
                        if schema_file.exists():
                            backup_path = backup_dir / f"{schema_file.stem}_{timestamp}{schema_file.suffix}"
                            shutil.copy2(schema_file, backup_path)
                    
                    stats = self._split_tmua_schemas_by_paper_type()
                    
                    if "error" in stats:
                        self.after(0, lambda: messagebox.showerror("Split Failed", stats["error"]))
                        self.after(0, lambda: self._set_status(f"Split failed: {stats['error']}"))
                    else:
                        summary = (
                            f"Paper 1: {stats['paper1_count']} schemas\n"
                            f"Paper 2: {stats['paper2_count']} schemas\n"
                            f"Mixed (split): {stats['mixed_count']} schemas\n"
                            f"Unknown: {stats['unknown_count']} schemas\n"
                            f"Total: {stats['total']} schemas"
                        )
                        self.after(0, lambda: messagebox.showinfo("Split Complete", 
                            f"Successfully split TMUA schemas:\n\n{summary}"))
                        self.after(0, lambda: self._set_status(
                        f"Split complete: {stats['paper1_count']} Paper 1, {stats['paper2_count']} Paper 2, "
                        f"{stats['mixed_count']} mixed schemas split. "
                        f"Released {stats.get('released_paper1', 0) + stats.get('released_paper2', 0)} questions for reuse."))
                except Exception as e:
                    error_msg = str(e)
                    self.after(0, lambda: messagebox.showerror("Split Failed", 
                        f"Failed to split schemas:\n{error_msg}"))
                    self.after(0, lambda: self._set_status(f"Split failed: {error_msg}"))
            
            threading.Thread(target=work, daemon=True).start()
        
        if MODE == "TMUA":
            split_btn = tk.Button(top, text="Split TMUA Schemas", command=on_split_tmua_schemas,
                                bg="lightblue")
            split_btn.pack(side="left", padx=6)

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
        # Merge/Enrich removed - keeping Split only
        # ttk.Button(btn_row2, text="Merge", command=self.on_merge).pack(side="left")
        # ttk.Button(btn_row2, text="Enrich", command=self.on_enrich_show).pack(side="left", padx=4)
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
        
        # Compress button removed (keeping validation status)
        preview_controls = ttk.Frame(right)
        preview_controls.pack(fill="x", pady=(0, 4))
        # ttk.Button(preview_controls, text="Compress preview", command=self.on_compress_preview).pack(side="left")
        self.validation_status = ttk.Label(preview_controls, text="", foreground="red")
        self.validation_status.pack(side="left", padx=10)
        
        self.schema_preview = tk.Text(right, wrap="word", height=15)
        self.schema_preview.pack(fill="both", expand=True)
        
        # Feature B: Enrich controls - REMOVED (keeping code commented for reference)
        # enrich_frame = ttk.LabelFrame(right, text="Enrich existing schema")
        # enrich_frame.pack(fill="x", pady=(10, 0))
        # ... (enrich UI code commented out)
        
        # Initialize enrich variables to None to avoid errors
        self.enrich_schema_var = None
        self.enrich_schema_combo = None
        self.enrich_section_var = None
        self.enrich_section_combo = None
        self.enrich_bullet_var = None
        self.enrich_bullet_combo = None
        self.enrich_replacement_text = None
        self.enrich_frame = None

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
        """Load schemas. For TMUA mode, load BOTH Paper 1 and Paper 2 schemas for comparison."""
        all_summaries = []
        all_fullness = {}
        
        if MODE == "TMUA":
            # Load both Paper 1 and Paper 2 schemas
            for schema_path, paper_name in [
                (TMUA_PAPER1_SCHEMAS_MD, "Paper 1"),
                (TMUA_PAPER2_SCHEMAS_MD, "Paper 2")
            ]:
                if schema_path.exists():
                    md = safe_read_text(schema_path)
                    summaries = parse_schema_summaries(md)
                    fullness = compute_schema_fullness(md)
                    all_summaries.extend(summaries)
                    all_fullness.update(fullness)
                else:
                    # Create empty file if it doesn't exist
                    schema_path.parent.mkdir(parents=True, exist_ok=True)
                    schema_path.write_text(f"# TMUA {paper_name} Schemas\n\n", encoding="utf-8")
            
            # Default to Paper 1 schema path for writing (will be switched based on candidate)
            if not self.schemas_md_path or not self.schemas_md_path.exists():
                self.schemas_md_path = TMUA_PAPER1_SCHEMAS_MD
        else:
            # ESAT mode: load single schema file
            if not self.schemas_md_path.exists():
                messagebox.showerror("Schemas.md not found", f"Missing: {self.schemas_md_path}")
                return
            md = safe_read_text(self.schemas_md_path)
            all_summaries = parse_schema_summaries(md)
            all_fullness = compute_schema_fullness(md)
        
        self.schema_summaries = all_summaries
        self.schema_fullness = all_fullness
        
        paper1_count = len([s for s in all_summaries if s.schema_id.startswith("M")])
        paper2_count = len([s for s in all_summaries if s.schema_id.startswith("R")])
        if MODE == "TMUA":
            self._set_status(f"Loaded {len(all_summaries)} schemas (M/Paper1: {paper1_count}, R/Paper2: {paper2_count}) from TMUA schema files")
        else:
            self._set_status(f"Loaded {len(all_summaries)} schemas from {self.schemas_md_path.name}")
        
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
        # Initialize missing entries and ensure unique_id/created_at fields exist
        for s in self.schema_summaries:
            if s.schema_id not in self.schemas_meta:
                self.schemas_meta[s.schema_id] = {"edits_count": 0, "locked": False, "evidence": []}
            
            # Ensure unique_id and created_at exist for backward compatibility
            meta = self.schemas_meta[s.schema_id]
            if "unique_id" not in meta:
                # If schema_id is already unique format, use it; otherwise generate one
                if "_" in s.schema_id:
                    meta["unique_id"] = s.schema_id
                else:
                    # Sequential ID - generate unique ID for tracking
                    prefix = s.schema_id[0]
                    meta["unique_id"] = generate_unique_schema_id(prefix)
            if "created_at" not in meta:
                meta["created_at"] = now_iso()  # Use current time as fallback
            if "evidence" not in meta:
                meta["evidence"] = []
        
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
    
    def _wipe_schema_data(self):
        """Wipe all schema-related files for a fresh start. In TMUA mode, wipes both Paper 1 and Paper 2."""
        files_to_wipe = []
        
        # Schema markdown files - depends on mode
        if MODE == "TMUA":
            # TMUA mode: wipe both Paper 1 and Paper 2 schema files
            files_to_wipe.extend([
                TMUA_PAPER1_SCHEMAS_MD,
                TMUA_PAPER2_SCHEMAS_MD,
            ])
        else:
            # ESAT mode: wipe ESAT schema file
            files_to_wipe.append(SCHEMAS_MD_DEFAULT)
        
        # Common schema-related JSON files (contain schema metadata, embeddings, coverage)
        files_to_wipe.extend([
            SCHEMA_EMBEDDINGS_JSON,
            SCHEMA_COVERAGE_JSON,
            SCHEMAS_META_JSON,
            USED_QUESTIONS_JSON,
        ])
        
        wiped = []
        for file_path in files_to_wipe:
            if file_path.exists():
                if file_path.suffix == '.md':
                    # Clear markdown file but keep structure with appropriate header
                    if MODE == "TMUA":
                        if file_path == TMUA_PAPER1_SCHEMAS_MD:
                            file_path.write_text("# TMUA Paper 1 Schemas (Mathematical Knowledge)\n\n", encoding="utf-8")
                        elif file_path == TMUA_PAPER2_SCHEMAS_MD:
                            file_path.write_text("# TMUA Paper 2 Schemas (Mathematical Reasoning)\n\n", encoding="utf-8")
                        else:
                            file_path.write_text("# TMUA Schemas\n\n", encoding="utf-8")
                    else:
                        file_path.write_text("# ESAT Schemas\n\n", encoding="utf-8")
                else:
                    # Delete JSON files
                    file_path.unlink()
                wiped.append(file_path.name)
        
        # Clear candidates and decisions logs (optional - archive instead)
        if CANDIDATES_JSONL.exists():
            CANDIDATES_JSONL.write_text("", encoding="utf-8")
            wiped.append(CANDIDATES_JSONL.name)
        if DECISIONS_JSONL.exists():
            DECISIONS_JSONL.write_text("", encoding="utf-8")
            wiped.append(DECISIONS_JSONL.name)
        
        # Reload empty state
        self._load_schemas()
        self._load_embeddings()
        self._load_meta()
        self.used_question_ids.clear()
        self._save_used_questions()
        
        return wiped
    
    def _split_tmua_schemas_by_paper_type(self) -> Dict[str, Any]:
        """
        Split existing TMUA schemas into Paper 1 and Paper 2 files based on evidence.
        Returns stats about the split operation.
        """
        if MODE != "TMUA":
            return {"error": "Not in TMUA mode"}
        
        # Load metadata to get evidence for each schema
        schemas_meta = load_schemas_meta()
        
        # Check all possible schema files (Paper 1, Paper 2, and legacy TMUA file)
        all_schema_files = [
            TMUA_PAPER1_SCHEMAS_MD,
            TMUA_PAPER2_SCHEMAS_MD,
            SCHEMAS_DIR_DEFAULT / "Schemas_TMUA.md",  # Legacy file
        ]
        
        all_blocks: List[tuple[str, str, str]] = []  # (schema_id, block_text, source_file)
        
        # Extract all schema blocks from all files
        for schema_file in all_schema_files:
            if schema_file.exists():
                md = safe_read_text(schema_file)
                blocks = extract_schema_blocks_from_markdown(md)
                for schema_id, block_text in blocks:
                    all_blocks.append((schema_id, block_text, schema_file.name))
        
        if not all_blocks:
            return {"error": "No schemas found to split"}
        
        # Categorize blocks by paper type
        paper1_blocks: List[tuple[str, str]] = []  # (schema_id, block_text)
        paper2_blocks: List[tuple[str, str]] = []  # (schema_id, block_text)
        mixed_blocks: List[tuple[str, str, List[str]]] = []  # (schema_id, block_text, evidence_ids)
        unknown_blocks: List[tuple[str, str]] = []  # (schema_id, block_text)
        
        for schema_id, block_text, source_file in all_blocks:
            # Get evidence from metadata
            meta = schemas_meta.get(schema_id, {})
            evidence_ids = meta.get("evidence", [])
            
            # Also check exemplar questions in the schema block itself
            parsed = parse_schema_block(block_text)
            exemplar_qids = [qid for qid, _ in parsed.get("exemplar_questions", [])]
            
            # Combine all question IDs
            all_qids = list(evidence_ids) + exemplar_qids
            
            # Determine paper type
            if all_qids:
                paper_type, is_mixed = get_tmua_paper_type_from_evidence_ids(all_qids)
                
                if is_mixed:
                    mixed_blocks.append((schema_id, block_text, all_qids))
                elif paper_type == "Paper1":
                    paper1_blocks.append((schema_id, block_text))
                elif paper_type == "Paper2":
                    paper2_blocks.append((schema_id, block_text))
                else:
                    # Unknown - check prefix: M = Paper 1, R = Paper 2
                    if schema_id.startswith("M"):
                        paper1_blocks.append((schema_id, block_text))
                    elif schema_id.startswith("R"):
                        paper2_blocks.append((schema_id, block_text))
                    else:
                        unknown_blocks.append((schema_id, block_text))
            else:
                # No evidence - infer from prefix
                if schema_id.startswith("M"):
                    paper1_blocks.append((schema_id, block_text))
                elif schema_id.startswith("R"):
                    paper2_blocks.append((schema_id, block_text))
                else:
                    unknown_blocks.append((schema_id, block_text))
        
        # Write Paper 1 schemas
        paper1_content = "# TMUA Paper 1 Schemas (Mathematical Knowledge)\n\n"
        for schema_id, block_text in paper1_blocks:
            paper1_content += block_text + "\n\n"
        
        # Write Paper 2 schemas
        paper2_content = "# TMUA Paper 2 Schemas (Mathematical Reasoning)\n\n"
        for schema_id, block_text in paper2_blocks:
            paper2_content += block_text + "\n\n"
        
        # Handle mixed schemas: split into two versions or move to majority paper type
        released_questions = {"Paper1": [], "Paper2": []}  # Track questions released for reuse
        
        for schema_id, block_text, evidence_ids in mixed_blocks:
            paper_type, _ = get_tmua_paper_type_from_evidence_ids(evidence_ids)
            parsed = parse_schema_block(block_text)
            
            # Count Paper 1 vs Paper 2 in evidence
            paper1_count = sum(1 for qid in evidence_ids if "PAPER1" in str(qid).upper() or "PAPER 1" in str(qid).upper())
            paper2_count = sum(1 for qid in evidence_ids if "PAPER2" in str(qid).upper() or "PAPER 2" in str(qid).upper())
            
            # Filter exemplar questions by paper type
            paper1_exemplars = []
            paper2_exemplars = []
            
            for qid, justification in parsed.get("exemplar_questions", []):
                qid_upper = str(qid).upper()
                if "PAPER1" in qid_upper or "PAPER 1" in qid_upper or "_PAPER1" in qid_upper:
                    paper1_exemplars.append((qid, justification))
                elif "PAPER2" in qid_upper or "PAPER 2" in qid_upper or "_PAPER2" in qid_upper:
                    paper2_exemplars.append((qid, justification))
            
            # Get metadata for this schema
            meta = schemas_meta.get(schema_id, {})
            all_evidence = meta.get("evidence", [])
            
            # Filter evidence by paper type
            paper1_evidence = [qid for qid in all_evidence if "PAPER1" in str(qid).upper() or "PAPER 1" in str(qid).upper() or "_PAPER1" in str(qid).upper()]
            paper2_evidence = [qid for qid in all_evidence if "PAPER2" in str(qid).upper() or "PAPER 2" in str(qid).upper() or "_PAPER2" in str(qid).upper()]
            
            # Create separate versions for each paper if both have exemplars
            if paper1_exemplars and paper2_exemplars:
                # Split into two schemas - one for each paper
                # Paper 1 version (keep original schema ID)
                paper1_block = self._create_schema_version_for_paper(block_text, schema_id, "M", paper1_exemplars)
                paper1_content += paper1_block + "\n\n"
                # Update metadata to only have Paper 1 evidence
                if schema_id in schemas_meta:
                    schemas_meta[schema_id]["evidence"] = paper1_evidence
                    schemas_meta[schema_id]["has_tmua_evidence"] = True
                else:
                    schemas_meta[schema_id] = {
                        "evidence": paper1_evidence,
                        "edits_count": 0,
                        "locked": False,
                        "has_tmua_evidence": True,
                        "unique_id": schema_id,
                        "created_at": now_iso()
                    }
                
                # Paper 2 version (create new schema ID for Paper 2 version)
                new_paper2_id = generate_unique_schema_id("R")
                paper2_block = self._create_schema_version_for_paper(block_text, schema_id, "R", paper2_exemplars)
                # Replace schema ID in the block with new ID
                paper2_block = re.sub(rf"## \*\*{re.escape(schema_id)}\.", f"## **{new_paper2_id}.", paper2_block)
                paper2_content += paper2_block + "\n\n"
                # Create metadata entry for new Paper 2 schema
                schemas_meta[new_paper2_id] = {
                    "evidence": paper2_evidence,
                    "edits_count": 0,
                    "locked": meta.get("locked", False),
                    "has_tmua_evidence": True,
                    "unique_id": new_paper2_id,
                    "created_at": now_iso()
                }
                
                # Note: No questions released when splitting into two schemas - both keep their questions
            else:
                # Move to majority paper type - release questions from minority type
                if paper1_count >= paper2_count:
                    paper1_content += block_text + "\n\n"
                    # Keep only Paper 1 evidence, release Paper 2 questions
                    if schema_id in schemas_meta:
                        schemas_meta[schema_id]["evidence"] = paper1_evidence
                        schemas_meta[schema_id]["has_tmua_evidence"] = True
                    released_questions["Paper2"].extend(paper2_evidence)
                else:
                    paper2_content += block_text + "\n\n"
                    # Keep only Paper 2 evidence, release Paper 1 questions
                    if schema_id in schemas_meta:
                        schemas_meta[schema_id]["evidence"] = paper2_evidence
                        schemas_meta[schema_id]["has_tmua_evidence"] = True
                    released_questions["Paper1"].extend(paper1_evidence)
        
        # Handle unknown blocks - try to infer from content or move to Paper 1 as default
        for schema_id, block_text in unknown_blocks:
            # Default to Paper 1 for unknown (M prefix or ambiguous)
            if schema_id.startswith("M") or not schema_id.startswith("R"):
                paper1_content += block_text + "\n\n"
            else:
                paper2_content += block_text + "\n\n"
        
        # Ensure files exist
        TMUA_PAPER1_SCHEMAS_MD.parent.mkdir(parents=True, exist_ok=True)
        TMUA_PAPER2_SCHEMAS_MD.parent.mkdir(parents=True, exist_ok=True)
        
        # Write to files
        safe_write_text(TMUA_PAPER1_SCHEMAS_MD, paper1_content)
        safe_write_text(TMUA_PAPER2_SCHEMAS_MD, paper2_content)
        
        # Delete legacy file if it exists
        legacy_file = SCHEMAS_DIR_DEFAULT / "Schemas_TMUA.md"
        if legacy_file.exists() and legacy_file != TMUA_PAPER1_SCHEMAS_MD and legacy_file != TMUA_PAPER2_SCHEMAS_MD:
            legacy_file.unlink()
        
        # Save updated metadata (with filtered evidence for mixed schemas)
        save_schemas_meta(schemas_meta)
        
        # Remove released questions from used_questions tracking so they can be reused
        if released_questions["Paper1"] or released_questions["Paper2"]:
            used_qids = load_used_questions()
            released_count = 0
            for paper_type, qids in released_questions.items():
                for qid in qids:
                    if qid in used_qids:
                        used_qids.remove(qid)
                        released_count += 1
            if released_count > 0:
                save_used_questions(used_qids)
                print(f"[SPLIT] Released {released_count} questions from mixed schemas for reuse ({len(released_questions['Paper1'])} Paper 1, {len(released_questions['Paper2'])} Paper 2)")
        
        # Reload schemas
        self._load_schemas()
        
        stats = {
            "paper1_count": len(paper1_blocks),
            "paper2_count": len(paper2_blocks),
            "mixed_count": len(mixed_blocks),
            "unknown_count": len(unknown_blocks),
            "total": len(all_blocks),
            "released_paper1": len(released_questions["Paper1"]),
            "released_paper2": len(released_questions["Paper2"])
        }
        
        return stats
    
    def _create_schema_version_for_paper(self, original_block: str, original_schema_id: str, 
                                        new_prefix: str, exemplar_questions: List[tuple[str, str]]) -> str:
        """
        Create a version of a schema block for a specific paper type.
        Updates exemplar questions to only include relevant ones.
        """
        lines = original_block.splitlines()
        result_lines = []
        
        i = 0
        in_exemplar_section = False
        exemplar_replaced = False
        
        while i < len(lines):
            line = lines[i]
            line_stripped = line.strip()
            
            # Update schema ID in header
            m = SCHEMA_HEADER_RE.match(line_stripped)
            if m:
                # Change prefix while keeping number or unique ID
                schema_id_part = m.group(1)
                if "_" in schema_id_part:
                    # Unique ID: keep the unique part but change prefix
                    unique_part = schema_id_part.split("_", 1)[1]
                    new_schema_id = f"{new_prefix}_{unique_part}"
                else:
                    # Sequential ID: change prefix
                    new_schema_id = new_prefix + schema_id_part[1:] if len(schema_id_part) > 1 else new_prefix + "1"
                
                title = m.group(3).strip()
                result_lines.append(f"## **{new_schema_id}. {title}**")
                i += 1
                continue
            
            # Detect start of exemplar questions section
            if "exemplar questions" in line_stripped.lower():
                in_exemplar_section = True
                result_lines.append(line)  # Keep the header
                i += 1
                # Skip all exemplar bullet points
                while i < len(lines):
                    if lines[i].strip().startswith("- ") or lines[i].strip().startswith("* "):
                        # Skip old exemplar
                        i += 1
                        continue
                    # Check if we've moved to next section
                    next_line = lines[i].strip()
                    if (next_line.startswith("**") or 
                        next_line == "---" or 
                        SCHEMA_HEADER_RE.match(next_line) or
                        (next_line and not next_line.startswith("-") and not next_line.startswith("*"))):
                        break
                    i += 1
                
                # Add filtered exemplar questions
                if exemplar_questions:
                    for qid, justification in exemplar_questions:
                        result_lines.append(f"- `{qid}`: {justification}")
                else:
                    # No exemplars for this paper type - add a note
                    result_lines.append("- (No exemplar questions for this paper type)")
                
                exemplar_replaced = True
                in_exemplar_section = False
                continue
            
            # Skip lines that are part of old exemplar section (if we're in it)
            if in_exemplar_section and (line_stripped.startswith("- ") or line_stripped.startswith("* ")):
                i += 1
                continue
            
            # Stop at separator
            if line_stripped == "---":
                result_lines.append(line)
                break
            
            result_lines.append(line)
            i += 1
        
        # Ensure block ends with separator
        if result_lines and result_lines[-1].strip() != "---":
            result_lines.append("---")
        
        return "\n".join(result_lines)
    
    def _renumber_all_schemas(self) -> Dict[str, str]:
        """
        Renumber all schemas from unique IDs (M_uuid) to sequential IDs (M1, M2, etc.).
        Updates markdown file and all JSON cache files.
        Returns mapping {old_id: new_id} for reference.
        """
        if not self.schemas_md_path.exists():
            return {}
        
        # Read current schemas
        md = safe_read_text(self.schemas_md_path)
        summaries = parse_schema_summaries(md)
        
        # Group schemas by prefix - only renumber unique IDs (M_uuid), keep sequential (M1) as-is
        schemas_by_prefix: Dict[str, List[Tuple[str, str, str, int]]] = {}  # prefix -> [(id, title, created_at, file_order)]
        sequential_schemas: Dict[str, str] = {}  # schema_id -> prefix (for tracking)
        
        # Also track file order as fallback for sorting
        file_order = 0
        for s in summaries:
            # Extract prefix
            if s.schema_id.startswith(("M", "P", "B", "C", "R")):
                prefix = s.schema_id[0]
                # Check if it's a unique ID (has underscore) or sequential (M1, M2, etc.)
                is_unique = "_" in s.schema_id
                is_sequential = re.match(r"^[MPBCR]\d+$", s.schema_id)
                
                if is_unique:
                    # Only renumber unique IDs
                    meta = self.schemas_meta.get(s.schema_id, {})
                    created_at = meta.get("created_at", "1970-01-01T00:00:00")  # Default to old date if missing
                    schemas_by_prefix.setdefault(prefix, []).append((s.schema_id, s.title, created_at, file_order))
                elif is_sequential:
                    # Track sequential schemas - they won't be renumbered but we need to account for them
                    sequential_schemas[s.schema_id] = prefix
                
                file_order += 1
        
        # Sort by creation time (oldest first), then by file order as tiebreaker
        for prefix in schemas_by_prefix:
            schemas_by_prefix[prefix].sort(key=lambda x: (x[2], x[3]))
        
        # Create mapping: old_id -> new_id
        # Need to account for existing sequential schemas when assigning new numbers
        id_mapping: Dict[str, str] = {}
        for prefix in sorted(schemas_by_prefix.keys()):
            schemas = schemas_by_prefix[prefix]
            
            # Find highest existing sequential number for this prefix
            max_seq = 0
            for seq_id in sequential_schemas:
                if sequential_schemas[seq_id] == prefix:
                    try:
                        num = int(seq_id[1:])
                        max_seq = max(max_seq, num)
                    except ValueError:
                        pass
            
            # Assign sequential IDs starting after existing ones
            for i, (old_id, title, _, _) in enumerate(schemas, 1):
                new_id = f"{prefix}{max_seq + i}"
                id_mapping[old_id] = new_id
        
        if not id_mapping:
            return {}
        
        # Backup files before renumbering
        backup_dir = self.schemas_md_path.parent / "_backups"
        backup_dir.mkdir(exist_ok=True)
        timestamp = now_iso().replace(":", "-")
        
        # Backup markdown
        backup_md = backup_dir / f"Schemas_ESAT_backup_{timestamp}.md"
        if self.schemas_md_path.exists():
            shutil.copy2(self.schemas_md_path, backup_md)
        
        # Update markdown file
        new_md = md
        for old_id, new_id in id_mapping.items():
            # Replace schema headers (## **M_a1b2c3d4. Title** → ## **M1. Title**)
            pattern = rf"##\s+\*\*{re.escape(old_id)}\.\s*"
            replacement = f"## **{new_id}. "
            new_md = re.sub(pattern, replacement, new_md)
            
            # Also replace any other references to the schema ID in the markdown
            # (e.g., in notes sections mentioning "see schema M_a1b2c3d4")
            # Only replace if it matches the schema ID pattern (prefix + underscore + hex)
            # This avoids replacing question IDs or other text
            if "_" in old_id and len(old_id) > 2:
                # Pattern: word boundary, schema ID, word boundary (or period/comma/space)
                schema_id_pattern = rf"(?<![a-zA-Z0-9_]){re.escape(old_id)}(?![a-zA-Z0-9_])"
                new_md = re.sub(schema_id_pattern, new_id, new_md)
        
        # Write updated markdown
        temp_file = self.schemas_md_path.with_suffix('.tmp')
        safe_write_text(temp_file, new_md)
        shutil.move(str(temp_file), str(self.schemas_md_path))
        
        # Update schemas_meta.json
        new_meta = {}
        for old_id, new_id in id_mapping.items():
            if old_id in self.schemas_meta:
                meta = self.schemas_meta[old_id].copy()
                meta["unique_id"] = old_id  # Preserve original unique ID
                meta["renumbered_at"] = now_iso()
                new_meta[new_id] = meta
        
        # Add any schemas that weren't renumbered (already sequential)
        for schema_id, meta in self.schemas_meta.items():
            if schema_id not in id_mapping and schema_id not in new_meta:
                # Check if it's already sequential format
                if re.match(r"^[MPBCR]\d+$", schema_id):
                    new_meta[schema_id] = meta
        
        self.schemas_meta = new_meta
        save_schemas_meta(self.schemas_meta)
        
        # Update schema_embeddings.json
        if SCHEMA_EMBEDDINGS_JSON.exists():
            embeddings = load_embeddings()
            new_embeddings = {}
            for old_id, new_id in id_mapping.items():
                if old_id in embeddings:
                    new_embeddings[new_id] = embeddings[old_id]
            # Keep embeddings for schemas that weren't renumbered
            for schema_id, embedding in embeddings.items():
                if schema_id not in id_mapping and schema_id not in new_embeddings:
                    if re.match(r"^[MPBCR]\d+$", schema_id):
                        new_embeddings[schema_id] = embedding
            save_embeddings(new_embeddings)
        
        # Update schema_coverage.json
        if SCHEMA_COVERAGE_JSON.exists():
            coverage = load_schema_coverage()
            new_coverage = {}
            for old_id, new_id in id_mapping.items():
                if old_id in coverage:
                    new_coverage[new_id] = coverage[old_id]
            # Keep coverage for schemas that weren't renumbered
            for schema_id, cov in coverage.items():
                if schema_id not in id_mapping and schema_id not in new_coverage:
                    if re.match(r"^[MPBCR]\d+$", schema_id):
                        new_coverage[schema_id] = cov
            save_schema_coverage(new_coverage)
        
        # Update DECISIONS_JSONL (optional, for history)
        if DECISIONS_JSONL.exists():
            decisions_lines = safe_read_text(DECISIONS_JSONL).strip().split("\n")
            updated_lines = []
            for line in decisions_lines:
                if line.strip():
                    try:
                        decision = json.loads(line)
                        # Update assigned_schema_id if present
                        if "assigned_schema_id" in decision:
                            old_id = decision["assigned_schema_id"]
                            if old_id in id_mapping:
                                decision["assigned_schema_id"] = id_mapping[old_id]
                        # Update schema_id in candidate if present
                        if "candidate" in decision and isinstance(decision["candidate"], dict):
                            if "collision_guess" in decision["candidate"]:
                                updated_guesses = []
                                for guess_id in decision["candidate"]["collision_guess"]:
                                    updated_guesses.append(id_mapping.get(guess_id, guess_id))
                                decision["candidate"]["collision_guess"] = updated_guesses
                        updated_lines.append(json.dumps(decision))
                    except json.JSONDecodeError:
                        updated_lines.append(line)  # Keep malformed lines as-is
            
            # Backup decisions log
            backup_decisions = backup_dir / f"decisions_backup_{timestamp}.jsonl"
            if DECISIONS_JSONL.exists():
                shutil.copy2(DECISIONS_JSONL, backup_decisions)
            
            # Write updated decisions
            safe_write_text(DECISIONS_JSONL, "\n".join(updated_lines) + "\n")
        
        # Reload everything
        self._load_schemas()
        self._load_embeddings()
        self._load_meta()
        
        return id_mapping
    
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
        total_questions = len(self.index)  # Include all questions (diagram filtering disabled)
        
        # Only count used questions that actually exist in the current index
        # This prevents counting questions from different filters or removed papers
        used_in_index = 0
        for q in self.index:
            if True:  # Include all questions (diagram filtering disabled)
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
            if True:  # Include all questions (diagram filtering disabled)
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
        # Enrich UI has been removed; controls are left as None.
        # Guard against calls when widgets don't exist.
        if (
            self.enrich_schema_combo is None
            or self.enrich_schema_var is None
            or self.enrich_section_var is None
            or self.enrich_bullet_combo is None
            or self.enrich_bullet_var is None
        ):
            return

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
        # If enrich UI is not present, do nothing.
        if (
            self.enrich_schema_var is None
            or self.enrich_section_var is None
            or self.enrich_bullet_combo is None
            or self.enrich_bullet_var is None
        ):
            return

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
            kept = len(self.index)  # Include all questions (diagram filtering disabled)
            
            # Check if we're working with TMUA and switch schemas file if needed
            if self.index:
                is_tmua = any(q.exam == "TMUA" for q in self.index)
                if is_tmua:
                    self.schemas_md_path = TMUA_PAPER1_SCHEMAS_MD
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
            
            if total == 0:
                # Show warning dialog with helpful information
                msg = f"No questions indexed!\n\n"
                msg += f"Mode: {MODE}\n"
                msg += f"Papers directory: {self.papers_dir}\n"
                msg += f"Directory exists: {self.papers_dir.exists()}\n\n"
                msg += "Check the console output for detailed debugging information.\n"
                msg += "You may need to:\n"
                msg += "1. Check that PDFs exist in the papers directory\n"
                msg += "2. Try 'Force rebuild index' checkbox\n"
                msg += "3. Check the extraction report for failed PDFs"
                self.after(0, lambda: messagebox.showwarning("No Questions Indexed", msg))
            
            exam_type = "TMUA" if self.index and any(q.exam == "TMUA" for q in self.index) else "ENGAA/NSAA"
            self._set_status(f"Indexed {total} question blocks ({exam_type}). Diagram-free kept: {kept}. Cache: {INDEX_JSON}")

        threading.Thread(target=work, daemon=True).start()

    def on_review_questions_solutions(self):
        """Open a window to review questions with their extracted solutions."""
        if not self.index:
            messagebox.showinfo("Index first", "Click 'Index PDFs' first.")
            return
        
        # Filter to only questions with solutions (for TMUA)
        # Also exclude unknown papers (section = None, "?", or empty)
        questions_with_solutions = [
            q for q in self.index 
            if q.solution_text 
            and q.section  # Must have a section
            and q.section != "?"  # Not unknown
            and (isinstance(q.section, str) and q.section.strip() != "")  # Not empty
        ]
        
        if not questions_with_solutions:
            messagebox.showinfo("No Solutions", 
                "No questions with solutions found. Make sure you've indexed TMUA papers with Official Solutions.")
            return
        
        # Create review window
        review_win = tk.Toplevel(self)
        review_win.title("Review Questions & Solutions")
        review_win.geometry("1200x800")
        
        # Top frame: Filters and navigation
        top_frame = ttk.Frame(review_win)
        top_frame.pack(fill="x", padx=10, pady=10)
        
        # Filter by paper type (for TMUA)
        filter_frame = ttk.Frame(top_frame)
        filter_frame.pack(side="left", padx=5)
        
        ttk.Label(filter_frame, text="Filter:").pack(side="left", padx=5)
        filter_var = tk.StringVar(value="All")
        
        # Store references for callback
        review_data = {
            'questions': questions_with_solutions,
            'filter_var': filter_var,
            'current_idx_var': tk.IntVar(value=0),
            'question_listbox': None,
            'question_display': None,
            'solution_display': None,
            'question_info': None
        }
        
        def update_list():
            self._update_review_list(review_win, review_data)
        
        ttk.Radiobutton(filter_frame, text="All", variable=filter_var, value="All",
                       command=update_list).pack(side="left")
        
        if MODE == "TMUA":
            ttk.Radiobutton(filter_frame, text="Paper 1", variable=filter_var, value="Paper 1",
                           command=update_list).pack(side="left", padx=5)
            ttk.Radiobutton(filter_frame, text="Paper 2", variable=filter_var, value="Paper 2",
                           command=update_list).pack(side="left", padx=5)
        
        # Navigation
        nav_frame = ttk.Frame(top_frame)
        nav_frame.pack(side="right", padx=5)
        
        def nav_prev():
            idx = review_data['current_idx_var'].get()
            if idx > 0:
                review_data['current_idx_var'].set(idx - 1)
                self._update_review_display(review_data)
        
        def nav_next():
            idx = review_data['current_idx_var'].get()
            filtered = self._get_filtered_questions(review_data['questions'], filter_var)
            if idx < len(filtered) - 1:
                review_data['current_idx_var'].set(idx + 1)
                self._update_review_display(review_data)
        
        ttk.Button(nav_frame, text="◀ Previous", command=nav_prev).pack(side="left", padx=2)
        review_data['question_info'] = ttk.Label(nav_frame, text="0 / 0")
        review_data['question_info'].pack(side="left", padx=10)
        ttk.Button(nav_frame, text="Next ▶", command=nav_next).pack(side="left", padx=2)
        
        # Main content: Question list on left, question/solution display on right
        main_frame = ttk.Frame(review_win)
        main_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        # Left: Question list
        list_frame = ttk.LabelFrame(main_frame, text="Questions", padding=5)
        list_frame.pack(side="left", fill="both", expand=False, padx=(0, 5))
        list_frame.config(width=300)
        
        question_listbox = tk.Listbox(list_frame, width=40, height=30)
        question_listbox.pack(fill="both", expand=True)
        review_data['question_listbox'] = question_listbox
        
        def on_list_select(event):
            selection = question_listbox.curselection()
            if selection:
                review_data['current_idx_var'].set(selection[0])
                self._update_review_display(review_data)
        
        question_listbox.bind("<<ListboxSelect>>", on_list_select)
        
        # Right: Question and solution display
        display_frame = ttk.Frame(main_frame)
        display_frame.pack(side="right", fill="both", expand=True)
        
        # Question display
        question_label = ttk.Label(display_frame, text="Question:", font=("TkDefaultFont", 10, "bold"))
        question_label.pack(anchor="w", pady=(0, 5))
        
        question_display = tk.Text(display_frame, wrap="word", height=15, padx=10, pady=10)
        question_display.pack(fill="both", expand=True)
        review_data['question_display'] = question_display
        
        # Solution display
        solution_label = ttk.Label(display_frame, text="Solution:", font=("TkDefaultFont", 10, "bold"))
        solution_label.pack(anchor="w", pady=(10, 5))
        
        solution_display = tk.Text(display_frame, wrap="word", height=15, padx=10, pady=10, bg="#f0f0f0")
        solution_display.pack(fill="both", expand=True)
        review_data['solution_display'] = solution_display
        
        # Initial update
        self._update_review_list(review_win, review_data)
    
    def _get_filtered_questions(self, questions: List[QuestionItem], filter_var: tk.StringVar) -> List[QuestionItem]:
        """Filter questions by paper type."""
        filter_value = filter_var.get()
        if filter_value == "All":
            return questions
        elif filter_value == "Paper 1":
            return [q for q in questions if q.section and "Paper 1" in q.section]
        elif filter_value == "Paper 2":
            return [q for q in questions if q.section and "Paper 2" in q.section]
        return questions
    
    def _update_review_list(self, win, review_data: dict):
        """Update the question list based on filter."""
        questions = review_data['questions']
        filter_var = review_data['filter_var']
        filtered = self._get_filtered_questions(questions, filter_var)
        
        # Update listbox
        question_listbox = review_data['question_listbox']
        question_listbox.delete(0, tk.END)
        for q in filtered:
            year = q.year or "?"
            section = q.section or "?"
            qnum = q.qnum
            label = f"{year} {section} Q{qnum}"
            question_listbox.insert(tk.END, label)
        
        # Reset to first question
        if filtered:
            review_data['current_idx_var'].set(0)
            question_listbox.selection_set(0)
            self._update_review_display(review_data)
    
    def _update_review_display(self, review_data: dict):
        """Update the question and solution display."""
        questions = review_data['questions']
        filter_var = review_data['filter_var']
        current_idx_var = review_data['current_idx_var']
        question_display = review_data['question_display']
        solution_display = review_data['solution_display']
        question_info = review_data['question_info']
        
        filtered = self._get_filtered_questions(questions, filter_var)
        idx = current_idx_var.get()
        
        if not filtered or idx < 0 or idx >= len(filtered):
            question_display.delete("1.0", tk.END)
            solution_display.delete("1.0", tk.END)
            if question_info:
                question_info.config(text="0 / 0")
            return
        
        q = filtered[idx]
        
        # Update info label
        if question_info:
            question_info.config(text=f"{idx + 1} / {len(filtered)}")
        
        # Update listbox selection
        question_listbox = review_data['question_listbox']
        question_listbox.selection_clear(0, tk.END)
        question_listbox.selection_set(idx)
        question_listbox.see(idx)
        
        # Display question
        question_display.delete("1.0", tk.END)
        question_header = f"Question {q.qnum}"
        if q.year:
            question_header += f" ({q.year}"
            if q.section:
                question_header += f" {q.section}"
            question_header += ")"
        question_display.insert("1.0", f"{question_header}\n\n{q.text}")
        
        # Display solution
        solution_display.delete("1.0", tk.END)
        if q.solution_text:
            solution_display.insert("1.0", q.solution_text)
        else:
            solution_display.insert("1.0", "[No solution available]")
    
    def on_view_extraction_report(self):
        """Display extraction report in a popup window."""
        report_path = LOG_DIR_DEFAULT / "extraction_report.json"
        
        if not report_path.exists():
            messagebox.showinfo("No Report", "No extraction report found. Run 'Index PDFs' first.")
            return
        
        try:
            with open(report_path, 'r', encoding='utf-8') as f:
                report = json.load(f)
            
            # Create popup window
            win = tk.Toplevel(self)
            win.title("PDF Extraction Report")
            win.geometry("800x600")
            
            # Summary at top
            summary_frame = ttk.Frame(win)
            summary_frame.pack(fill="x", padx=10, pady=10)
            
            summary = report.get("summary", {})
            ttk.Label(summary_frame, text=f"Mode: {report.get('mode', 'N/A')}", 
                     font=("TkDefaultFont", 10, "bold")).pack(anchor="w")
            ttk.Label(summary_frame, text=f"Created: {report.get('created_at', 'N/A')}").pack(anchor="w")
            ttk.Label(summary_frame, text=f"Scanned: {summary.get('scanned', 0)} PDFs").pack(anchor="w")
            ttk.Label(summary_frame, text=f"Success: {summary.get('success', 0)} PDFs", 
                     foreground="green").pack(anchor="w")
            ttk.Label(summary_frame, text=f"Failed: {summary.get('failed', 0)} PDFs", 
                     foreground="red").pack(anchor="w")
            
            # Detailed list
            ttk.Label(win, text="Per-PDF Details:").pack(anchor="w", padx=10)
            
            text = tk.Text(win, wrap="word")
            text.pack(fill="both", expand=True, padx=10, pady=5)
            
            per_pdf = report.get("per_pdf", [])
            for pdf_stat in per_pdf:
                status = pdf_stat.get("status", "UNKNOWN")
                pdf_name = Path(pdf_stat.get("pdf_path", "")).name
                
                if status == "SUCCESS":
                    text.insert(tk.END, f"✓ {pdf_name}\n", "success")
                    text.insert(tk.END, f"  Questions: {pdf_stat.get('question_count', 0)}, "
                                       f"Chars: {pdf_stat.get('total_chars', 0)}\n\n")
                else:
                    text.insert(tk.END, f"✗ {pdf_name}\n", "failed")
                    text.insert(tk.END, f"  Reason: {pdf_stat.get('failure_reason', 'Unknown')}\n\n", "failed")
            
            text.tag_config("success", foreground="green")
            text.tag_config("failed", foreground="red")
            text.config(state="disabled")
            
            # Close button
            ttk.Button(win, text="Close", command=win.destroy).pack(pady=5)
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load extraction report: {e}")

    def _accept_candidate_as_schema(self, candidate: Candidate) -> Optional[str]:
        """
        Accept a candidate as a new schema (helper method for pipeline).
        Returns schema_id if successful, None otherwise.
        """
        try:
            # Generate full schema markdown
            md = self.gemini.generate_text(prompt_full_schema(candidate))
            md = md.strip()
            
            # Ensure trailing separator
            if not md.endswith("---"):
                if not md.endswith("\n"):
                    md += "\n"
                md += "\n---\n"
            
            # Validate and auto-fix
            is_valid, errors, fixed_preview = validate_schema_block(md, auto_fix=True)
            if fixed_preview:
                md = fixed_preview
            
            if not is_valid:
                print(f"[REJECT] Candidate {candidate.candidate_id}: Validation failed: {errors}")
                return None
            
            # For TMUA: Route to correct schema file based on prefix
            if MODE == "TMUA":
                normalized_prefix = normalize_prefix(candidate.prefix)
                if normalized_prefix == "R":
                    target_path = TMUA_PAPER2_SCHEMAS_MD
                else:
                    target_path = TMUA_PAPER1_SCHEMAS_MD
                
                if not target_path.exists():
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    if normalized_prefix == "R":
                        target_path.write_text("# TMUA Paper 2 Schemas (Mathematical Reasoning)\n\n", encoding="utf-8")
                    else:
                        target_path.write_text("# TMUA Paper 1 Schemas (Mathematical Knowledge)\n\n", encoding="utf-8")
            else:
                target_path = self.schemas_md_path
                if not target_path.exists():
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    target_path.write_text("# Schemas\n\n", encoding="utf-8")
            
            # Assign unique schema ID
            normalized_prefix = normalize_prefix(candidate.prefix)
            new_id = generate_unique_schema_id(normalized_prefix)
            
            # Clean placeholders
            md = clean_schema_markdown(md, new_id, candidate.title)
            
            # Atomic write
            temp_file = target_path.with_suffix('.tmp')
            try:
                current_content = safe_read_text(target_path)
                new_content = current_content + "\n" + md + "\n"
                safe_write_text(temp_file, new_content)
                shutil.move(str(temp_file), str(target_path))
            except Exception as e:
                print(f"[ERROR] Failed to write schema {new_id}: {e}")
                if temp_file.exists():
                    temp_file.unlink()
                return None
            
            # Update meta
            if new_id not in self.schemas_meta:
                self.schemas_meta[new_id] = {
                    "edits_count": 0,
                    "locked": False,
                    "evidence": [],
                    "unique_id": new_id,
                    "created_at": now_iso()
                }
            self.schemas_meta[new_id]["has_tmua_evidence"] = has_tmua_evidence(candidate)
            save_schemas_meta(self.schemas_meta)
            
            # Update coverage
            update_schema_coverage(new_id, candidate, self.index)
            
            return new_id
        except Exception as e:
            print(f"[ERROR] Failed to accept candidate {candidate.candidate_id}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def _merge_candidate_into_schema(self, candidate: Candidate, schema_id: str):
        """
        Merge a candidate's evidence into an existing schema.
        """
        try:
            # Add evidence to existing schema
            if schema_id not in self.schemas_meta:
                self.schemas_meta[schema_id] = {"evidence": [], "edits_count": 0}
            
            existing_evidence = set(self.schemas_meta[schema_id].get("evidence", []))
            for qid in candidate.evidence:
                if qid not in existing_evidence:
                    existing_evidence.add(qid)
            
            self.schemas_meta[schema_id]["evidence"] = list(existing_evidence)
            save_schemas_meta(self.schemas_meta)
            
            # Update schema markdown file with new exemplars
            for qid in candidate.evidence:
                if qid not in existing_evidence:
                    justification = candidate.exemplar_justifications.get(qid, "Exemplifies pattern") if candidate.exemplar_justifications else "Exemplifies pattern"
                    self._update_schema_exemplars_in_file(schema_id, qid, justification)
        except Exception as e:
            print(f"[ERROR] Failed to merge candidate into {schema_id}: {e}")
            import traceback
            traceback.print_exc()
    
    def on_process_all_questions(self):
        """
        Three-stage schema generation pipeline:
        1. Stage 1: Parallel fingerprint extraction (one LLM call per question)
        2. Stage 2: LLM-based clustering of fingerprints
        3. Stage 3: Parallel schema synthesis (one LLM call per cluster)
        """
        if not self.index:
            messagebox.showinfo("Index first", "Click 'Index PDFs' first.")
            return
        
        # Get filter settings
        filt = self.batch_filter.get().strip().lower()
        
        # Select questions to process
        pool = self.index
        if filt:
            pool = [q for q in pool if filt in q.pdf_path.lower()]
        
        if len(pool) < 1:
            messagebox.showwarning("No questions", "No questions matched the filter.")
            return
        
        # Filter out already used questions
        unused_pool = [q for q in pool if f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "") not in self.used_question_ids]
        
        if len(unused_pool) < 1:
            if messagebox.askyesno("Reset tracking?", 
                f"All questions have been processed. Reset tracking and reprocess?"):
                self.used_question_ids.clear()
                self._save_used_questions()
                unused_pool = pool
            else:
                messagebox.showinfo("Done", "All questions have been processed.")
                return
        
        # Confirm before starting
        if not messagebox.askyesno("Process All Questions (Three-Stage Pipeline)", 
            f"This will process {len(unused_pool)} questions using the new three-stage pipeline:\n\n"
            f"Stage 1: Extract fingerprints in parallel ({PARALLEL_WORKERS} workers)\n"
            f"Stage 2: Cluster fingerprints using LLM\n"
            f"Stage 3: Synthesize schemas from clusters ({PARALLEL_WORKERS} workers)\n\n"
            f"Continue?"):
            return
        
        def work():
            try:
                # Stage 1: Extract fingerprints in parallel
                self.after(0, lambda: self._set_status("Stage 1: Extracting fingerprints..."))
                fingerprints = self._extract_fingerprints_parallel(unused_pool)
                
                # Skip barrier - continue with what we have
                # (The worker already loads existing fingerprints from disk)
                
                # Filter to eligible fingerprints
                eligible_fps = {qid: fp for qid, fp in fingerprints.items() if fp.eligible}
                self.after(0, lambda: self._set_status(
                    f"Stage 1 complete: {len(eligible_fps)}/{len(fingerprints)} eligible fingerprints"
                ))
                
                if len(eligible_fps) < 3:
                    self.after(0, lambda: messagebox.showwarning("Too Few Fingerprints", 
                        f"Only {len(eligible_fps)} eligible fingerprints. Need at least 3 for clustering."))
                    return
                
                # Stage 2: Cluster fingerprints
                self.after(0, lambda: self._set_status("Stage 2: Clustering fingerprints..."))
                clusters = self._cluster_fingerprints_llm(eligible_fps)
                
                if not clusters:
                    self.after(0, lambda: messagebox.showerror("Error", "Clustering failed or produced no clusters."))
                    return
                
                self.after(0, lambda: self._set_status(
                    f"Stage 2 complete: {len(clusters)} clusters created"
                ))
                
                # Stage 3: Synthesize schemas from clusters
                self.after(0, lambda: self._set_status("Stage 3: Synthesizing schemas from clusters..."))
                candidates = self._synthesize_schemas_from_clusters(clusters, eligible_fps)
                
                if not candidates:
                    self.after(0, lambda: messagebox.showwarning("No Candidates", "No schema candidates were generated."))
                    return
                
                # Process candidates: validate and create/merge schemas
                stats = {
                    "total_candidates": len(candidates),
                    "created": 0,
                    "merged": 0,
                    "rejected": 0,
                    "questions_lost": 0,
                    "skipped": 0
                }
                
                # Log model being used
                model_name = self.gemini.get_model_name()
                print(f"[INFO] Using model: {model_name}")
                self.after(0, lambda: self._set_status(f"Using model: {model_name}"))
                
                # Reload schemas to check what already exists
                self._load_schemas()
                existing_schema_evidence = set()
                for schema in self.schema_summaries:
                    meta = self.schemas_meta.get(schema.schema_id, {})
                    evidence = meta.get("evidence", [])
                    existing_schema_evidence.update(evidence)
                
                # Track failed candidates for resume
                failed_candidates = []
                
                for candidate in candidates:
                    try:
                        # Validate candidate
                        is_valid, error_msg = validate_prefix_against_content(candidate, self.index)
                        if not is_valid:
                            print(f"[REJECT] Candidate {candidate.candidate_id}: {error_msg}")
                            stats["rejected"] += 1
                            if candidate.evidence:
                                stats["questions_lost"] += len(candidate.evidence)
                            continue
                        
                        # Check for collisions
                        if candidate.collision_guess:
                            # Try to merge with existing schema
                            collision_id = candidate.collision_guess[0]
                            if any(s.schema_id == collision_id for s in self.schema_summaries):
                                # Merge logic: add evidence to existing schema
                                self._merge_candidate_into_schema(candidate, collision_id)
                                stats["merged"] += 1
                                continue
                        
                        # Create new schema
                        schema_id = self._accept_candidate_as_schema(candidate)
                        if schema_id:
                            stats["created"] += 1
                            # Mark questions as used
                            for qid in candidate.evidence:
                                self.used_question_ids.add(qid)
                        else:
                            stats["rejected"] += 1
                            # Count questions lost due to rejection
                            if candidate.evidence:
                                stats["questions_lost"] = stats.get("questions_lost", 0) + len(candidate.evidence)
                    except Exception as e:
                        print(f"[ERROR] Failed to process candidate {candidate.candidate_id}: {e}")
                        stats["rejected"] += 1
                        # Count questions lost due to error
                        if candidate.evidence:
                            stats["questions_lost"] = stats.get("questions_lost", 0) + len(candidate.evidence)
                
                # Save failed candidates for resume if any
                if failed_candidates:
                    failed_file = FINGERPRINTS_DIR_DEFAULT.parent / "failed_candidates.jsonl"
                    with open(failed_file, 'w', encoding='utf-8') as f:
                        for candidate in failed_candidates:
                            f.write(json.dumps(asdict(candidate), ensure_ascii=False) + "\n")
                    print(f"[INFO] Saved {len(failed_candidates)} failed candidates to {failed_file}")
                
                # Save used questions
                self._save_used_questions()
                
                # Final reload
                self.after(0, self._load_schemas)
                self.after(0, self._load_embeddings)
                self.after(0, self._load_meta)
                
                # Show summary
                questions_lost = stats.get("questions_lost", 0)
                skipped = stats.get("skipped", 0)
                summary = (f"Three-stage pipeline complete:\n\n"
                          f"Model used: {self.gemini.get_model_name()}\n\n"
                          f"Stage 1: {len(eligible_fps)} eligible fingerprints extracted\n"
                          f"Stage 2: {len(clusters)} clusters created\n"
                          f"Stage 3: {stats['total_candidates']} schema candidates generated\n\n"
                          f"Results:\n"
                          f"✓ New schemas created: {stats['created']}\n"
                          f"↻ Merged with existing: {stats['merged']}\n"
                          f"⊘ Skipped (already exist): {skipped}\n"
                          f"✗ Rejected: {stats['rejected']}")
                if questions_lost > 0:
                    summary += f"\n⚠ Questions lost due to failures: {questions_lost}"
                if failed_candidates:
                    summary += f"\n💾 {len(failed_candidates)} failed candidates saved for resume"
                    summary += f"\n💾 {len(failed_candidates)} failed candidates saved for resume"
                
                self.after(0, lambda: messagebox.showinfo("Processing Complete", summary))
                self.after(0, lambda: self._set_status(
                    f"Done. {stats['created']} created, {stats['merged']} merged, {stats['rejected']} rejected."
                ))
                
            except Exception as e:
                error_msg = f"Fatal error in pipeline: {e}"
                print(f"[ERROR] {error_msg}")
                import traceback
                traceback.print_exc()
                self.after(0, lambda: messagebox.showerror("Error", error_msg))
                self.after(0, lambda: self._set_status("Error occurred. Check console for details."))
        
        threading.Thread(target=work, daemon=True).start()
    
    def on_resume_failed_candidates(self):
        """
        Resume processing failed candidates from a previous run.
        """
        failed_file = FINGERPRINTS_DIR_DEFAULT.parent / "failed_candidates.jsonl"
        
        if not failed_file.exists():
            messagebox.showinfo("No Failed Candidates", "No failed candidates file found. All candidates were processed successfully.")
            return
        
        # Load failed candidates
        failed_candidates = []
        try:
            with open(failed_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        data = json.loads(line)
                        failed_candidates.append(Candidate(**data))
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load failed candidates: {e}")
            return
        
        if not failed_candidates:
            messagebox.showinfo("No Failed Candidates", "Failed candidates file is empty.")
            return
        
        if not messagebox.askyesno("Resume Failed Candidates", 
            f"Found {len(failed_candidates)} failed candidates.\n\n"
            f"This will retry processing them.\n\n"
            f"Continue?"):
            return
        
        def work():
            try:
                self.after(0, lambda: self._set_status(f"Resuming {len(failed_candidates)} failed candidates..."))
                
                # Reload schemas to check what already exists
                self._load_schemas()
                self._load_meta()
                
                existing_schema_evidence = set()
                for schema in self.schema_summaries:
                    meta = self.schemas_meta.get(schema.schema_id, {})
                    evidence = meta.get("evidence", [])
                    existing_schema_evidence.update(evidence)
                
                stats = {
                    "total": len(failed_candidates),
                    "created": 0,
                    "merged": 0,
                    "rejected": 0,
                    "skipped": 0,
                    "questions_lost": 0
                }
                
                model_name = self.gemini.get_model_name()
                print(f"[INFO] Resuming with model: {model_name}")
                
                for candidate in failed_candidates:
                    try:
                        # Check if already processed
                        candidate_evidence_set = set(candidate.evidence)
                        if candidate_evidence_set.issubset(existing_schema_evidence):
                            stats["skipped"] += 1
                            print(f"[SKIP] Candidate {candidate.candidate_id}: Already processed")
                            continue
                        
                        # Validate candidate
                        is_valid, error_msg = validate_prefix_against_content(candidate, self.index)
                        if not is_valid:
                            print(f"[REJECT] Candidate {candidate.candidate_id}: {error_msg}")
                            stats["rejected"] += 1
                            if candidate.evidence:
                                stats["questions_lost"] += len(candidate.evidence)
                            continue
                        
                        # Check for collisions
                        if candidate.collision_guess:
                            collision_id = candidate.collision_guess[0]
                            if any(s.schema_id == collision_id for s in self.schema_summaries):
                                self._merge_candidate_into_schema(candidate, collision_id)
                                stats["merged"] += 1
                                meta = self.schemas_meta.get(collision_id, {})
                                existing_schema_evidence.update(meta.get("evidence", []))
                                continue
                        
                        # Create new schema
                        schema_id = self._accept_candidate_as_schema(candidate)
                        if schema_id:
                            stats["created"] += 1
                            for qid in candidate.evidence:
                                self.used_question_ids.add(qid)
                            existing_schema_evidence.update(candidate.evidence)
                        else:
                            stats["rejected"] += 1
                            if candidate.evidence:
                                stats["questions_lost"] += len(candidate.evidence)
                    except Exception as e:
                        print(f"[ERROR] Failed to process candidate {candidate.candidate_id}: {e}")
                        stats["rejected"] += 1
                        if candidate.evidence:
                            stats["questions_lost"] += len(candidate.evidence)
                
                # Save used questions
                self._save_used_questions()
                
                # Final reload
                self.after(0, self._load_schemas)
                self.after(0, self._load_embeddings)
                self.after(0, self._load_meta)
                
                # Show summary
                summary = (f"Resume complete:\n\n"
                          f"Model used: {model_name}\n\n"
                          f"Total candidates: {stats['total']}\n"
                          f"✓ Created: {stats['created']}\n"
                          f"↻ Merged: {stats['merged']}\n"
                          f"⊘ Skipped: {stats['skipped']}\n"
                          f"✗ Rejected: {stats['rejected']}")
                if stats["questions_lost"] > 0:
                    summary += f"\n⚠ Questions lost: {stats['questions_lost']}"
                
                self.after(0, lambda: messagebox.showinfo("Resume Complete", summary))
                self.after(0, lambda: self._set_status(
                    f"Resume done. {stats['created']} created, {stats['merged']} merged, {stats['rejected']} rejected."
                ))
                
            except Exception as e:
                error_msg = f"Fatal error in resume: {e}"
                print(f"[ERROR] {error_msg}")
                import traceback
                traceback.print_exc()
                self.after(0, lambda: messagebox.showerror("Error", error_msg))
                self.after(0, lambda: self._set_status("Error occurred. Check console for details."))
        
        threading.Thread(target=work, daemon=True).start()
    
    def _create_candidate_from_question(self, question: QuestionItem, 
                                       similar_to: Optional[str] = None,
                                       fit_score: Optional[float] = None) -> Optional[Candidate]:
        """Create a schema candidate from a single question."""
        try:
            # Generate candidate using Gemini
            prompt = f"""Analyze this exam question and propose a schema candidate.

Question:
{question.text[:1000]}

Create a schema that captures the REASONING PATTERN (not the topic).

Return ONLY valid JSON:
{{
  "candidate_id": "C1",
  "prefix": "M|P|B|C",
  "title": "3-8 word title describing the pattern",
  "core_move": "One sentence describing the key reasoning step",
  "evidence": ["{question.exam}_{question.section}_{question.year}_Q{question.qnum}"],
  "exemplar_justifications": {{
    "{question.exam}_{question.section}_{question.year}_Q{question.qnum}": "Why this exemplifies the pattern"
  }},
  "collision_guess": [],
  "confidence": 0.8
}}
"""
            
            data = self.gemini.generate_json(prompt)
            # Normalise response shape: Gemini may return a dict, a list, or a wrapper with "candidates"
            if isinstance(data, list):
                data = data[0] if data else None
            elif isinstance(data, dict) and "candidates" in data and isinstance(data["candidates"], list):
                data = data["candidates"][0] if data["candidates"] else None

            if data and isinstance(data, dict):
                qid = f"{question.exam}_{question.section}_{question.year}_Q{question.qnum}".replace(" ", "")
                
                candidate = Candidate(
                    candidate_id=data.get("candidate_id", f"C{len(self.candidates)+1}"),
                    title=data.get("title", "").strip(),
                    prefix=data.get("prefix", "M").strip().upper(),
                    core_move=data.get("core_move", "").strip(),
                    evidence=[qid],
                    collision_guess=data.get("collision_guess", []),
                    confidence=float(data.get("confidence", 0.5)),
                    exemplar_justifications={qid: data.get("exemplar_justifications", {}).get(qid, "Exemplifies pattern")}
                )
                
                if similar_to:
                    candidate.collision_guess = [similar_to]
                
                return candidate
        except Exception as e:
            print(f"[ERROR] Failed to create candidate from question: {e}")
        
        return None
    
    def _extract_fingerprints_parallel(self, questions: List[QuestionItem]) -> Dict[str, QuestionFingerprint]:
        """
        Stage 1: Extract fingerprints from all questions in parallel.
        Returns dict mapping qid -> QuestionFingerprint.
        """
        fingerprints = {}
        fingerprints_dir = FINGERPRINTS_DIR_DEFAULT
        
        def extract_worker(question: QuestionItem) -> Tuple[str, Optional[QuestionFingerprint], Optional[str]]:
            return _extract_fingerprint_worker(question, self.gemini, fingerprints_dir)
        
        with ThreadPoolExecutor(max_workers=PARALLEL_WORKERS) as executor:
            future_to_question = {executor.submit(extract_worker, q): q for q in questions}
            
            completed = 0
            for future in as_completed(future_to_question):
                try:
                    qid, fingerprint, error = future.result()
                    if fingerprint:
                        fingerprints[qid] = fingerprint
                    else:
                        print(f"[WARN] Failed to extract fingerprint for {qid}: {error}")
                    completed += 1
                    if completed % 10 == 0:
                        self.after(0, lambda c=completed: self._set_status(
                            f"Stage 1: Extracting fingerprints ({c}/{len(questions)} complete)..."
                        ))
                except Exception as e:
                    q = future_to_question[future]
                    qid = f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "")
                    print(f"[ERROR] Exception extracting fingerprint for {qid}: {e}")
        
        return fingerprints
    
    def _cluster_fingerprints_llm(self, fingerprints: Dict[str, QuestionFingerprint]) -> Dict[int, List[str]]:
        """
        Stage 2: Cluster fingerprints using LLM.
        Returns dict mapping cluster_id -> List[qid].
        """
        if not fingerprints:
            return {}
        
        # Filter to eligible fingerprints only
        eligible_fps = {qid: fp for qid, fp in fingerprints.items() if fp.eligible}
        
        if len(eligible_fps) < 3:
            # Too few fingerprints, create one cluster
            return {0: list(eligible_fps.keys())}
        
        # Group fingerprints into batches for LLM processing (50-100 at a time)
        batch_size = 75
        fingerprint_list = list(eligible_fps.items())
        batches = [fingerprint_list[i:i+batch_size] for i in range(0, len(fingerprint_list), batch_size)]
        
        all_clusters = {}
        next_cluster_id = 0
        
        for batch_idx, batch in enumerate(batches):
            self.after(0, lambda b=batch_idx+1, t=len(batches): self._set_status(
                f"Stage 2: Clustering fingerprints (batch {b}/{t})..."
            ))
            
            # Build cluster text for each fingerprint
            fingerprint_texts = []
            for qid, fp in batch:
                cluster_text = f"{fp.reasoning_pattern_hint} | {fp.core_move_guess} | {', '.join(fp.trigger_cues)}"
                fingerprint_texts.append({
                    "qid": qid,
                    "cluster_text": cluster_text,
                    "reasoning_pattern_hint": fp.reasoning_pattern_hint,
                    "core_move_guess": fp.core_move_guess,
                    "trigger_cues": fp.trigger_cues
                })
            
            # LLM clustering prompt
            prompt = f"""Group these {len(batch)} question fingerprints into clusters based on similar reasoning patterns.

Each fingerprint has:
- reasoning_pattern_hint: A pattern label
- core_move_guess: The key reasoning move
- trigger_cues: Surface signals that detect the pattern

Group fingerprints that share:
- Similar reasoning_pattern_hint
- Similar core_move_guess
- Overlapping trigger_cues

Avoid creating too many small clusters (< 3 items) or too few large clusters (> 40 items).
Aim for clusters of 5-25 fingerprints each.

Fingerprints:
{json.dumps(fingerprint_texts, indent=2)}

Return ONLY valid JSON:
{{
  "clusters": [
    {{
      "cluster_id": 1,
      "qids": ["qid1", "qid2", "qid3"],
      "reasoning_pattern": "Brief description of the shared pattern"
    }},
    ...
  ]
}}
"""
            
            try:
                resp = self.gemini.generate_json(prompt)
                if resp and isinstance(resp, dict):
                    clusters_data = resp.get("clusters", [])
                    if isinstance(resp, list):
                        clusters_data = resp
                    
                    for cluster_data in clusters_data:
                        if isinstance(cluster_data, dict):
                            qids = cluster_data.get("qids", [])
                            if qids:
                                all_clusters[next_cluster_id] = qids
                                next_cluster_id += 1
            except Exception as e:
                print(f"[WARN] Failed to cluster batch {batch_idx + 1}: {e}")
                # Fallback: create one cluster per batch
                batch_qids = [qid for qid, _ in batch]
                all_clusters[next_cluster_id] = batch_qids
                next_cluster_id += 1
        
        # Handle any unclustered fingerprints (singletons)
        clustered_qids = set()
        for cluster_qids in all_clusters.values():
            clustered_qids.update(cluster_qids)
        
        unclustered = [qid for qid in eligible_fps.keys() if qid not in clustered_qids]
        if unclustered:
            # Create individual clusters for each unclustered question
            # This ensures every question gets a schema (even if it's a unique pattern)
            for qid in unclustered:
                all_clusters[next_cluster_id] = [qid]
                next_cluster_id += 1
        
        return all_clusters
    
    def _synthesize_schemas_from_clusters(self, clusters: Dict[int, List[str]], 
                                         fingerprints: Dict[str, QuestionFingerprint]) -> List[Candidate]:
        """
        Stage 3: Synthesize schema candidates from clusters in parallel.
        Returns list of Candidate objects.
        """
        candidates = []
        
        # Process all clusters - use every question
        # For small clusters (< 3), we'll still create schemas (they might be unique patterns)
        # For large clusters (> 25), split into multiple schemas to ensure diversity
        valid_clusters = {}
        for cluster_id, qids in clusters.items():
            if len(qids) < 3:
                # Small clusters: create schema anyway (might be unique patterns)
                valid_clusters[cluster_id] = qids
            elif len(qids) > 25:
                # Large clusters: split into multiple schemas (each with 15-25 questions)
                # This ensures we create multiple schemas and use all questions
                chunk_size = 20
                for i in range(0, len(qids), chunk_size):
                    chunk = qids[i:i+chunk_size]
                    if len(chunk) >= 1:  # Accept even single-question chunks
                        valid_clusters[len(valid_clusters)] = chunk
            else:
                valid_clusters[cluster_id] = qids
        
        if not valid_clusters:
            return []
        
        def synthesize_worker(cluster_id: int, qids: List[str]) -> Optional[Candidate]:
            """Worker function to synthesize one schema from a cluster."""
            try:
                # Get fingerprints for this cluster
                cluster_fps = [fingerprints[qid] for qid in qids if qid in fingerprints]
                if not cluster_fps:
                    return None
                
                # Select representative fingerprints (8-20, or all if small)
                if len(cluster_fps) <= 20:
                    representative_fps = cluster_fps
                else:
                    # Sample evenly
                    step = len(cluster_fps) // 20
                    representative_fps = cluster_fps[::step][:20]
                
                # Determine prefix from question IDs
                prefix = "M"  # Default
                for qid in qids:
                    if "Paper2" in qid or "_Paper2_" in qid:
                        prefix = "R"
                        break
                    elif "Paper1" in qid or "_Paper1_" in qid:
                        prefix = "M"
                        break
                
                # Load schema synthesis prompt
                template = load_prompt_template(SCHEMA_SYNTHESIS_CLUSTER_PROMPT_PATH)
                
                # Format existing schemas
                existing_schemas_text = "\n".join(
                    [f"- {s.schema_id}: {s.title} | {s.core_move}" for s in self.schema_summaries[:20]]
                )
                
                # Format cluster fingerprints as JSON
                cluster_fps_json = json.dumps([
                    {
                        "qid": fp.qid,
                        "reasoning_pattern_hint": fp.reasoning_pattern_hint,
                        "core_move_guess": fp.core_move_guess,
                        "trigger_cues": fp.trigger_cues,
                        "mini_steps": fp.mini_steps,
                        "wrong_move": fp.wrong_move,
                        "answer_form": fp.answer_form
                    }
                    for fp in representative_fps
                ], indent=2)
                
                prompt = template.format(
                    existing_schemas=existing_schemas_text,
                    cluster_fingerprints=cluster_fps_json
                )
                
                resp = self.gemini.generate_json(prompt)
                if resp and isinstance(resp, dict):
                    # Handle list wrapper
                    if isinstance(resp, list):
                        resp = resp[0] if resp else {}
                    elif "candidates" in resp:
                        resp = resp["candidates"][0] if resp["candidates"] else {}
                    
                    if resp:
                        # Use ALL questions from cluster as evidence (not just 3-8)
                        # This ensures every question gets used
                        evidence_qids = qids  # Use all questions in the cluster
                        
                        # Build exemplar justifications for all questions
                        exemplar_justifications = {}
                        for qid in evidence_qids:
                            if qid in fingerprints:
                                fp = fingerprints[qid]
                                exemplar_justifications[qid] = f"Exemplifies {fp.reasoning_pattern_hint}"
                            else:
                                exemplar_justifications[qid] = "Exemplifies pattern"
                        
                        # If LLM returned evidence, use it, but ensure we include all cluster questions
                        llm_evidence = resp.get("evidence", [])
                        if llm_evidence:
                            # Merge LLM evidence with all cluster questions (no duplicates)
                            all_evidence = list(set(evidence_qids + llm_evidence))
                        else:
                            all_evidence = evidence_qids
                        
                        candidate = Candidate(
                            candidate_id=resp.get("candidate_id") or f"C{cluster_id}",
                            title=str(resp.get("title", "")),
                            prefix=str(resp.get("prefix", prefix)),
                            core_move=str(resp.get("core_move", "")),
                            evidence=all_evidence,  # Use all questions
                            collision_guess=list(resp.get("collision_guess", [])),
                            confidence=float(resp.get("confidence", 0.0)),
                            exemplar_justifications=resp.get("exemplar_justifications", exemplar_justifications),
                            trigger_cues=list(resp.get("trigger_cues", [])),
                            canonical_steps=list(resp.get("canonical_steps", [])),
                            variation_knobs=list(resp.get("variation_knobs", [])),
                            distractor_archetypes=list(resp.get("distractor_archetypes", [])),
                            answer_form=str(resp.get("answer_form", "other")),
                            scope=str(resp.get("scope", "good")),
                            collision_reason=resp.get("collision_reason")
                        )
                        return candidate
            except Exception as e:
                print(f"[ERROR] Failed to synthesize schema for cluster {cluster_id}: {e}")
                import traceback
                traceback.print_exc()
            
            return None
        
        # Process clusters in parallel
        with ThreadPoolExecutor(max_workers=PARALLEL_WORKERS) as executor:
            future_to_cluster = {
                executor.submit(synthesize_worker, cluster_id, qids): cluster_id
                for cluster_id, qids in valid_clusters.items()
            }
            
            completed = 0
            for future in as_completed(future_to_cluster):
                try:
                    candidate = future.result()
                    if candidate:
                        candidates.append(candidate)
                    completed += 1
                    self.after(0, lambda c=completed, t=len(valid_clusters): self._set_status(
                        f"Stage 3: Synthesizing schemas ({c}/{t} clusters complete)..."
                    ))
                except Exception as e:
                    cluster_id = future_to_cluster[future]
                    print(f"[ERROR] Exception synthesizing cluster {cluster_id}: {e}")
        
        return candidates
    
    def _auto_attach_question_to_schema(self, question: QuestionItem, schema_id: str, fit_score: float):
        """Auto-attach a question as exemplar to an existing schema."""
        qid = f"{question.exam}_{question.section}_{question.year}_Q{question.qnum}".replace(" ", "")
        
        # Add to schema metadata
        if schema_id not in self.schemas_meta:
            self.schemas_meta[schema_id] = {"evidence": [], "edit_count": 0}
        
        if "evidence" not in self.schemas_meta[schema_id]:
            self.schemas_meta[schema_id]["evidence"] = []
        
        if qid not in self.schemas_meta[schema_id]["evidence"]:
            self.schemas_meta[schema_id]["evidence"].append(qid)
            self._save_meta()
            
            # Update markdown file with new exemplar question
            justification = f"Exemplifies pattern (fit score: {fit_score:.1f})"
            self._update_schema_exemplars_in_file(schema_id, qid, justification)
            
            # Mark question as used (it's now in a schema)
            self.used_question_ids.add(qid)
            self._save_used_questions()
        
        # Log the attachment
        append_text(DECISIONS_JSONL, json.dumps({
            "ts": now_iso(),
            "decision": "auto_attach",
            "question_id": qid,
            "schema_id": schema_id,
            "fit_score": fit_score
        }) + "\n")
        
        print(f"[AUTO-ATTACH] {qid} → {schema_id} (score: {fit_score:.1f})")
    
    def _auto_accept_new_schema(self, question: QuestionItem) -> Optional[str]:
        """
        Automatically create and accept a new schema from a question.
        Returns the assigned schema_id if successful, None otherwise.
        """
        try:
            # Create candidate from question
            candidate = self._create_candidate_from_question(question)
            if not candidate:
                return None
            
            # Generate full schema block
            prompt = prompt_full_schema(candidate, enforce_max4=True)
            md_response = self.gemini.generate_text(prompt, temperature=0.4, max_tokens=2000)
            
            if not md_response or not md_response.strip():
                print(f"[ERROR] Failed to generate schema for question")
                return None
            
            # Validate schema
            is_valid, errors, fixed_md = validate_schema_block(md_response, auto_fix=True)
            if fixed_md:
                md_response = fixed_md
            
            if not is_valid:
                print(f"[ERROR] Schema validation failed: {errors}")
                return None
            
            # Assign unique schema ID (no conflicts even with parallel processing)
            # Normalize prefix to single letter (M, P, B, C, R)
            normalized_prefix = normalize_prefix(candidate.prefix)
            new_id = generate_unique_schema_id(normalized_prefix)
            
            # Clean ALL placeholders from the markdown
            md_response = clean_schema_markdown(md_response, new_id, candidate.title)
            
            # Ensure separator at end
            if not md_response.rstrip().endswith("---"):
                md_response = md_response.rstrip() + "\n\n---\n"
            
            # For TMUA: Route to correct schema file based on prefix (M = Paper 1, R = Paper 2)
            target_schemas_path = self.schemas_md_path
            if MODE == "TMUA":
                if normalized_prefix == "R":
                    target_schemas_path = TMUA_PAPER2_SCHEMAS_MD
                else:
                    # M prefix or any other prefix defaults to Paper 1
                    target_schemas_path = TMUA_PAPER1_SCHEMAS_MD
                
                # Ensure file exists
                if not target_schemas_path.exists():
                    target_schemas_path.parent.mkdir(parents=True, exist_ok=True)
                    if normalized_prefix == "R":
                        target_schemas_path.write_text("# TMUA Paper 2 Schemas (Mathematical Reasoning)\n\n", encoding="utf-8")
                    else:
                        target_schemas_path.write_text("# TMUA Paper 1 Schemas (Mathematical Knowledge)\n\n", encoding="utf-8")
            
            # Atomic write to file
            temp_file = target_schemas_path.with_suffix('.tmp')
            try:
                current_content = safe_read_text(target_schemas_path)
                new_content = current_content.rstrip() + "\n\n" + md_response + "\n"
                safe_write_text(temp_file, new_content)
                shutil.move(str(temp_file), str(target_schemas_path))
            except Exception as e:
                print(f"[ERROR] Failed to write schema to file: {e}")
                if temp_file.exists():
                    temp_file.unlink()
                return None
            
            # Update metadata
            if new_id not in self.schemas_meta:
                self.schemas_meta[new_id] = {
                    "edits_count": 0, 
                    "locked": False, 
                    "evidence": [],
                    "unique_id": new_id,  # Store original unique ID
                    "created_at": now_iso()  # Timestamp for sorting during renumbering
                }
            
            # Add question to evidence
            qid = f"{question.exam}_{question.section}_{question.year}_Q{question.qnum}".replace(" ", "")
            if "evidence" not in self.schemas_meta[new_id]:
                self.schemas_meta[new_id]["evidence"] = []
            if qid not in self.schemas_meta[new_id]["evidence"]:
                self.schemas_meta[new_id]["evidence"].append(qid)
            
            self.schemas_meta[new_id]["has_tmua_evidence"] = has_tmua_evidence(candidate)
            save_schemas_meta(self.schemas_meta)
            
            # Update coverage stats
            update_schema_coverage(new_id, candidate, self.index)
            
            # Mark all questions in evidence as used (they're now in a schema)
            for qid in candidate.evidence:
                self.used_question_ids.add(qid)
            self._save_used_questions()
            
            # Log success
            append_text(DECISIONS_JSONL, json.dumps({
                "ts": now_iso(),
                "decision": "auto_accept_new",
                "assigned_schema_id": new_id,
                "candidate": asdict(candidate),
                "question_id": qid,
                "has_tmua_evidence": has_tmua_evidence(candidate),
            }) + "\n")
            
            print(f"[AUTO-ACCEPT] Created new schema {new_id} from question {qid} (saved to {target_schemas_path.name})")
            
            # Reload schemas so subsequent questions see the new schema
            self._load_schemas()
            self._load_embeddings()
            self._load_meta()
            
            return new_id
            
        except Exception as e:
            print(f"[ERROR] Failed to auto-accept new schema: {e}")
            return None

    # Candidate generation
    def on_generate(self):
        if not self.index:
            messagebox.showinfo("Index first", "Click 'Index PDFs' first.")
            return

        # Ensure correct schemas file path (check if TMUA)
        if self.index:
            is_tmua = any(q.exam == "TMUA" for q in self.index)
            if is_tmua:
                self.schemas_md_path = TMUA_PAPER1_SCHEMAS_MD
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
        # Include all questions (diagram filtering disabled)
        # pool = [q for q in pool if not q.skipped_diagram]  # Disabled per user request

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
        
        # NOTE: Do NOT mark questions as used here - they should only be marked as used
        # when they're actually accepted into schemas (in on_accept_new, on_accept_all, etc.)
        # This allows questions to be reused if candidates are rejected/ignored

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
                        exemplar_justifications=obj.get("exemplar_justifications", {}),
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

    def _compute_similarity_hits(self, use_llm_scoring: bool = True):
        """
        Compute similarity hits using improved strategy:
        1. Fast comparison against ALL schemas (embeddings + fuzzy)
        2. Get top 5
        3. Use LLM to score fit for top 5 (if use_llm_scoring=True)
        """
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
            # Step 1: Fast comparison - filter schemas by prefix (TMUA: M vs M, R vs R only)
            fast_hits = []
            cand_emb = candidate_embeddings.get(c.candidate_id)
            for s in self.schema_summaries:
                # For TMUA: Only compare within same paper type (M = Paper 1, R = Paper 2)
                # For ESAT: Compare all schemas (M, P, B, C can be compared with each other)
                if MODE == "TMUA" and c.prefix != s.schema_id[0]:
                    continue  # Skip if prefixes don't match (Paper 1 vs Paper 2)
                existing_emb = self.schema_embeddings.get(s.schema_id)
                score = schema_similarity(c.title, c.core_move, s, cand_emb, existing_emb)
                fast_hits.append((s, score))
            
            # Step 2: Get top 5
            fast_hits.sort(key=lambda x: x[1], reverse=True)
            top_5 = fast_hits[:5]
            
            # Step 3: Use LLM to score fit for top 5 (optional, more expensive)
            if use_llm_scoring and self.schema_summaries:
                detailed_hits = []
                for schema, fast_score in top_5:
                    # Get exemplars for this schema (from evidence in metadata)
                    exemplar_questions = self._get_exemplar_questions_for_schema(schema.schema_id)
                    
                    # Create a pseudo-question from candidate for scoring
                    pseudo_question = QuestionItem(
                        paper_id="candidate",
                        pdf_path="",
                        year=None,
                        exam=None,
                        section=None,
                        qnum=0,
                        text=f"{c.title}\n\n{c.core_move}",
                        skipped_diagram=False
                    )
                    
                    # Extract reasoning fingerprint from candidate
                    fingerprint = extract_reasoning_fingerprint(pseudo_question, self.gemini)
                    
                    # Use LLM to compute detailed fit score
                    fit_score, rubric = compute_schema_fit_score(
                        question=pseudo_question,
                        schema=schema,
                        question_fingerprint=fingerprint,
                        schema_exemplars=exemplar_questions[:3],  # Use top 3 exemplars
                        gemini=self.gemini
                    )
                    
                    # Combine fast score and LLM score (weighted: 30% fast, 70% LLM)
                    combined_score = (fast_score * 0.3) + (fit_score * 10 * 0.7)
                    
                    detailed_hits.append(SimilarityHit(
                        schema_id=schema.schema_id,
                        score=combined_score,
                        title=f"{schema.title} [LLM:{fit_score:.1f}]"
                    ))
                
                detailed_hits.sort(key=lambda x: x.score, reverse=True)
                self.sim_hits[c.candidate_id] = detailed_hits
            else:
                # Fallback: just use fast scores
                hits = [SimilarityHit(schema_id=s.schema_id, score=score, title=s.title) 
                        for s, score in top_5]
                self.sim_hits[c.candidate_id] = hits
    
    def _get_exemplar_questions_for_schema(self, schema_id: str) -> List[QuestionItem]:
        """Get exemplar questions for a schema from the index."""
        exemplars = []
        
        # Try to get evidence from schema metadata
        schema_meta = self.schemas_meta.get(schema_id, {})
        evidence_ids = schema_meta.get("evidence", [])
        
        # If no evidence in metadata, return empty
        if not evidence_ids:
            return exemplars
        
        # Find questions in index that match evidence IDs
        for qid in evidence_ids[:8]:  # Max 8 exemplars
            for q in self.index:
                q_id = f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "")
                if q_id == qid:
                    exemplars.append(q)
                    break
        
        return exemplars
    
    def _get_question_count_for_schema(self, schema_id: str) -> int:
        """Get current number of questions attached to a schema."""
        schema_meta = self.schemas_meta.get(schema_id, {})
        evidence_ids = schema_meta.get("evidence", [])
        return len(evidence_ids) if evidence_ids else 0
    
    def _get_question_text_by_id(self, question_id: str) -> Optional[QuestionItem]:
        """Retrieve full question text from index given question ID."""
        for q in self.index:
            q_id = f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "")
            if q_id == question_id:
                return q
        return None
    
    def _update_schema_exemplars_in_file(self, schema_id: str, question_id: str, justification: str):
        """Update schema markdown file to add a new exemplar question."""
        # For TMUA: Determine correct file based on schema prefix
        target_schemas_path = self.schemas_md_path
        if MODE == "TMUA":
            prefix = schema_id[0] if schema_id else "M"
            if prefix == "R":
                target_schemas_path = TMUA_PAPER2_SCHEMAS_MD
            else:
                # M prefix or any other prefix defaults to Paper 1
                target_schemas_path = TMUA_PAPER1_SCHEMAS_MD
        
        if not target_schemas_path.exists():
            return
        
        md = safe_read_text(target_schemas_path)
        lines = md.splitlines()
        
        # Find the schema block
        schema_start = None
        schema_end = None
        exemplar_section_start = None
        exemplar_section_end = None
        
        for i, line in enumerate(lines):
            # Find schema header
            if SCHEMA_HEADER_RE.match(line.strip()):
                matched_id = SCHEMA_HEADER_RE.match(line.strip()).group(1)
                if matched_id == schema_id:
                    schema_start = i
                elif schema_start is not None:
                    # Found next schema, this is our end
                    schema_end = i
                    break
                continue
            
            # Find exemplar questions section
            if schema_start is not None and "exemplar questions" in line.lower():
                exemplar_section_start = i
                # Find end of exemplar section (next section or blank line before ---)
                j = i + 1
                while j < len(lines):
                    if lines[j].strip().startswith("**") or lines[j].strip() == "---" or (lines[j].startswith("##") and SCHEMA_HEADER_RE.match(lines[j].strip())):
                        exemplar_section_end = j
                        break
                    if not lines[j].strip().startswith("- ") and lines[j].strip():
                        # Non-bullet line, end of exemplar section
                        exemplar_section_end = j
                        break
                    j += 1
                if exemplar_section_end is None:
                    exemplar_section_end = j
                continue
            
            # Find end of schema (separator)
            if schema_start is not None and i > schema_start:
                if line.strip() == "---":
                    schema_end = i
                    break
        
        if schema_start is None:
            print(f"[WARN] Schema {schema_id} not found in file")
            return
        
        if schema_end is None:
            schema_end = len(lines)
        
        # If exemplar section exists, add to it; otherwise create it
        new_exemplar_line = f"- `{question_id}`: {justification}"
        
        if exemplar_section_start is not None:
            # Insert after last exemplar item (before end of section)
            insert_pos = exemplar_section_end if exemplar_section_end else exemplar_section_start + 1
            lines.insert(insert_pos, new_exemplar_line)
        else:
            # Create exemplar section before the end
            # Find where to insert (after "Notes for generation" section)
            insert_pos = schema_end
            for i in range(schema_start, schema_end):
                if "notes for generation" in lines[i].lower():
                    # Find end of notes section
                    j = i + 1
                    while j < schema_end and (lines[j].strip().startswith("- ") or not lines[j].strip()):
                        j += 1
                    insert_pos = j
                    break
            
            # Insert exemplar section
            lines.insert(insert_pos, "**Exemplar questions:**")
            lines.insert(insert_pos + 1, new_exemplar_line)
            if insert_pos + 2 < len(lines) and lines[insert_pos + 2].strip() != "":
                lines.insert(insert_pos + 2, "")  # Blank line if needed
        
        # Write back
        new_md = "\n".join(lines)
        if not new_md.endswith("\n"):
            new_md += "\n"
        safe_write_text(target_schemas_path, new_md)
    
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
            
            # For TMUA: Ensure both schema files exist (will route based on candidate prefix)
            if self.index:
                is_tmua = any(q.exam == "TMUA" for q in self.index)
                if is_tmua:
                    # Ensure both TMUA schema files exist
                    for schema_path, paper_name in [
                        (TMUA_PAPER1_SCHEMAS_MD, "Paper 1 Schemas (Mathematical Knowledge)"),
                        (TMUA_PAPER2_SCHEMAS_MD, "Paper 2 Schemas (Mathematical Reasoning)")
                    ]:
                        if not schema_path.exists():
                            schema_path.parent.mkdir(parents=True, exist_ok=True)
                            schema_path.write_text(f"# TMUA {paper_name}\n\n", encoding="utf-8")
                    # Default to Paper 1 for UI, actual write routes based on candidate
                    self.schemas_md_path = TMUA_PAPER1_SCHEMAS_MD
                    # Reload schemas (loads both Paper 1 and Paper 2 for comparison)
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
                    
                    # Route to correct TMUA schema file based on prefix (M = Paper 1, R = Paper 2)
                    if has_tmua_evidence(c):
                        tmua_prefix = get_tmua_prefix_from_evidence(c)
                        if tmua_prefix == "R":
                            self.schemas_md_path = TMUA_PAPER2_SCHEMAS_MD
                        else:
                            # Default to Paper 1 for M prefix or if unclear
                            self.schemas_md_path = TMUA_PAPER1_SCHEMAS_MD
                    
                    # Ensure schemas file exists
                    if not self.schemas_md_path.exists():
                        self.schemas_md_path.parent.mkdir(parents=True, exist_ok=True)
                        if has_tmua_evidence(c):
                            tmua_prefix = get_tmua_prefix_from_evidence(c) if has_tmua_evidence(c) else "M"
                            if tmua_prefix == "R":
                                initial_content = "# TMUA Paper 2 Schemas (Mathematical Reasoning)\n\n"
                            else:
                                initial_content = "# TMUA Paper 1 Schemas (Mathematical Knowledge)\n\n"
                        else:
                            initial_content = "# Schemas\n\n"
                        self.schemas_md_path.write_text(initial_content, encoding="utf-8")
                    
                    # Assign unique schema ID (no conflicts even with parallel processing)
                    # Normalize prefix to single letter (M, P, B, C, R)
                    normalized_prefix = normalize_prefix(c.prefix)
                    new_id = generate_unique_schema_id(normalized_prefix)
                    
                    # Clean ALL placeholders from the markdown
                    md = clean_schema_markdown(md, new_id, c.title)
                    
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
                        self.schemas_meta[new_id] = {
                            "edits_count": 0, 
                            "locked": False,
                            "evidence": [],
                            "unique_id": new_id,  # Store original unique ID
                            "created_at": now_iso()  # Timestamp for sorting during renumbering
                        }
                    # Track if schema has TMUA evidence
                    self.schemas_meta[new_id]["has_tmua_evidence"] = has_tmua_evidence(c)
                    save_schemas_meta(self.schemas_meta)

                    # Update coverage stats for this schema
                    update_schema_coverage(new_id, c, self.index)
                    
                    # Mark all questions in evidence as used (they're now in a schema)
                    for qid in c.evidence:
                        self.used_question_ids.add(qid)
                    self._save_used_questions()
                    
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

        # For TMUA: Route to correct schema file based on prefix (M = Paper 1, R = Paper 2)
        # Check prefix directly first, then fall back to evidence-based detection
        if MODE == "TMUA":
            # Normalize prefix to single letter
            normalized_prefix = normalize_prefix(c.prefix)
            
            # Route based on prefix: R = Paper 2, M (or anything else) = Paper 1
            if normalized_prefix == "R":
                self.schemas_md_path = TMUA_PAPER2_SCHEMAS_MD
            else:
                # M prefix or any other prefix defaults to Paper 1
                self.schemas_md_path = TMUA_PAPER1_SCHEMAS_MD
            
            # Ensure file exists
            if not self.schemas_md_path.exists():
                self.schemas_md_path.parent.mkdir(parents=True, exist_ok=True)
                if normalized_prefix == "R":
                    self.schemas_md_path.write_text("# TMUA Paper 2 Schemas (Mathematical Reasoning)\n\n", encoding="utf-8")
                else:
                    self.schemas_md_path.write_text("# TMUA Paper 1 Schemas (Mathematical Knowledge)\n\n", encoding="utf-8")

        # Assign unique schema ID (no conflicts even with parallel processing)
        # Normalize prefix to single letter (M, P, B, C, R)
        normalized_prefix = normalize_prefix(c.prefix)
        new_id = generate_unique_schema_id(normalized_prefix)

        # Clean ALL placeholders from the markdown
        preview = clean_schema_markdown(preview, new_id, c.title)

        # Atomic write
        temp_file = self.schemas_md_path.with_suffix('.tmp')
        try:
            current_content = safe_read_text(self.schemas_md_path)
            new_content = current_content + "\n" + preview + "\n"
            safe_write_text(temp_file, new_content)
            shutil.move(str(temp_file), str(self.schemas_md_path))
        except Exception as e:
            messagebox.showerror("Write failed", f"Failed to write {self.schemas_md_path.name}: {e}")
            if temp_file.exists():
                temp_file.unlink()
            return

        # Update meta
        if new_id not in self.schemas_meta:
            self.schemas_meta[new_id] = {
                "edits_count": 0, 
                "locked": False,
                "evidence": [],
                "unique_id": new_id,  # Store original unique ID
                "created_at": now_iso()  # Timestamp for sorting during renumbering
            }
        # Track if schema has TMUA evidence
        self.schemas_meta[new_id]["has_tmua_evidence"] = has_tmua_evidence(c)
        save_schemas_meta(self.schemas_meta)

        # Update coverage stats for this schema
        update_schema_coverage(new_id, c, self.index)
        
        # Mark all questions in evidence as used (they're now in a schema)
        for qid in c.evidence:
            self.used_question_ids.add(qid)
        self._save_used_questions()

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
        self._set_status(f"Appended NEW schema {new_id} to {self.schemas_md_path.name}")

        messagebox.showinfo("Appended", f"Appended {new_id} to {self.schemas_md_path.name}")

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
                            exemplar_justifications=obj.get("exemplar_justifications", {}),
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

# Mode: "ESAT" (default) indexes ENGAA/NSAA/ESAT, "TMUA" indexes TMUA only
MODE = os.getenv("SCHEMA_MODE", "ESAT")  # "ESAT" or "TMUA"

# Portable project root (derived from script location, overridable via env var)
PROJECT_ROOT_DEFAULT = Path(__file__).resolve().parent.parent.parent
PAPERS_DIR_DEFAULT = PROJECT_ROOT_DEFAULT / "scripts" / "schema_generator" / "papers"

# Select schemas file based on MODE
if MODE == "TMUA":
    SCHEMAS_MD_DEFAULT = PROJECT_ROOT_DEFAULT / "scripts" / "esat_question_generator" / "1. Designer" / "Schemas_TMUA.md"
else:  # ESAT mode
    SCHEMAS_MD_DEFAULT = PROJECT_ROOT_DEFAULT / "scripts" / "esat_question_generator" / "1. Designer" / "Schemas_ESAT.md"

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
    evidence: List[str]  # e.g. ["ENGAA_S1_2021_Q11", ...] - Now requires 3-8 items
    collision_guess: List[str]  # existing schema IDs
    confidence: float  # 0..1
    exemplar_justifications: Optional[Dict[str, str]] = None  # qid -> one-line reason

@dataclass
class ReasoningFingerprint:
    """Structured reasoning pattern extracted from a question."""
    object_type: str  # "function", "geometry", "reaction", etc.
    constraint_types: List[str]  # ["value at point", "conservation", etc.]
    asked_type: str  # "compute value", "compare", "count solutions", etc.
    dominant_move: str  # One sentence describing the key reasoning step
    wrong_path_family: List[str]  # Common wrong approaches (2-4 bullets)

@dataclass
class PDFExtractionStats:
    """Statistics for PDF extraction quality tracking."""
    pdf_path: str
    status: str  # "SUCCESS" | "FAILED_TEXT_EXTRACTION"
    total_chars: int
    question_count: int
    median_question_length: int
    failure_reason: Optional[str]
    extracted_at: str

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
    """
    Check if candidate evidence spans multiple papers.
    Returns (passes, details) where details includes:
    - pdf_count: number of distinct PDFs
    - pdf_list: list of PDF names
    - evidence_distribution: dict of pdf -> question count
    """
    mapping = map_evidence_to_papers(candidate, index)
    distinct_pdfs = len(mapping)
    total_questions = len(candidate.evidence)
    
    # Build evidence distribution
    evidence_distribution = {}
    pdf_list = []
    for pdf_path, qids in mapping.items():
        pdf_name = Path(pdf_path).name
        pdf_list.append(pdf_name)
        evidence_distribution[pdf_name] = len(qids)
    
    stats = {
        "pdf_count": distinct_pdfs,
        "distinct_pdfs": distinct_pdfs,  # Keep for backward compatibility
        "total_questions": total_questions,
        "pdfs": list(mapping.keys()),  # Full paths
        "pdf_list": pdf_list,  # Just names
        "evidence_distribution": evidence_distribution
    }
    
    # Require: >=2 distinct PDFs OR (>=3 questions AND >=2 PDFs preferred)
    satisfied = distinct_pdfs >= 2 or (total_questions >= 3 and distinct_pdfs >= 2)
    
    return satisfied, stats


def validate_prefix_against_content(candidate: Candidate, index: List[QuestionItem]) -> Tuple[bool, str]:
    """
    Check if prefix matches question content.
    Returns (is_valid, warning_message)
    
    For ESAT mode:
    - M = Math keywords (algebra, calculus, geometry, equation, function, derivative, integral)
    - P = Physics keywords (force, energy, motion, velocity, acceleration, momentum, field)
    - B = Biology keywords (cell, enzyme, DNA, protein, gene, organism, tissue)
    - C = Chemistry keywords (reaction, bond, molecule, atom, compound, element, ion)
    
    For TMUA mode:
    - M = Paper 1 evidence
    - R = Paper 2 evidence
    """
    # Get evidence questions
    evidence_questions = []
    for qid in candidate.evidence:
        for q in index:
            q_id = f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "")
            if q_id == qid:
                evidence_questions.append(q)
                break
    
    if not evidence_questions:
        return True, ""  # Can't validate without questions
    
    # Combine all question text
    all_text = " ".join(q.text.lower() for q in evidence_questions)
    
    if MODE == "TMUA":
        # For TMUA, check paper type matches prefix
        paper_types = set()
        for q in evidence_questions:
            if q.section:
                if "paper 1" in q.section.lower():
                    paper_types.add("M")
                elif "paper 2" in q.section.lower():
                    paper_types.add("R")
        
        if paper_types and candidate.prefix not in paper_types:
            expected = "/".join(sorted(paper_types))
            return False, f"Prefix '{candidate.prefix}' doesn't match evidence paper type (expected {expected})"
    
    elif MODE == "ESAT":
        # For ESAT, check subject keywords
        keyword_counts = {
            "M": ["algebra", "calculus", "geometry", "equation", "function", "derivative", "integral", 
                  "polynomial", "trigonometric", "logarithm", "exponential", "matrix", "vector"],
            "P": ["force", "energy", "motion", "velocity", "acceleration", "momentum", "field", 
                  "mass", "charge", "current", "voltage", "wave", "frequency", "particle"],
            "B": ["cell", "enzyme", "dna", "protein", "gene", "organism", "tissue", "membrane", 
                  "mitochondria", "chloroplast", "photosynthesis", "respiration", "evolution"],
            "C": ["reaction", "bond", "molecule", "atom", "compound", "element", "ion", 
                  "electron", "oxidation", "reduction", "acid", "base", "catalyst", "equilibrium"]
        }
        
        # Count keyword matches for each subject
        subject_scores = {}
        for subject, keywords in keyword_counts.items():
            count = sum(1 for kw in keywords if kw in all_text)
            subject_scores[subject] = count
        
        # Find dominant subject
        if subject_scores:
            max_score = max(subject_scores.values())
            if max_score > 0:
                dominant_subjects = [s for s, score in subject_scores.items() if score == max_score]
                
                if candidate.prefix not in dominant_subjects:
                    expected = "/".join(sorted(dominant_subjects))
                    return False, f"Prefix '{candidate.prefix}' may not match content (found more {expected} keywords)"
    
    return True, ""


def extract_reasoning_fingerprint(question: QuestionItem, gemini: 'Gemini') -> Optional[ReasoningFingerprint]:
    """
    Use Gemini to extract structured reasoning fingerprint from question.
    Returns None if extraction fails.
    """
    prompt = f"""Analyze this exam question and extract its reasoning structure.

Question text:
{question.text[:1000]}

Extract and return ONLY valid JSON with this structure:
{{
  "object_type": "function|geometry|reaction|experiment|etc",
  "constraint_types": ["value at point", "conservation", "stoichiometry", "etc"],
  "asked_type": "compute value|compare|count solutions|identify|infer|etc",
  "dominant_move": "One sentence describing the key reasoning step",
  "wrong_path_family": ["Common wrong approach 1", "Common wrong approach 2"]
}}

Focus on the REASONING PATTERN, not the topic.
"""
    
    try:
        resp = gemini.generate_json(prompt)
        if resp and isinstance(resp, dict):
            return ReasoningFingerprint(
                object_type=str(resp.get("object_type", "unknown")),
                constraint_types=list(resp.get("constraint_types", [])),
                asked_type=str(resp.get("asked_type", "unknown")),
                dominant_move=str(resp.get("dominant_move", "")),
                wrong_path_family=list(resp.get("wrong_path_family", []))
            )
    except Exception as e:
        print(f"[WARN] Failed to extract reasoning fingerprint: {e}")
    
    return None


def compute_schema_fit_score(
    question: QuestionItem,
    schema: SchemaSummary,
    question_fingerprint: Optional[ReasoningFingerprint],
    schema_exemplars: List[QuestionItem],
    gemini: 'Gemini'
) -> Tuple[float, Dict[str, float]]:
    """
    Compute fit score (0-10) with breakdown.
    
    Rubric (0-2 points each):
    1. Core move match
    2. Same decision point
    3. Same error family
    4. Same answer form
    5. Solution compressibility
    
    Returns (total_score, rubric_breakdown)
    """
    rubric = {
        "core_move_match": 0.0,
        "decision_point": 0.0,
        "error_family": 0.0,
        "answer_form": 0.0,
        "compressibility": 0.0
    }
    
    # If no fingerprint, use simpler text-based scoring
    if not question_fingerprint or not schema_exemplars:
        # Fallback: simple text similarity
        q_text = question.text.lower()
        schema_text = f"{schema.title} {schema.core_move}".lower()
        
        # Basic keyword overlap
        q_words = set(q_text.split())
        s_words = set(schema_text.split())
        overlap = len(q_words & s_words) / max(len(q_words), 1)
        
        # Distribute score evenly
        base_score = min(overlap * 10, 2.0)
        for key in rubric:
            rubric[key] = base_score / 5
        
        return sum(rubric.values()), rubric
    
    # Use LLM to score fit
    exemplar_texts = "\n\n".join([f"Exemplar {i+1}: {ex.text[:300]}..." 
                                   for i, ex in enumerate(schema_exemplars[:3])])
    
    prompt = f"""Score how well this question fits the schema pattern (0-2 points each category):

Schema: {schema.title}
Core move: {schema.core_move}

Question fingerprint:
- Object type: {question_fingerprint.object_type}
- Constraints: {', '.join(question_fingerprint.constraint_types)}
- Asked: {question_fingerprint.asked_type}
- Dominant move: {question_fingerprint.dominant_move}

Exemplar questions from schema:
{exemplar_texts}

Score these aspects (0-2 each):
1. core_move_match: Does question use same dominant reasoning move?
2. decision_point: Same critical decision point where weaker candidates branch wrong?
3. error_family: Same types of wrong approaches?
4. answer_form: Same output type (value/count/comparison/etc)?
5. compressibility: Once seen, is solution short and clean like exemplars?

Return ONLY valid JSON:
{{
  "core_move_match": 0.0-2.0,
  "decision_point": 0.0-2.0,
  "error_family": 0.0-2.0,
  "answer_form": 0.0-2.0,
  "compressibility": 0.0-2.0
}}
"""
    
    try:
        resp = gemini.generate_json(prompt)
        if resp and isinstance(resp, dict):
            for key in rubric:
                if key in resp:
                    rubric[key] = float(resp[key])
    except Exception as e:
        print(f"[WARN] Failed to compute fit score: {e}")
    
    total = sum(rubric.values())
    return total, rubric


def match_question_to_schemas(
    question: QuestionItem,
    existing_schemas: List[SchemaSummary],
    schema_exemplars: Dict[str, List[QuestionItem]],
    gemini: 'Gemini',
    top_k: int = 5
) -> List[Tuple[str, float, str]]:
    """
    Match question to existing schemas.
    
    Returns list of (schema_id, fit_score, decision) where decision is:
    - "attach" (score 8-10)
    - "split_candidate" (score 5-7)
    - "new_schema" (score 0-4)
    """
    if not existing_schemas:
        return []
    
    # Extract reasoning fingerprint for question
    question_fingerprint = extract_reasoning_fingerprint(question, gemini)
    
    # Score against all schemas
    results = []
    for schema in existing_schemas[:top_k]:  # Limit to top K for performance
        exemplars = schema_exemplars.get(schema.schema_id, [])
        score, rubric = compute_schema_fit_score(
            question, schema, question_fingerprint, exemplars, gemini
        )
        
        # Determine decision based on score
        if score >= 8.0:
            decision = "attach"
        elif score >= 5.0:
            decision = "split_candidate"
        else:
            decision = "new_schema"
        
        results.append((schema.schema_id, score, decision))
    
    # Sort by score descending
    results.sort(key=lambda x: x[1], reverse=True)
    
    return results[:top_k]


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


def compute_diagram_likelihood(qtext: str, page_has_images: bool) -> float:
    """
    Returns 0.0-1.0 score indicating likelihood question depends on diagram.
    >0.5 = likely diagram-dependent, should skip
    
    Scoring:
    - Diagram keywords in text: +0.6
    - Page has images: +0.2 (weak evidence)
    """
    score = 0.0
    
    if question_contains_diagram_keywords(qtext):
        score += 0.6
    
    if page_has_images:
        score += 0.2  # Weak evidence - page might have unrelated images
    
    return score


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


def validate_pdf_extraction(items: List[QuestionItem], pdf_path: Path) -> Tuple[bool, str]:
    """
    Validate extracted questions meet quality thresholds.
    Returns (is_valid, failure_reason)
    
    Failure conditions (conservative thresholds):
    - Total non-whitespace chars < 500
    - Zero questions detected
    - Median question length < 40 chars
    - No option letters (A/B/C/D) found anywhere
    """
    if not items:
        return False, "No questions detected"
    
    # Calculate total non-whitespace characters
    total_chars = sum(len(q.text.replace(" ", "").replace("\n", "").replace("\t", "")) for q in items)
    if total_chars < 500:
        return False, f"Insufficient text content ({total_chars} chars < 500 threshold)"
    
    # Calculate median question length
    question_lengths = [len(q.text.strip()) for q in items]
    question_lengths.sort()
    median_length = question_lengths[len(question_lengths) // 2] if question_lengths else 0
    
    if median_length < 40:
        return False, f"Questions too short (median {median_length} chars < 40 threshold)"
    
    # Check for option letters (A/B/C/D) in at least some questions
    all_text = " ".join(q.text for q in items)
    has_options = bool(re.search(r'[A-D]\)|[A-D]\.|\(A\)|\(B\)|\(C\)|\(D\)', all_text))
    
    if not has_options:
        return False, "No option letters (A/B/C/D) found - likely not a question paper"
    
    return True, ""


def extract_questions_from_pdf(pdf_path: Path, overrides: Optional[Dict[int, bool]] = None) -> Tuple[List[QuestionItem], PDFExtractionStats]:
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
            
            # Sanity filter: skip questions that are too short or malformed
            if len(qtext.strip()) < 40:
                # Too short - likely extraction error
                continue
            
            if not re.search(r'[A-D]\)|[A-D]\.|\(A\)|\(B\)', qtext):
                # No option letters - might not be a multiple choice question
                # (Allow it through but note this in logs if needed)
                pass

            # Diagram detection: check override first, then use likelihood score
            if qnum in overrides:
                # override True = force include (i.e. not skipped)
                skipped = not overrides[qnum]
            else:
                # Use per-question diagram likelihood score
                diagram_score = compute_diagram_likelihood(qtext, page_has_diagram)
                skipped = diagram_score > 0.5

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
    
    # Validate extraction and create stats
    is_valid, failure_reason = validate_pdf_extraction(items, pdf_path)
    
    # Calculate stats
    question_lengths = [len(q.text.strip()) for q in items] if items else [0]
    question_lengths.sort()
    median_length = question_lengths[len(question_lengths) // 2] if question_lengths else 0
    total_chars = sum(len(q.text.replace(" ", "").replace("\n", "").replace("\t", "")) for q in items)
    
    stats = PDFExtractionStats(
        pdf_path=str(pdf_path),
        status="SUCCESS" if is_valid else "FAILED_TEXT_EXTRACTION",
        total_chars=total_chars,
        question_count=len(items),
        median_question_length=median_length,
        failure_reason=failure_reason if not is_valid else None,
        extracted_at=now_iso()
    )
    
    return items, stats


def save_extraction_report(stats: List[PDFExtractionStats], total_scanned: int) -> None:
    """Save extraction report to _logs/extraction_report.json"""
    report_path = LOG_DIR_DEFAULT / "extraction_report.json"
    
    success_count = sum(1 for s in stats if s.status == "SUCCESS")
    failed_count = sum(1 for s in stats if s.status == "FAILED_TEXT_EXTRACTION")
    
    report = {
        "created_at": now_iso(),
        "mode": MODE,
        "thresholds": {
            "min_chars": 500,
            "min_question_length": 40
        },
        "summary": {
            "scanned": total_scanned,
            "success": success_count,
            "failed": failed_count
        },
        "per_pdf": [asdict(s) for s in stats]
    }
    
    safe_write_text(report_path, json.dumps(report, indent=2))
    print(f"[INFO] Extraction report saved to {report_path}")


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
        # Filter based on MODE
        if MODE == "TMUA":
            items = [q for q in items if q.exam == "TMUA"]
        elif MODE == "ESAT":
            items = [q for q in items if q.exam != "TMUA"]
        return items

    pdfs = [Path(p) for p in glob.glob(str(papers_dir / "**" / "*.pdf"), recursive=True)]

    # Filter PDFs based on MODE
    if MODE == "TMUA":
        # Only include TMUA papers
        pdfs = [p for p in pdfs if "tmua" in str(p).lower()]
    elif MODE == "ESAT":
        # Exclude TMUA, keep ENGAA/NSAA/ESAT
        pdfs = [p for p in pdfs if "tmua" not in str(p).lower()]

    # Filter out answer keys/conversion tables unless include_non_papers is True
    if not include_non_papers:
        exclude_keywords = ["answer key", "answers", "mark scheme", "conversion table", 
                          "official solutions", "data sheet"]
        pdfs = [p for p in pdfs if not any(k in p.name.lower() for k in exclude_keywords)]
    
    total_pdfs = len(pdfs)
    all_items: List[QuestionItem] = []
    extraction_stats: List[PDFExtractionStats] = []

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
                # Create stats for cached item (mark as success if it was cached)
                stats = PDFExtractionStats(
                    pdf_path=str(pdf),
                    status="SUCCESS",
                    total_chars=sum(len(q.text.replace(" ", "").replace("\n", "").replace("\t", "")) for q in items),
                    question_count=len(items),
                    median_question_length=0,  # Not recalculated for cached
                    failure_reason=None,
                    extracted_at=now_iso()
                )
            else:
                # Extract and cache
                pdf_overrides = overrides_map.get(str(pdf), {})
                items, stats = extract_questions_from_pdf(pdf, pdf_overrides)
                # Only cache if extraction was successful
                if stats.status == "SUCCESS":
                    # Save to per-PDF cache
                    safe_write_text(cache_file, json.dumps([asdict(x) for x in items], indent=2))
            
            # Track extraction stats
            extraction_stats.append(stats)
            
            # Skip failed PDFs (don't add to index)
            if stats.status == "FAILED_TEXT_EXTRACTION":
                print(f"[SKIP] {pdf.name}: {stats.failure_reason}")
                if progress_callback:
                    progress_callback(i, total_pdfs, f"{pdf.name} (SKIPPED: {stats.failure_reason})")
                continue
            
            # Filter based on MODE
            if MODE == "TMUA":
                items = [q for q in items if q.exam == "TMUA"]
            elif MODE == "ESAT":
                items = [q for q in items if q.exam != "TMUA"]
            
            all_items.extend(items)
        except Exception as e:
            print(f"[WARN] Failed to parse {pdf}: {e}")
            # Track failed extraction
            extraction_stats.append(PDFExtractionStats(
                pdf_path=str(pdf),
                status="FAILED_TEXT_EXTRACTION",
                total_chars=0,
                question_count=0,
                median_question_length=0,
                failure_reason=f"Exception: {str(e)}",
                extracted_at=now_iso()
            ))
            if progress_callback:
                progress_callback(i, total_pdfs, f"{pdf.name} (ERROR: {e})")

    # Save aggregated cache
    safe_write_text(INDEX_JSON, json.dumps([asdict(x) for x in all_items], indent=2))
    
    # Save extraction report
    save_extraction_report(extraction_stats, total_pdfs)
    
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
# Prompts - Load from external markdown files
# ----------------------------

PROMPT_DIR = Path(__file__).parent / "prompts"
CANDIDATE_PROMPT_PATH = PROMPT_DIR / "Schema_Candidate_Prompt.md"
FULL_PROMPT_PATH = PROMPT_DIR / "Schema_Full_Prompt.md"
COMPRESS_PROMPT_PATH = PROMPT_DIR / "Schema_Compress_Prompt.md"
SPLIT_PROMPT_PATH = PROMPT_DIR / "Schema_Split_Prompt.md"
ENRICH_PROMPT_PATH = PROMPT_DIR / "Schema_Enrich_Prompt.md"

def load_prompt_template(path: Path) -> str:
    """Load a prompt template from a markdown file."""
    if not path.exists():
        raise FileNotFoundError(f"Prompt template not found: {path}")
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

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

    # Load the template
    template = load_prompt_template(CANDIDATE_PROMPT_PATH)

    # Existing schema summaries (short)
    existing = "\n".join(
        [f"- {s.schema_id}: {s.title} | {s.core_move}".strip() for s in schema_summaries]
    )

    # Evidence corpus: short question IDs + text
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

    # Replace placeholders in template
    return template.format(
        exam_type=exam_type,
        prefix_instructions=prefix_instructions,
        existing=existing,
        corpus=corpus,
        prefix_json=prefix_json,
        n_candidates=n_candidates
    )


def prompt_full_schema(candidate: Candidate, enforce_max4: bool = True) -> str:
    # Load the template
    template = load_prompt_template(FULL_PROMPT_PATH)
    
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
    
    schema_file = "Schemas_TMUA.md" if is_tmua else "Schemas.md"
    
    # Build exemplar list text
    exemplar_text = ""
    if candidate.exemplar_justifications:
        exemplar_lines = []
        for qid, justification in candidate.exemplar_justifications.items():
            exemplar_lines.append(f"- {qid}: {justification}")
        exemplar_text = "\n".join(exemplar_lines)
    else:
        # Fallback: just list evidence IDs
        exemplar_text = "\n".join(f"- {qid}" for qid in candidate.evidence[:8])
    
    # Replace placeholders in template
    return template.replace("{schema_file}", schema_file) \
                   .replace("{candidate.prefix}", candidate.prefix) \
                   .replace("{prefix_desc}", prefix_desc) \
                   .replace("{candidate.title}", candidate.title) \
                   .replace("{candidate.core_move}", candidate.core_move) \
                   .replace("{candidate.evidence}", str(candidate.evidence)) \
                   .replace("{exemplar_text}", exemplar_text) \
                   .replace("{tmua_note}", tmua_note) \
                   .replace("{limit_text}", limit_text)


def prompt_compress_schema(schema_markdown: str) -> str:
    """Prompt for compressing a schema to enforce bullet limits."""
    template = load_prompt_template(COMPRESS_PROMPT_PATH)
    return template.replace("{schema_markdown}", schema_markdown)


def prompt_split_candidate(candidate: Candidate) -> str:
    """Prompt for splitting a candidate into two."""
    template = load_prompt_template(SPLIT_PROMPT_PATH)
    return template.replace("{candidate.title}", candidate.title) \
                   .replace("{candidate.core_move}", candidate.core_move) \
                   .replace("{candidate.evidence}", str(candidate.evidence)) \
                   .replace("{candidate.prefix}", candidate.prefix)


def prompt_enrich_bullet(candidate: Candidate, target_schema_id: str, section: str, 
                         existing_bullet: str) -> str:
    """Prompt for generating a replacement bullet."""
    template = load_prompt_template(ENRICH_PROMPT_PATH)
    return template.replace("{target_schema_id}", target_schema_id) \
                   .replace("{section}", section) \
                   .replace("{existing_bullet}", existing_bullet) \
                   .replace("{candidate.title}", candidate.title) \
                   .replace("{candidate.core_move}", candidate.core_move) \
                   .replace("{candidate.evidence}", str(candidate.evidence))


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
        # MODE selection frame (at very top)
        mode_frame = ttk.LabelFrame(self, text="Mode", padding=5)
        mode_frame.pack(fill="x", padx=10, pady=(5, 0))
        
        self.mode_var = tk.StringVar(value=MODE)
        ttk.Radiobutton(mode_frame, text="ESAT (ENGAA/NSAA/ESAT)", 
                        variable=self.mode_var, value="ESAT").pack(side="left", padx=5)
        ttk.Radiobutton(mode_frame, text="TMUA", 
                        variable=self.mode_var, value="TMUA").pack(side="left", padx=5)
        ttk.Label(mode_frame, text="(Restart required after changing mode)", 
                  foreground="gray").pack(side="left", padx=10)
        
        # Top row: Main actions and filters
        top = ttk.Frame(self)
        top.pack(fill="x", padx=10, pady=(8, 4))

        self.force_rebuild_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(top, text="Force rebuild index", variable=self.force_rebuild_var).pack(side="left")

        ttk.Button(top, text="Index PDFs", command=self.on_index).pack(side="left", padx=6)
        ttk.Button(top, text="View Extraction Report", command=self.on_view_extraction_report).pack(side="left", padx=6)
        ttk.Button(top, text="Generate candidates (batch)", command=self.on_generate).pack(side="left", padx=6)
        ttk.Button(top, text="Process All Questions", command=self.on_process_all_questions).pack(side="left", padx=6)
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
        # Merge/Enrich removed - keeping Split only
        # ttk.Button(btn_row2, text="Merge", command=self.on_merge).pack(side="left")
        # ttk.Button(btn_row2, text="Enrich", command=self.on_enrich_show).pack(side="left", padx=4)
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
        
        # Compress button removed (keeping validation status)
        preview_controls = ttk.Frame(right)
        preview_controls.pack(fill="x", pady=(0, 4))
        # ttk.Button(preview_controls, text="Compress preview", command=self.on_compress_preview).pack(side="left")
        self.validation_status = ttk.Label(preview_controls, text="", foreground="red")
        self.validation_status.pack(side="left", padx=10)
        
        self.schema_preview = tk.Text(right, wrap="word", height=15)
        self.schema_preview.pack(fill="both", expand=True)
        
        # Feature B: Enrich controls - REMOVED (keeping code commented for reference)
        # enrich_frame = ttk.LabelFrame(right, text="Enrich existing schema")
        # enrich_frame.pack(fill="x", pady=(10, 0))
        # ... (enrich UI code commented out)
        
        # Initialize enrich variables to None to avoid errors
        self.enrich_schema_var = None
        self.enrich_schema_combo = None
        self.enrich_section_var = None
        self.enrich_section_combo = None
        self.enrich_bullet_var = None
        self.enrich_bullet_combo = None
        self.enrich_replacement_text = None
        self.enrich_frame = None

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

    def on_view_extraction_report(self):
        """Display extraction report in a popup window."""
        report_path = LOG_DIR_DEFAULT / "extraction_report.json"
        
        if not report_path.exists():
            messagebox.showinfo("No Report", "No extraction report found. Run 'Index PDFs' first.")
            return
        
        try:
            with open(report_path, 'r', encoding='utf-8') as f:
                report = json.load(f)
            
            # Create popup window
            win = tk.Toplevel(self)
            win.title("PDF Extraction Report")
            win.geometry("800x600")
            
            # Summary at top
            summary_frame = ttk.Frame(win)
            summary_frame.pack(fill="x", padx=10, pady=10)
            
            summary = report.get("summary", {})
            ttk.Label(summary_frame, text=f"Mode: {report.get('mode', 'N/A')}", 
                     font=("TkDefaultFont", 10, "bold")).pack(anchor="w")
            ttk.Label(summary_frame, text=f"Created: {report.get('created_at', 'N/A')}").pack(anchor="w")
            ttk.Label(summary_frame, text=f"Scanned: {summary.get('scanned', 0)} PDFs").pack(anchor="w")
            ttk.Label(summary_frame, text=f"Success: {summary.get('success', 0)} PDFs", 
                     foreground="green").pack(anchor="w")
            ttk.Label(summary_frame, text=f"Failed: {summary.get('failed', 0)} PDFs", 
                     foreground="red").pack(anchor="w")
            
            # Detailed list
            ttk.Label(win, text="Per-PDF Details:").pack(anchor="w", padx=10)
            
            text = tk.Text(win, wrap="word")
            text.pack(fill="both", expand=True, padx=10, pady=5)
            
            per_pdf = report.get("per_pdf", [])
            for pdf_stat in per_pdf:
                status = pdf_stat.get("status", "UNKNOWN")
                pdf_name = Path(pdf_stat.get("pdf_path", "")).name
                
                if status == "SUCCESS":
                    text.insert(tk.END, f"✓ {pdf_name}\n", "success")
                    text.insert(tk.END, f"  Questions: {pdf_stat.get('question_count', 0)}, "
                                       f"Chars: {pdf_stat.get('total_chars', 0)}\n\n")
                else:
                    text.insert(tk.END, f"✗ {pdf_name}\n", "failed")
                    text.insert(tk.END, f"  Reason: {pdf_stat.get('failure_reason', 'Unknown')}\n\n", "failed")
            
            text.tag_config("success", foreground="green")
            text.tag_config("failed", foreground="red")
            text.config(state="disabled")
            
            # Close button
            ttk.Button(win, text="Close", command=win.destroy).pack(pady=5)
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load extraction report: {e}")

    def on_process_all_questions(self):
        """
        Process all questions individually instead of batch sampling.
        For each question:
        1. Extract reasoning fingerprint
        2. Compare against all schemas (fast)
        3. Get top 5 matches
        4. Use LLM to score fit for top 5
        5. If score >= 8: auto-attach to schema
        6. If score 5-7: create candidate for review (potential split)
        7. If score < 5: create new schema candidate
        """
        if not self.index:
            messagebox.showinfo("Index first", "Click 'Index PDFs' first.")
            return
        
        # Get filter settings
        filt = self.batch_filter.get().strip().lower()
        
        # Select questions to process
        pool = self.index
        if filt:
            pool = [q for q in pool if filt in q.pdf_path.lower()]
        
        # Only diagram-free
        pool = [q for q in pool if not q.skipped_diagram]
        
        if len(pool) < 1:
            messagebox.showwarning("No questions", "No diagram-free questions matched the filter.")
            return
        
        # Filter out already used questions
        unused_pool = [q for q in pool if f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "") not in self.used_question_ids]
        
        if len(unused_pool) < 1:
            if messagebox.askyesno("Reset tracking?", 
                f"All questions have been processed. Reset tracking and reprocess?"):
                self.used_question_ids.clear()
                self._save_used_questions()
                unused_pool = pool
            else:
                messagebox.showinfo("Done", "All questions have been processed.")
                return
        
        # Confirm before starting
        if not messagebox.askyesno("Process All Questions", 
            f"This will process {len(unused_pool)} questions individually.\n\n"
            f"This may take a while and use many API calls.\n\n"
            f"Auto-attach: fit score >= 8\n"
            f"Review: fit score 5-7 (potential split)\n"
            f"New schema: fit score < 5\n\n"
            f"Continue?"):
            return
        
        def work():
            self._set_status(f"Processing {len(unused_pool)} questions individually...")
            
            stats = {
                "total": len(unused_pool),
                "processed": 0,
                "auto_attached": 0,
                "needs_review": 0,
                "new_schemas": 0,
                "errors": 0
            }
            
            new_candidates = []
            
            for i, question in enumerate(unused_pool, 1):
                try:
                    # Update progress
                    self.after(0, lambda p=i, t=len(unused_pool): 
                              self._set_status(f"Processing question {p}/{t}..."))
                    
                    # Mark as used
                    qid = f"{question.exam}_{question.section}_{question.year}_Q{question.qnum}".replace(" ", "")
                    self.used_question_ids.add(qid)
                    
                    # Skip if no schemas exist yet (need at least one schema)
                    if not self.schema_summaries:
                        # Create candidate for new schema
                        candidate = self._create_candidate_from_question(question)
                        if candidate:
                            new_candidates.append(candidate)
                            stats["new_schemas"] += 1
                        stats["processed"] += 1
                        continue
                    
                    # Extract reasoning fingerprint
                    fingerprint = extract_reasoning_fingerprint(question, self.gemini)
                    
                    # Match against all schemas
                    matches = match_question_to_schemas(
                        question=question,
                        existing_schemas=self.schema_summaries,
                        schema_exemplars={s.schema_id: self._get_exemplar_questions_for_schema(s.schema_id) 
                                        for s in self.schema_summaries},
                        gemini=self.gemini,
                        top_k=5
                    )
                    
                    if matches:
                        best_schema_id, best_score, decision = matches[0]
                        
                        if decision == "attach":  # Score >= 8
                            # Auto-attach to existing schema
                            self._auto_attach_question_to_schema(question, best_schema_id, best_score)
                            stats["auto_attached"] += 1
                            
                        elif decision == "split_candidate":  # Score 5-7
                            # Create candidate for human review
                            candidate = self._create_candidate_from_question(question, 
                                                                             similar_to=best_schema_id,
                                                                             fit_score=best_score)
                            if candidate:
                                new_candidates.append(candidate)
                                stats["needs_review"] += 1
                        
                        else:  # Score < 5
                            # Create new schema candidate
                            candidate = self._create_candidate_from_question(question)
                            if candidate:
                                new_candidates.append(candidate)
                                stats["new_schemas"] += 1
                    else:
                        # No matches, create new schema
                        candidate = self._create_candidate_from_question(question)
                        if candidate:
                            new_candidates.append(candidate)
                            stats["new_schemas"] += 1
                    
                    stats["processed"] += 1
                    
                except Exception as e:
                    print(f"[ERROR] Failed to process question {qid}: {e}")
                    stats["errors"] += 1
                    stats["processed"] += 1
            
            # Save used questions
            self.after(0, self._save_used_questions)
            
            # Add new candidates to the list
            if new_candidates:
                self.candidates.extend(new_candidates)
                self.after(0, lambda: self._compute_similarity_hits(use_llm_scoring=False))  # Already scored
                self.after(0, self._render_candidate_list)
            
            # Show summary
            summary = (f"Processed {stats['processed']}/{stats['total']} questions:\n\n"
                      f"✓ Auto-attached: {stats['auto_attached']}\n"
                      f"⚠ Needs review: {stats['needs_review']}\n"
                      f"+ New schemas: {stats['new_schemas']}\n"
                      f"✗ Errors: {stats['errors']}\n\n"
                      f"Review candidates that need attention.")
            
            self.after(0, lambda: messagebox.showinfo("Processing Complete", summary))
            self.after(0, lambda: self._set_status(f"Done. {stats['auto_attached']} attached, "
                                                   f"{stats['needs_review']} need review, "
                                                   f"{stats['new_schemas']} new schemas."))
        
        threading.Thread(target=work, daemon=True).start()
    
    def _create_candidate_from_question(self, question: QuestionItem, 
                                       similar_to: Optional[str] = None,
                                       fit_score: Optional[float] = None) -> Optional[Candidate]:
        """Create a schema candidate from a single question."""
        try:
            # Generate candidate using Gemini
            prompt = f"""Analyze this exam question and propose a schema candidate.

Question:
{question.text[:1000]}

Create a schema that captures the REASONING PATTERN (not the topic).

Return ONLY valid JSON:
{{
  "candidate_id": "C1",
  "prefix": "M|P|B|C",
  "title": "3-8 word title describing the pattern",
  "core_move": "One sentence describing the key reasoning step",
  "evidence": ["{question.exam}_{question.section}_{question.year}_Q{question.qnum}"],
  "exemplar_justifications": {{
    "{question.exam}_{question.section}_{question.year}_Q{question.qnum}": "Why this exemplifies the pattern"
  }},
  "collision_guess": [],
  "confidence": 0.8
}}
"""
            
            data = self.gemini.generate_json(prompt)
            if data:
                qid = f"{question.exam}_{question.section}_{question.year}_Q{question.qnum}".replace(" ", "")
                
                candidate = Candidate(
                    candidate_id=data.get("candidate_id", f"C{len(self.candidates)+1}"),
                    title=data.get("title", "").strip(),
                    prefix=data.get("prefix", "M").strip().upper(),
                    core_move=data.get("core_move", "").strip(),
                    evidence=[qid],
                    collision_guess=data.get("collision_guess", []),
                    confidence=float(data.get("confidence", 0.5)),
                    exemplar_justifications={qid: data.get("exemplar_justifications", {}).get(qid, "Exemplifies pattern")}
                )
                
                if similar_to:
                    candidate.collision_guess = [similar_to]
                
                return candidate
        except Exception as e:
            print(f"[ERROR] Failed to create candidate from question: {e}")
        
        return None
    
    def _auto_attach_question_to_schema(self, question: QuestionItem, schema_id: str, fit_score: float):
        """Auto-attach a question as exemplar to an existing schema."""
        qid = f"{question.exam}_{question.section}_{question.year}_Q{question.qnum}".replace(" ", "")
        
        # Add to schema metadata
        if schema_id not in self.schemas_meta:
            self.schemas_meta[schema_id] = {"evidence": [], "edit_count": 0}
        
        if "evidence" not in self.schemas_meta[schema_id]:
            self.schemas_meta[schema_id]["evidence"] = []
        
        if qid not in self.schemas_meta[schema_id]["evidence"]:
            self.schemas_meta[schema_id]["evidence"].append(qid)
            self._save_meta()
        
        # Log the attachment
        append_text(DECISIONS_JSONL, json.dumps({
            "ts": now_iso(),
            "decision": "auto_attach",
            "question_id": qid,
            "schema_id": schema_id,
            "fit_score": fit_score
        }) + "\n")
        
        print(f"[AUTO-ATTACH] {qid} → {schema_id} (score: {fit_score:.1f})")

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
                        exemplar_justifications=obj.get("exemplar_justifications", {}),
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

    def _compute_similarity_hits(self, use_llm_scoring: bool = True):
        """
        Compute similarity hits using improved strategy:
        1. Fast comparison against ALL schemas (embeddings + fuzzy)
        2. Get top 5
        3. Use LLM to score fit for top 5 (if use_llm_scoring=True)
        """
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
            # Step 1: Fast comparison against ALL schemas
            fast_hits = []
            cand_emb = candidate_embeddings.get(c.candidate_id)
            for s in self.schema_summaries:
                existing_emb = self.schema_embeddings.get(s.schema_id)
                score = schema_similarity(c.title, c.core_move, s, cand_emb, existing_emb)
                fast_hits.append((s, score))
            
            # Step 2: Get top 5
            fast_hits.sort(key=lambda x: x[1], reverse=True)
            top_5 = fast_hits[:5]
            
            # Step 3: Use LLM to score fit for top 5 (optional, more expensive)
            if use_llm_scoring and self.schema_summaries:
                detailed_hits = []
                for schema, fast_score in top_5:
                    # Get exemplars for this schema (from evidence in metadata)
                    exemplar_questions = self._get_exemplar_questions_for_schema(schema.schema_id)
                    
                    # Create a pseudo-question from candidate for scoring
                    pseudo_question = QuestionItem(
                        paper_id="candidate",
                        pdf_path="",
                        year=None,
                        exam=None,
                        section=None,
                        qnum=0,
                        text=f"{c.title}\n\n{c.core_move}",
                        skipped_diagram=False
                    )
                    
                    # Extract reasoning fingerprint from candidate
                    fingerprint = extract_reasoning_fingerprint(pseudo_question, self.gemini)
                    
                    # Use LLM to compute detailed fit score
                    fit_score, rubric = compute_schema_fit_score(
                        question=pseudo_question,
                        schema=schema,
                        question_fingerprint=fingerprint,
                        schema_exemplars=exemplar_questions[:3],  # Use top 3 exemplars
                        gemini=self.gemini
                    )
                    
                    # Combine fast score and LLM score (weighted: 30% fast, 70% LLM)
                    combined_score = (fast_score * 0.3) + (fit_score * 10 * 0.7)
                    
                    detailed_hits.append(SimilarityHit(
                        schema_id=schema.schema_id,
                        score=combined_score,
                        title=f"{schema.title} [LLM:{fit_score:.1f}]"
                    ))
                
                detailed_hits.sort(key=lambda x: x.score, reverse=True)
                self.sim_hits[c.candidate_id] = detailed_hits
            else:
                # Fallback: just use fast scores
                hits = [SimilarityHit(schema_id=s.schema_id, score=score, title=s.title) 
                        for s, score in top_5]
                self.sim_hits[c.candidate_id] = hits
    
    def _get_exemplar_questions_for_schema(self, schema_id: str) -> List[QuestionItem]:
        """Get exemplar questions for a schema from the index."""
        exemplars = []
        
        # Try to get evidence from schema metadata
        schema_meta = self.schemas_meta.get(schema_id, {})
        evidence_ids = schema_meta.get("evidence", [])
        
        # If no evidence in metadata, return empty
        if not evidence_ids:
            return exemplars
        
        # Find questions in index that match evidence IDs
        for qid in evidence_ids[:8]:  # Max 8 exemplars
            for q in self.index:
                q_id = f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "")
                if q_id == qid:
                    exemplars.append(q)
                    break
        
        return exemplars
    
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
                            exemplar_justifications=obj.get("exemplar_justifications", {}),
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







            new_embeddings = {}
            for old_id, new_id in id_mapping.items():
                if old_id in embeddings:
                    new_embeddings[new_id] = embeddings[old_id]
            # Keep embeddings for schemas that weren't renumbered
            for schema_id, embedding in embeddings.items():
                if schema_id not in id_mapping and schema_id not in new_embeddings:
                    if re.match(r"^[MPBCR]\d+$", schema_id):
                        new_embeddings[schema_id] = embedding
            save_embeddings(new_embeddings)
        
        # Update schema_coverage.json
        if SCHEMA_COVERAGE_JSON.exists():
            coverage = load_schema_coverage()
            new_coverage = {}
            for old_id, new_id in id_mapping.items():
                if old_id in coverage:
                    new_coverage[new_id] = coverage[old_id]
            # Keep coverage for schemas that weren't renumbered
            for schema_id, cov in coverage.items():
                if schema_id not in id_mapping and schema_id not in new_coverage:
                    if re.match(r"^[MPBCR]\d+$", schema_id):
                        new_coverage[schema_id] = cov
            save_schema_coverage(new_coverage)
        
        # Update DECISIONS_JSONL (optional, for history)
        if DECISIONS_JSONL.exists():
            decisions_lines = safe_read_text(DECISIONS_JSONL).strip().split("\n")
            updated_lines = []
            for line in decisions_lines:
                if line.strip():
                    try:
                        decision = json.loads(line)
                        # Update assigned_schema_id if present
                        if "assigned_schema_id" in decision:
                            old_id = decision["assigned_schema_id"]
                            if old_id in id_mapping:
                                decision["assigned_schema_id"] = id_mapping[old_id]
                        # Update schema_id in candidate if present
                        if "candidate" in decision and isinstance(decision["candidate"], dict):
                            if "collision_guess" in decision["candidate"]:
                                updated_guesses = []
                                for guess_id in decision["candidate"]["collision_guess"]:
                                    updated_guesses.append(id_mapping.get(guess_id, guess_id))
                                decision["candidate"]["collision_guess"] = updated_guesses
                        updated_lines.append(json.dumps(decision))
                    except json.JSONDecodeError:
                        updated_lines.append(line)  # Keep malformed lines as-is
            
            # Backup decisions log
            backup_decisions = backup_dir / f"decisions_backup_{timestamp}.jsonl"
            if DECISIONS_JSONL.exists():
                shutil.copy2(DECISIONS_JSONL, backup_decisions)
            
            # Write updated decisions
            safe_write_text(DECISIONS_JSONL, "\n".join(updated_lines) + "\n")
        
        # Reload everything
        self._load_schemas()
        self._load_embeddings()
        self._load_meta()
        
        return id_mapping
    
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
        total_questions = len(self.index)  # Include all questions (diagram filtering disabled)
        
        # Only count used questions that actually exist in the current index
        # This prevents counting questions from different filters or removed papers
        used_in_index = 0
        for q in self.index:
            if True:  # Include all questions (diagram filtering disabled)
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
            if True:  # Include all questions (diagram filtering disabled)
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
        # Enrich UI has been removed; controls are left as None.
        # Guard against calls when widgets don't exist.
        if (
            self.enrich_schema_combo is None
            or self.enrich_schema_var is None
            or self.enrich_section_var is None
            or self.enrich_bullet_combo is None
            or self.enrich_bullet_var is None
        ):
            return

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
        # If enrich UI is not present, do nothing.
        if (
            self.enrich_schema_var is None
            or self.enrich_section_var is None
            or self.enrich_bullet_combo is None
            or self.enrich_bullet_var is None
        ):
            return

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
            kept = len(self.index)  # Include all questions (diagram filtering disabled)
            
            # Check if we're working with TMUA and switch schemas file if needed
            if self.index:
                is_tmua = any(q.exam == "TMUA" for q in self.index)
                if is_tmua:
                    self.schemas_md_path = TMUA_PAPER1_SCHEMAS_MD
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
            
            if total == 0:
                # Show warning dialog with helpful information
                msg = f"No questions indexed!\n\n"
                msg += f"Mode: {MODE}\n"
                msg += f"Papers directory: {self.papers_dir}\n"
                msg += f"Directory exists: {self.papers_dir.exists()}\n\n"
                msg += "Check the console output for detailed debugging information.\n"
                msg += "You may need to:\n"
                msg += "1. Check that PDFs exist in the papers directory\n"
                msg += "2. Try 'Force rebuild index' checkbox\n"
                msg += "3. Check the extraction report for failed PDFs"
                self.after(0, lambda: messagebox.showwarning("No Questions Indexed", msg))
            
            exam_type = "TMUA" if self.index and any(q.exam == "TMUA" for q in self.index) else "ENGAA/NSAA"
            self._set_status(f"Indexed {total} question blocks ({exam_type}). Diagram-free kept: {kept}. Cache: {INDEX_JSON}")

        threading.Thread(target=work, daemon=True).start()

    def on_review_questions_solutions(self):
        """Open a window to review questions with their extracted solutions."""
        if not self.index:
            messagebox.showinfo("Index first", "Click 'Index PDFs' first.")
            return
        
        # Filter to only questions with solutions (for TMUA)
        # Also exclude unknown papers (section = None, "?", or empty)
        questions_with_solutions = [
            q for q in self.index 
            if q.solution_text 
            and q.section  # Must have a section
            and q.section != "?"  # Not unknown
            and (isinstance(q.section, str) and q.section.strip() != "")  # Not empty
        ]
        
        if not questions_with_solutions:
            messagebox.showinfo("No Solutions", 
                "No questions with solutions found. Make sure you've indexed TMUA papers with Official Solutions.")
            return
        
        # Create review window
        review_win = tk.Toplevel(self)
        review_win.title("Review Questions & Solutions")
        review_win.geometry("1200x800")
        
        # Top frame: Filters and navigation
        top_frame = ttk.Frame(review_win)
        top_frame.pack(fill="x", padx=10, pady=10)
        
        # Filter by paper type (for TMUA)
        filter_frame = ttk.Frame(top_frame)
        filter_frame.pack(side="left", padx=5)
        
        ttk.Label(filter_frame, text="Filter:").pack(side="left", padx=5)
        filter_var = tk.StringVar(value="All")
        
        # Store references for callback
        review_data = {
            'questions': questions_with_solutions,
            'filter_var': filter_var,
            'current_idx_var': tk.IntVar(value=0),
            'question_listbox': None,
            'question_display': None,
            'solution_display': None,
            'question_info': None
        }
        
        def update_list():
            self._update_review_list(review_win, review_data)
        
        ttk.Radiobutton(filter_frame, text="All", variable=filter_var, value="All",
                       command=update_list).pack(side="left")
        
        if MODE == "TMUA":
            ttk.Radiobutton(filter_frame, text="Paper 1", variable=filter_var, value="Paper 1",
                           command=update_list).pack(side="left", padx=5)
            ttk.Radiobutton(filter_frame, text="Paper 2", variable=filter_var, value="Paper 2",
                           command=update_list).pack(side="left", padx=5)
        
        # Navigation
        nav_frame = ttk.Frame(top_frame)
        nav_frame.pack(side="right", padx=5)
        
        def nav_prev():
            idx = review_data['current_idx_var'].get()
            if idx > 0:
                review_data['current_idx_var'].set(idx - 1)
                self._update_review_display(review_data)
        
        def nav_next():
            idx = review_data['current_idx_var'].get()
            filtered = self._get_filtered_questions(review_data['questions'], filter_var)
            if idx < len(filtered) - 1:
                review_data['current_idx_var'].set(idx + 1)
                self._update_review_display(review_data)
        
        ttk.Button(nav_frame, text="◀ Previous", command=nav_prev).pack(side="left", padx=2)
        review_data['question_info'] = ttk.Label(nav_frame, text="0 / 0")
        review_data['question_info'].pack(side="left", padx=10)
        ttk.Button(nav_frame, text="Next ▶", command=nav_next).pack(side="left", padx=2)
        
        # Main content: Question list on left, question/solution display on right
        main_frame = ttk.Frame(review_win)
        main_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        # Left: Question list
        list_frame = ttk.LabelFrame(main_frame, text="Questions", padding=5)
        list_frame.pack(side="left", fill="both", expand=False, padx=(0, 5))
        list_frame.config(width=300)
        
        question_listbox = tk.Listbox(list_frame, width=40, height=30)
        question_listbox.pack(fill="both", expand=True)
        review_data['question_listbox'] = question_listbox
        
        def on_list_select(event):
            selection = question_listbox.curselection()
            if selection:
                review_data['current_idx_var'].set(selection[0])
                self._update_review_display(review_data)
        
        question_listbox.bind("<<ListboxSelect>>", on_list_select)
        
        # Right: Question and solution display
        display_frame = ttk.Frame(main_frame)
        display_frame.pack(side="right", fill="both", expand=True)
        
        # Question display
        question_label = ttk.Label(display_frame, text="Question:", font=("TkDefaultFont", 10, "bold"))
        question_label.pack(anchor="w", pady=(0, 5))
        
        question_display = tk.Text(display_frame, wrap="word", height=15, padx=10, pady=10)
        question_display.pack(fill="both", expand=True)
        review_data['question_display'] = question_display
        
        # Solution display
        solution_label = ttk.Label(display_frame, text="Solution:", font=("TkDefaultFont", 10, "bold"))
        solution_label.pack(anchor="w", pady=(10, 5))
        
        solution_display = tk.Text(display_frame, wrap="word", height=15, padx=10, pady=10, bg="#f0f0f0")
        solution_display.pack(fill="both", expand=True)
        review_data['solution_display'] = solution_display
        
        # Initial update
        self._update_review_list(review_win, review_data)
    
    def _get_filtered_questions(self, questions: List[QuestionItem], filter_var: tk.StringVar) -> List[QuestionItem]:
        """Filter questions by paper type."""
        filter_value = filter_var.get()
        if filter_value == "All":
            return questions
        elif filter_value == "Paper 1":
            return [q for q in questions if q.section and "Paper 1" in q.section]
        elif filter_value == "Paper 2":
            return [q for q in questions if q.section and "Paper 2" in q.section]
        return questions
    
    def _update_review_list(self, win, review_data: dict):
        """Update the question list based on filter."""
        questions = review_data['questions']
        filter_var = review_data['filter_var']
        filtered = self._get_filtered_questions(questions, filter_var)
        
        # Update listbox
        question_listbox = review_data['question_listbox']
        question_listbox.delete(0, tk.END)
        for q in filtered:
            year = q.year or "?"
            section = q.section or "?"
            qnum = q.qnum
            label = f"{year} {section} Q{qnum}"
            question_listbox.insert(tk.END, label)
        
        # Reset to first question
        if filtered:
            review_data['current_idx_var'].set(0)
            question_listbox.selection_set(0)
            self._update_review_display(review_data)
    
    def _update_review_display(self, review_data: dict):
        """Update the question and solution display."""
        questions = review_data['questions']
        filter_var = review_data['filter_var']
        current_idx_var = review_data['current_idx_var']
        question_display = review_data['question_display']
        solution_display = review_data['solution_display']
        question_info = review_data['question_info']
        
        filtered = self._get_filtered_questions(questions, filter_var)
        idx = current_idx_var.get()
        
        if not filtered or idx < 0 or idx >= len(filtered):
            question_display.delete("1.0", tk.END)
            solution_display.delete("1.0", tk.END)
            if question_info:
                question_info.config(text="0 / 0")
            return
        
        q = filtered[idx]
        
        # Update info label
        if question_info:
            question_info.config(text=f"{idx + 1} / {len(filtered)}")
        
        # Update listbox selection
        question_listbox = review_data['question_listbox']
        question_listbox.selection_clear(0, tk.END)
        question_listbox.selection_set(idx)
        question_listbox.see(idx)
        
        # Display question
        question_display.delete("1.0", tk.END)
        question_header = f"Question {q.qnum}"
        if q.year:
            question_header += f" ({q.year}"
            if q.section:
                question_header += f" {q.section}"
            question_header += ")"
        question_display.insert("1.0", f"{question_header}\n\n{q.text}")
        
        # Display solution
        solution_display.delete("1.0", tk.END)
        if q.solution_text:
            solution_display.insert("1.0", q.solution_text)
        else:
            solution_display.insert("1.0", "[No solution available]")
    
    def on_view_extraction_report(self):
        """Display extraction report in a popup window."""
        report_path = LOG_DIR_DEFAULT / "extraction_report.json"
        
        if not report_path.exists():
            messagebox.showinfo("No Report", "No extraction report found. Run 'Index PDFs' first.")
            return
        
        try:
            with open(report_path, 'r', encoding='utf-8') as f:
                report = json.load(f)
            
            # Create popup window
            win = tk.Toplevel(self)
            win.title("PDF Extraction Report")
            win.geometry("800x600")
            
            # Summary at top
            summary_frame = ttk.Frame(win)
            summary_frame.pack(fill="x", padx=10, pady=10)
            
            summary = report.get("summary", {})
            ttk.Label(summary_frame, text=f"Mode: {report.get('mode', 'N/A')}", 
                     font=("TkDefaultFont", 10, "bold")).pack(anchor="w")
            ttk.Label(summary_frame, text=f"Created: {report.get('created_at', 'N/A')}").pack(anchor="w")
            ttk.Label(summary_frame, text=f"Scanned: {summary.get('scanned', 0)} PDFs").pack(anchor="w")
            ttk.Label(summary_frame, text=f"Success: {summary.get('success', 0)} PDFs", 
                     foreground="green").pack(anchor="w")
            ttk.Label(summary_frame, text=f"Failed: {summary.get('failed', 0)} PDFs", 
                     foreground="red").pack(anchor="w")
            
            # Detailed list
            ttk.Label(win, text="Per-PDF Details:").pack(anchor="w", padx=10)
            
            text = tk.Text(win, wrap="word")
            text.pack(fill="both", expand=True, padx=10, pady=5)
            
            per_pdf = report.get("per_pdf", [])
            for pdf_stat in per_pdf:
                status = pdf_stat.get("status", "UNKNOWN")
                pdf_name = Path(pdf_stat.get("pdf_path", "")).name
                
                if status == "SUCCESS":
                    text.insert(tk.END, f"✓ {pdf_name}\n", "success")
                    text.insert(tk.END, f"  Questions: {pdf_stat.get('question_count', 0)}, "
                                       f"Chars: {pdf_stat.get('total_chars', 0)}\n\n")
                else:
                    text.insert(tk.END, f"✗ {pdf_name}\n", "failed")
                    text.insert(tk.END, f"  Reason: {pdf_stat.get('failure_reason', 'Unknown')}\n\n", "failed")
            
            text.tag_config("success", foreground="green")
            text.tag_config("failed", foreground="red")
            text.config(state="disabled")
            
            # Close button
            ttk.Button(win, text="Close", command=win.destroy).pack(pady=5)
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load extraction report: {e}")

    def _accept_candidate_as_schema(self, candidate: Candidate) -> Optional[str]:
        """
        Accept a candidate as a new schema (helper method for pipeline).
        Returns schema_id if successful, None otherwise.
        """
        try:
            # Generate full schema markdown
            md = self.gemini.generate_text(prompt_full_schema(candidate))
            md = md.strip()
            
            # Ensure trailing separator
            if not md.endswith("---"):
                if not md.endswith("\n"):
                    md += "\n"
                md += "\n---\n"
            
            # Validate and auto-fix
            is_valid, errors, fixed_preview = validate_schema_block(md, auto_fix=True)
            if fixed_preview:
                md = fixed_preview
            
            if not is_valid:
                print(f"[REJECT] Candidate {candidate.candidate_id}: Validation failed: {errors}")
                return None
            
            # For TMUA: Route to correct schema file based on prefix
            if MODE == "TMUA":
                normalized_prefix = normalize_prefix(candidate.prefix)
                if normalized_prefix == "R":
                    target_path = TMUA_PAPER2_SCHEMAS_MD
                else:
                    target_path = TMUA_PAPER1_SCHEMAS_MD
                
                if not target_path.exists():
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    if normalized_prefix == "R":
                        target_path.write_text("# TMUA Paper 2 Schemas (Mathematical Reasoning)\n\n", encoding="utf-8")
                    else:
                        target_path.write_text("# TMUA Paper 1 Schemas (Mathematical Knowledge)\n\n", encoding="utf-8")
            else:
                target_path = self.schemas_md_path
                if not target_path.exists():
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    target_path.write_text("# Schemas\n\n", encoding="utf-8")
            
            # Assign unique schema ID
            normalized_prefix = normalize_prefix(candidate.prefix)
            new_id = generate_unique_schema_id(normalized_prefix)
            
            # Clean placeholders
            md = clean_schema_markdown(md, new_id, candidate.title)
            
            # Atomic write
            temp_file = target_path.with_suffix('.tmp')
            try:
                current_content = safe_read_text(target_path)
                new_content = current_content + "\n" + md + "\n"
                safe_write_text(temp_file, new_content)
                shutil.move(str(temp_file), str(target_path))
            except Exception as e:
                print(f"[ERROR] Failed to write schema {new_id}: {e}")
                if temp_file.exists():
                    temp_file.unlink()
                return None
            
            # Update meta
            if new_id not in self.schemas_meta:
                self.schemas_meta[new_id] = {
                    "edits_count": 0,
                    "locked": False,
                    "evidence": [],
                    "unique_id": new_id,
                    "created_at": now_iso()
                }
            self.schemas_meta[new_id]["has_tmua_evidence"] = has_tmua_evidence(candidate)
            save_schemas_meta(self.schemas_meta)
            
            # Update coverage
            update_schema_coverage(new_id, candidate, self.index)
            
            return new_id
        except Exception as e:
            print(f"[ERROR] Failed to accept candidate {candidate.candidate_id}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def _merge_candidate_into_schema(self, candidate: Candidate, schema_id: str):
        """
        Merge a candidate's evidence into an existing schema.
        """
        try:
            # Add evidence to existing schema
            if schema_id not in self.schemas_meta:
                self.schemas_meta[schema_id] = {"evidence": [], "edits_count": 0}
            
            existing_evidence = set(self.schemas_meta[schema_id].get("evidence", []))
            for qid in candidate.evidence:
                if qid not in existing_evidence:
                    existing_evidence.add(qid)
            
            self.schemas_meta[schema_id]["evidence"] = list(existing_evidence)
            save_schemas_meta(self.schemas_meta)
            
            # Update schema markdown file with new exemplars
            for qid in candidate.evidence:
                if qid not in existing_evidence:
                    justification = candidate.exemplar_justifications.get(qid, "Exemplifies pattern") if candidate.exemplar_justifications else "Exemplifies pattern"
                    self._update_schema_exemplars_in_file(schema_id, qid, justification)
        except Exception as e:
            print(f"[ERROR] Failed to merge candidate into {schema_id}: {e}")
            import traceback
            traceback.print_exc()
    
    def on_process_all_questions(self):
        """
        Three-stage schema generation pipeline:
        1. Stage 1: Parallel fingerprint extraction (one LLM call per question)
        2. Stage 2: LLM-based clustering of fingerprints
        3. Stage 3: Parallel schema synthesis (one LLM call per cluster)
        """
        if not self.index:
            messagebox.showinfo("Index first", "Click 'Index PDFs' first.")
            return
        
        # Get filter settings
        filt = self.batch_filter.get().strip().lower()
        
        # Select questions to process
        pool = self.index
        if filt:
            pool = [q for q in pool if filt in q.pdf_path.lower()]
        
        if len(pool) < 1:
            messagebox.showwarning("No questions", "No questions matched the filter.")
            return
        
        # Filter out already used questions
        unused_pool = [q for q in pool if f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "") not in self.used_question_ids]
        
        if len(unused_pool) < 1:
            if messagebox.askyesno("Reset tracking?", 
                f"All questions have been processed. Reset tracking and reprocess?"):
                self.used_question_ids.clear()
                self._save_used_questions()
                unused_pool = pool
            else:
                messagebox.showinfo("Done", "All questions have been processed.")
                return
        
        # Confirm before starting
        if not messagebox.askyesno("Process All Questions (Three-Stage Pipeline)", 
            f"This will process {len(unused_pool)} questions using the new three-stage pipeline:\n\n"
            f"Stage 1: Extract fingerprints in parallel ({PARALLEL_WORKERS} workers)\n"
            f"Stage 2: Cluster fingerprints using LLM\n"
            f"Stage 3: Synthesize schemas from clusters ({PARALLEL_WORKERS} workers)\n\n"
            f"Continue?"):
            return
        
        def work():
            try:
                # Stage 1: Extract fingerprints in parallel
                self.after(0, lambda: self._set_status("Stage 1: Extracting fingerprints..."))
                fingerprints = self._extract_fingerprints_parallel(unused_pool)
                
                # Skip barrier - continue with what we have
                # (The worker already loads existing fingerprints from disk)
                
                # Filter to eligible fingerprints
                eligible_fps = {qid: fp for qid, fp in fingerprints.items() if fp.eligible}
                self.after(0, lambda: self._set_status(
                    f"Stage 1 complete: {len(eligible_fps)}/{len(fingerprints)} eligible fingerprints"
                ))
                
                if len(eligible_fps) < 3:
                    self.after(0, lambda: messagebox.showwarning("Too Few Fingerprints", 
                        f"Only {len(eligible_fps)} eligible fingerprints. Need at least 3 for clustering."))
                    return
                
                # Stage 2: Cluster fingerprints
                self.after(0, lambda: self._set_status("Stage 2: Clustering fingerprints..."))
                clusters = self._cluster_fingerprints_llm(eligible_fps)
                
                if not clusters:
                    self.after(0, lambda: messagebox.showerror("Error", "Clustering failed or produced no clusters."))
                    return
                
                self.after(0, lambda: self._set_status(
                    f"Stage 2 complete: {len(clusters)} clusters created"
                ))
                
                # Stage 3: Synthesize schemas from clusters
                self.after(0, lambda: self._set_status("Stage 3: Synthesizing schemas from clusters..."))
                candidates = self._synthesize_schemas_from_clusters(clusters, eligible_fps)
                
                if not candidates:
                    self.after(0, lambda: messagebox.showwarning("No Candidates", "No schema candidates were generated."))
                    return
                
                # Process candidates: validate and create/merge schemas
                stats = {
                    "total_candidates": len(candidates),
                    "created": 0,
                    "merged": 0,
                    "rejected": 0,
                    "questions_lost": 0,
                    "skipped": 0
                }
                
                # Log model being used
                model_name = self.gemini.get_model_name()
                print(f"[INFO] Using model: {model_name}")
                self.after(0, lambda: self._set_status(f"Using model: {model_name}"))
                
                # Reload schemas to check what already exists
                self._load_schemas()
                existing_schema_evidence = set()
                for schema in self.schema_summaries:
                    meta = self.schemas_meta.get(schema.schema_id, {})
                    evidence = meta.get("evidence", [])
                    existing_schema_evidence.update(evidence)
                
                # Track failed candidates for resume
                failed_candidates = []
                
                for candidate in candidates:
                    try:
                        # Validate candidate
                        is_valid, error_msg = validate_prefix_against_content(candidate, self.index)
                        if not is_valid:
                            print(f"[REJECT] Candidate {candidate.candidate_id}: {error_msg}")
                            stats["rejected"] += 1
                            if candidate.evidence:
                                stats["questions_lost"] += len(candidate.evidence)
                            continue
                        
                        # Check for collisions
                        if candidate.collision_guess:
                            # Try to merge with existing schema
                            collision_id = candidate.collision_guess[0]
                            if any(s.schema_id == collision_id for s in self.schema_summaries):
                                # Merge logic: add evidence to existing schema
                                self._merge_candidate_into_schema(candidate, collision_id)
                                stats["merged"] += 1
                                continue
                        
                        # Create new schema
                        schema_id = self._accept_candidate_as_schema(candidate)
                        if schema_id:
                            stats["created"] += 1
                            # Mark questions as used
                            for qid in candidate.evidence:
                                self.used_question_ids.add(qid)
                        else:
                            stats["rejected"] += 1
                            # Count questions lost due to rejection
                            if candidate.evidence:
                                stats["questions_lost"] = stats.get("questions_lost", 0) + len(candidate.evidence)
                    except Exception as e:
                        print(f"[ERROR] Failed to process candidate {candidate.candidate_id}: {e}")
                        stats["rejected"] += 1
                        # Count questions lost due to error
                        if candidate.evidence:
                            stats["questions_lost"] = stats.get("questions_lost", 0) + len(candidate.evidence)
                
                # Save failed candidates for resume if any
                if failed_candidates:
                    failed_file = FINGERPRINTS_DIR_DEFAULT.parent / "failed_candidates.jsonl"
                    with open(failed_file, 'w', encoding='utf-8') as f:
                        for candidate in failed_candidates:
                            f.write(json.dumps(asdict(candidate), ensure_ascii=False) + "\n")
                    print(f"[INFO] Saved {len(failed_candidates)} failed candidates to {failed_file}")
                
                # Save used questions
                self._save_used_questions()
                
                # Final reload
                self.after(0, self._load_schemas)
                self.after(0, self._load_embeddings)
                self.after(0, self._load_meta)
                
                # Show summary
                questions_lost = stats.get("questions_lost", 0)
                skipped = stats.get("skipped", 0)
                summary = (f"Three-stage pipeline complete:\n\n"
                          f"Model used: {self.gemini.get_model_name()}\n\n"
                          f"Stage 1: {len(eligible_fps)} eligible fingerprints extracted\n"
                          f"Stage 2: {len(clusters)} clusters created\n"
                          f"Stage 3: {stats['total_candidates']} schema candidates generated\n\n"
                          f"Results:\n"
                          f"✓ New schemas created: {stats['created']}\n"
                          f"↻ Merged with existing: {stats['merged']}\n"
                          f"⊘ Skipped (already exist): {skipped}\n"
                          f"✗ Rejected: {stats['rejected']}")
                if questions_lost > 0:
                    summary += f"\n⚠ Questions lost due to failures: {questions_lost}"
                if failed_candidates:
                    summary += f"\n💾 {len(failed_candidates)} failed candidates saved for resume"
                    summary += f"\n💾 {len(failed_candidates)} failed candidates saved for resume"
                
                self.after(0, lambda: messagebox.showinfo("Processing Complete", summary))
                self.after(0, lambda: self._set_status(
                    f"Done. {stats['created']} created, {stats['merged']} merged, {stats['rejected']} rejected."
                ))
                
            except Exception as e:
                error_msg = f"Fatal error in pipeline: {e}"
                print(f"[ERROR] {error_msg}")
                import traceback
                traceback.print_exc()
                self.after(0, lambda: messagebox.showerror("Error", error_msg))
                self.after(0, lambda: self._set_status("Error occurred. Check console for details."))
        
        threading.Thread(target=work, daemon=True).start()
    
    def on_resume_failed_candidates(self):
        """
        Resume processing failed candidates from a previous run.
        """
        failed_file = FINGERPRINTS_DIR_DEFAULT.parent / "failed_candidates.jsonl"
        
        if not failed_file.exists():
            messagebox.showinfo("No Failed Candidates", "No failed candidates file found. All candidates were processed successfully.")
            return
        
        # Load failed candidates
        failed_candidates = []
        try:
            with open(failed_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        data = json.loads(line)
                        failed_candidates.append(Candidate(**data))
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load failed candidates: {e}")
            return
        
        if not failed_candidates:
            messagebox.showinfo("No Failed Candidates", "Failed candidates file is empty.")
            return
        
        if not messagebox.askyesno("Resume Failed Candidates", 
            f"Found {len(failed_candidates)} failed candidates.\n\n"
            f"This will retry processing them.\n\n"
            f"Continue?"):
            return
        
        def work():
            try:
                self.after(0, lambda: self._set_status(f"Resuming {len(failed_candidates)} failed candidates..."))
                
                # Reload schemas to check what already exists
                self._load_schemas()
                self._load_meta()
                
                existing_schema_evidence = set()
                for schema in self.schema_summaries:
                    meta = self.schemas_meta.get(schema.schema_id, {})
                    evidence = meta.get("evidence", [])
                    existing_schema_evidence.update(evidence)
                
                stats = {
                    "total": len(failed_candidates),
                    "created": 0,
                    "merged": 0,
                    "rejected": 0,
                    "skipped": 0,
                    "questions_lost": 0
                }
                
                model_name = self.gemini.get_model_name()
                print(f"[INFO] Resuming with model: {model_name}")
                
                for candidate in failed_candidates:
                    try:
                        # Check if already processed
                        candidate_evidence_set = set(candidate.evidence)
                        if candidate_evidence_set.issubset(existing_schema_evidence):
                            stats["skipped"] += 1
                            print(f"[SKIP] Candidate {candidate.candidate_id}: Already processed")
                            continue
                        
                        # Validate candidate
                        is_valid, error_msg = validate_prefix_against_content(candidate, self.index)
                        if not is_valid:
                            print(f"[REJECT] Candidate {candidate.candidate_id}: {error_msg}")
                            stats["rejected"] += 1
                            if candidate.evidence:
                                stats["questions_lost"] += len(candidate.evidence)
                            continue
                        
                        # Check for collisions
                        if candidate.collision_guess:
                            collision_id = candidate.collision_guess[0]
                            if any(s.schema_id == collision_id for s in self.schema_summaries):
                                self._merge_candidate_into_schema(candidate, collision_id)
                                stats["merged"] += 1
                                meta = self.schemas_meta.get(collision_id, {})
                                existing_schema_evidence.update(meta.get("evidence", []))
                                continue
                        
                        # Create new schema
                        schema_id = self._accept_candidate_as_schema(candidate)
                        if schema_id:
                            stats["created"] += 1
                            for qid in candidate.evidence:
                                self.used_question_ids.add(qid)
                            existing_schema_evidence.update(candidate.evidence)
                        else:
                            stats["rejected"] += 1
                            if candidate.evidence:
                                stats["questions_lost"] += len(candidate.evidence)
                    except Exception as e:
                        print(f"[ERROR] Failed to process candidate {candidate.candidate_id}: {e}")
                        stats["rejected"] += 1
                        if candidate.evidence:
                            stats["questions_lost"] += len(candidate.evidence)
                
                # Save used questions
                self._save_used_questions()
                
                # Final reload
                self.after(0, self._load_schemas)
                self.after(0, self._load_embeddings)
                self.after(0, self._load_meta)
                
                # Show summary
                summary = (f"Resume complete:\n\n"
                          f"Model used: {model_name}\n\n"
                          f"Total candidates: {stats['total']}\n"
                          f"✓ Created: {stats['created']}\n"
                          f"↻ Merged: {stats['merged']}\n"
                          f"⊘ Skipped: {stats['skipped']}\n"
                          f"✗ Rejected: {stats['rejected']}")
                if stats["questions_lost"] > 0:
                    summary += f"\n⚠ Questions lost: {stats['questions_lost']}"
                
                self.after(0, lambda: messagebox.showinfo("Resume Complete", summary))
                self.after(0, lambda: self._set_status(
                    f"Resume done. {stats['created']} created, {stats['merged']} merged, {stats['rejected']} rejected."
                ))
                
            except Exception as e:
                error_msg = f"Fatal error in resume: {e}"
                print(f"[ERROR] {error_msg}")
                import traceback
                traceback.print_exc()
                self.after(0, lambda: messagebox.showerror("Error", error_msg))
                self.after(0, lambda: self._set_status("Error occurred. Check console for details."))
        
        threading.Thread(target=work, daemon=True).start()
    
    def _create_candidate_from_question(self, question: QuestionItem, 
                                       similar_to: Optional[str] = None,
                                       fit_score: Optional[float] = None) -> Optional[Candidate]:
        """Create a schema candidate from a single question."""
        try:
            # Generate candidate using Gemini
            prompt = f"""Analyze this exam question and propose a schema candidate.

Question:
{question.text[:1000]}

Create a schema that captures the REASONING PATTERN (not the topic).

Return ONLY valid JSON:
{{
  "candidate_id": "C1",
  "prefix": "M|P|B|C",
  "title": "3-8 word title describing the pattern",
  "core_move": "One sentence describing the key reasoning step",
  "evidence": ["{question.exam}_{question.section}_{question.year}_Q{question.qnum}"],
  "exemplar_justifications": {{
    "{question.exam}_{question.section}_{question.year}_Q{question.qnum}": "Why this exemplifies the pattern"
  }},
  "collision_guess": [],
  "confidence": 0.8
}}
"""
            
            data = self.gemini.generate_json(prompt)
            # Normalise response shape: Gemini may return a dict, a list, or a wrapper with "candidates"
            if isinstance(data, list):
                data = data[0] if data else None
            elif isinstance(data, dict) and "candidates" in data and isinstance(data["candidates"], list):
                data = data["candidates"][0] if data["candidates"] else None

            if data and isinstance(data, dict):
                qid = f"{question.exam}_{question.section}_{question.year}_Q{question.qnum}".replace(" ", "")
                
                candidate = Candidate(
                    candidate_id=data.get("candidate_id", f"C{len(self.candidates)+1}"),
                    title=data.get("title", "").strip(),
                    prefix=data.get("prefix", "M").strip().upper(),
                    core_move=data.get("core_move", "").strip(),
                    evidence=[qid],
                    collision_guess=data.get("collision_guess", []),
                    confidence=float(data.get("confidence", 0.5)),
                    exemplar_justifications={qid: data.get("exemplar_justifications", {}).get(qid, "Exemplifies pattern")}
                )
                
                if similar_to:
                    candidate.collision_guess = [similar_to]
                
                return candidate
        except Exception as e:
            print(f"[ERROR] Failed to create candidate from question: {e}")
        
        return None
    
    def _extract_fingerprints_parallel(self, questions: List[QuestionItem]) -> Dict[str, QuestionFingerprint]:
        """
        Stage 1: Extract fingerprints from all questions in parallel.
        Returns dict mapping qid -> QuestionFingerprint.
        """
        fingerprints = {}
        fingerprints_dir = FINGERPRINTS_DIR_DEFAULT
        
        def extract_worker(question: QuestionItem) -> Tuple[str, Optional[QuestionFingerprint], Optional[str]]:
            return _extract_fingerprint_worker(question, self.gemini, fingerprints_dir)
        
        with ThreadPoolExecutor(max_workers=PARALLEL_WORKERS) as executor:
            future_to_question = {executor.submit(extract_worker, q): q for q in questions}
            
            completed = 0
            for future in as_completed(future_to_question):
                try:
                    qid, fingerprint, error = future.result()
                    if fingerprint:
                        fingerprints[qid] = fingerprint
                    else:
                        print(f"[WARN] Failed to extract fingerprint for {qid}: {error}")
                    completed += 1
                    if completed % 10 == 0:
                        self.after(0, lambda c=completed: self._set_status(
                            f"Stage 1: Extracting fingerprints ({c}/{len(questions)} complete)..."
                        ))
                except Exception as e:
                    q = future_to_question[future]
                    qid = f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "")
                    print(f"[ERROR] Exception extracting fingerprint for {qid}: {e}")
        
        return fingerprints
    
    def _cluster_fingerprints_llm(self, fingerprints: Dict[str, QuestionFingerprint]) -> Dict[int, List[str]]:
        """
        Stage 2: Cluster fingerprints using LLM.
        Returns dict mapping cluster_id -> List[qid].
        """
        if not fingerprints:
            return {}
        
        # Filter to eligible fingerprints only
        eligible_fps = {qid: fp for qid, fp in fingerprints.items() if fp.eligible}
        
        if len(eligible_fps) < 3:
            # Too few fingerprints, create one cluster
            return {0: list(eligible_fps.keys())}
        
        # Group fingerprints into batches for LLM processing (50-100 at a time)
        batch_size = 75
        fingerprint_list = list(eligible_fps.items())
        batches = [fingerprint_list[i:i+batch_size] for i in range(0, len(fingerprint_list), batch_size)]
        
        all_clusters = {}
        next_cluster_id = 0
        
        for batch_idx, batch in enumerate(batches):
            self.after(0, lambda b=batch_idx+1, t=len(batches): self._set_status(
                f"Stage 2: Clustering fingerprints (batch {b}/{t})..."
            ))
            
            # Build cluster text for each fingerprint
            fingerprint_texts = []
            for qid, fp in batch:
                cluster_text = f"{fp.reasoning_pattern_hint} | {fp.core_move_guess} | {', '.join(fp.trigger_cues)}"
                fingerprint_texts.append({
                    "qid": qid,
                    "cluster_text": cluster_text,
                    "reasoning_pattern_hint": fp.reasoning_pattern_hint,
                    "core_move_guess": fp.core_move_guess,
                    "trigger_cues": fp.trigger_cues
                })
            
            # LLM clustering prompt
            prompt = f"""Group these {len(batch)} question fingerprints into clusters based on similar reasoning patterns.

Each fingerprint has:
- reasoning_pattern_hint: A pattern label
- core_move_guess: The key reasoning move
- trigger_cues: Surface signals that detect the pattern

Group fingerprints that share:
- Similar reasoning_pattern_hint
- Similar core_move_guess
- Overlapping trigger_cues

Avoid creating too many small clusters (< 3 items) or too few large clusters (> 40 items).
Aim for clusters of 5-25 fingerprints each.

Fingerprints:
{json.dumps(fingerprint_texts, indent=2)}

Return ONLY valid JSON:
{{
  "clusters": [
    {{
      "cluster_id": 1,
      "qids": ["qid1", "qid2", "qid3"],
      "reasoning_pattern": "Brief description of the shared pattern"
    }},
    ...
  ]
}}
"""
            
            try:
                resp = self.gemini.generate_json(prompt)
                if resp and isinstance(resp, dict):
                    clusters_data = resp.get("clusters", [])
                    if isinstance(resp, list):
                        clusters_data = resp
                    
                    for cluster_data in clusters_data:
                        if isinstance(cluster_data, dict):
                            qids = cluster_data.get("qids", [])
                            if qids:
                                all_clusters[next_cluster_id] = qids
                                next_cluster_id += 1
            except Exception as e:
                print(f"[WARN] Failed to cluster batch {batch_idx + 1}: {e}")
                # Fallback: create one cluster per batch
                batch_qids = [qid for qid, _ in batch]
                all_clusters[next_cluster_id] = batch_qids
                next_cluster_id += 1
        
        # Handle any unclustered fingerprints (singletons)
        clustered_qids = set()
        for cluster_qids in all_clusters.values():
            clustered_qids.update(cluster_qids)
        
        unclustered = [qid for qid in eligible_fps.keys() if qid not in clustered_qids]
        if unclustered:
            # Create individual clusters for each unclustered question
            # This ensures every question gets a schema (even if it's a unique pattern)
            for qid in unclustered:
                all_clusters[next_cluster_id] = [qid]
                next_cluster_id += 1
        
        return all_clusters
    
    def _synthesize_schemas_from_clusters(self, clusters: Dict[int, List[str]], 
                                         fingerprints: Dict[str, QuestionFingerprint]) -> List[Candidate]:
        """
        Stage 3: Synthesize schema candidates from clusters in parallel.
        Returns list of Candidate objects.
        """
        candidates = []
        
        # Process all clusters - use every question
        # For small clusters (< 3), we'll still create schemas (they might be unique patterns)
        # For large clusters (> 25), split into multiple schemas to ensure diversity
        valid_clusters = {}
        for cluster_id, qids in clusters.items():
            if len(qids) < 3:
                # Small clusters: create schema anyway (might be unique patterns)
                valid_clusters[cluster_id] = qids
            elif len(qids) > 25:
                # Large clusters: split into multiple schemas (each with 15-25 questions)
                # This ensures we create multiple schemas and use all questions
                chunk_size = 20
                for i in range(0, len(qids), chunk_size):
                    chunk = qids[i:i+chunk_size]
                    if len(chunk) >= 1:  # Accept even single-question chunks
                        valid_clusters[len(valid_clusters)] = chunk
            else:
                valid_clusters[cluster_id] = qids
        
        if not valid_clusters:
            return []
        
        def synthesize_worker(cluster_id: int, qids: List[str]) -> Optional[Candidate]:
            """Worker function to synthesize one schema from a cluster."""
            try:
                # Get fingerprints for this cluster
                cluster_fps = [fingerprints[qid] for qid in qids if qid in fingerprints]
                if not cluster_fps:
                    return None
                
                # Select representative fingerprints (8-20, or all if small)
                if len(cluster_fps) <= 20:
                    representative_fps = cluster_fps
                else:
                    # Sample evenly
                    step = len(cluster_fps) // 20
                    representative_fps = cluster_fps[::step][:20]
                
                # Determine prefix from question IDs
                prefix = "M"  # Default
                for qid in qids:
                    if "Paper2" in qid or "_Paper2_" in qid:
                        prefix = "R"
                        break
                    elif "Paper1" in qid or "_Paper1_" in qid:
                        prefix = "M"
                        break
                
                # Load schema synthesis prompt
                template = load_prompt_template(SCHEMA_SYNTHESIS_CLUSTER_PROMPT_PATH)
                
                # Format existing schemas
                existing_schemas_text = "\n".join(
                    [f"- {s.schema_id}: {s.title} | {s.core_move}" for s in self.schema_summaries[:20]]
                )
                
                # Format cluster fingerprints as JSON
                cluster_fps_json = json.dumps([
                    {
                        "qid": fp.qid,
                        "reasoning_pattern_hint": fp.reasoning_pattern_hint,
                        "core_move_guess": fp.core_move_guess,
                        "trigger_cues": fp.trigger_cues,
                        "mini_steps": fp.mini_steps,
                        "wrong_move": fp.wrong_move,
                        "answer_form": fp.answer_form
                    }
                    for fp in representative_fps
                ], indent=2)
                
                prompt = template.format(
                    existing_schemas=existing_schemas_text,
                    cluster_fingerprints=cluster_fps_json
                )
                
                resp = self.gemini.generate_json(prompt)
                if resp and isinstance(resp, dict):
                    # Handle list wrapper
                    if isinstance(resp, list):
                        resp = resp[0] if resp else {}
                    elif "candidates" in resp:
                        resp = resp["candidates"][0] if resp["candidates"] else {}
                    
                    if resp:
                        # Use ALL questions from cluster as evidence (not just 3-8)
                        # This ensures every question gets used
                        evidence_qids = qids  # Use all questions in the cluster
                        
                        # Build exemplar justifications for all questions
                        exemplar_justifications = {}
                        for qid in evidence_qids:
                            if qid in fingerprints:
                                fp = fingerprints[qid]
                                exemplar_justifications[qid] = f"Exemplifies {fp.reasoning_pattern_hint}"
                            else:
                                exemplar_justifications[qid] = "Exemplifies pattern"
                        
                        # If LLM returned evidence, use it, but ensure we include all cluster questions
                        llm_evidence = resp.get("evidence", [])
                        if llm_evidence:
                            # Merge LLM evidence with all cluster questions (no duplicates)
                            all_evidence = list(set(evidence_qids + llm_evidence))
                        else:
                            all_evidence = evidence_qids
                        
                        candidate = Candidate(
                            candidate_id=resp.get("candidate_id") or f"C{cluster_id}",
                            title=str(resp.get("title", "")),
                            prefix=str(resp.get("prefix", prefix)),
                            core_move=str(resp.get("core_move", "")),
                            evidence=all_evidence,  # Use all questions
                            collision_guess=list(resp.get("collision_guess", [])),
                            confidence=float(resp.get("confidence", 0.0)),
                            exemplar_justifications=resp.get("exemplar_justifications", exemplar_justifications),
                            trigger_cues=list(resp.get("trigger_cues", [])),
                            canonical_steps=list(resp.get("canonical_steps", [])),
                            variation_knobs=list(resp.get("variation_knobs", [])),
                            distractor_archetypes=list(resp.get("distractor_archetypes", [])),
                            answer_form=str(resp.get("answer_form", "other")),
                            scope=str(resp.get("scope", "good")),
                            collision_reason=resp.get("collision_reason")
                        )
                        return candidate
            except Exception as e:
                print(f"[ERROR] Failed to synthesize schema for cluster {cluster_id}: {e}")
                import traceback
                traceback.print_exc()
            
            return None
        
        # Process clusters in parallel
        with ThreadPoolExecutor(max_workers=PARALLEL_WORKERS) as executor:
            future_to_cluster = {
                executor.submit(synthesize_worker, cluster_id, qids): cluster_id
                for cluster_id, qids in valid_clusters.items()
            }
            
            completed = 0
            for future in as_completed(future_to_cluster):
                try:
                    candidate = future.result()
                    if candidate:
                        candidates.append(candidate)
                    completed += 1
                    self.after(0, lambda c=completed, t=len(valid_clusters): self._set_status(
                        f"Stage 3: Synthesizing schemas ({c}/{t} clusters complete)..."
                    ))
                except Exception as e:
                    cluster_id = future_to_cluster[future]
                    print(f"[ERROR] Exception synthesizing cluster {cluster_id}: {e}")
        
        return candidates
    
    def _auto_attach_question_to_schema(self, question: QuestionItem, schema_id: str, fit_score: float):
        """Auto-attach a question as exemplar to an existing schema."""
        qid = f"{question.exam}_{question.section}_{question.year}_Q{question.qnum}".replace(" ", "")
        
        # Add to schema metadata
        if schema_id not in self.schemas_meta:
            self.schemas_meta[schema_id] = {"evidence": [], "edit_count": 0}
        
        if "evidence" not in self.schemas_meta[schema_id]:
            self.schemas_meta[schema_id]["evidence"] = []
        
        if qid not in self.schemas_meta[schema_id]["evidence"]:
            self.schemas_meta[schema_id]["evidence"].append(qid)
            self._save_meta()
            
            # Update markdown file with new exemplar question
            justification = f"Exemplifies pattern (fit score: {fit_score:.1f})"
            self._update_schema_exemplars_in_file(schema_id, qid, justification)
            
            # Mark question as used (it's now in a schema)
            self.used_question_ids.add(qid)
            self._save_used_questions()
        
        # Log the attachment
        append_text(DECISIONS_JSONL, json.dumps({
            "ts": now_iso(),
            "decision": "auto_attach",
            "question_id": qid,
            "schema_id": schema_id,
            "fit_score": fit_score
        }) + "\n")
        
        print(f"[AUTO-ATTACH] {qid} → {schema_id} (score: {fit_score:.1f})")
    
    def _auto_accept_new_schema(self, question: QuestionItem) -> Optional[str]:
        """
        Automatically create and accept a new schema from a question.
        Returns the assigned schema_id if successful, None otherwise.
        """
        try:
            # Create candidate from question
            candidate = self._create_candidate_from_question(question)
            if not candidate:
                return None
            
            # Generate full schema block
            prompt = prompt_full_schema(candidate, enforce_max4=True)
            md_response = self.gemini.generate_text(prompt, temperature=0.4, max_tokens=2000)
            
            if not md_response or not md_response.strip():
                print(f"[ERROR] Failed to generate schema for question")
                return None
            
            # Validate schema
            is_valid, errors, fixed_md = validate_schema_block(md_response, auto_fix=True)
            if fixed_md:
                md_response = fixed_md
            
            if not is_valid:
                print(f"[ERROR] Schema validation failed: {errors}")
                return None
            
            # Assign unique schema ID (no conflicts even with parallel processing)
            # Normalize prefix to single letter (M, P, B, C, R)
            normalized_prefix = normalize_prefix(candidate.prefix)
            new_id = generate_unique_schema_id(normalized_prefix)
            
            # Clean ALL placeholders from the markdown
            md_response = clean_schema_markdown(md_response, new_id, candidate.title)
            
            # Ensure separator at end
            if not md_response.rstrip().endswith("---"):
                md_response = md_response.rstrip() + "\n\n---\n"
            
            # For TMUA: Route to correct schema file based on prefix (M = Paper 1, R = Paper 2)
            target_schemas_path = self.schemas_md_path
            if MODE == "TMUA":
                if normalized_prefix == "R":
                    target_schemas_path = TMUA_PAPER2_SCHEMAS_MD
                else:
                    # M prefix or any other prefix defaults to Paper 1
                    target_schemas_path = TMUA_PAPER1_SCHEMAS_MD
                
                # Ensure file exists
                if not target_schemas_path.exists():
                    target_schemas_path.parent.mkdir(parents=True, exist_ok=True)
                    if normalized_prefix == "R":
                        target_schemas_path.write_text("# TMUA Paper 2 Schemas (Mathematical Reasoning)\n\n", encoding="utf-8")
                    else:
                        target_schemas_path.write_text("# TMUA Paper 1 Schemas (Mathematical Knowledge)\n\n", encoding="utf-8")
            
            # Atomic write to file
            temp_file = target_schemas_path.with_suffix('.tmp')
            try:
                current_content = safe_read_text(target_schemas_path)
                new_content = current_content.rstrip() + "\n\n" + md_response + "\n"
                safe_write_text(temp_file, new_content)
                shutil.move(str(temp_file), str(target_schemas_path))
            except Exception as e:
                print(f"[ERROR] Failed to write schema to file: {e}")
                if temp_file.exists():
                    temp_file.unlink()
                return None
            
            # Update metadata
            if new_id not in self.schemas_meta:
                self.schemas_meta[new_id] = {
                    "edits_count": 0, 
                    "locked": False, 
                    "evidence": [],
                    "unique_id": new_id,  # Store original unique ID
                    "created_at": now_iso()  # Timestamp for sorting during renumbering
                }
            
            # Add question to evidence
            qid = f"{question.exam}_{question.section}_{question.year}_Q{question.qnum}".replace(" ", "")
            if "evidence" not in self.schemas_meta[new_id]:
                self.schemas_meta[new_id]["evidence"] = []
            if qid not in self.schemas_meta[new_id]["evidence"]:
                self.schemas_meta[new_id]["evidence"].append(qid)
            
            self.schemas_meta[new_id]["has_tmua_evidence"] = has_tmua_evidence(candidate)
            save_schemas_meta(self.schemas_meta)
            
            # Update coverage stats
            update_schema_coverage(new_id, candidate, self.index)
            
            # Mark all questions in evidence as used (they're now in a schema)
            for qid in candidate.evidence:
                self.used_question_ids.add(qid)
            self._save_used_questions()
            
            # Log success
            append_text(DECISIONS_JSONL, json.dumps({
                "ts": now_iso(),
                "decision": "auto_accept_new",
                "assigned_schema_id": new_id,
                "candidate": asdict(candidate),
                "question_id": qid,
                "has_tmua_evidence": has_tmua_evidence(candidate),
            }) + "\n")
            
            print(f"[AUTO-ACCEPT] Created new schema {new_id} from question {qid} (saved to {target_schemas_path.name})")
            
            # Reload schemas so subsequent questions see the new schema
            self._load_schemas()
            self._load_embeddings()
            self._load_meta()
            
            return new_id
            
        except Exception as e:
            print(f"[ERROR] Failed to auto-accept new schema: {e}")
            return None

    # Candidate generation
    def on_generate(self):
        if not self.index:
            messagebox.showinfo("Index first", "Click 'Index PDFs' first.")
            return

        # Ensure correct schemas file path (check if TMUA)
        if self.index:
            is_tmua = any(q.exam == "TMUA" for q in self.index)
            if is_tmua:
                self.schemas_md_path = TMUA_PAPER1_SCHEMAS_MD
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
        # Include all questions (diagram filtering disabled)
        # pool = [q for q in pool if not q.skipped_diagram]  # Disabled per user request

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
        
        # NOTE: Do NOT mark questions as used here - they should only be marked as used
        # when they're actually accepted into schemas (in on_accept_new, on_accept_all, etc.)
        # This allows questions to be reused if candidates are rejected/ignored

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
                        exemplar_justifications=obj.get("exemplar_justifications", {}),
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

    def _compute_similarity_hits(self, use_llm_scoring: bool = True):
        """
        Compute similarity hits using improved strategy:
        1. Fast comparison against ALL schemas (embeddings + fuzzy)
        2. Get top 5
        3. Use LLM to score fit for top 5 (if use_llm_scoring=True)
        """
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
            # Step 1: Fast comparison - filter schemas by prefix (TMUA: M vs M, R vs R only)
            fast_hits = []
            cand_emb = candidate_embeddings.get(c.candidate_id)
            for s in self.schema_summaries:
                # For TMUA: Only compare within same paper type (M = Paper 1, R = Paper 2)
                # For ESAT: Compare all schemas (M, P, B, C can be compared with each other)
                if MODE == "TMUA" and c.prefix != s.schema_id[0]:
                    continue  # Skip if prefixes don't match (Paper 1 vs Paper 2)
                existing_emb = self.schema_embeddings.get(s.schema_id)
                score = schema_similarity(c.title, c.core_move, s, cand_emb, existing_emb)
                fast_hits.append((s, score))
            
            # Step 2: Get top 5
            fast_hits.sort(key=lambda x: x[1], reverse=True)
            top_5 = fast_hits[:5]
            
            # Step 3: Use LLM to score fit for top 5 (optional, more expensive)
            if use_llm_scoring and self.schema_summaries:
                detailed_hits = []
                for schema, fast_score in top_5:
                    # Get exemplars for this schema (from evidence in metadata)
                    exemplar_questions = self._get_exemplar_questions_for_schema(schema.schema_id)
                    
                    # Create a pseudo-question from candidate for scoring
                    pseudo_question = QuestionItem(
                        paper_id="candidate",
                        pdf_path="",
                        year=None,
                        exam=None,
                        section=None,
                        qnum=0,
                        text=f"{c.title}\n\n{c.core_move}",
                        skipped_diagram=False
                    )
                    
                    # Extract reasoning fingerprint from candidate
                    fingerprint = extract_reasoning_fingerprint(pseudo_question, self.gemini)
                    
                    # Use LLM to compute detailed fit score
                    fit_score, rubric = compute_schema_fit_score(
                        question=pseudo_question,
                        schema=schema,
                        question_fingerprint=fingerprint,
                        schema_exemplars=exemplar_questions[:3],  # Use top 3 exemplars
                        gemini=self.gemini
                    )
                    
                    # Combine fast score and LLM score (weighted: 30% fast, 70% LLM)
                    combined_score = (fast_score * 0.3) + (fit_score * 10 * 0.7)
                    
                    detailed_hits.append(SimilarityHit(
                        schema_id=schema.schema_id,
                        score=combined_score,
                        title=f"{schema.title} [LLM:{fit_score:.1f}]"
                    ))
                
                detailed_hits.sort(key=lambda x: x.score, reverse=True)
                self.sim_hits[c.candidate_id] = detailed_hits
            else:
                # Fallback: just use fast scores
                hits = [SimilarityHit(schema_id=s.schema_id, score=score, title=s.title) 
                        for s, score in top_5]
                self.sim_hits[c.candidate_id] = hits
    
    def _get_exemplar_questions_for_schema(self, schema_id: str) -> List[QuestionItem]:
        """Get exemplar questions for a schema from the index."""
        exemplars = []
        
        # Try to get evidence from schema metadata
        schema_meta = self.schemas_meta.get(schema_id, {})
        evidence_ids = schema_meta.get("evidence", [])
        
        # If no evidence in metadata, return empty
        if not evidence_ids:
            return exemplars
        
        # Find questions in index that match evidence IDs
        for qid in evidence_ids[:8]:  # Max 8 exemplars
            for q in self.index:
                q_id = f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "")
                if q_id == qid:
                    exemplars.append(q)
                    break
        
        return exemplars
    
    def _get_question_count_for_schema(self, schema_id: str) -> int:
        """Get current number of questions attached to a schema."""
        schema_meta = self.schemas_meta.get(schema_id, {})
        evidence_ids = schema_meta.get("evidence", [])
        return len(evidence_ids) if evidence_ids else 0
    
    def _get_question_text_by_id(self, question_id: str) -> Optional[QuestionItem]:
        """Retrieve full question text from index given question ID."""
        for q in self.index:
            q_id = f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "")
            if q_id == question_id:
                return q
        return None
    
    def _update_schema_exemplars_in_file(self, schema_id: str, question_id: str, justification: str):
        """Update schema markdown file to add a new exemplar question."""
        # For TMUA: Determine correct file based on schema prefix
        target_schemas_path = self.schemas_md_path
        if MODE == "TMUA":
            prefix = schema_id[0] if schema_id else "M"
            if prefix == "R":
                target_schemas_path = TMUA_PAPER2_SCHEMAS_MD
            else:
                # M prefix or any other prefix defaults to Paper 1
                target_schemas_path = TMUA_PAPER1_SCHEMAS_MD
        
        if not target_schemas_path.exists():
            return
        
        md = safe_read_text(target_schemas_path)
        lines = md.splitlines()
        
        # Find the schema block
        schema_start = None
        schema_end = None
        exemplar_section_start = None
        exemplar_section_end = None
        
        for i, line in enumerate(lines):
            # Find schema header
            if SCHEMA_HEADER_RE.match(line.strip()):
                matched_id = SCHEMA_HEADER_RE.match(line.strip()).group(1)
                if matched_id == schema_id:
                    schema_start = i
                elif schema_start is not None:
                    # Found next schema, this is our end
                    schema_end = i
                    break
                continue
            
            # Find exemplar questions section
            if schema_start is not None and "exemplar questions" in line.lower():
                exemplar_section_start = i
                # Find end of exemplar section (next section or blank line before ---)
                j = i + 1
                while j < len(lines):
                    if lines[j].strip().startswith("**") or lines[j].strip() == "---" or (lines[j].startswith("##") and SCHEMA_HEADER_RE.match(lines[j].strip())):
                        exemplar_section_end = j
                        break
                    if not lines[j].strip().startswith("- ") and lines[j].strip():
                        # Non-bullet line, end of exemplar section
                        exemplar_section_end = j
                        break
                    j += 1
                if exemplar_section_end is None:
                    exemplar_section_end = j
                continue
            
            # Find end of schema (separator)
            if schema_start is not None and i > schema_start:
                if line.strip() == "---":
                    schema_end = i
                    break
        
        if schema_start is None:
            print(f"[WARN] Schema {schema_id} not found in file")
            return
        
        if schema_end is None:
            schema_end = len(lines)
        
        # If exemplar section exists, add to it; otherwise create it
        new_exemplar_line = f"- `{question_id}`: {justification}"
        
        if exemplar_section_start is not None:
            # Insert after last exemplar item (before end of section)
            insert_pos = exemplar_section_end if exemplar_section_end else exemplar_section_start + 1
            lines.insert(insert_pos, new_exemplar_line)
        else:
            # Create exemplar section before the end
            # Find where to insert (after "Notes for generation" section)
            insert_pos = schema_end
            for i in range(schema_start, schema_end):
                if "notes for generation" in lines[i].lower():
                    # Find end of notes section
                    j = i + 1
                    while j < schema_end and (lines[j].strip().startswith("- ") or not lines[j].strip()):
                        j += 1
                    insert_pos = j
                    break
            
            # Insert exemplar section
            lines.insert(insert_pos, "**Exemplar questions:**")
            lines.insert(insert_pos + 1, new_exemplar_line)
            if insert_pos + 2 < len(lines) and lines[insert_pos + 2].strip() != "":
                lines.insert(insert_pos + 2, "")  # Blank line if needed
        
        # Write back
        new_md = "\n".join(lines)
        if not new_md.endswith("\n"):
            new_md += "\n"
        safe_write_text(target_schemas_path, new_md)
    
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
            
            # For TMUA: Ensure both schema files exist (will route based on candidate prefix)
            if self.index:
                is_tmua = any(q.exam == "TMUA" for q in self.index)
                if is_tmua:
                    # Ensure both TMUA schema files exist
                    for schema_path, paper_name in [
                        (TMUA_PAPER1_SCHEMAS_MD, "Paper 1 Schemas (Mathematical Knowledge)"),
                        (TMUA_PAPER2_SCHEMAS_MD, "Paper 2 Schemas (Mathematical Reasoning)")
                    ]:
                        if not schema_path.exists():
                            schema_path.parent.mkdir(parents=True, exist_ok=True)
                            schema_path.write_text(f"# TMUA {paper_name}\n\n", encoding="utf-8")
                    # Default to Paper 1 for UI, actual write routes based on candidate
                    self.schemas_md_path = TMUA_PAPER1_SCHEMAS_MD
                    # Reload schemas (loads both Paper 1 and Paper 2 for comparison)
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
                    
                    # Route to correct TMUA schema file based on prefix (M = Paper 1, R = Paper 2)
                    if has_tmua_evidence(c):
                        tmua_prefix = get_tmua_prefix_from_evidence(c)
                        if tmua_prefix == "R":
                            self.schemas_md_path = TMUA_PAPER2_SCHEMAS_MD
                        else:
                            # Default to Paper 1 for M prefix or if unclear
                            self.schemas_md_path = TMUA_PAPER1_SCHEMAS_MD
                    
                    # Ensure schemas file exists
                    if not self.schemas_md_path.exists():
                        self.schemas_md_path.parent.mkdir(parents=True, exist_ok=True)
                        if has_tmua_evidence(c):
                            tmua_prefix = get_tmua_prefix_from_evidence(c) if has_tmua_evidence(c) else "M"
                            if tmua_prefix == "R":
                                initial_content = "# TMUA Paper 2 Schemas (Mathematical Reasoning)\n\n"
                            else:
                                initial_content = "# TMUA Paper 1 Schemas (Mathematical Knowledge)\n\n"
                        else:
                            initial_content = "# Schemas\n\n"
                        self.schemas_md_path.write_text(initial_content, encoding="utf-8")
                    
                    # Assign unique schema ID (no conflicts even with parallel processing)
                    # Normalize prefix to single letter (M, P, B, C, R)
                    normalized_prefix = normalize_prefix(c.prefix)
                    new_id = generate_unique_schema_id(normalized_prefix)
                    
                    # Clean ALL placeholders from the markdown
                    md = clean_schema_markdown(md, new_id, c.title)
                    
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
                        self.schemas_meta[new_id] = {
                            "edits_count": 0, 
                            "locked": False,
                            "evidence": [],
                            "unique_id": new_id,  # Store original unique ID
                            "created_at": now_iso()  # Timestamp for sorting during renumbering
                        }
                    # Track if schema has TMUA evidence
                    self.schemas_meta[new_id]["has_tmua_evidence"] = has_tmua_evidence(c)
                    save_schemas_meta(self.schemas_meta)

                    # Update coverage stats for this schema
                    update_schema_coverage(new_id, c, self.index)
                    
                    # Mark all questions in evidence as used (they're now in a schema)
                    for qid in c.evidence:
                        self.used_question_ids.add(qid)
                    self._save_used_questions()
                    
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

        # For TMUA: Route to correct schema file based on prefix (M = Paper 1, R = Paper 2)
        # Check prefix directly first, then fall back to evidence-based detection
        if MODE == "TMUA":
            # Normalize prefix to single letter
            normalized_prefix = normalize_prefix(c.prefix)
            
            # Route based on prefix: R = Paper 2, M (or anything else) = Paper 1
            if normalized_prefix == "R":
                self.schemas_md_path = TMUA_PAPER2_SCHEMAS_MD
            else:
                # M prefix or any other prefix defaults to Paper 1
                self.schemas_md_path = TMUA_PAPER1_SCHEMAS_MD
            
            # Ensure file exists
            if not self.schemas_md_path.exists():
                self.schemas_md_path.parent.mkdir(parents=True, exist_ok=True)
                if normalized_prefix == "R":
                    self.schemas_md_path.write_text("# TMUA Paper 2 Schemas (Mathematical Reasoning)\n\n", encoding="utf-8")
                else:
                    self.schemas_md_path.write_text("# TMUA Paper 1 Schemas (Mathematical Knowledge)\n\n", encoding="utf-8")

        # Assign unique schema ID (no conflicts even with parallel processing)
        # Normalize prefix to single letter (M, P, B, C, R)
        normalized_prefix = normalize_prefix(c.prefix)
        new_id = generate_unique_schema_id(normalized_prefix)

        # Clean ALL placeholders from the markdown
        preview = clean_schema_markdown(preview, new_id, c.title)

        # Atomic write
        temp_file = self.schemas_md_path.with_suffix('.tmp')
        try:
            current_content = safe_read_text(self.schemas_md_path)
            new_content = current_content + "\n" + preview + "\n"
            safe_write_text(temp_file, new_content)
            shutil.move(str(temp_file), str(self.schemas_md_path))
        except Exception as e:
            messagebox.showerror("Write failed", f"Failed to write {self.schemas_md_path.name}: {e}")
            if temp_file.exists():
                temp_file.unlink()
            return

        # Update meta
        if new_id not in self.schemas_meta:
            self.schemas_meta[new_id] = {
                "edits_count": 0, 
                "locked": False,
                "evidence": [],
                "unique_id": new_id,  # Store original unique ID
                "created_at": now_iso()  # Timestamp for sorting during renumbering
            }
        # Track if schema has TMUA evidence
        self.schemas_meta[new_id]["has_tmua_evidence"] = has_tmua_evidence(c)
        save_schemas_meta(self.schemas_meta)

        # Update coverage stats for this schema
        update_schema_coverage(new_id, c, self.index)
        
        # Mark all questions in evidence as used (they're now in a schema)
        for qid in c.evidence:
            self.used_question_ids.add(qid)
        self._save_used_questions()

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
        self._set_status(f"Appended NEW schema {new_id} to {self.schemas_md_path.name}")

        messagebox.showinfo("Appended", f"Appended {new_id} to {self.schemas_md_path.name}")

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
                            exemplar_justifications=obj.get("exemplar_justifications", {}),
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





