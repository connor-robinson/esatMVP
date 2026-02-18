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
import sys
import warnings

# Suppress Abseil warnings from Google Generative AI library
# This warning appears when the library initializes and is harmless
os.environ['ABSL_MIN_LOG_LEVEL'] = '2'  # Suppress INFO and WARNING logs
warnings.filterwarnings('ignore', category=UserWarning, module='absl')

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

# Import database module
import sys
_restructure_path = str(Path(__file__).parent / "restructure")
if _restructure_path not in sys.path:
    sys.path.insert(0, _restructure_path)
try:
    from db import NSAASchemaDB  # type: ignore
except ImportError:
    NSAASchemaDB = None  # type: ignore


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
    # NSAA/ESAT subject classification
    subject: Optional[str] = None  # Mathematics, Physics, Chemistry, Biology (for NSAA/ESAT)

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
class MicroSchema:
    """Micro-schema extracted from a single question (legacy format)."""
    qid: str
    question_item: QuestionItem
    core_move: str  # Single decisive step in imperative form
    secondary_moves: List[str]  # Optional secondary steps
    key_triggers: List[str]  # 2-5 concrete phrases that signal this move
    representation: str  # "algebraic|diagram|graph|probability|data_table|pure_text|other"
    difficulty: str  # "Easy|Medium|Hard"
    prerequisites: List[str]  # Required concepts
    wrong_paths: List[str]  # 2-3 common mistakes
    answer_form: str  # "integer|rational|algebraic|logic|multiple_choice_logic|proof|explanation|other"
    object_type: str  # "function|geometry|reaction|energy|probability_distribution|other"
    prefix_hint: str  # "M|P|B|C|R"
    embedding: Optional[List[float]] = None  # Embedding vector for clustering
    core_move_verb: Optional[str] = None  # Extracted verb from core_move (e.g., "apply", "set up", "differentiate")

@dataclass
class MicroSchemaNew:
    """Micro-schema for new pipeline (matches database structure)."""
    question_id: str
    subject_assigned: str
    subject_final: str
    subject_confidence: str  # "high|medium|low"
    discard: bool
    discard_reason: Optional[str]
    core_move: Optional[str]
    trigger_signals: List[str]
    type_bucket: Optional[str]  # reasoning_type/manipulation_type/representation_type
    common_wrong_path: Optional[str]
    minimal_prerequisite: Optional[str]
    difficulty_estimate: Optional[str]  # "low|medium|high"
    quality_score: float
    embedding: Optional[List[float]]

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

    # year - support 2010-2029 (2010-2019 and 2020-2029)
    m = re.search(r"(20[12]\d)", str(pdf_path))
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
    
    # Check if this is an ESAT/NSAA paper
    is_esat = any(item.exam and item.exam in ["NSAA", "ENGAA"] for item in items) or any(exam in str(pdf_path).upper() for exam in ["NSAA", "ENGAA"])
    is_section2 = any(item.section and "Section 2" in item.section for item in items) or "Section 2" in str(pdf_path)
    
    # For ESAT/NSAA: Check for appropriate option letters
    all_text = " ".join(q.text for q in items)
    
    if is_esat:
        if is_section2:
            # Section 2 uses A-H options
            has_options = bool(re.search(r'[A-H]\)|[A-H]\.|\([A-H]\)|[A-H]:', all_text, re.IGNORECASE))
            if not has_options:
                # For Section 2, be lenient - options might be on separate pages or not extracted yet
                # Just check we have reasonable content
                if len(items) < 5:
                    return False, f"Too few questions extracted ({len(items)} < 5) - likely extraction issue"
                # Allow through even without options for Section 2
                return True, ""
        else:
            # Section 1 uses A-D options, but be lenient
            has_options = bool(re.search(r'[A-D]\)|[A-D]\.|\([A-D]\)|[A-D]:', all_text, re.IGNORECASE))
            if not has_options:
                # For ESAT/NSAA, be lenient - options might be on separate pages
                if len(items) < 5:
                    return False, f"Too few questions extracted ({len(items)} < 5) - likely extraction issue"
                # Allow through even without options
                return True, ""
        return True, ""
    
    # For other non-TMUA papers: Check for option letters (A-D)
    has_options = bool(re.search(r'[A-D]\)|[A-D]\.|\([A-D]\)|[A-D]:', all_text))
    
    if not has_options:
        return False, "No option letters (A-D) found - likely not a question paper"
    
    return True, ""


def classify_nsaa_question_by_part_header(page_text: str, section: Optional[str]) -> Optional[str]:
    """
    Classify NSAA question by PART header in page text.
    PART headers appear on every page in that section (e.g., "PART X PHYSICS" on all Physics pages).
    Returns: 'Mathematics', 'Physics', 'Chemistry', or 'Biology', or None if not found.
    """
    if not section:
        return None
    
    lines = page_text.splitlines()[:15]  # Check first 15 lines for PART header
    
    if "Section 1" in section:
        # Section 1: PART A = Mathematics, PART B = Physics, PART C = Chemistry
        for line in lines:
            # Match "PART A Mathematics" or "PART A" followed by Mathematics
            if re.search(r'PART\s+A\s+Mathematics', line, re.IGNORECASE):
                return 'Mathematics'
            elif re.search(r'PART\s+B\s+Physics', line, re.IGNORECASE):
                return 'Physics'
            elif re.search(r'PART\s+C\s+Chemistry', line, re.IGNORECASE):
                return 'Chemistry'
            # Also check for just "PART A" / "PART B" / "PART C" if subject is clear from context
            elif re.search(r'PART\s+A\b', line, re.IGNORECASE) and 'mathematics' in line.lower():
                return 'Mathematics'
            elif re.search(r'PART\s+B\b', line, re.IGNORECASE) and 'physics' in line.lower():
                return 'Physics'
            elif re.search(r'PART\s+C\b', line, re.IGNORECASE) and 'chemistry' in line.lower():
                return 'Chemistry'
    
    elif "Section 2" in section:
        # Section 2: PART X = Physics, PART Y = Chemistry, PART Z = Biology
        # "PART X PHYSICS" appears on every Physics page
        for line in lines:
            # Match "PART X PHYSICS" or "PART X" with Physics
            if re.search(r'PART\s+X\s+PHYSICS', line, re.IGNORECASE) or (re.search(r'PART\s+X\b', line, re.IGNORECASE) and 'physics' in line.lower()):
                return 'Physics'
            elif re.search(r'PART\s+Y\s+CHEMISTRY', line, re.IGNORECASE) or (re.search(r'PART\s+Y\b', line, re.IGNORECASE) and 'chemistry' in line.lower()):
                return 'Chemistry'
            elif re.search(r'PART\s+Z\s+BIOLOGY', line, re.IGNORECASE) or (re.search(r'PART\s+Z\b', line, re.IGNORECASE) and 'biology' in line.lower()):
                return 'Biology'
    
    return None


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
    
    # For ESAT/NSAA Section 2 papers before and including 2018, skip them
    if not is_tmua and section and "Section 2" in section and year:
        try:
            year_int = int(year)
            if year_int <= 2018:
                print(f"[SKIP] Skipping {pdf_path.name}: Section 2 papers before/including 2018 are not supported")
                doc.close()
                return [], PDFExtractionStats(
                    pdf_path=str(pdf_path),
                    status="SUCCESS",
                    total_chars=0,
                    question_count=0,
                    median_question_length=0,
                    failure_reason=None,
                    extracted_at=now_iso()
                )
        except (ValueError, TypeError):
            pass  # If year parsing fails, continue
    
    # Determine extraction strategy
    is_section1 = not is_tmua and section and "Section 1" in section
    is_section2 = not is_tmua and section and "Section 2" in section
    
    # Debug output
    if is_section2:
        print(f"[DEBUG] Section 2 detected: exam={exam}, section={section}, year={year}, path={pdf_path.name}")
    
    # For TMUA, skip first page (cover/instructions), then use one question per page
    # For Section 1, also use per-page extraction (1-2 questions per page)
    start_page = 1 if (is_tmua or is_section1) else 0

    # ----------------------------
    # ENGAA Section 1 Part B handling
    # ----------------------------
    # ENGAA Section 1 PDFs in the "Part B" folders contain BOTH Part A and Part B.
    # We only want to keep Part B questions (Advanced Mathematics and Advanced Physics).
    # Heuristic:
    # - Find the first page that contains a "PART B" heading.
    # - Skip all pages before that when extracting Section 1 questions.
    part_b_start_page: Optional[int] = None
    if exam == "ENGAA" and is_section1:
        for pi_scan in range(start_page, doc.page_count):
            page_scan = doc.load_page(pi_scan)
            raw_scan = page_scan.get_text("text") or ""
            text_scan = normalize_spaces(raw_scan).upper()
            # Look for a reasonably specific Part B marker to avoid false positives
            if "PART B" in text_scan and "ADVANCED" in text_scan:
                part_b_start_page = pi_scan
                break
        # If we didn't find an explicit PART B marker, fall back to processing everything
        # (this keeps behaviour unchanged for legacy/odd PDFs).
    
    for pi in range(start_page, doc.page_count):
        page = doc.load_page(pi)
        raw = page.get_text("text") or ""
        text = normalize_spaces(raw)
        if not text or len(text.strip()) < 50:  # Skip blank pages
            continue

        page_has_diagram = detect_page_has_diagram(page)

        # For ENGAA Section 1, drop all pages that belong to Part A.
        # If we detected a PART B start page, only keep pages at/after that.
        if exam == "ENGAA" and is_section1 and part_b_start_page is not None:
            if pi < part_b_start_page:
                # This is Part A content – skip entirely.
                continue

        if is_section1:
            # Section 1: Usually 1-2 questions per page, per-page extraction
            lines = text.splitlines()
            qnum = None
            
            # Try to find question number in first few lines
            for line_idx, line in enumerate(lines[:10]):
                line_stripped = line.strip()
                if not line_stripped:
                    continue
                
                # Pattern: Number at start of line: "1 ", "2 ", etc.
                m = re.match(r"^(\d{1,2})\s+", line_stripped)
                if m:
                    candidate = int(m.group(1))
                    if 1 <= candidate <= 80:  # Section 1 can have up to 80 questions
                        qnum = candidate
                        break
                
                # Pattern: "Question N" or "Q N"
                m = re.match(r"^Question\s+(\d{1,2})[:\.]?\s*", line_stripped, re.IGNORECASE)
                if m:
                    candidate = int(m.group(1))
                    if 1 <= candidate <= 80:
                        qnum = candidate
                        break
                m = re.match(r"^Q\.?\s*(\d{1,2})[:\.]?\s*", line_stripped, re.IGNORECASE)
                if m:
                    candidate = int(m.group(1))
                    if 1 <= candidate <= 80:
                        qnum = candidate
                        break
            
            if qnum is None:
                # Try to infer from page number (less reliable)
                inferred_qnum = (pi - start_page) + 1
                if 1 <= inferred_qnum <= 80:
                    qnum = inferred_qnum
                else:
                    continue
            
            # Use entire page text as question text (Section 1 typically has 1-2 questions per page)
            qtext = text.strip()
            
            # Skip if too short
            if len(qtext) < 50:
                continue
            
            # Classify subject for NSAA/ESAT questions (before cleaning)
            subject = None
            if exam and exam in ["NSAA", "ENGAA"]:
                subject = classify_nsaa_question_by_part_header(text, section)
            
            # Diagram detection: Always False for now
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
                subject=subject,
            )
            items.append(item)
            
        elif is_tmua:
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

            # Classify subject for NSAA/ESAT questions
            subject = None
            if exam and exam in ["NSAA", "ENGAA"]:
                subject = classify_nsaa_question_by_part_header(text, section)

            item = QuestionItem(
                paper_id=paper_id,
                pdf_path=str(pdf_path),
                year=year,
                exam=exam,
                section=section,
                qnum=qnum,
                text=qtext,
                skipped_diagram=skipped,  # Always False now
                subject=subject,
            )
            items.append(item)
                
        elif is_section2:
            # Section 2 (2019+): Clean extraction approach
            # 1. Remove headers/footers
            # 2. Identify PART pages (X, Y, Z)
            # 3. Extract one question per page after PART header
            # 4. Validate
            
            # Debug: Track extraction for this PDF
            if not hasattr(extract_questions_from_pdf, '_debug_section2'):
                extract_questions_from_pdf._debug_section2 = {}
            if str(pdf_path) not in extract_questions_from_pdf._debug_section2:
                extract_questions_from_pdf._debug_section2[str(pdf_path)] = {
                    'total_pages': doc.page_count,
                    'processed': 0,
                    'skipped_early_pages': 0,
                    'skipped_not_question': 0,
                    'skipped_no_qnum': 0,
                    'skipped_too_short': 0,
                    'skipped_false_positive': 0,
                    'skipped_no_content': 0,
                    'extracted': 0,
                    'page_details': []
                }
            debug_info = extract_questions_from_pdf._debug_section2[str(pdf_path)]
            
            # Skip first ~7 pages (cover, instructions, TOC, periodic table, blank pages)
            if pi < start_page + 7:
                debug_info['skipped_early_pages'] = debug_info.get('skipped_early_pages', 0) + 1
                continue
            
            # Helper function to remove headers/footers from text
            def remove_headers_footers(text_lines: List[str]) -> List[str]:
                """Remove common headers and footers from page text."""
                if not text_lines:
                    return []
                
                cleaned = []
                header_patterns = [
                    r'^PART\s+[XYZ]\s*$',  # PART X, PART Y, PART Z (standalone)
                    r'^PART\s+[XYZ]\s+[A-Z]+',  # PART X PHYSICS, etc.
                    r'^SECTION\s+2',
                    r'^NSAA\s+SECTION\s+2',
                    r'^\d+\s*$',  # Just page numbers
                ]
                footer_patterns = [
                    r'^BLANK\s+PAGE',
                    r'^Cambridge',
                    r'^©\s+Cambridge',
                    r'^\d+\s*$',  # Page numbers at bottom
                ]
                
                # Remove headers from top (first few lines)
                start_idx = 0
                for i, line in enumerate(text_lines[:5]):
                    line_stripped = line.strip()
                    if any(re.match(pattern, line_stripped, re.IGNORECASE) for pattern in header_patterns):
                        start_idx = i + 1
                    else:
                        break
                
                # Remove footers from bottom (last few lines)
                end_idx = len(text_lines)
                for i in range(len(text_lines) - 1, max(len(text_lines) - 5, start_idx), -1):
                    line_stripped = text_lines[i].strip()
                    if any(re.match(pattern, line_stripped, re.IGNORECASE) for pattern in footer_patterns):
                        end_idx = i
                    else:
                        break
                
                # Extract cleaned lines
                for line in text_lines[start_idx:end_idx]:
                    line_stripped = line.strip()
                    # Skip empty lines
                    if not line_stripped:
                        continue
                    # Skip any remaining header/footer patterns
                    is_header = any(re.match(pattern, line_stripped, re.IGNORECASE) for pattern in header_patterns)
                    is_footer = any(re.match(pattern, line_stripped, re.IGNORECASE) for pattern in footer_patterns)
                    if not is_header and not is_footer:
                        cleaned.append(line)
                
                return cleaned
            
            lines = text.splitlines()
            debug_info['processed'] += 1
            page_debug = {
                'page_num': pi,
                'total_lines': len(lines),
                'skipped_reason': None,
                'qnum_found': None,
                'qnum_source': None,
                'text_length': 0,
                'has_question_content': False
            }
            
            # Check if this is a standalone PART header page (not just a header on a question page)
            # PART header pages typically have ONLY "PART X" or "PART X Physics" with little other content
            is_standalone_part_header = False
            part_letter = None
            non_empty_lines = [l.strip() for l in lines if l.strip()]
            if len(non_empty_lines) <= 5:  # Very few lines = likely standalone header page
                for line in non_empty_lines[:5]:
                    m = re.match(r'^\s*PART\s+([XYZ])\s*$', line, re.IGNORECASE)  # Standalone PART X/Y/Z (no subject)
                    if m:
                        is_standalone_part_header = True
                        part_letter = m.group(1).upper()
                        break
            
            # Skip standalone PART header pages (questions start on next page)
            if is_standalone_part_header:
                debug_info['skipped_not_question'] = debug_info.get('skipped_not_question', 0) + 1
                page_debug['skipped_reason'] = f'Standalone PART header page ({part_letter})'
                debug_info['page_details'].append(page_debug)
                continue
            
            # Clean headers/footers (removes "PART X PHYSICS" headers that appear on every page)
            cleaned_lines = remove_headers_footers(lines)
            page_debug['cleaned_lines'] = len(cleaned_lines)
            
            # Skip if page is too short after cleaning (likely blank or minimal content)
            if len(cleaned_lines) < 5:  # Need at least 5 lines for a question
                debug_info['skipped_too_short'] += 1
                page_debug['skipped_reason'] = f'Too few lines after cleaning ({len(cleaned_lines)} < 5)'
                debug_info['page_details'].append(page_debug)
                continue
            
            # Extract question number from page (one question per page for Section 2)
            # Try original lines first (before cleaning), then cleaned lines
            qnum = None
            qnum_source = None
            search_lines = lines[:20] + cleaned_lines[:20]  # Check both original and cleaned
            
            for line in search_lines:
                # Pattern: Question number at start: "1 ", "2 ", etc.
                m = re.match(r'^\s*(\d{1,2})\s+(.+)$', line)
                if m:
                    candidate = int(m.group(1))
                    rest = m.group(2).strip()
                    # Validate it's a real question (has content after number)
                    if len(rest) >= 3 and 1 <= candidate <= 80:  # More lenient: 3 chars instead of 5
                        qnum = candidate
                        qnum_source = f'Pattern match: "{line[:50]}"'
                        break
                
                # Pattern: "Question N" or "Q N"
                m = re.match(r'^Question\s+(\d{1,2})[:\.]?\s*', line, re.IGNORECASE)
                if m:
                    candidate = int(m.group(1))
                    if 1 <= candidate <= 80:
                        qnum = candidate
                        qnum_source = f'Question pattern: "{line[:50]}"'
                        break
                m = re.match(r'^Q\.?\s*(\d{1,2})[:\.]?\s*', line, re.IGNORECASE)
                if m:
                    candidate = int(m.group(1))
                    if 1 <= candidate <= 80:
                        qnum = candidate
                        qnum_source = f'Q pattern: "{line[:50]}"'
                        break
            
            if qnum is None:
                # Try to infer from page number - be more aggressive
                # For Section 2, questions typically start after cover/instructions (first ~5-7 pages)
                # Then each PART has ~20 questions, so we need to track which PART we're in
                # For now, use a simpler approach: assume questions start around page 7-8
                # Be very lenient - if we're past the first few pages, assume it's a question
                if pi >= start_page + 3:  # Very lenient: start from page 3 (after cover/instructions)
                    # Try to infer question number from page position
                    # This is rough but better than skipping
                    inferred_qnum = (pi - start_page - 3) + 1
                    if 1 <= inferred_qnum <= 80:
                        qnum = inferred_qnum
                        qnum_source = f'Inferred from page number (pi={pi}, start_page={start_page})'
                    else:
                        debug_info['skipped_no_qnum'] += 1
                        page_debug['skipped_reason'] = f'Inferred qnum out of range: {inferred_qnum}'
                        debug_info['page_details'].append(page_debug)
                        continue
                else:
                    debug_info['skipped_no_qnum'] += 1
                    page_debug['skipped_reason'] = f'Page too early (pi={pi} < start_page+3={start_page+3})'
                    debug_info['page_details'].append(page_debug)
                    continue
            
            page_debug['qnum_found'] = qnum
            page_debug['qnum_source'] = qnum_source
            
            # Use cleaned page text as question text (one question per page)
            qtext = normalize_spaces("\n".join(cleaned_lines))
            page_debug['text_length'] = len(qtext.strip())
            
            # Skip if too short (more lenient for Section 2)
            if len(qtext.strip()) < 30:  # Reduced from 50 to 30
                debug_info['skipped_too_short'] += 1
                page_debug['skipped_reason'] = f'Text too short ({len(qtext.strip())} < 30)'
                debug_info['page_details'].append(page_debug)
                continue
            
            # Filter out obvious false positives
            qtext_lower = qtext.lower()
            false_positive_indicators = [
                "blank page", "instructions", "answer sheet", "total marks",
                "periodic table", "dictionary", "calculator"
            ]
            if any(indicator in qtext_lower[:100] for indicator in false_positive_indicators):
                if len(qtext.strip()) < 150:
                    debug_info['skipped_false_positive'] += 1
                    page_debug['skipped_reason'] = f'False positive indicator found: {[ind for ind in false_positive_indicators if ind in qtext_lower[:100]]}'
                    debug_info['page_details'].append(page_debug)
                    continue
            
            # Check for question-like content
            question_indicators = [
                r'\?',  # Question mark
                r'what|which|where|when|why|how|who',  # Question words
                r'calculate|find|determine|show|prove|state|explain|describe|identify',  # Question verbs
                r'[A-H]\)',  # Multiple choice options (A-H for Section 2)
                r'[A-H]\.',  # Multiple choice options with period
            ]
            has_question_content = any(re.search(pattern, qtext, re.IGNORECASE) for pattern in question_indicators)
            page_debug['has_question_content'] = has_question_content
            
            # For ESAT Section 2, be very lenient - just need reasonable length or question content
            # Don't require question content if text is substantial
            if not has_question_content and len(qtext.strip()) < 50:  # Reduced from 100 to 50
                debug_info['skipped_no_content'] += 1
                page_debug['skipped_reason'] = f'No question content and text too short ({len(qtext.strip())} < 50)'
                debug_info['page_details'].append(page_debug)
                continue
            
            # Classify subject for NSAA/ESAT questions (use original text before cleaning)
            subject = None
            if exam and exam in ["NSAA", "ENGAA"]:
                subject = classify_nsaa_question_by_part_header(text, section)
            
            # Diagram detection: Always False for now
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
                subject=subject,
            )
            items.append(item)
            if is_section2 and str(pdf_path) in extract_questions_from_pdf._debug_section2:
                debug_info['extracted'] += 1
                page_debug['extracted'] = True
                debug_info['page_details'].append(page_debug)
                
        else:
            # Non-TMUA, non-Section 1/2: Improved multi-question-per-page logic with better boundary detection
            lines = text.splitlines()
            starts: List[Tuple[int, int, str]] = []
            
            # Helper function to validate if a line looks like a real question start
            def is_valid_question_start(line: str, qnum: int) -> bool:
                """Check if this line is likely a real question start, not a false positive."""
                line_lower = line.lower().strip()
                
                # Reject if it's just a number with no content
                if len(line.strip()) < 5:
                    return False
                
                # Reject common false positives
                false_positive_patterns = [
                    r'^\d+\s*$',  # Just a number alone
                    r'page\s+\d+',  # Page numbers
                    r'section\s+\d+',  # Section numbers
                    r'part\s+\d+',  # Part numbers
                    r'^\d+\s*[\.\)]\s*$',  # Just "1." or "1)" with nothing after
                ]
                for pattern in false_positive_patterns:
                    if re.match(pattern, line_lower):
                        return False
                
                # Must have some actual text content after the number
                # Extract the part after the question number
                match = re.match(r'^\s*\d+\s+(.+)$', line)
                if match:
                    rest = match.group(1).strip()
                    if len(rest) < 10:  # Need at least 10 chars of actual content
                        return False
                else:
                    return False
                
                return True
            
            # Find question starts with validation
            for idx, line in enumerate(lines):
                m = QSTART_RE.match(line)
                if m:
                    qnum = int(m.group(1))
                    # Validate it's a real question start
                    if is_valid_question_start(line, qnum):
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
                            # Validate it's a real question start
                            if is_valid_question_start(line, qnum):
                                rest = m.group(2) if pattern_re.groups >= 2 else ""
                                starts.append((idx, qnum, rest))
                            break
                    if starts:
                        break

            if not starts:
                continue
            
            # Helper function to find better question end boundary
            def find_question_end(start_idx: int, qnum: int, lines: List[str], next_start_idx: int = None) -> int:
                """Find where this question actually ends, ensuring we capture all options."""
                # Start from question start
                search_start = start_idx
                search_end = next_start_idx if next_start_idx is not None else len(lines)
                
                # Look for multiple choice option patterns to ensure we capture all options
                # Support A-D for most exams, but also A-H for Section 2
                option_patterns = [
                    r'^[A-H]\)',  # A), B), C), D), E), F), G), H)
                    r'^[A-H]\.',  # A. B. C. D. E. F. G. H.
                    r'^\([A-H]\)',  # (A), (B), (C), (D), (E), (F), (G), (H)
                    r'^[A-H]\s+',  # A  B  C  D  E  F  G  H (with spaces)
                ]
                
                # Find the last option in this question block
                last_option_idx = search_start
                for i in range(search_start, search_end):
                    line = lines[i].strip()
                    for pattern in option_patterns:
                        if re.match(pattern, line, re.IGNORECASE):
                            last_option_idx = i
                            break
                
                # If we found options, extend to capture a few lines after the last option
                # (in case there's additional text or the question continues)
                if last_option_idx > search_start:
                    # Look for the end of the last option (empty line or next question)
                    for i in range(last_option_idx + 1, min(last_option_idx + 5, search_end)):
                        if i < len(lines):
                            line = lines[i].strip()
                            # Stop if we hit another question number or clear section break
                            if re.match(r'^\d+\s+', line) and i != search_start:
                                return i
                            # Stop if we hit multiple empty lines
                            if not line and i > last_option_idx + 2:
                                return i
                    return min(last_option_idx + 3, search_end)
                
                # No options found, use next question start or end of page
                return search_end
            
            # Process all questions found on this page
            for si, (start_idx, qnum, first_line_rest) in enumerate(starts):
                next_start_idx = starts[si + 1][0] if si + 1 < len(starts) else len(lines)
                
                # Find better end boundary
                end_idx = find_question_end(start_idx, qnum, lines, next_start_idx)
                
                # Extract question text
                block_lines = [f"{qnum} {first_line_rest}"] + lines[start_idx + 1:end_idx]
                qtext = normalize_spaces("\n".join(block_lines))
                
                # Enhanced validation: skip questions that are too short or malformed
                if len(qtext.strip()) < 50:  # Increased minimum length
                    continue
                
                # Filter out obvious false positives
                qtext_lower = qtext.lower()
                false_positive_indicators = [
                    "page", "section", "part", "turn over", "blank page",
                    "instructions", "answer sheet", "total marks"
                ]
                # Check if text is mostly false positive indicators
                if any(indicator in qtext_lower[:100] for indicator in false_positive_indicators):
                    # Only skip if it's a very short match (likely false positive)
                    if len(qtext.strip()) < 150:
                        continue
                
                # NO option letter filtering for ESAT/NSAA - options may be on separate pages
                # Check for question-like content (must have some question words or structure)
                question_indicators = [
                    r'\?',  # Question mark
                    r'what|which|where|when|why|how|who',  # Question words
                    r'calculate|find|determine|show|prove|state|explain',  # Question verbs
                    r'[A-H]\)',  # Multiple choice options (A-H for Section 2, A-D for others)
                ]
                has_question_content = any(re.search(pattern, qtext, re.IGNORECASE) for pattern in question_indicators)
                
                # For ESAT, be lenient - don't require options or strict question structure
                if MODE == "ESAT":
                    # Must have at least some question-like content or be reasonably long
                    if not has_question_content and len(qtext.strip()) < 100:
                        continue
                else:
                    # For other modes, require question content
                    if not has_question_content:
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
    
    # Print debug info for Section 2 papers
    if is_section2 and hasattr(extract_questions_from_pdf, '_debug_section2') and str(pdf_path) in extract_questions_from_pdf._debug_section2:
        debug_info = extract_questions_from_pdf._debug_section2[str(pdf_path)]
        print(f"\n[DEBUG] Section 2 Extraction Summary for {pdf_path.name}:")
        print(f"  Total pages: {debug_info['total_pages']}")
        print(f"  Pages processed: {debug_info['processed']}")
        print(f"  Questions extracted: {debug_info['extracted']}")
        print(f"  Skipped - Early pages (first 7): {debug_info.get('skipped_early_pages', 0)}")
        print(f"  Skipped - Not a question page: {debug_info.get('skipped_not_question', 0)}")
        print(f"  Skipped - No question number: {debug_info['skipped_no_qnum']}")
        print(f"  Skipped - Too short: {debug_info['skipped_too_short']}")
        print(f"  Skipped - False positive: {debug_info['skipped_false_positive']}")
        print(f"  Skipped - No question content: {debug_info['skipped_no_content']}")
        
        # Show subject classification stats
        subject_counts = {}
        for item in items:
            if item.subject:
                subject_counts[item.subject] = subject_counts.get(item.subject, 0) + 1
        if subject_counts:
            print(f"\n  Subject Classification:")
            for subject, count in sorted(subject_counts.items()):
                print(f"    {subject}: {count} questions")
        else:
            print(f"\n  Subject Classification: None (classification may have failed)")
        
        # Show details for first 10 pages and all extracted pages
        print(f"\n[DEBUG] Page-by-page details (first 10 + extracted):")
        shown = 0
        for page_detail in debug_info['page_details']:
            if shown < 10 or page_detail.get('extracted', False):
                status = "✓ EXTRACTED" if page_detail.get('extracted', False) else f"✗ {page_detail.get('skipped_reason', 'Unknown')}"
                print(f"  Page {page_detail['page_num']}: {status}")
                if page_detail.get('qnum_found'):
                    print(f"    Qnum: {page_detail['qnum_found']} ({page_detail.get('qnum_source', 'unknown')})")
                if page_detail.get('text_length'):
                    print(f"    Text length: {page_detail['text_length']} chars")
                if page_detail.get('has_question_content') is not None:
                    print(f"    Has question content: {page_detail['has_question_content']}")
                if page_detail.get('cleaned_lines'):
                    print(f"    Cleaned lines: {page_detail['cleaned_lines']}")
                shown += 1
                if shown >= 20:  # Limit output
                    break
        print()
    
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
                    # Accept reasonable question numbers (1-50 for ESAT/TMUA - ESAT can have more questions)
                    if 1 <= qnum <= 50:
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

    # Track valid paper pairs for both ESAT and TMUA modes (will be used in extraction loop)
    valid_paper_pairs: List[Tuple[Path, Path]] = []
    discarded_count = 0
    solutions_map: Dict[Path, Path] = {}  # Lookup: past_paper_path -> solutions_path
    
    # Filter PDFs based on mode - both ESAT and TMUA can have solution PDFs
    if MODE == "TMUA":
        # Step 1: Separate Past Papers from Official Solutions
        past_papers = [p for p in pdfs if "past paper" in p.name.lower()]
        official_solutions = [p for p in pdfs if "official solutions" in p.name.lower()]
        
        print(f"[INDEX] TMUA mode: Found {len(past_papers)} Past Papers and {len(official_solutions)} Official Solutions PDFs")
        
        # Step 2: Match Past Papers with Official Solutions and discard unmatched
        for pp in past_papers:
            matching_solution = find_matching_solutions_pdf(pp, official_solutions)
            if matching_solution:
                valid_paper_pairs.append((pp, matching_solution))
                solutions_map[pp] = matching_solution
            else:
                paper_id = get_paper_identifier_from_path(pp)
                print(f"[SKIP] No Official Solutions found for {pp.name} (ID: {paper_id}) - discarding paper")
                discarded_count += 1
        
        print(f"[INDEX] TMUA mode: Matched {len(valid_paper_pairs)} paper pairs, discarded {discarded_count} papers without solutions")
        
        # Step 3: Only process Past Papers that have solutions (solutions will be processed with their pairs)
        pdfs = [pp for pp, _ in valid_paper_pairs]
        
        if len(pdfs) == 0:
            print(f"[WARN] No valid TMUA paper pairs found! Need both Past Papers and matching Official Solutions.")
    
    elif not include_non_papers:
        # ESAT mode: Process ONLY past papers (no solutions needed, no matching)
        # ENGAA papers often do NOT include "Past Paper" in the filename, but live under
        # .../ENGAA/<year>/Section 1/Part B/ and contain Section 1 Part A+B.
        # When we're indexing under an ENGAA subtree, treat all Section 1 PDFs as "past papers".
        if "engaa" in str(papers_dir).lower():
            # Keep only Section 1 PDFs; we'll trim to Part B inside extract_questions_from_pdf.
            past_papers = [p for p in pdfs if "section 1" in str(p).lower()]
        else:
            past_papers = [p for p in pdfs if "past paper" in p.name.lower()]
        
        # Skip "explain answer" files
        before_explain_filter = len(past_papers)
        past_papers = [p for p in past_papers if "explain answer" not in p.name.lower()]
        if before_explain_filter > len(past_papers):
            print(f"[INDEX] ESAT mode: Skipped {before_explain_filter - len(past_papers)} 'explain answer' files")
        
        # Exclude solution/answer files - we don't need them
        exclude_keywords = [
            "official solutions", "solutions", "answer key", "answers", 
            "mark scheme", "explain answer", "worked", "worked solutions",
            "conversion table", "data sheet", "specimen", "formula sheet", "reference"
        ]
        before_count = len(past_papers)
        past_papers = [p for p in past_papers if not any(k in p.name.lower() for k in exclude_keywords)]
        if before_count > len(past_papers):
            print(f"[INDEX] ESAT mode: Excluded {before_count - len(past_papers)} solution/non-paper files")
        
        # Process ONLY past papers (no solution matching needed)
        pdfs = past_papers.copy()
        
        print(f"[INDEX] ESAT mode: Processing {len(pdfs)} past_papers (questions only, no solutions needed)")
    
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
                
                # For TMUA mode: Extract solutions and match to questions (if solution PDF available)
                # ESAT mode: Skip solution matching completely - we only need questions
                if MODE == "TMUA" and stats.status == "SUCCESS" and pdf in solutions_map:
                    matching_solutions_path = solutions_map[pdf]
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
                # Note: If no solution PDF is available, questions will be processed without solutions (still valid)
                
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
    
    # Save extraction report with solution coverage stats (for both ESAT and TMUA if solutions were found)
    save_extraction_report(extraction_stats, total_pdfs, solution_coverage_stats if solution_coverage_stats["questions_with_solutions"] > 0 else None, discarded_count)
    
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
        if discarded_count > 0:
            print(f"[INDEX] Discarded {discarded_count} papers without Official Solutions")
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
        if discarded_count > 0:
            mode_label = "TMUA" if MODE == "TMUA" else "ESAT"
            print(f"[INDEX] {mode_label}: Discarded {discarded_count} papers without Official Solutions")
        if solution_coverage_stats["total_questions"] > 0:
            coverage_pct = (solution_coverage_stats["questions_with_solutions"] / solution_coverage_stats["total_questions"]) * 100
            mode_label = "TMUA" if MODE == "TMUA" else "ESAT"
            print(f"[INDEX] {mode_label}: Solution coverage: {solution_coverage_stats['questions_with_solutions']}/{solution_coverage_stats['total_questions']} questions ({coverage_pct:.1f}%)")
    
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

    # Explicitly drop all ENGAA Section 2 questions – we only want ENGAA Section 1.
    before_engaa_filter = len(all_items)
    all_items = [
        q for q in all_items
        if not (q.exam == "ENGAA" and q.section and "Section 2" in q.section)
    ]
    if before_engaa_filter > len(all_items):
        print(f"[INDEX] Removed {before_engaa_filter - len(all_items)} ENGAA Section 2 questions")
    
    return all_items


# ----------------------------
# Gemini client
# ----------------------------

class Gemini:
    def __init__(self, api_key: str, model: str = None):
        genai.configure(api_key=api_key)
        # Default to gemini-2.5-flash (or from env var), fallback chain: 2.5-flash -> 1.5-flash -> pro
        if model is None:
            model = os.getenv("SCHEMA_GENERATOR_MODEL", "gemini-2.5-flash")
        self._requested_model = model
        # Try to create the model, fallback chain
        try:
            self.model = genai.GenerativeModel(model)
            self._actual_model = model
            print(f"[INFO] Using model: {model}")
        except Exception as e:
            print(f"[WARN] Model {model} not available, trying gemini-2.5-flash: {e}")
            try:
                self.model = genai.GenerativeModel("gemini-2.5-flash")
                self._actual_model = "gemini-2.5-flash"
                print(f"[INFO] Using fallback model: gemini-2.5-flash")
            except Exception as e2:
                print(f"[WARN] gemini-2.5-flash not available, trying gemini-1.5-flash: {e2}")
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
        # Make min_delay configurable via environment variable, default to 2.0s to avoid rate limits
        self._min_delay = float(os.getenv("SCHEMA_GENERATOR_MIN_DELAY", "2.0"))
        print(f"[INFO] Rate limiting: {self._min_delay}s minimum delay between requests")
    
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

    def _retry_with_backoff(self, func, max_retries: int = 3, initial_delay: float = None):
        """Retry function with exponential backoff for rate limit errors."""
        if initial_delay is None:
            # Use longer initial delay for rate limits - configurable via env var
            initial_delay = float(os.getenv("SCHEMA_GENERATOR_RATE_LIMIT_DELAY", "5.0"))
        delay = initial_delay
        for attempt in range(max_retries):
            try:
                return func()
            except Exception as e:
                error_str = str(e)
                # Check if it's a rate limit error (more comprehensive detection)
                is_rate_limit = (
                    "429" in error_str or 
                    "ResourceExhausted" in error_str or 
                    "Resource exhausted" in error_str or
                    "rate limit" in error_str.lower() or
                    "quota" in error_str.lower() or
                    "too many requests" in error_str.lower()
                )
                if is_rate_limit:
                    if attempt < max_retries - 1:
                        wait_time = delay * (2 ** attempt)  # Exponential backoff: 5s, 10s, 20s
                        print(f"[WARN] Rate limit hit, waiting {wait_time:.1f}s before retry {attempt + 1}/{max_retries}")
                        print(f"[WARN] Error details: {error_str[:200]}")
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
MICRO_SCHEMA_EXTRACTION_PROMPT_PATH = PROMPT_DIR / "Micro_Schema_Extraction_Prompt.md"

# New pipeline prompts
MICRO_SCHEMA_MATH_PROMPT = PROMPT_DIR / "new" / "microschemas" / "math prompt.md"
MICRO_SCHEMA_PHYSICS_PROMPT = PROMPT_DIR / "new" / "microschemas" / "physics prompt.md"
MICRO_SCHEMA_CHEMISTRY_PROMPT = PROMPT_DIR / "new" / "microschemas" / "chemistry prompt.md"
MICRO_SCHEMA_BIOLOGY_PROMPT = PROMPT_DIR / "new" / "microschemas" / "biology prompt.md"
GROUPING_PROMPT_PATH = PROMPT_DIR / "new" / "grouping_prompt.md"
WRITING_PROMPT_PATH = PROMPT_DIR / "new" / "writing_prompt.md"

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

    # Evidence corpus: short question IDs + text (with solution if available for ESAT/TMUA)
    corpus_lines = []
    for q in questions:
        qid = f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "")
        if q.solution_text:
            # Include solution text for ESAT/TMUA questions (helps identify reasoning patterns)
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


# ----------------------------
# New Micro-Schema Pipeline Functions
# ----------------------------

def extract_core_move_verb(core_move: str) -> str:
    """Extract the main verb from core_move for clustering."""
    # Common patterns: "Apply X", "Set up X", "Differentiate X", "Use X", etc.
    verbs = ["apply", "use", "set up", "differentiate", "integrate", "solve", "find", 
             "compute", "calculate", "exploit", "exploit", "invoke", "invoke", "invoke"]
    core_lower = core_move.lower()
    for verb in verbs:
        if core_lower.startswith(verb):
            return verb
    # Fallback: first word
    words = core_move.split()
    return words[0].lower() if words else "unknown"


def extract_micro_schema(question: QuestionItem, gemini_client) -> Optional[MicroSchema]:
    """
    Extract micro-schema from a single question.
    Returns None on failure.
    """
    try:
        # Load prompt template
        template = load_prompt_template(MICRO_SCHEMA_EXTRACTION_PROMPT_PATH)
        
        # Build question ID
        qid = f"{question.exam}_{question.section}_{question.year}_Q{question.qnum}".replace(" ", "")
        
        # Prepare prompt
        solution_text = question.solution_text if question.solution_text else "Not available"
        prompt = template.replace("{qid}", qid) \
                        .replace("{question_text}", question.text) \
                        .replace("{solution_text}", solution_text)
        
        # Generate JSON response
        response = gemini_client.generate_json(prompt)
        
        if not response or not isinstance(response, dict):
            return None
        
        # Extract core move verb
        core_move = response.get("core_move", "")
        core_move_verb = extract_core_move_verb(core_move)
        
        # Create MicroSchema
        micro_schema = MicroSchema(
            qid=qid,
            question_item=question,
            core_move=core_move,
            secondary_moves=response.get("secondary_moves", []),
            key_triggers=response.get("key_triggers", []),
            representation=response.get("representation", "other"),
            difficulty=response.get("difficulty", "Medium"),
            prerequisites=response.get("prerequisites", []),
            wrong_paths=response.get("wrong_paths", []),
            answer_form=response.get("answer_form", "other"),
            object_type=response.get("object_type", "other"),
            prefix_hint=response.get("prefix_hint", "M"),
            embedding=None,  # Will be computed later
            core_move_verb=core_move_verb
        )
        
        return micro_schema
    except Exception as e:
        print(f"[ERROR] Failed to extract micro-schema for {qid}: {e}")
        return None


def extract_micro_schemas_batch(questions: List[QuestionItem], gemini_client, 
                                batch_size: int = 20, progress_callback=None) -> List[MicroSchema]:
    """
    Extract micro-schemas from questions in batches.
    Returns list of successfully extracted micro-schemas.
    """
    micro_schemas = []
    total = len(questions)
    
    for i in range(0, total, batch_size):
        batch = questions[i:i+batch_size]
        if progress_callback:
            progress_callback(i, total, f"Extracting micro-schemas: {i+1}-{min(i+batch_size, total)}/{total}")
        
        for question in batch:
            micro_schema = extract_micro_schema(question, gemini_client)
            if micro_schema:
                micro_schemas.append(micro_schema)
        
        # Small delay between batches to avoid rate limits
        time.sleep(0.5)
    
    return micro_schemas


def compute_micro_schema_embedding(micro_schema: MicroSchema, gemini_client=None) -> Optional[List[float]]:
    """
    Compute embedding for a micro-schema.
    Embedding is based on: core_move + triggers + wrong_paths
    """
    # Combine key fields for embedding
    embedding_text = f"{micro_schema.core_move}\n"
    embedding_text += "Triggers: " + ", ".join(micro_schema.key_triggers) + "\n"
    embedding_text += "Wrong paths: " + ", ".join(micro_schema.wrong_paths)
    
    # Use the existing compute_embedding function which uses genai directly
    return compute_embedding(embedding_text, gemini_client)


def create_structured_signature(micro_schema: MicroSchema) -> Dict[str, Any]:
    """
    Create a structured signature for duplicate detection.
    """
    return {
        "prefix": micro_schema.prefix_hint,
        "representation": micro_schema.representation,
        "core_move_verb": micro_schema.core_move_verb,
        "object_type": micro_schema.object_type,
        "answer_form": micro_schema.answer_form
    }


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if len(vec1) != len(vec2):
        return 0.0
    
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    magnitude1 = sum(a * a for a in vec1) ** 0.5
    magnitude2 = sum(b * b for b in vec2) ** 0.5
    
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0
    
    return dot_product / (magnitude1 * magnitude2)


def cluster_micro_schemas(micro_schemas: List[MicroSchema], 
                          min_cluster_size: int = 3,
                          max_cluster_size: int = 6,
                          similarity_threshold: float = 0.75) -> List[List[MicroSchema]]:
    """
    Cluster micro-schemas into groups of 3-6 questions.
    
    Uses two-pass clustering:
    Pass A (coarse): Group by prefix, representation, core_move_verb
    Pass B (semantic): Within each bucket, cluster by embedding similarity
    """
    if not micro_schemas:
        return []
    
    # Filter out micro-schemas without embeddings
    schemas_with_embeddings = [ms for ms in micro_schemas if ms.embedding is not None]
    if not schemas_with_embeddings:
        print("[WARN] No embeddings found. Computing embeddings first...")
        return []
    
    # Pass A: Coarse grouping by structured signature
    buckets: Dict[str, List[MicroSchema]] = {}
    
    for ms in schemas_with_embeddings:
        sig = create_structured_signature(ms)
        # Create bucket key from signature
        bucket_key = f"{sig['prefix']}|{sig['representation']}|{sig['core_move_verb']}"
        if bucket_key not in buckets:
            buckets[bucket_key] = []
        buckets[bucket_key].append(ms)
    
    # Pass B: Semantic clustering within each bucket using embeddings
    clusters = []
    orphans = []  # Schemas that don't fit in any cluster
    
    for bucket_key, bucket_schemas in buckets.items():
        if len(bucket_schemas) < min_cluster_size:
            # Too small - mark as orphans
            orphans.extend(bucket_schemas)
            continue
        
        # Cluster by embedding similarity using agglomerative approach
        if len(bucket_schemas) <= max_cluster_size:
            # Small enough - check if they're similar enough
            avg_similarity = 0.0
            comparisons = 0
            for i in range(len(bucket_schemas)):
                for j in range(i + 1, len(bucket_schemas)):
                    sim = cosine_similarity(bucket_schemas[i].embedding, bucket_schemas[j].embedding)
                    avg_similarity += sim
                    comparisons += 1
            
            if comparisons > 0:
                avg_similarity /= comparisons
            
            if avg_similarity >= similarity_threshold:
                clusters.append(bucket_schemas)
            else:
                # Not similar enough - try to split
                sub_clusters = _agglomerative_cluster(bucket_schemas, similarity_threshold, min_cluster_size, max_cluster_size)
                clusters.extend(sub_clusters)
        else:
            # Too large - cluster using agglomerative method
            sub_clusters = _agglomerative_cluster(bucket_schemas, similarity_threshold, min_cluster_size, max_cluster_size)
            clusters.extend(sub_clusters)
    
    # Try to merge orphans into nearest clusters
    for orphan in orphans:
        best_cluster_idx = None
        best_similarity = 0.0
        
        for idx, cluster in enumerate(clusters):
            if len(cluster) >= max_cluster_size:
                continue
            
            # Find average similarity to cluster
            similarities = []
            for ms in cluster:
                if ms.embedding and orphan.embedding:
                    sim = cosine_similarity(ms.embedding, orphan.embedding)
                    similarities.append(sim)
            
            if similarities:
                avg_sim = sum(similarities) / len(similarities)
                if avg_sim > best_similarity and avg_sim >= similarity_threshold * 0.8:
                    best_similarity = avg_sim
                    best_cluster_idx = idx
        
        if best_cluster_idx is not None:
            clusters[best_cluster_idx].append(orphan)
    
    return clusters


def _agglomerative_cluster(schemas: List[MicroSchema], 
                           similarity_threshold: float,
                           min_size: int,
                           max_size: int) -> List[List[MicroSchema]]:
    """
    Simple agglomerative clustering: start with each schema as its own cluster,
    merge most similar clusters until threshold is reached.
    """
    if len(schemas) <= max_size:
        return [schemas]
    
    # Initialize: each schema is its own cluster
    clusters = [[ms] for ms in schemas]
    
    while True:
        if len(clusters) == 1:
            break
        
        # Find two most similar clusters
        best_i, best_j = None, None
        best_sim = -1.0
        
        for i in range(len(clusters)):
            for j in range(i + 1, len(clusters)):
                # Compute average similarity between clusters
                similarities = []
                for ms1 in clusters[i]:
                    for ms2 in clusters[j]:
                        if ms1.embedding and ms2.embedding:
                            sim = cosine_similarity(ms1.embedding, ms2.embedding)
                            similarities.append(sim)
                
                if similarities:
                    avg_sim = sum(similarities) / len(similarities)
                    if avg_sim > best_sim:
                        best_sim = avg_sim
                        best_i, best_j = i, j
        
        # Merge if similar enough and combined size <= max_size
        if best_i is not None and best_j is not None:
            combined_size = len(clusters[best_i]) + len(clusters[best_j])
            if best_sim >= similarity_threshold and combined_size <= max_size:
                # Merge clusters
                clusters[best_i].extend(clusters[best_j])
                clusters.pop(best_j)
            else:
                break
        else:
            break
    
    # Filter clusters by min_size
    return [c for c in clusters if len(c) >= min_size]


def select_exemplars_from_cluster(cluster: List[MicroSchema], target_count: int = 4) -> List[MicroSchema]:
    """
    Select 3-4 diverse exemplars from a cluster.
    Prioritizes: different paper/year, slightly different wording, same core move.
    """
    if len(cluster) <= target_count:
        return cluster
    
    # Group by paper/year for diversity
    by_paper_year: Dict[str, List[MicroSchema]] = {}
    for ms in cluster:
        key = f"{ms.question_item.exam}_{ms.question_item.year}"
        if key not in by_paper_year:
            by_paper_year[key] = []
        by_paper_year[key].append(ms)
    
    # Select one from each paper/year, then fill remaining slots
    exemplars = []
    used_paper_years = set()
    
    # First pass: one from each paper/year
    for paper_year, schemas in by_paper_year.items():
        if len(exemplars) < target_count:
            exemplars.append(schemas[0])
            used_paper_years.add(paper_year)
    
    # Second pass: fill remaining slots with diverse choices
    remaining = [ms for ms in cluster if ms not in exemplars]
    for ms in remaining:
        if len(exemplars) >= target_count:
            break
        paper_year = f"{ms.question_item.exam}_{ms.question_item.year}"
        if paper_year not in used_paper_years or len(exemplars) < target_count:
            exemplars.append(ms)
            used_paper_years.add(paper_year)
    
    # If still need more, add any remaining
    while len(exemplars) < target_count and remaining:
        ms = remaining.pop(0)
        if ms not in exemplars:
            exemplars.append(ms)
    
    return exemplars[:target_count]


def test_core_move_gate(cluster: List[MicroSchema], gemini_client) -> Tuple[bool, str]:
    """
    Quality Gate A: Core Move Test
    Tests if knowing only the core move is sufficient to solve most questions in the cluster.
    Returns (passes, reason)
    """
    if not cluster:
        return False, "Empty cluster"
    
    # Get the most common core move
    core_moves = [ms.core_move for ms in cluster]
    most_common_move = max(set(core_moves), key=core_moves.count) if core_moves else ""
    
    # Build test prompt
    question_texts = "\n\n".join([f"Q{idx+1}: {ms.question_item.text[:200]}..." for idx, ms in enumerate(cluster[:5])])
    
    prompt = f"""You are testing whether a schema's core move is sufficient to solve questions.

Core Move: {most_common_move}

Questions:
{question_texts}

If a student knows ONLY this core move (and basic prerequisites), can they solve most of these questions?

Answer with JSON:
{{
  "sufficient": true/false,
  "reason": "Brief explanation"
}}"""
    
    try:
        response = gemini_client.generate_json(prompt)
        if response and isinstance(response, dict):
            sufficient = response.get("sufficient", False)
            reason = response.get("reason", "")
            return sufficient, reason
    except Exception as e:
        return True, f"Test failed (non-blocking): {e}"
    
    return True, "Test completed"


def test_generateability_gate(cluster: List[MicroSchema], exemplars: List[MicroSchema], gemini_client) -> Tuple[bool, str]:
    """
    Quality Gate B: Generate-ability Test
    Tests if the schema can generate clearly in-family questions.
    Returns (passes, reason)
    """
    if not exemplars:
        return False, "No exemplars"
    
    # Build exemplar summary
    exemplar_summary = "\n".join([f"- {ms.qid}: {ms.core_move}" for ms in exemplars[:4]])
    common_triggers = ", ".join(exemplars[0].key_triggers[:3]) if exemplars and exemplars[0].key_triggers else "N/A"
    
    prompt = f"""You are testing whether a schema can generate clearly in-family questions.

Schema Summary:
- Core Move: {exemplars[0].core_move if exemplars else 'N/A'}
- Triggers: {common_triggers}
- Wrong paths: {', '.join(exemplars[0].wrong_paths[:2]) if exemplars and exemplars[0].wrong_paths else 'N/A'}

Exemplar Questions:
{exemplar_summary}

Generate 3 new questions that match this schema. Then evaluate: Are they clearly in-family with the exemplars?

Answer with JSON:
{{
  "generated_questions": ["Q1: ...", "Q2: ...", "Q3: ..."],
  "in_family": true/false,
  "reason": "Brief explanation"
}}"""
    
    try:
        response = gemini_client.generate_json(prompt)
        if response and isinstance(response, dict):
            in_family = response.get("in_family", False)
            reason = response.get("reason", "")
            return in_family, reason
    except Exception as e:
        return True, f"Test failed (non-blocking): {e}"
    
    return True, "Test completed"


def prompt_schema_from_cluster(cluster: List[MicroSchema], exemplars: List[MicroSchema]) -> str:
    """
    Generate prompt for writing full schema from a cluster of micro-schemas.
    """
    template = load_prompt_template(FULL_PROMPT_PATH)
    
    # Determine prefix from cluster
    prefix = exemplars[0].prefix_hint if exemplars else "M"
    
    # Build exemplar text
    exemplar_lines = []
    for ms in exemplars:
        justification = f"Exemplifies {ms.core_move}"
        exemplar_lines.append(f"- `{ms.qid}`: {justification}")
    exemplar_text = "\n".join(exemplar_lines)
    
    # Extract common core move (most frequent)
    core_moves = [ms.core_move for ms in exemplars]
    most_common_move = max(set(core_moves), key=core_moves.count) if core_moves else ""
    
    # Build cluster summary
    cluster_summary = f"""
Cluster Summary:
- Core move: {most_common_move}
- Representation: {exemplars[0].representation if exemplars else 'unknown'}
- Object type: {exemplars[0].object_type if exemplars else 'unknown'}
- Common triggers: {', '.join(exemplars[0].key_triggers[:3]) if exemplars and exemplars[0].key_triggers else 'N/A'}
- Common wrong paths: {', '.join(exemplars[0].wrong_paths[:2]) if exemplars and exemplars[0].wrong_paths else 'N/A'}
"""
    
    # Replace placeholders
    return template.replace("{schema_file}", "Schemas.md") \
                   .replace("{candidate.prefix}", prefix) \
                   .replace("{prefix_desc}", f"{prefix} = {prefix}") \
                   .replace("{candidate.title}", f"Schema for {most_common_move}") \
                   .replace("{candidate.core_move}", most_common_move) \
                   .replace("{candidate.evidence}", str([ms.qid for ms in exemplars])) \
                   .replace("{exemplar_text}", exemplar_text) \
                   .replace("{tmua_note}", "") \
                   .replace("{limit_text}", "")


def prompt_enrich_bullet(candidate: Candidate, target_schema_id: str, section: str, 
                         existing_bullet: str) -> str:
    """Prompt for generating a replacement bullet."""
    template = load_prompt_template(ENRICH_PROMPT_PATH)
    return template.replace("{target_schema_id}", target_schema_id) \
                   .replace("{section}", section) \
                   .replace("{existing_bullet}", existing_bullet) \
                   .replace("{candidate.title}", candidate.title) \
                   .replace("{candidate.core_move}", candidate.core_move)


# ============================================================================
# NEW PIPELINE: Full Schema Generation Pipeline (Final Version)
# ============================================================================

def get_subject_prompt_path(subject: str) -> Path:
    """Get the micro-schema prompt path for a subject."""
    subject_lower = subject.lower()
    if "math" in subject_lower:
        return MICRO_SCHEMA_MATH_PROMPT
    elif "physics" in subject_lower:
        return MICRO_SCHEMA_PHYSICS_PROMPT
    elif "chemistry" in subject_lower:
        return MICRO_SCHEMA_CHEMISTRY_PROMPT
    elif "biology" in subject_lower:
        return MICRO_SCHEMA_BIOLOGY_PROMPT
    else:
        return MICRO_SCHEMA_MATH_PROMPT  # Default fallback


def extract_micro_schema_new(question: QuestionItem, gemini_client) -> Optional[MicroSchemaNew]:
    """
    Extract micro-schema using subject-specific prompt (new pipeline).
    Returns None on failure.
    """
    try:
        # Determine subject from question
        subject_assigned = question.subject or "mathematics"
        if subject_assigned:
            # Normalize subject name
            subject_lower = subject_assigned.lower()
            if "math" in subject_lower:
                subject_assigned = "mathematics"
            elif "physics" in subject_lower:
                subject_assigned = "physics"
            elif "chemistry" in subject_lower:
                subject_assigned = "chemistry"
            elif "biology" in subject_lower:
                subject_assigned = "biology"
        
        # Load subject-specific prompt
        prompt_path = get_subject_prompt_path(subject_assigned)
        template = load_prompt_template(prompt_path)
        
        # Build question ID
        question_id = f"{question.exam}_{question.section}_{question.year}_Q{question.qnum}".replace(" ", "")
        
        # Prepare prompt
        solution_text = question.solution_text if question.solution_text else "Not available"
        prompt = template.replace("{question_text}", question.text) \
                       .replace("{subject_assigned}", subject_assigned) \
                       .replace("{solution_text}", solution_text)
        
        # Generate JSON response
        print(f"[DEBUG] Extracting micro-schema for {question_id}, subject: {subject_assigned}")
        try:
            response = gemini_client.generate_json(prompt)
        except Exception as e:
            error_str = str(e).lower()
            error_msg = f"[ERROR] Failed to extract micro-schema for {question_id}"
            
            # Check for specific error types
            if "api" in error_str and ("key" in error_str or "invalid" in error_str or "unauthorized" in error_str or "403" in error_str or "401" in error_str):
                error_msg += ": API KEY ERROR - Check your GEMINI_API_KEY in .env.local"
            elif "429" in error_str or "rate limit" in error_str or "resource exhausted" in error_str:
                error_msg += ": RATE LIMIT ERROR - Too many requests, please wait"
            elif "timeout" in error_str:
                error_msg += ": TIMEOUT ERROR - Request took too long"
            elif "json" in error_str or "parse" in error_str:
                error_msg += ": JSON PARSE ERROR - Invalid response format"
            else:
                error_msg += f": {type(e).__name__} - {str(e)}"
            
            print(error_msg)
            import traceback
            print(f"[ERROR] Full traceback:\n{traceback.format_exc()}")
            return None

        # Some Gemini responses may be wrapped in a top-level list; unwrap that.
        if isinstance(response, list):
            if not response:
                print(f"[ERROR] Empty list response for {question_id}")
                return None
            response = response[0]

        # Also tolerate a 'candidates' wrapper if present.
        if isinstance(response, dict) and "candidates" in response and isinstance(response["candidates"], list) and response["candidates"]:
            response = response["candidates"][0]
        
        if not response or not isinstance(response, dict):
            print(f"[ERROR] Invalid response for {question_id}: expected dict, got {type(response).__name__}")
            if response:
                print(f"[ERROR] Response content: {str(response)[:200]}...")
            return None
        
        # Extract fields
        discard = response.get("discard", False)
        discard_reason = response.get("reason") if discard else None

        # Subject is now decided in the preclassification step; ignore any
        # subject_* fields coming back from this prompt and treat the
        # pre-assigned subject as authoritative.
        subject_final = subject_assigned
        subject_confidence = response.get("subject_confidence", "high")
        
        # Extract type_bucket (varies by subject)
        type_bucket = response.get("type_bucket") or \
                     response.get("reasoning_type") or \
                     response.get("manipulation_type") or \
                     response.get("representation_type") or None
        
        # Create MicroSchemaNew
        micro_schema = MicroSchemaNew(
            question_id=question_id,
            subject_assigned=subject_assigned,
            subject_final=subject_final,
            subject_confidence=subject_confidence,
            discard=discard,
            discard_reason=discard_reason,
            core_move=response.get("core_move"),
            trigger_signals=response.get("trigger_signals", []),
            type_bucket=type_bucket,
            common_wrong_path=response.get("common_wrong_path"),
            minimal_prerequisite=response.get("minimal_prerequisite"),
            difficulty_estimate=response.get("difficulty_estimate"),
            quality_score=0.0,  # Will be computed later
            embedding=None  # Will be computed later
        )
        
        return micro_schema
    except Exception as e:
        qid = f"{question.exam}_{question.section}_{question.year}_Q{question.qnum}".replace(" ", "")
        print(f"[ERROR] Failed to extract micro-schema for {qid}: {e}")
        return None


def validate_and_discard_micro_schema(ms: MicroSchemaNew) -> bool:
    """
    Deterministic validation and discard filtering.
    Returns True if should be discarded.
    """
    # Already marked for discard by LLM
    if ms.discard:
        return True
    
    # Core move missing
    if not ms.core_move or not ms.core_move.strip():
        return True
    
    # Trigger signals empty
    if not ms.trigger_signals or len(ms.trigger_signals) == 0:
        return True
    
    # Core move too short
    word_count = len(ms.core_move.split())
    if word_count < 5:
        return True
    
    # Check for vague phrases
    vague_phrases = [
        "use formula",
        "apply principles",
        "calculate normally",
        "use correct method",
        "apply basic",
        "use the formula",
        "apply the principles"
    ]
    core_move_lower = ms.core_move.lower()
    for phrase in vague_phrases:
        if phrase in core_move_lower:
            return True
    
    return False


def compute_quality_score(ms: MicroSchemaNew) -> float:
    """
    Deterministic quality scoring.
    Returns quality score (higher is better).
    """
    score = 0.0
    
    # Core move length (8-20 words is ideal)
    if ms.core_move:
        word_count = len(ms.core_move.split())
        if 8 <= word_count <= 20:
            score += 3.0
        elif 5 <= word_count < 8 or 20 < word_count <= 25:
            score += 1.0
    
    # Trigger signals count
    if ms.trigger_signals and len(ms.trigger_signals) >= 2:
        score += 2.0
    
    # Wrong path is specific (not empty, not too short)
    if ms.common_wrong_path and len(ms.common_wrong_path.split()) >= 5:
        score += 2.0
    
    # Minimal prerequisite exists
    if ms.minimal_prerequisite and ms.minimal_prerequisite.strip():
        score += 1.0
    
    # Penalties for vague phrasing (already checked in validation, but double-check)
    if ms.core_move:
        vague_phrases = ["use formula", "apply principles", "calculate normally", "use correct method"]
        core_move_lower = ms.core_move.lower()
        for phrase in vague_phrases:
            if phrase in core_move_lower:
                score -= 5.0
                break
    
    # Discard penalty
    if ms.discard:
        score -= 10.0
    
    return score


def compute_embedding_new(ms: MicroSchemaNew, gemini_client) -> Optional[List[float]]:
    """
    Compute embedding for new micro-schema format.
    Embedding text: subject_final + core_move + trigger_signals + common_wrong_path + minimal_prerequisite
    """
    if not ms.core_move:
        return None
    
    # Build embedding text deterministically
    embed_text = f"{ms.subject_final}\n"
    embed_text += f"{ms.core_move}\n"
    
    if ms.trigger_signals:
        embed_text += "Triggers: " + ", ".join(ms.trigger_signals) + "\n"
    
    if ms.common_wrong_path:
        embed_text += f"Wrong path: {ms.common_wrong_path}\n"
    
    if ms.minimal_prerequisite:
        embed_text += f"Prerequisite: {ms.minimal_prerequisite}\n"
    
    # Use existing compute_embedding function
    return compute_embedding(embed_text, gemini_client)


def anchor_based_grouping(subject: str, anchor_id: str, candidate_pool: List[Dict[str, Any]], 
                         gemini_client, late_stage: bool = False) -> Dict[str, Any]:
    """
    Call grouping prompt to select group of 3/2/1 from candidate pool.
    Returns grouping result with group_size, group_ids, shared_core_move, confidence.
    """
    try:
        template = load_prompt_template(GROUPING_PROMPT_PATH)
        
        # Format candidate micro-schemas for prompt
        candidates_text = ""
        for i, cand in enumerate(candidate_pool):
            candidates_text += f"""
Candidate {i+1} (ID: {cand['question_id']}):
- core_move: {cand.get('core_move', 'N/A')}
- trigger_signals: {', '.join(cand.get('trigger_signals', []))}
- type_bucket: {cand.get('type_bucket', 'N/A')}
- common_wrong_path: {cand.get('common_wrong_path', 'N/A')}
- minimal_prerequisite: {cand.get('minimal_prerequisite', 'N/A')}
- quality_score: {cand.get('quality_score', 0.0)}
"""
        
        prompt = template.replace("{subject}", subject) \
                        .replace("{anchor_id}", anchor_id) \
                        .replace("{candidate_micro_schemas}", candidates_text)
        
        if late_stage:
            prompt += "\n\nNOTE: Late stage - allow singles more freely if no good groups exist."
        
        print(f"[DEBUG] Calling grouping prompt for anchor {anchor_id}, {len(candidate_pool)} candidates")
        response = gemini_client.generate_json(prompt)
        
        if response and isinstance(response, dict):
            result = {
                "group_size": response.get("group_size", 1),
                "group_ids": response.get("group_ids", [anchor_id]),
                "shared_core_move": response.get("shared_core_move"),
                "why_coherent": response.get("why_coherent", ""),
                "confidence": response.get("confidence", "low")
            }
            print(f"[DEBUG] Grouping result: size={result['group_size']}, ids={result['group_ids']}, confidence={result['confidence']}")
            return result
    except Exception as e:
        print(f"[ERROR] Grouping failed for anchor {anchor_id}: {e}")
        import traceback
        traceback.print_exc()
    
    # Fallback: return singleton
    return {
        "group_size": 1,
        "group_ids": [anchor_id],
        "shared_core_move": None,
        "why_coherent": "Fallback: grouping failed",
        "confidence": "low"
    }


def write_schema_from_group(subject: str, group_ids: List[str], group_micro_schemas: List[Dict[str, Any]],
                           question_texts: Dict[str, str], gemini_client) -> Optional[Dict[str, Any]]:
    """
    Call schema writing prompt to generate full schema from grouped micro-schemas.
    Returns schema JSON or None on failure.
    """
    try:
        template = load_prompt_template(WRITING_PROMPT_PATH)
        
        # Format grouped micro-schemas
        grouped_text = ""
        for i, ms in enumerate(group_micro_schemas):
            grouped_text += f"""
Micro-schema {i+1}:
- id: {ms['question_id']}
- core_move: {ms.get('core_move', 'N/A')}
- trigger_signals: {', '.join(ms.get('trigger_signals', []))}
- type_bucket: {ms.get('type_bucket', 'N/A')}
- common_wrong_path: {ms.get('common_wrong_path', 'N/A')}
- minimal_prerequisite: {ms.get('minimal_prerequisite', 'N/A')}
- difficulty_estimate: {ms.get('difficulty_estimate', 'N/A')}
"""
        
        # Format exemplar question texts
        exemplar_texts = ""
        for qid in group_ids:
            if qid in question_texts:
                exemplar_texts += f"\nQuestion {qid}:\n{question_texts[qid]}\n"
        
        prompt = template.replace("{subject}", subject) \
                        .replace("{grouped_micro_schemas}", grouped_text) \
                        .replace("{exemplar_question_texts}", exemplar_texts)
        
        print(f"[DEBUG] Writing schema for group {group_ids}, {len(group_micro_schemas)} micro-schemas")
        response = gemini_client.generate_json(prompt)
        
        if response and isinstance(response, dict):
            # Add exemplar question IDs
            response["exemplars"] = [
                {"question_id": qid, "why_it_fits": "Part of grouped micro-schemas"}
                for qid in group_ids
            ]
            print(f"[DEBUG] Schema written successfully: {response.get('title', 'N/A')}")
            return response
        
    except Exception as e:
        print(f"[ERROR] Schema writing failed for group {group_ids}: {e}")
        import traceback
        traceback.print_exc()
    
    return None


def run_full_schema_pipeline(questions: List[QuestionItem], gemini_client, db, 
                             progress_callback=None) -> Dict[str, Any]:
    """
    Run the full schema generation pipeline.
    
    Stages:
    1. Micro-schema extraction
    2. Validation & discard filtering
    3. Quality scoring
    4. Embedding computation
    5. Anchor-based grouping (within subject only)
    6. Schema writing
    """
    print(f"[PIPELINE] Starting full schema generation pipeline with {len(questions)} questions")
    
    # Initialize database tables
    print("[PIPELINE] Initializing database tables...")
    db._init_schema_pipeline_tables()
    print("[PIPELINE] Database tables initialized")
    
    stats = {
        "total_questions": len(questions),
        "extracted": 0,
        "discarded": 0,
        "validated": 0,
        "embedded": 0,
        "schemas_created": 0,
        "by_subject": {}
    }

    # PRE-STAGE: Subject classification & front-page / junk filtering
    # Use gemini-2.5-flash for classification (supports JSON mode, cheaper than pro models)
    # Note: gemini-pro doesn't support JSON mode, so we use flash which is still cheaper
    classifier_model = os.getenv("SCHEMA_CLASSIFIER_MODEL", "gemini-2.5-flash")
    classifier_client = Gemini(api_key=gemini_client.api_key, model=classifier_model)
    actual_classifier_model = classifier_client.get_model_name()
    print(f"[PIPELINE] Using {actual_classifier_model} for subject classification (batch mode: 10 questions per call)")
    
    def _preclassify_batch(question_batch: List[Tuple[int, QuestionItem]]) -> Dict[int, Tuple[Optional[str], bool, str]]:
        """
        Classify a batch of questions (up to 10) into mathematics/physics/chemistry/biology, or mark as discard.
        
        Args:
            question_batch: List of (index, QuestionItem) tuples
            
        Returns:
            Dict mapping question index to (subject_key or None, discard, reason)
        """
        if not question_batch:
            return {}
        
        # Build prompt with all questions, each with a unique ID
        questions_text = ""
        question_ids = []
        for idx, q in question_batch:
            qid = f"Q{idx}"
            question_ids.append((idx, qid))
            q_text = q.text[:1500] if q.text else ""  # Slightly shorter per question to fit 10 in one prompt
            questions_text += f"""
--- {qid} ---
{q_text}
"""
        
        prompt = f"""You are classifying exam QUESTIONS by subject and filtering out junk pages.

Rules:
- For EACH question, choose exactly ONE subject from this set: "mathematics", "physics", "chemistry", "biology".
- For EACH question, decide whether it should be DISCARDED.
- Discard pages that are NOT real, self-contained questions (e.g. covers, instructions, specification text,
  data tables with no question, blank pages, formula sheets).
- Treat CONTEXT as decisive for subject:
  * If the content clearly involves physical concepts (force, energy, velocity, acceleration, motion, circuits,
    voltage, current, resistance, charge, fields, waves, photons, etc.), classify as "physics"
    EVEN IF the calculations are purely algebraic.
  * If it is about chemical substances, reactions, moles, pH, equilibrium, rates, binding, etc.,
    classify as "chemistry" even if the maths is non-trivial.
  * If it is about biological systems (cells, enzymes, DNA, organisms, physiology, ecology, populations, etc.),
    classify as "biology".
  * Only use "mathematics" when the question is about abstract maths (numbers, algebra, functions, calculus,
    geometry, probability, combinatorics, etc.) with no clear physics/chemistry/biology context.

Questions to classify:
{questions_text}

Return ONLY valid JSON with this structure (an array of results, one per question):
{{
  "results": [
    {{
      "question_id": "Q0",
      "subject": "mathematics|physics|chemistry|biology",
      "discard": true or false,
      "reason": "short explanation"
    }},
    {{
      "question_id": "Q1",
      "subject": "mathematics|physics|chemistry|biology",
      "discard": true or false,
      "reason": "short explanation"
    }}
    // ... one entry for each question in the same order
  ]
}}"""
        try:
            resp = classifier_client.generate_json(prompt)
            # Tolerate list/candidates wrappers
            if isinstance(resp, list):
                if not resp:
                    raise ValueError("Empty list response")
                resp = resp[0]
            if isinstance(resp, dict) and "candidates" in resp and isinstance(resp["candidates"], list) and resp["candidates"]:
                resp = resp["candidates"][0]
            if not isinstance(resp, dict):
                raise ValueError(f"Non-dict response: {type(resp).__name__}")
            
            # Extract results array
            results = resp.get("results", [])
            if not isinstance(results, list):
                raise ValueError(f"Expected 'results' array, got {type(results).__name__}")
            
            # Build mapping from question_id to result
            result_map = {}
            for result in results:
                if not isinstance(result, dict):
                    continue
                qid = result.get("question_id", "")
                subject_raw = str(result.get("subject", "")).strip().lower()
                if subject_raw not in {"mathematics", "physics", "chemistry", "biology"}:
                    subject_raw = "mathematics"
                discard = bool(result.get("discard", False))
                reason = str(result.get("reason", ""))
                result_map[qid] = (subject_raw, discard, reason)
            
            # Map back to original indices
            output = {}
            for idx, qid in question_ids:
                if qid in result_map:
                    output[idx] = result_map[qid]
                else:
                    # Missing question - raise error to trigger retry
                    raise ValueError(f"Question {qid} not found in batch results - incomplete classification")
            
            # Verify all questions were classified
            missing = [idx for idx, _ in question_batch if idx not in output]
            if missing:
                raise ValueError(f"Missing classifications for questions: {missing}")
            
            return output
            
        except Exception as e:
            # On classifier failure, raise exception to trigger retry (don't default to mathematics)
            error_msg = f"Batch preclassification failed: {e}"
            print(f"[ERROR] {error_msg}", flush=True)
            raise Exception(error_msg) from e

    print(f"[PIPELINE] PRE-STAGE: Classifying subjects & filtering junk for {len(questions)} questions...")
    classified_questions: List[QuestionItem] = []
    subject_label_map = {
        "mathematics": "Mathematics",
        "physics": "Physics",
        "chemistry": "Chemistry",
        "biology": "Biology",
    }
    
    # Process questions in batches of 10
    BATCH_SIZE = 10
    total_batches = (len(questions) + BATCH_SIZE - 1) // BATCH_SIZE  # Ceiling division
    print(f"[PIPELINE] Processing {len(questions)} questions in {total_batches} batches (batch size: {BATCH_SIZE})")
    
    processed_indices = set()
    for batch_num, batch_start in enumerate(range(0, len(questions), BATCH_SIZE), 1):
        batch_end = min(batch_start + BATCH_SIZE, len(questions))
        batch_questions = [(i, questions[i]) for i in range(batch_start, batch_end)]
        
        # Verify all indices in batch are unique and sequential
        batch_indices = [idx for idx, _ in batch_questions]
        if len(batch_indices) != len(set(batch_indices)):
            print(f"[WARN] Batch {batch_num} has duplicate indices!")
        if batch_indices != list(range(batch_start, batch_end)):
            print(f"[WARN] Batch {batch_num} indices are not sequential: {batch_indices}")
        
        processed_indices.update(batch_indices)
        
        if progress_callback:
            progress_callback(batch_start, len(questions), f"Classifying subjects: batch {batch_num}/{total_batches} ({batch_start}-{batch_end-1}/{len(questions)})")
        
        # Classify batch
        batch_results = _preclassify_batch(batch_questions)
        
        # Process results
        for idx, q in batch_questions:
            if idx not in batch_results:
                # Fallback if result missing
                subj_key, discard, reason = "mathematics", False, "missing_result"
                print(f"[WARN] Question index {idx} missing from batch results")
            else:
                subj_key, discard, reason = batch_results[idx]
            
            if discard:
                stats["discarded"] += 1
                continue
            
            if not subj_key:
                # Fallback to maths if classifier failed silently
                subj_key = "mathematics"
            
            q.subject = subject_label_map.get(subj_key, "Mathematics")
            classified_questions.append(q)
    
    # Verify all questions were processed
    expected_indices = set(range(len(questions)))
    if processed_indices != expected_indices:
        missing = expected_indices - processed_indices
        extra = processed_indices - expected_indices
        print(f"[ERROR] Not all questions were processed!")
        if missing:
            print(f"[ERROR] Missing indices: {sorted(missing)}")
        if extra:
            print(f"[ERROR] Extra indices: {sorted(extra)}")
    else:
        print(f"[PIPELINE] All {len(questions)} questions processed in batches")

    questions = classified_questions
    stats["total_questions"] = len(questions)

    # STAGE 1: Extract micro-schemas
    print(f"[PIPELINE] STAGE 1: Extracting micro-schemas from {len(questions)} questions...")
    if progress_callback:
        progress_callback(0, len(questions), "Extracting micro-schemas...")
    
    micro_schemas = []
    for i, question in enumerate(questions):
        if progress_callback and i % 10 == 0:
            progress_callback(i, len(questions), f"Extracting micro-schemas: {i}/{len(questions)}")
        
        if i % 50 == 0:
            print(f"[PIPELINE] Extracting micro-schema {i+1}/{len(questions)}")
        
        ms = extract_micro_schema_new(question, gemini_client)
        if ms:
            micro_schemas.append(ms)
            stats["extracted"] += 1
        else:
            print(f"[PIPELINE] Failed to extract micro-schema for question {i+1}")
    
    print(f"[PIPELINE] STAGE 1 complete: {stats['extracted']} micro-schemas extracted")
    
    # STAGE 2: Validate & discard
    print(f"[PIPELINE] STAGE 2: Validating {len(micro_schemas)} micro-schemas...")
    if progress_callback:
        progress_callback(0, len(micro_schemas), "Validating micro-schemas...")
    
    validated_schemas = []
    for i, ms in enumerate(micro_schemas):
        if progress_callback and i % 10 == 0:
            progress_callback(i, len(micro_schemas), f"Validating: {i}/{len(micro_schemas)}")
        
        should_discard = validate_and_discard_micro_schema(ms)
        if should_discard:
            ms.discard = True
            ms.discard_reason = ms.discard_reason or "Failed validation"
            stats["discarded"] += 1
            if i % 50 == 0:
                print(f"[PIPELINE] Discarded micro-schema {i+1}: {ms.discard_reason}")
        else:
            validated_schemas.append(ms)
            stats["validated"] += 1
        
        # Compute quality score
        ms.quality_score = compute_quality_score(ms)
        
        # Save to database
        db.save_micro_schema(
            question_id=ms.question_id,
            subject_assigned=ms.subject_assigned,
            subject_final=ms.subject_final,
            subject_confidence=ms.subject_confidence,
            discard=ms.discard,
            discard_reason=ms.discard_reason,
            core_move=ms.core_move,
            trigger_signals=ms.trigger_signals,
            type_bucket=ms.type_bucket,
            common_wrong_path=ms.common_wrong_path,
            minimal_prerequisite=ms.minimal_prerequisite,
            difficulty_estimate=ms.difficulty_estimate,
            quality_score=ms.quality_score,
            embedding=None  # Will be computed next
        )
    
    # STAGE 3: Compute embeddings
    print(f"[PIPELINE] STAGE 3: Computing embeddings for {len(validated_schemas)} micro-schemas...")
    if progress_callback:
        progress_callback(0, len(validated_schemas), "Computing embeddings...")
    
    for i, ms in enumerate(validated_schemas):
        if progress_callback and i % 20 == 0:
            progress_callback(i, len(validated_schemas), f"Embedding: {i}/{len(validated_schemas)}")
        
        if i % 50 == 0:
            print(f"[PIPELINE] Computing embedding {i+1}/{len(validated_schemas)}")
        
        embedding = compute_embedding_new(ms, gemini_client)
        if embedding:
            ms.embedding = embedding
            stats["embedded"] += 1
        else:
            print(f"[PIPELINE] Failed to compute embedding for {ms.question_id}")
            
            # Update database with embedding
            db.save_micro_schema(
                question_id=ms.question_id,
                subject_assigned=ms.subject_assigned,
                subject_final=ms.subject_final,
                subject_confidence=ms.subject_confidence,
                discard=ms.discard,
                discard_reason=ms.discard_reason,
                core_move=ms.core_move,
                trigger_signals=ms.trigger_signals,
                type_bucket=ms.type_bucket,
                common_wrong_path=ms.common_wrong_path,
                minimal_prerequisite=ms.minimal_prerequisite,
                difficulty_estimate=ms.difficulty_estimate,
                quality_score=ms.quality_score,
                embedding=embedding
            )
        
        # Small delay to avoid rate limits
        if i % 20 == 0:
            time.sleep(0.5)
    
    print(f"[PIPELINE] STAGE 3 complete: {stats['embedded']} embeddings computed")
    
    # STAGE 4: Anchor-based grouping (within subject only)
    print(f"[PIPELINE] STAGE 4: Starting anchor-based grouping...")
    subjects = ["mathematics", "physics", "chemistry", "biology"]
    # Map question IDs to texts
    question_texts = {}
    for q in questions:
        qid = f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "")
        question_texts[qid] = q.text
    
    for subject in subjects:
        print(f"[PIPELINE] Processing subject: {subject}")
        if progress_callback:
            progress_callback(0, 1, f"Grouping {subject}...")
        
        stats["by_subject"][subject] = {"schemas": 0, "questions_grouped": 0}
        
        # Get unassigned micro-schemas for this subject
        assigned_ids = set()
        iteration = 0
        
        while True:
            iteration += 1
            unassigned = db.get_unassigned_micro_schemas(subject, assigned_ids, limit=1000)
            
            print(f"[PIPELINE] {subject}: iteration {iteration}, {len(unassigned)} unassigned")
            
            if not unassigned:
                print(f"[PIPELINE] {subject}: No more unassigned micro-schemas, moving to next subject")
                break
            
            # Check if late stage
            late_stage = len(unassigned) <= 20
            
            # Pick anchor (highest quality_score, already sorted)
            anchor = unassigned[0]
            anchor_id = anchor["question_id"]
            anchor_embedding = anchor.get("embedding")
            
            # Retrieve top 30 similar candidates (using embedding similarity)
            if anchor_embedding and len(anchor_embedding) > 0:
                # Compute similarity scores
                candidates_with_sim = []
                for cand in unassigned:
                    cand_embedding = cand.get("embedding")
                    if cand_embedding and len(cand_embedding) > 0:
                        sim = cosine_similarity(anchor_embedding, cand_embedding)
                        candidates_with_sim.append((cand, sim))
                
                # Sort by similarity (descending) and take top 30
                candidates_with_sim.sort(key=lambda x: x[1], reverse=True)
                candidate_pool = [cand for cand, _ in candidates_with_sim[:30]]
            else:
                # Fallback: use quality_score if no embeddings
                candidate_pool = unassigned[:30]
            
            # Call grouping prompt
            grouping_result = anchor_based_grouping(
                subject, anchor_id, candidate_pool, gemini_client, late_stage
            )
            
            group_ids = grouping_result["group_ids"]
            
            # Get micro-schema data for group
            group_micro_schemas = [c for c in candidate_pool if c["question_id"] in group_ids]
            
            # Write schema
            schema_result = write_schema_from_group(
                subject, group_ids, group_micro_schemas, question_texts, gemini_client
            )
            
            if schema_result:
                # Generate schema ID
                schema_id = f"{subject[0].upper()}{stats['by_subject'][subject]['schemas'] + 1}"
                
                # Save schema to database
                db.save_schema(
                    schema_id=schema_id,
                    subject=subject,
                    title=schema_result.get("title", f"Schema {schema_id}"),
                    core_move=schema_result.get("core_move", ""),
                    trigger_signals=schema_result.get("trigger_signals", []),
                    boundary_definition=schema_result.get("boundary_definition", ""),
                    possible_wrong_paths=schema_result.get("possible_wrong_paths", []),
                    generation_notes=schema_result.get("generation_notes", []),
                    difficulty_profile=schema_result.get("difficulty_profile", {}),
                    exemplar_question_ids=group_ids
                )
                
                stats["by_subject"][subject]["schemas"] += 1
                stats["by_subject"][subject]["questions_grouped"] += len(group_ids)
                stats["schemas_created"] += 1
            
            # Mark as assigned
            assigned_ids.update(group_ids)
            
            # Progress update
            if progress_callback and iteration % 10 == 0:
                remaining = len(unassigned) - len(assigned_ids)
                progress_callback(iteration, 1, f"Grouping {subject}: {remaining} remaining")
        
        print(f"[PIPELINE] {subject} complete: {stats['by_subject'][subject]['schemas']} schemas, {stats['by_subject'][subject]['questions_grouped']} questions grouped")
    
    print(f"[PIPELINE] Pipeline complete!")
    print(f"[PIPELINE] Final stats: {stats}")
    return stats


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

        # Use SCHEMA_GENERATOR_MODEL env var, or let Gemini class use its default (gemini-2.5-flash)
        model_override = os.getenv("SCHEMA_GENERATOR_MODEL") or os.getenv("GEMINI_MODEL")
        self.gemini = Gemini(api_key=api_key, model=model_override)

        self.index: List[QuestionItem] = []
        self.schema_summaries: List[SchemaSummary] = []
        self.candidates: List[Candidate] = []
        self.sim_hits: Dict[str, List[SimilarityHit]] = {}
        self.schema_embeddings: Dict[str, List[float]] = {}
        self.schemas_meta: Dict[str, Dict[str, any]] = {}
        self.schema_fullness: Dict[str, Dict[str, int]] = {}
        self.diagram_overrides: Dict[str, Dict[int, bool]] = {}
        self.used_question_ids: set = set()  # Track questions already used in batches
        self.micro_schema_clusters: List[Tuple[List[MicroSchema], List[MicroSchema]]] = []  # (cluster, exemplars)
        self.micro_schema_quality: List[Dict[str, Any]] = []  # Quality gate results

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
        ttk.Button(top, text="Index ENGAA Part B only", command=self.on_index_engaa_partb).pack(side="left", padx=6)
        ttk.Button(top, text="View Extraction Report", command=self.on_view_extraction_report).pack(side="left", padx=6)
        ttk.Button(top, text="Review Questions & Solutions", command=self.on_review_questions_solutions).pack(side="left", padx=6)
        # Make micro-schema pipeline the primary/default method (prominent button)
        generate_btn = ttk.Button(top, text="🚀 Generate Schemas (Micro-Schema Pipeline)", command=self.on_micro_schema_pipeline)
        generate_btn.pack(side="left", padx=6)
        ttk.Button(top, text="Review Accepted Questions", command=self.on_review_accepted_questions).pack(side="left", padx=6)
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
                    schema_path.write_text(f"# TMUA {paper_name}\n\n", encoding="utf-8")
    
    # Handler methods (stubs - need to be implemented)
    def on_index(self):
        """Index PDFs from the papers directory."""
        force_rebuild = self.force_rebuild_var.get() if hasattr(self, 'force_rebuild_var') else False
        include_non_papers = self.include_non_papers_var.get() if hasattr(self, 'include_non_papers_var') else False
        
        def work():
            try:
                self.after(0, lambda: self._set_status("Indexing PDFs..."))
                self.after(0, lambda: self.progress_frame.pack(fill="x", pady=(0, 5)) if hasattr(self, 'progress_frame') else None)
                
                def progress_callback(current, total, filename):
                    if hasattr(self, 'progress_bar'):
                        self.after(0, lambda: self.progress_bar.config(maximum=total, value=current))
                    if hasattr(self, 'progress_label'):
                        self.after(0, lambda: self.progress_label.config(text=f"Indexing: {filename} ({current}/{total})"))
                    self.after(0, lambda: self._set_status(f"Indexing: {filename} ({current}/{total})"))
                
                # Build or load index
                self.index = build_or_load_index(
                    self.papers_dir,
                    force_rebuild=force_rebuild,
                    include_non_papers=include_non_papers,
                    progress_callback=progress_callback
                )
                
                # Hide progress bar
                if hasattr(self, 'progress_frame'):
                    self.after(0, lambda: self.progress_frame.pack_forget())
                
                # Update UI
                self.after(0, lambda: self._set_status(f"Indexed {len(self.index)} questions from PDFs"))
                self.after(0, lambda: messagebox.showinfo("Indexing Complete", 
                    f"Successfully indexed {len(self.index)} questions from PDFs.\n\n"
                    f"Mode: {MODE}\n"
                    f"Force rebuild: {force_rebuild}"))
                
                # Update progress display
                if hasattr(self, 'paper_progress_label'):
                    self.after(0, lambda: self.paper_progress_label.config(
                        text=f"Questions: {len(self.index)}/{len(self.index)} (all questions)"))
                
            except Exception as e:
                error_msg = str(e)
                if hasattr(self, 'progress_frame'):
                    self.after(0, lambda: self.progress_frame.pack_forget())
                self.after(0, lambda: messagebox.showerror("Indexing Failed", f"Error: {error_msg}"))
                self.after(0, lambda: self._set_status(f"Indexing failed: {error_msg}"))
                import traceback
                traceback.print_exc()
        
        threading.Thread(target=work, daemon=True).start()
    
    def on_index_engaa_partb(self):
        """Index ONLY ENGAA Section 1 Part B papers under scripts/schema_generator/papers/ENGAA."""
        force_rebuild = self.force_rebuild_var.get() if hasattr(self, 'force_rebuild_var') else False
        include_non_papers = self.include_non_papers_var.get() if hasattr(self, 'include_non_papers_var') else False

        engaa_dir = self.project_root / "scripts" / "schema_generator" / "papers" / "ENGAA"

        def work():
            try:
                self.after(0, lambda: self._set_status("Indexing ENGAA Section 1 Part B PDFs..."))
                if hasattr(self, 'progress_frame'):
                    self.after(0, lambda: self.progress_frame.pack(fill="x", pady=(0, 5)))

                def progress_callback(current, total, filename):
                    if hasattr(self, 'progress_bar'):
                        self.after(0, lambda: self.progress_bar.config(maximum=total, value=current))
                    if hasattr(self, 'progress_label'):
                        self.after(0, lambda: self.progress_label.config(
                            text=f"ENGAA Part B: {filename} ({current}/{total})"
                        ))
                    self.after(0, lambda: self._set_status(
                        f"Indexing ENGAA Part B: {filename} ({current}/{total})"
                    ))

                # Build or load index, restricted to ENGAA subtree.
                self.index = build_or_load_index(
                    engaa_dir,
                    force_rebuild=force_rebuild,
                    include_non_papers=include_non_papers,
                    progress_callback=progress_callback,
                )

                # Hide progress bar
                if hasattr(self, 'progress_frame'):
                    self.after(0, lambda: self.progress_frame.pack_forget())

                # Update UI
                self.after(0, lambda: self._set_status(
                    f"Indexed {len(self.index)} ENGAA Section 1 Part B questions"
                ))
                self.after(0, lambda: messagebox.showinfo(
                    "ENGAA Indexing Complete",
                    f"Successfully indexed {len(self.index)} ENGAA Section 1 Part B questions.\n\n"
                    f"Force rebuild: {force_rebuild}"
                ))

                if hasattr(self, 'paper_progress_label'):
                    self.after(0, lambda: self.paper_progress_label.config(
                        text=f"ENGAA Part B questions: {len(self.index)}"
                    ))

            except Exception as e:
                error_msg = str(e)
                if hasattr(self, 'progress_frame'):
                    self.after(0, lambda: self.progress_frame.pack_forget())
                self.after(0, lambda: messagebox.showerror(
                    "ENGAA Indexing Failed",
                    f"Error: {error_msg}"
                ))
                self.after(0, lambda: self._set_status(f"ENGAA indexing failed: {error_msg}"))
                import traceback
                traceback.print_exc()

        threading.Thread(target=work, daemon=True).start()
    
    def on_view_extraction_report(self):
        """View extraction report - placeholder."""
        messagebox.showinfo("Not Implemented", "View extraction report functionality needs to be implemented.")
    
    def on_review_questions_solutions(self):
        """Review all indexed questions and solutions."""
        if not hasattr(self, 'index') or not self.index:
            messagebox.showinfo("No Index", "Please index PDFs first using 'Index PDFs' button.")
            return
        
        # Create review window
        review_window = tk.Toplevel(self)
        review_window.title("Review Questions & Solutions")
        review_window.geometry("1200x800")
        
        # Top: Filter controls
        filter_frame = ttk.LabelFrame(review_window, text="Filters")
        filter_frame.pack(fill="x", padx=10, pady=10)
        
        ttk.Label(filter_frame, text="PDF:").pack(side="left", padx=5)
        pdf_var = tk.StringVar()
        pdf_combo = ttk.Combobox(filter_frame, textvariable=pdf_var, width=60, state="readonly")
        pdf_combo.pack(side="left", padx=5)
        
        ttk.Label(filter_frame, text="Exam:").pack(side="left", padx=5)
        exam_var = tk.StringVar()
        exam_combo = ttk.Combobox(filter_frame, textvariable=exam_var, width=20, state="readonly")
        exam_combo.pack(side="left", padx=5)
        
        # Get unique PDFs and exams
        unique_pdfs = sorted(set(q.pdf_path for q in self.index))
        unique_exams = sorted(set(q.exam for q in self.index if q.exam))
        pdf_combo['values'] = ["All PDFs"] + [Path(p).name for p in unique_pdfs]
        exam_combo['values'] = ["All Exams"] + unique_exams
        pdf_combo.current(0)
        exam_combo.current(0)
        
        # Middle: Question list
        list_frame = ttk.Frame(review_window)
        list_frame.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Left: Question list
        left_frame = ttk.LabelFrame(list_frame, text="Questions")
        left_frame.pack(side="left", fill="both", expand=True, padx=(0, 5))
        
        list_scrollbar = ttk.Scrollbar(left_frame)
        list_scrollbar.pack(side="right", fill="y")
        
        question_listbox = tk.Listbox(left_frame, yscrollcommand=list_scrollbar.set, selectmode=tk.SINGLE, font=("Courier", 9))
        question_listbox.pack(side="left", fill="both", expand=True)
        list_scrollbar.config(command=question_listbox.yview)
        
        # Right: Question details
        right_frame = ttk.LabelFrame(list_frame, text="Question Details")
        right_frame.pack(side="right", fill="both", expand=True, padx=(5, 0))
        
        details_text = tk.Text(right_frame, wrap=tk.WORD, font=("Courier", 9))
        details_scrollbar = ttk.Scrollbar(right_frame, command=details_text.yview)
        details_text.config(yscrollcommand=details_scrollbar.set)
        details_text.pack(side="left", fill="both", expand=True)
        details_scrollbar.pack(side="right", fill="y")
        
        # Store filtered questions
        filtered_questions = []
        
        def refresh_list():
            """Refresh question list based on filters."""
            question_listbox.delete(0, tk.END)
            filtered_questions.clear()
            
            selected_pdf = pdf_var.get()
            selected_exam = exam_var.get()
            
            for q in self.index:
                # Apply filters
                if selected_pdf != "All PDFs":
                    if Path(q.pdf_path).name != selected_pdf:
                        continue
                
                if selected_exam != "All Exams":
                    if q.exam != selected_exam:
                        continue
                
                filtered_questions.append(q)
                
                # Format display
                pdf_name = Path(q.pdf_path).name[:30]
                exam_str = q.exam or "?"
                year_str = q.year or "?"
                section_str = q.section or "?"
                qnum_str = str(q.qnum) if q.qnum else "?"
                subject_str = f"[{q.subject}]" if q.subject else "[No Subject]"
                preview = q.text[:60].replace("\n", " ") + "..." if len(q.text) > 60 else q.text.replace("\n", " ")
                
                label = f"{pdf_name} | {exam_str} {year_str} {section_str} Q{qnum_str} {subject_str}: {preview}"
                question_listbox.insert(tk.END, label)
        
        def show_details(event=None):
            """Show details of selected question."""
            selection = question_listbox.curselection()
            if not selection:
                details_text.delete(1.0, tk.END)
                return
            
            idx = selection[0]
            if idx < len(filtered_questions):
                q = filtered_questions[idx]
                
                details = f"""Question ID: {q.paper_id}
PDF: {Path(q.pdf_path).name}
Exam: {q.exam or 'N/A'}
Section: {q.section or 'N/A'}
Year: {q.year or 'N/A'}
Question Number: {q.qnum or 'N/A'}
Subject: {q.subject or 'N/A (not classified)'}

Question Text:
{'='*80}
{q.text}
{'='*80}

Solution Available: {'Yes' if q.solution_text else 'No'}
"""
                if q.solution_text:
                    details += f"\nSolution:\n{'='*80}\n{q.solution_text}\n{'='*80}\n"
                
                if q.skipped_diagram:
                    details += "\n⚠️ This question was marked as having a diagram (but was included anyway).\n"
                
                details_text.delete(1.0, tk.END)
                details_text.insert(1.0, details)
        
        # Bind events
        pdf_combo.bind("<<ComboboxSelected>>", lambda e: refresh_list())
        exam_combo.bind("<<ComboboxSelected>>", lambda e: refresh_list())
        question_listbox.bind("<<ListboxSelect>>", show_details)
        
        # Bottom: Stats and actions
        bottom_frame = ttk.Frame(review_window)
        bottom_frame.pack(fill="x", padx=10, pady=10)
        
        stats_label = ttk.Label(bottom_frame, text="")
        stats_label.pack(side="left", padx=5)
        
        def update_stats():
            """Update statistics display."""
            total = len(self.index)
            filtered = len(filtered_questions)
            with_solutions = sum(1 for q in filtered_questions if q.solution_text)
            stats_text = f"Total: {total} questions | Filtered: {filtered} | With Solutions: {with_solutions}"
            stats_label.config(text=stats_text)
        
        ttk.Button(bottom_frame, text="Refresh", command=lambda: [refresh_list(), update_stats()]).pack(side="right", padx=5)
        ttk.Button(bottom_frame, text="Close", command=review_window.destroy).pack(side="right", padx=5)
        
        # Initial load
        refresh_list()
        update_stats()
    
    def on_review_accepted_questions(self):
        """Review and manage accepted questions from clusters."""
        if not self.micro_schema_clusters:
            messagebox.showinfo("No Clusters", "No accepted clusters to review. Generate schemas first using the Micro-Schema Pipeline.")
            return
        
        # Create review window
        review_window = tk.Toplevel(self)
        review_window.title("Review Accepted Questions")
        review_window.geometry("1000x700")
        
        # Top: Cluster selection
        top_frame = ttk.Frame(review_window)
        top_frame.pack(fill="x", padx=10, pady=10)
        
        ttk.Label(top_frame, text="Cluster:").pack(side="left", padx=5)
        cluster_var = tk.StringVar()
        cluster_combo = ttk.Combobox(top_frame, textvariable=cluster_var, width=50, state="readonly")
        cluster_combo.pack(side="left", padx=5)
        
        # Populate cluster list
        cluster_options = [f"Cluster {i+1} ({len(cluster)} questions, {len(exemplars)} exemplars)" 
                          for i, (cluster, exemplars) in enumerate(self.micro_schema_clusters)]
        cluster_combo['values'] = cluster_options
        if cluster_options:
            cluster_combo.current(0)
        
        # Middle: Question list with checkboxes
        mid_frame = ttk.Frame(review_window)
        mid_frame.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Create scrollable list
        list_frame = ttk.Frame(mid_frame)
        list_frame.pack(fill="both", expand=True)
        
        scrollbar = ttk.Scrollbar(list_frame)
        scrollbar.pack(side="right", fill="y")
        
        question_listbox = tk.Listbox(list_frame, yscrollcommand=scrollbar.set, selectmode=tk.EXTENDED)
        question_listbox.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=question_listbox.yview)
        
        # Question details text area
        details_frame = ttk.LabelFrame(mid_frame, text="Question Details")
        details_frame.pack(fill="both", expand=True, pady=(10, 0))
        
        details_text = tk.Text(details_frame, wrap=tk.WORD, height=10)
        details_text.pack(fill="both", expand=True, padx=5, pady=5)
        
        # Store question data
        current_questions = []
        
        def load_cluster():
            """Load questions for selected cluster."""
            selection = cluster_combo.current()
            if selection < 0 or selection >= len(self.micro_schema_clusters):
                return
            
            cluster, exemplars = self.micro_schema_clusters[selection]
            current_questions.clear()
            question_listbox.delete(0, tk.END)
            
            # Add all questions from cluster
            for ms in cluster:
                qid = ms.qid
                qtext = ms.question_item.text[:100] + "..." if len(ms.question_item.text) > 100 else ms.question_item.text
                is_exemplar = ms in exemplars
                label = f"{'[EXEMPLAR] ' if is_exemplar else ''}{qid}: {qtext}"
                question_listbox.insert(tk.END, label)
                current_questions.append({
                    "micro_schema": ms,
                    "is_exemplar": is_exemplar,
                    "qid": qid
                })
        
        def show_details(event=None):
            """Show details of selected question."""
            selection = question_listbox.curselection()
            if not selection:
                details_text.delete(1.0, tk.END)
                return
            
            idx = selection[0]
            if idx < len(current_questions):
                ms = current_questions[idx]["micro_schema"]
                q = ms.question_item
                
                details = f"""Question ID: {ms.qid}
Exam: {q.exam or 'N/A'}
Section: {q.section or 'N/A'}
Year: {q.year or 'N/A'}
Question Number: {q.qnum}

Question Text:
{q.text}

Core Move: {ms.core_move}
Triggers: {', '.join(ms.key_triggers)}
Wrong Paths: {', '.join(ms.wrong_paths)}
Representation: {ms.representation}
Difficulty: {ms.difficulty}
Answer Form: {ms.answer_form}

Solution Available: {'Yes' if q.solution_text else 'No'}
"""
                if q.solution_text:
                    details += f"\nSolution:\n{q.solution_text[:500]}..."
                
                details_text.delete(1.0, tk.END)
                details_text.insert(1.0, details)
        
        def delete_selected():
            """Delete selected questions from cluster."""
            selection = question_listbox.curselection()
            if not selection:
                messagebox.showwarning("No Selection", "Please select questions to delete.")
                return
            
            selected_indices = list(selection)
            selected_qids = [current_questions[i]["qid"] for i in selected_indices]
            
            confirm_msg = f"Delete {len(selected_indices)} question(s)?\n\n" + "\n".join(selected_qids[:5])
            if len(selected_qids) > 5:
                confirm_msg += f"\n... and {len(selected_qids) - 5} more"
            
            if not messagebox.askyesno("Confirm Delete", confirm_msg):
                return
            
            # Remove from cluster
            cluster_idx = cluster_combo.current()
            if cluster_idx >= 0 and cluster_idx < len(self.micro_schema_clusters):
                cluster, exemplars = self.micro_schema_clusters[cluster_idx]
                
                # Remove selected questions
                indices_to_remove = sorted(selected_indices, reverse=True)
                for idx in indices_to_remove:
                    ms_to_remove = current_questions[idx]["micro_schema"]
                    if ms_to_remove in cluster:
                        cluster.remove(ms_to_remove)
                    if ms_to_remove in exemplars:
                        exemplars.remove(ms_to_remove)
                
                # Reload display
                load_cluster()
                details_text.delete(1.0, tk.END)
                
                messagebox.showinfo("Deleted", f"Deleted {len(selected_indices)} question(s) from cluster.")
        
        def save_changes():
            """Save changes to clusters."""
            # Clusters are already updated in memory
            messagebox.showinfo("Saved", "Changes saved. Clusters updated in memory.")
        
        # Bind events
        cluster_combo.bind("<<ComboboxSelected>>", lambda e: load_cluster())
        question_listbox.bind("<<ListboxSelect>>", show_details)
        
        # Bottom: Action buttons
        bottom_frame = ttk.Frame(review_window)
        bottom_frame.pack(fill="x", padx=10, pady=10)
        
        ttk.Button(bottom_frame, text="Delete Selected", command=delete_selected).pack(side="left", padx=5)
        ttk.Button(bottom_frame, text="Save Changes", command=save_changes).pack(side="left", padx=5)
        ttk.Button(bottom_frame, text="Close", command=review_window.destroy).pack(side="right", padx=5)
        
        # Load first cluster
        if cluster_options:
            load_cluster()
    
    def on_preview_questions(self):
        """Preview questions - placeholder."""
        messagebox.showinfo("Not Implemented", "Preview questions functionality needs to be implemented.")
    
    def on_show_coverage(self):
        """Show coverage - placeholder."""
        messagebox.showinfo("Not Implemented", "Show coverage functionality needs to be implemented.")
    
    def on_accept_new(self):
        """Accept as new - placeholder."""
        messagebox.showinfo("Not Implemented", "Accept as new functionality needs to be implemented.")
    
    def on_ignore(self):
        """Ignore - placeholder."""
        messagebox.showinfo("Not Implemented", "Ignore functionality needs to be implemented.")
    
    def on_accept_all(self):
        """Accept all - placeholder."""
        messagebox.showinfo("Not Implemented", "Accept all functionality needs to be implemented.")
    
    def on_split(self):
        """Split - placeholder."""
        messagebox.showinfo("Not Implemented", "Split functionality needs to be implemented.")
    
    def on_reset_used_questions(self):
        """Reset used questions tracking - placeholder."""
        messagebox.showinfo("Not Implemented", "Reset used questions functionality needs to be implemented.")
    
    def on_select_candidate(self, event=None):
        """Handle candidate selection from listbox - placeholder."""
        # This is called when user selects a candidate from the list
        # For now, just a placeholder
        pass
    
    def _load_embeddings(self):
        """Load schema embeddings - placeholder."""
        self.schema_embeddings = {}
    
    def _load_meta(self):
        """Load schema metadata - placeholder."""
        self.schemas_meta = {}
        self.schema_fullness = {}
    
    def _load_used_questions(self):
        """Load used questions tracking - placeholder."""
        self.used_question_ids = set()
    
    def _wipe_schema_data(self):
        """Wipe all schema data for current mode (ESAT or TMUA)."""
        wiped_files = []
        
        try:
            # Determine which files to wipe based on mode
            if MODE == "TMUA":
                schema_files = [TMUA_PAPER1_SCHEMAS_MD, TMUA_PAPER2_SCHEMAS_MD]
            else:  # ESAT
                schema_files = [SCHEMAS_MD_DEFAULT]
            
            # Wipe schema files (clear content, keep file)
            for schema_file in schema_files:
                if schema_file.exists():
                    schema_file.write_text(f"# {MODE} Schemas\n\n", encoding="utf-8")
                    wiped_files.append(schema_file.name)
            
            # Wipe cache files
            cache_files = [
                SCHEMAS_META_JSON,
                SCHEMA_EMBEDDINGS_JSON,
                SCHEMA_COVERAGE_JSON,
                USED_QUESTIONS_JSON,
                DIAGRAM_OVERRIDES_JSON,
            ]
            
            for cache_file in cache_files:
                if cache_file.exists():
                    cache_file.unlink()
                    wiped_files.append(cache_file.name)
            
            # Wipe index (but only if in ESAT mode, or if we want to wipe TMUA index too)
            # For ESAT, wipe the index. For TMUA, we might want to keep it shared.
            if MODE == "ESAT" and INDEX_JSON.exists():
                # Check if index contains only ESAT questions
                try:
                    data = json.loads(safe_read_text(INDEX_JSON))
                    items = [QuestionItem(**x) for x in data]
                    # Only wipe if all questions are ESAT (not TMUA)
                    if all(q.exam != "TMUA" for q in items if q.exam):
                        INDEX_JSON.unlink()
                        wiped_files.append(INDEX_JSON.name)
                except:
                    # If we can't parse, wipe it anyway
                    INDEX_JSON.unlink()
                    wiped_files.append(INDEX_JSON.name)
            
            # Wipe log files
            log_files = [
                CANDIDATES_JSONL,
                DECISIONS_JSONL,
            ]
            
            for log_file in log_files:
                if log_file.exists():
                    log_file.unlink()
                    wiped_files.append(log_file.name)
            
            # Wipe PDF cache (all PDF caches - they'll be regenerated)
            if PDF_CACHE_DIR.exists():
                for cache_file in PDF_CACHE_DIR.glob("*.json"):
                    cache_file.unlink()
                    wiped_files.append(f"pdf_cache/{cache_file.name}")
            
            # Reset in-memory data
            self.index = []
            self.schema_summaries = []
            self.candidates = []
            self.sim_hits = {}
            self.schema_embeddings = {}
            self.schemas_meta = {}
            self.schema_fullness = {}
            self.used_question_ids = set()
            self.micro_schema_clusters = []
            self.micro_schema_quality = []
            
            # Reload schemas (will be empty now)
            self._load_schemas()
            self._load_embeddings()
            self._load_meta()
            self._load_used_questions()
            
            # Update UI
            if hasattr(self, 'cand_list'):
                self.cand_list.delete(0, tk.END)
            if hasattr(self, 'paper_progress_label'):
                self.paper_progress_label.config(text="Questions: 0/0")
            
            self._set_status(f"Wiped {len(wiped_files)} files for {MODE} mode")
            
        except Exception as e:
            print(f"[ERROR] Failed to wipe some files: {e}")
            import traceback
            traceback.print_exc()
        
        return wiped_files
    
    def _renumber_all_schemas(self):
        """Renumber all schemas - placeholder."""
        return {}
    
    def _split_tmua_schemas_by_paper_type(self):
        """Split TMUA schemas by paper type - placeholder."""
        return {"error": "Not implemented"}
    
    def on_micro_schema_pipeline(self):
        """Run the new full schema generation pipeline (final version)."""
        if not self.index:
            messagebox.showwarning("No Index", "Please index PDFs first.")
            return
        
        # Include ALL questions (solutions optional, diagrams allowed)
        # Apply batch filter if set
        eligible = list(self.index)  # Start with all questions
        
        # Get batch filter if it exists (defined later in _build_ui)
        batch_filter = ""
        if hasattr(self, 'batch_filter') and self.batch_filter:
            try:
                batch_filter = self.batch_filter.get().strip()
            except:
                pass
        if batch_filter:
            eligible = [q for q in eligible if batch_filter.lower() in str(q).lower()]
        
        if not eligible:
            messagebox.showwarning("No Questions", f"No eligible questions found (filter: '{batch_filter}').")
            return
        
        # Ask for confirmation
        total = len(eligible)
        if not messagebox.askyesno("Full Schema Generation Pipeline", 
            f"This will run the full pipeline on {total} questions:\n\n"
            f"1. Extract micro-schemas (subject-specific)\n"
            f"2. Validate & discard filtering\n"
            f"3. Quality scoring\n"
            f"4. Embedding computation\n"
            f"5. Anchor-based grouping (within subject)\n"
            f"6. Schema writing\n\n"
            f"This may take a while and use API credits.\n\n"
            f"Continue?"):
            return
        
        def work():
            try:
                # Initialize database
                db_path = str(Path(__file__).parent.parent / "restructure" / "nsaa_state.db")
                db = NSAASchemaDB(db_path)
                
                def progress_callback(current, total, msg):
                    self.after(0, lambda: self._set_status(msg))
                    if hasattr(self, 'progress_bar'):
                        self.after(0, lambda: self.progress_bar.config(maximum=total, value=current))
                
                # Run full pipeline
                stats = run_full_schema_pipeline(
                    eligible,
                    self.gemini,
                    db,
                    progress_callback=progress_callback
                )
                
                # Show summary
                summary = (
                    f"Full Schema Generation Pipeline Complete:\n\n"
                    f"Total questions: {stats['total_questions']}\n"
                    f"Extracted: {stats['extracted']}\n"
                    f"Discarded: {stats['discarded']}\n"
                    f"Validated: {stats['validated']}\n"
                    f"Embedded: {stats['embedded']}\n"
                    f"Schemas created: {stats['schemas_created']}\n\n"
                    f"By subject:\n"
                )
                for subject, sub_stats in stats['by_subject'].items():
                    summary += f"  {subject}: {sub_stats['schemas']} schemas, {sub_stats['questions_grouped']} questions\n"
                
                self.after(0, lambda: messagebox.showinfo("Pipeline Complete", summary))
                self.after(0, lambda: self._set_status(
                    f"Pipeline complete: {stats['schemas_created']} schemas created"))
                
            except Exception as e:
                error_msg = str(e)
                self.after(0, lambda: messagebox.showerror("Pipeline Failed", f"Error: {error_msg}"))
                self.after(0, lambda: self._set_status(f"Pipeline failed: {error_msg}"))
                import traceback
                traceback.print_exc()
        
        threading.Thread(target=work, daemon=True).start()
    
    # (Reclassification / clear-schemas handlers removed – pipeline will now
    # do subject classification up front when generating micro-schemas.)
    
    def _on_closing(self):
        """Handle window closing."""
        self.destroy()

# ----------------------------
# Main Entry Point
# ----------------------------

if __name__ == "__main__":
    import sys
    
    # Get project root and papers directory
    project_root = Path(__file__).resolve().parent.parent.parent
    papers_dir = project_root / "scripts" / "schema_generator" / "papers"
    
    # Determine schema file based on mode
    if MODE == "TMUA":
        schemas_md = TMUA_PAPER1_SCHEMAS_MD  # Default to Paper 1 for UI
    else:
        schemas_md = SCHEMAS_MD_DEFAULT
    
    # Create UI
    try:
        print("Starting Schema Generator UI...")
        print(f"Mode: {MODE}")
        print(f"Papers directory: {papers_dir}")
        print(f"Schemas file: {schemas_md}")
        app = App(project_root, papers_dir, schemas_md)
        print("UI initialized. Starting main loop...")
        app.mainloop()
    except KeyboardInterrupt:
        print("\nExiting...")
        sys.exit(0)
    except Exception as e:
        print(f"Error starting schema generator: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
