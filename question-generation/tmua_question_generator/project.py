#!/usr/bin/env python3
"""
TMUA Question Generator Pipeline (v2 - Paper-Specific)

Implements:
Schema -> Designer -> Implementer -> Verifier -> Style Judge -> Classifier -> Save
with Retry Controller (max retries on fixable failures).

Directory layout expected (relative to this script):
tmua_question_generator/
├── by_paper_prompts/
│   ├── Paper1/
│   │   ├── Paper1 Designer.md
│   │   ├── Paper1 Implementer.md
│   │   ├── Paper1 Verifier.md
│   │   ├── Paper1 Style_checker.md
│   │   ├── Paper1 Sibling Mode.md
│   │   └── Paper1 Far Mode.md
│   ├── Paper2/
│   │   ├── Paper2 Designer.md
│   │   ├── Paper2 Implementer.md
│   │   ├── Paper2 Verifier.md
│   │   ├── Paper2 Style_checker.md
│   │   ├── Paper2 Sibling Mode.md
│   │   └── Paper2 Far Mode.md
│   └── Spec.md (TMUA content specification)
├── schemas/ (or schemas in esat_question_generator/schemas/)
│   ├── Schemas_TMUA_Paper1.md
│   └── Schemas_TMUA_Paper2.md
└── old_prompt_structure/ (archived - not used in v2)

Notes:
- This script is interface-free. It writes JSONL logs/output files under runs/<timestamp>/.
- Requires a Gemini API key in .env.local file: GEMINI_API_KEY
- Uses Google GenAI Python SDK: `google-genai` (recommended) or falls back to REST stub.
- Loads environment variables from .env.local using python-dotenv
- Math questions get classified into Math 1 or Math 2 papers by the classifier
"""

from __future__ import annotations

import os
import sys
import re
import json
import time
import random
import hashlib
import datetime
import threading
import sqlite3
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Tuple, Callable
from dotenv import load_dotenv

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        # Python 3.7+
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        # Fallback for older Python versions
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# GUI support
try:
    import tkinter as tk
    from tkinter import ttk, scrolledtext
    _TKINTER_AVAILABLE = True
except ImportError:
    _TKINTER_AVAILABLE = False

# Google GenAI SDK (Gemini)
_GENAI_AVAILABLE = True
try:
    from google import genai
except Exception:
    _GENAI_AVAILABLE = False


# ---------- Config ----------

@dataclass
class ModelsConfig:
    designer: str = "gemini-3-pro-preview"
    implementer: str = "gemini-3-pro-preview"
    verifier: str = "gemini-2.5-flash"
    style_judge: str = "gemini-2.5-flash"
    classifier: str = "gemini-2.5-flash"  # NEW: For curriculum tag classification
    template_selector: str = "gemini-2.5-flash"  # For template selection
    graph_intent: str = "gemini-2.5-flash"  # For graph intent generation
    graph_regen: str = "gemini-2.5-flash"  # For graph regeneration
    format_fixer: str = "gemini-2.5-flash"  # For format fixing


def get_default_models_config() -> ModelsConfig:
    """
    Returns a ModelsConfig instance with default model values.
    This is the single source of truth for model defaults.
    Environment variables can override individual models.
    Falls back to MODEL_IMPLEMENTER for new fields if not set.
    """
    import os
    default_implementer = os.environ.get("MODEL_IMPLEMENTER", "gemini-3-pro-preview")
    return ModelsConfig(
        designer=os.environ.get("MODEL_DESIGNER", "gemini-3-pro-preview"),
        implementer=default_implementer,
        verifier=os.environ.get("MODEL_VERIFIER", "gemini-2.5-flash"),
        style_judge=os.environ.get("MODEL_STYLE", "gemini-2.5-flash"),
        classifier=os.environ.get("MODEL_CLASSIFIER", "gemini-2.5-flash"),
        template_selector=os.environ.get("MODEL_TEMPLATE_SELECTOR", default_implementer),
        graph_intent=os.environ.get("MODEL_GRAPH_INTENT", default_implementer),
        graph_regen=os.environ.get("MODEL_GRAPH_REGEN", default_implementer),
        format_fixer=os.environ.get("MODEL_FORMAT_FIXER", default_implementer),
    )


@dataclass
class RunConfig:
    max_implementer_retries: int = 2
    max_designer_retries: int = 2  # if designer outputs invalid YAML, etc.
    seed: Optional[int] = None
    difficulty_weights: Dict[str, float] = None  # type: ignore
    schema_weights: Optional[Dict[str, float]] = None  # optional weighting by schema_id
    out_dir: str = "runs"
    allow_schema_prefixes: Tuple[str, ...] = ("M", "R")  # Paper 1 (M_) and Paper 2 (R_) schema prefixes
    enable_tag_labeling: bool = True  # Enable curriculum tag labeling
    curriculum_file_path: Optional[str] = None  # Path to curriculum file (default: by_paper_prompts/Spec.md for TMUA)
    variation_mode: Optional[str] = None  # TMUA designer: force "sibling" / "far" (else env VARIATION_MODE or weighted random)

    def __post_init__(self):
        """Validate RunConfig parameters to catch unknown kwargs early."""
        if is_tmua_allow_schema_prefixes(self.allow_schema_prefixes):
            self.difficulty_weights = normalize_tmua_difficulty_weights(self.difficulty_weights)


def validate_run_config_kwargs(kwargs: Dict[str, Any]) -> None:
    """
    Validate that all kwargs are valid RunConfig parameters.
    Raises ValueError if unknown parameters are found.
    This is a helper to catch errors early before RunConfig initialization.
    """
    valid_fields = {
        'max_implementer_retries', 'max_designer_retries', 'seed',
        'difficulty_weights', 'schema_weights', 'out_dir',
        'allow_schema_prefixes', 'enable_tag_labeling', 'curriculum_file_path',
        'variation_mode',
    }
    unknown = set(kwargs.keys()) - valid_fields
    if unknown:
        raise ValueError(
            f"RunConfig got unexpected keyword arguments: {unknown}. "
            f"Valid fields are: {valid_fields}"
        )


# ---------- Utilities ----------

def read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)

def now_stamp() -> str:
    return datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

def sha1_short(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()[:10]

def strip_code_fences(text: str) -> str:
    """
    Removes surrounding ```json / ```yaml / ``` ... ``` fences if present.
    """
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```[a-zA-Z0-9_-]*\s*\n?", "", t)
        t = re.sub(r"\n?```\s*$", "", t.strip())
    return t.strip()


def prompt_json_dumps(obj: Any) -> str:
    """Pretty JSON for LLM user messages (UTF-8, stable for prompts)."""
    return json.dumps(obj, ensure_ascii=False, indent=2, default=str)


def _extract_top_json_object(s: str) -> Optional[str]:
    """Extract first balanced `{ ... }` from text (handles strings with braces)."""
    start_idx = s.find("{")
    if start_idx < 0:
        return None
    depth = 0
    in_string = False
    escape = False
    i = start_idx
    while i < len(s):
        ch = s[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
        else:
            if ch == '"':
                in_string = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return s[start_idx : i + 1]
        i += 1
    return None


def strip_markdown_formatting(text: str) -> str:
    """
    Strip markdown formatting from model output before JSON parse.
    """
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"__([^_]+)__", r"\1", text)
    text = re.sub(r"(?<!^)\*([^*\n]+)\*(?!\*)", r"\1", text, flags=re.MULTILINE)
    text = re.sub(r"(?<!^)_([^_\n]+)_(?!_)", r"\1", text, flags=re.MULTILINE)
    text = re.sub(r"^#+\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    text = re.sub(r"!\[([^\]]*)\]\([^\)]+\)", r"\1", text)
    return text


def strip_prompt_contamination_json(text: str) -> str:
    """If the model wrapped JSON in fences or led with prose, isolate the object."""
    m = re.search(r"```(?:json)?\s*\n(.*?)\n```", text, re.DOTALL)
    if m:
        inner = m.group(1).strip()
        if inner.startswith("{"):
            return inner
    snippet = _extract_top_json_object(text)
    if snippet:
        return snippet
    return text


def safe_json_load(text: str, strip_markdown: bool = False, strip_prompt: bool = False) -> Any:
    """
    Parse model output as JSON; strip fences; optionally strip markdown / leading prose.

    String values may contain colons, percent signs, and most Unicode; only " and \\ must be escaped in strings.
    """
    cleaned = text
    if strip_prompt:
        cleaned = strip_prompt_contamination_json(cleaned)
    if strip_markdown:
        cleaned = strip_markdown_formatting(cleaned)
    cleaned = strip_code_fences(cleaned).strip()
    if not cleaned:
        raise ValueError("JSON parse: empty input after stripping fences.")
    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError as e1:
        snippet = _extract_top_json_object(cleaned)
        if snippet:
            try:
                result = json.loads(snippet)
            except json.JSONDecodeError as e2:
                preview = cleaned[:500] if len(cleaned) <= 500 else cleaned[:500] + "\n... (truncated)"
                raise ValueError(
                    f"JSON parsing error: {e1}\nExtracted object also invalid: {e2}\n\nPreview:\n{preview}"
                ) from e2
        else:
            preview = cleaned[:500] if len(cleaned) <= 500 else cleaned[:500] + "\n... (truncated)"
            raise ValueError(f"JSON parsing error: {e1}\n\nPreview:\n{preview}") from e1
    if result is None:
        raise ValueError("JSON parsed to null (invalid for pipeline).")
    return result


def normalize_implementer_output(obj: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalise Implementer YAML into the expected structure.

    Some models nest `solution` under `question.solution` instead of top-level.
    This function promotes it to the top-level `solution` key so downstream
    agents (Verifier, Style Judge) see the expected schema.
    
    Also handles distractor_map which may be nested under question or at top level.
    """
    q = obj.get("question")
    if isinstance(q, dict):
        # If solution is nested under question, promote it
        if "solution" in q and "solution" not in obj and isinstance(q["solution"], dict):
            obj["solution"] = q["solution"]
        
        # If distractor_map is nested under question, promote it
        if "distractor_map" in q and "distractor_map" not in obj and isinstance(q["distractor_map"], dict):
            obj["distractor_map"] = q["distractor_map"]
    
    # Ensure distractor_map exists (even if empty) - it's required by the prompt
    if "distractor_map" not in obj:
        obj["distractor_map"] = {}
    
    return obj

def dump_jsonl(path: str, obj: Dict[str, Any]) -> None:
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


# ---------- Subject-specific helper functions ----------

def fetch_exemplar_texts(exemplar_ids: List[str]) -> List[str]:
    """Fetch the actual question text for each exemplar ID from the SQLite DB."""
    if not exemplar_ids:
        return []
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    qgen_root = os.path.dirname(current_dir)
    db_path = os.path.join(qgen_root, "schema_generator", "restructure", "nsaa_state.db")
    
    if not os.path.exists(db_path):
        return []
    
    texts = []
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        valid_ids = [eid for eid in exemplar_ids if eid.strip()]
        if not valid_ids:
            return []
            
        placeholders = ",".join(["?"] * len(valid_ids))
        query = f"SELECT text FROM questions_queue WHERE question_id IN ({placeholders})"
        cursor.execute(query, valid_ids)
        rows = cursor.fetchall()
        texts = [row[0] for row in rows]
        conn.close()
    except Exception as e:
        # Silently fail but print for debug if needed
        # print(f"Error fetching exemplar texts from {db_path}: {e}")
        pass
    
    return texts


TMUA_VARIATION_INSERT_MARKER = "<INSERT_VARIATION_POLICY>"


def load_variation_mode_weights(base_dir: str) -> Tuple[float, float]:
    """
    Load Sibling vs Far weights from ``variation_weights.txt`` under ``base_dir``.
    Returns ``(w_sibling, w_far)`` normalized to sum to 1.0. On missing/invalid file, (0.75, 0.25).
    """
    default = (0.75, 0.25)
    path = os.path.join(base_dir, "variation_weights.txt")
    if not os.path.isfile(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except OSError:
        return default
    sib: Optional[float] = None
    far: Optional[float] = None
    for line in content.split("\n"):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, rest = line.partition("=")
        k = key.strip().lower()
        try:
            val = float(rest.strip())
        except ValueError:
            continue
        if k in ("sibling", "sib"):
            sib = val
        elif k == "far":
            far = val
    if sib is None or far is None or sib < 0 or far < 0:
        return default
    tot = sib + far
    if tot <= 0:
        return default
    return (sib / tot, far / tot)


def _resolve_tmua_variation_mode(requested: Optional[str], base_dir: Optional[str] = None) -> str:
    """TMUA designer: SIBLING or FAR when forced; else weighted random from variation_weights.txt."""
    r = (requested or "").strip().lower()
    if r in ("sibling", "far"):
        return r
    bd = base_dir or os.path.dirname(os.path.abspath(__file__))
    ws, wf = load_variation_mode_weights(bd)
    return random.choices(["sibling", "far"], weights=[ws, wf], k=1)[0]


def _split_tmua_reference_question_solution(blob: str) -> Tuple[str, str]:
    """Split exemplar bank text into question vs solution when common separators exist."""
    blob = (blob or "").strip()
    if not blob:
        return "", ""
    for sep in ("\n---\n", "\n\nSolution\n", "\nSolution:\n", "\n\nOfficial solution\n", "\nOfficial solution:\n"):
        if sep in blob:
            q, s = blob.split(sep, 1)
            return q.strip(), s.strip()
    return blob, ""


def _inject_tmua_variation_policy(
    designer_body: str,
    paper_key: str,
    mode: str,
    variation_by_paper: Dict[str, Dict[str, str]],
) -> Tuple[str, bool]:
    """
    Inject Sibling/Far policy into Paper1/2 Designer.md at <INSERT_VARIATION_POLICY>, else append.
    ``mode`` is 'sibling' or 'far'.
    """
    per = variation_by_paper.get(paper_key) or {}
    blob = (per.get(mode) or "").strip()
    if not blob:
        return designer_body, False
    if TMUA_VARIATION_INSERT_MARKER in designer_body:
        return designer_body.replace(TMUA_VARIATION_INSERT_MARKER, blob, 1), True
    header = (
        "\n\n------------------------------------------------------------\n\n"
        "# VARIATION CONTRACT (mandatory)\n\n"
        f"Set variation_mode in your YAML output to exactly \"{mode.upper()}\".\n\n"
    )
    return designer_body + header + blob + "\n", True


def _tmua_designer_user_prompt(
    schema_block: str,
    difficulty: str,
    exemplar_ids: Optional[List[str]],
    mode_lower: str,
) -> str:
    """User message: variation_seed + schema + reference Q/S (matches Paper1 Designer.md)."""
    seed = mode_lower.strip().upper()
    lines = [
        f"variation_seed: {seed}",
        "",
        "Apply the variation policy in your system instructions. "
        f"Your YAML must set variation_mode to exactly \"{seed}\" (SIBLING or FAR).",
        "",
        "# Schema (invariant — preserve this reasoning pattern)",
        schema_block,
        "",
    ]
    ref_q, ref_sol = "", ""
    if exemplar_ids:
        sample_ids = random.sample(exemplar_ids, min(len(exemplar_ids), 1))
        texts = fetch_exemplar_texts(sample_ids)
        if texts:
            ref_q, ref_sol = _split_tmua_reference_question_solution(texts[0])

    if ref_q:
        lines.extend(["# Reference question (TMUA style calibration)", '"""', ref_q, '"""', ""])
        if ref_sol:
            lines.extend(["# Reference solution (difficulty + step-count calibration)", '"""', ref_sol, '"""', ""])
        else:
            lines.extend(
                [
                    "# Reference solution",
                    "(No separate solution section in bank text — use any solution text inside the question block if present.)",
                    "",
                ]
            )
    else:
        lines.extend(
            [
                "# Reference question",
                "(No exemplar from bank for this schema — design from schema + difficulty only.)",
                "",
                "# Reference solution",
                "(None.)",
                "",
            ]
        )

    lines.extend(
        [
            f"Target difficulty: {difficulty}",
            "",
            "Return raw YAML only in the format specified in your system instructions.",
        ]
    )
    return "\n".join(lines)


def get_subject_from_schema(schema_id: str) -> str:
    """Map schema_id prefix to subject name."""
    prefix = schema_id[0].upper()
    mapping = {
        'M': 'mathematics',
        'P': 'physics',
        'B': 'biology',
        'C': 'chemistry',
        'R': 'mathematics',
    }
    return mapping.get(prefix, 'mathematics')


def tmua_paper_key_from_schema_id(schema_id: str) -> str:
    """TMUA Paper 2 reasoning schemas use R_ prefix; Paper 1 knowledge uses M_ (and other non-R)."""
    return "Paper2" if schema_id.startswith("R_") else "Paper1"


def filter_prompt_by_subject(prompt_text: str, subject: str) -> str:
    """
    Extract only the relevant subject-specific section from universal prompts.
    
    For Verifier and Style_checker, these prompts have sections like:
    ### If `subject: mathematics`
    ...
    ### If `subject: physics`
    ...
    
    This function:
    1. Parses the markdown to find subject-specific sections
    2. Extracts ONLY the relevant subject section
    3. Returns the filtered prompt with subject-specific instructions inline
    """
    lines = prompt_text.split('\n')
    filtered_lines = []
    in_subject_section = False
    current_subject = None
    capture = True  # Always capture lines not in if blocks
    
    for line in lines:
        # Check if this is a subject-specific header
        if line.strip().startswith('### If `subject:'):
            # Extract subject name from header
            match = re.search(r'subject:\s*(\w+)', line)
            if match:
                current_subject = match.group(1).strip()
                if current_subject == subject:
                    # This is our subject section - capture following lines
                    in_subject_section = True
                    capture = True
                else:
                    # This is a different subject section - skip
                    in_subject_section = True
                    capture = False
                continue  # Don't include the header itself
            
        # Check if we're exiting a subject section (next ### header or ## header)
        elif line.strip().startswith('##') and in_subject_section:
            in_subject_section = False
            current_subject = None
            capture = True
            
        # Add line if we're capturing
        if capture:
            filtered_lines.append(line)
    
    return '\n'.join(filtered_lines)


def get_subject_prompts(prompts: 'Prompts', schema_id: str) -> Dict[str, str]:
    """Get subject-specific prompts based on schema_id."""
    subject = get_subject_from_schema(schema_id)

    # TMUA by_paper_prompts: dict keys are Paper1 / Paper2 (not mathematics)
    if "Paper1" in prompts.designer or "Paper2" in prompts.designer:
        paper = tmua_paper_key_from_schema_id(schema_id)
        designer_prompt = prompts.designer.get(paper, "") or prompts.designer.get("Paper1", "")
        implementer_prompt = prompts.implementer.get(paper, "") or prompts.implementer.get("Paper1", "")
        classifier_prompt = prompts.classifier.get(paper, "") or prompts.classifier.get("Paper1", "")
    else:
        designer_prompt = prompts.designer.get(subject, "")
        implementer_prompt = prompts.implementer.get(subject, "")
        classifier_prompt = prompts.classifier.get(subject, "")

        if not designer_prompt and prompts.designer:
            designer_prompt = list(prompts.designer.values())[0]
        if not implementer_prompt and prompts.implementer:
            implementer_prompt = list(prompts.implementer.values())[0]
        if not classifier_prompt and prompts.classifier:
            classifier_prompt = list(prompts.classifier.values())[0]

    return {
        'designer': designer_prompt,
        'implementer': implementer_prompt,
        'classifier': classifier_prompt
    }


# ---------- Schema parsing ----------

# Updated regex to accept numbered (M1, P3), unique (M_a1b2c3d4, R_a1b2c3d4), and unnumbered (M., P.) formats
# Includes R prefix for TMUA Paper 2 (Reasoning)
SCHEMA_HEADER_RE = re.compile(r"^##\s+\*\*((?:M|P|B|C|R)(?:\d+|_[a-f0-9]{8}))\.?\s+(.+?)\*\*\s*$", re.MULTILINE)

def parse_schemas_from_markdown(md: str, allow_prefixes: Tuple[str, ...]=("M","P")) -> Dict[str, Dict[str, str]]:
    """
    Parses Schemas.md into blocks keyed by schema_id (e.g., M1, P3, or M_custom, P_custom).
    Accepts both numbered format (## **M1. Title**) and unnumbered format (## **M. Title**).
    For unnumbered schemas, generates schema_id as {prefix}_{sanitized_title}.
    Returns: { "M1": {"title": "...", "block": "## M1...."} , ... }
    """
    matches = list(SCHEMA_HEADER_RE.finditer(md))
    schemas: Dict[str, Dict[str, str]] = {}
    unnumbered_counter = {}  # Track unnumbered schemas per prefix
    
    for i, m in enumerate(matches):
        schema_prefix_and_num = m.group(1).strip()
        title = m.group(2).strip()
        
        # Extract prefix (M, P, B, C, or R)
        prefix = schema_prefix_and_num[0]
        if prefix not in allow_prefixes:
            continue
        
        # Determine schema_id
        if schema_prefix_and_num.endswith('.'):
            # Unnumbered format (M., P.) - generate ID from title
            # Use a simple sanitization: lowercase, replace spaces with underscores, remove special chars
            sanitized_title = re.sub(r'[^a-zA-Z0-9\s]', '', title).strip().lower()
            sanitized_title = re.sub(r'\s+', '_', sanitized_title)[:30]  # Limit length
            if not sanitized_title:
                sanitized_title = "unnamed"
            # Add counter to ensure uniqueness
            if prefix not in unnumbered_counter:
                unnumbered_counter[prefix] = {}
            if sanitized_title not in unnumbered_counter[prefix]:
                unnumbered_counter[prefix][sanitized_title] = 0
            unnumbered_counter[prefix][sanitized_title] += 1
            counter = unnumbered_counter[prefix][sanitized_title]
            schema_id = f"{prefix}_{sanitized_title}" if counter == 1 else f"{prefix}_{sanitized_title}_{counter}"
        elif '_' in schema_prefix_and_num:
            # Unique ID format (M_a1b2c3d4) - use as-is
            schema_id = schema_prefix_and_num
        else:
            # Numbered format (M1, P3) - use as-is
            schema_id = schema_prefix_and_num
        
        start = m.start()
        end = matches[i+1].start() if i+1 < len(matches) else len(md)
        block = md[start:end].strip()
        
        # Extract exemplar IDs from the block (format: - `ID`: Justification)
        exemplar_ids = re.findall(r"- `([^`]+)`:", block)
        
        schemas[schema_id] = {"title": title, "block": block, "exemplar_ids": exemplar_ids}
    
    if not schemas:
        raise ValueError("No schemas parsed. Ensure Schemas.md uses headings like: ## **M1. Title** or ## **P1. Title** or ## **B1. Title** or ## **C1. Title** or ## **M. Title** or ## **P. Title**")
    return schemas


# ---------- Gemini client wrapper ----------


def _llm_debug_logging_enabled() -> bool:
    return os.environ.get("GEMINI_DEBUG_LLM", "").strip().lower() in ("1", "true", "yes")


class LLMClient:
    # Class-level tracking of exhausted models (shared across instances)
    _exhausted_models: Dict[str, float] = {}  # model -> timestamp when exhausted
    _exhausted_lock = threading.Lock()  # Lock for exhausted models dict
    _api_concurrency_sem: Optional[threading.BoundedSemaphore] = None
    _api_sem_init_lock = threading.Lock()
    _global_pacing_lock = threading.Lock()
    _global_last_call_time: float = 0.0
    
    # Model fallback chain: if primary model is exhausted, try these in order
    MODEL_FALLBACKS = {
        "gemini-3-pro-preview": ["gemini-2.5-pro", "gemini-2.5-flash"],
        "gemini-3-pro": ["gemini-2.5-pro", "gemini-2.5-flash"],
        "gemini-2.5-pro": ["gemini-2.5-flash"],
        "gemini-2.5-flash": [],  # No fallback for flash (cheapest)
    }
    
    def __init__(self, api_key: str, min_delay: float = 0.5, rate_limit_delay: float = 5.0):
        """
        Initialize LLM client with rate limiting and quota exhaustion handling.
        
        Args:
            api_key: Gemini API key
            min_delay: Minimum delay between API calls in seconds (default: 0.5s)
            rate_limit_delay: Initial delay when rate limit is hit (default: 5.0s)
        """
        self.api_key = api_key
        self.client = None
        self.last_usage = None  # Store last API call's token usage
        self.total_usage = {"prompt_tokens": 0, "candidates_tokens": 0, "total_tokens": 0}  # Accumulate total usage
        self.min_delay = min_delay  # Minimum delay between calls
        self.rate_limit_delay = rate_limit_delay  # Current delay for rate limits
        self.rate_limit_count = 0  # Track consecutive rate limit errors
        self.lock = threading.Lock()  # Thread-safe rate limiting
        if _GENAI_AVAILABLE:
            self.client = genai.Client(api_key=api_key)
    
    @classmethod
    def mark_model_exhausted(cls, model: str, duration_hours: float = 24.0):
        """
        Mark a model as exhausted (daily quota reached).
        Model will be avoided for the specified duration.
        """
        with cls._exhausted_lock:
            cls._exhausted_models[model] = time.time() + (duration_hours * 3600)
            print(f"[LLMClient] ⚠️  Marked {model} as exhausted (daily quota). Will avoid for {duration_hours} hours.")
    
    @classmethod
    def is_model_exhausted(cls, model: str) -> bool:
        """Check if a model is currently marked as exhausted."""
        with cls._exhausted_lock:
            if model not in cls._exhausted_models:
                return False
            # Check if exhaustion period has expired
            if time.time() > cls._exhausted_models[model]:
                del cls._exhausted_models[model]
                print(f"[LLMClient] ✓ {model} quota reset - can use again")
                return False
            return True
    
    @classmethod
    def get_fallback_model(cls, model: str) -> Optional[str]:
        """
        Get the next available fallback model if the primary is exhausted.
        Returns None if no fallback is available.
        """
        fallbacks = cls.MODEL_FALLBACKS.get(model, [])
        for fallback in fallbacks:
            if not cls.is_model_exhausted(fallback):
                return fallback
        return None

    @classmethod
    def _get_api_semaphore(cls) -> threading.BoundedSemaphore:
        with cls._api_sem_init_lock:
            if cls._api_concurrency_sem is None:
                n = max(1, int(os.environ.get("GEMINI_MAX_CONCURRENT", "4")))
                cls._api_concurrency_sem = threading.BoundedSemaphore(n)
            return cls._api_concurrency_sem

    def generate(self, model: str, system_prompt: str, user_prompt: str, temperature: float=0.6, max_retries: int=3) -> str:
        """
        Returns model output as text.
        Retries on transient errors (503, network issues) with exponential backoff.
        Implements rate limiting with automatic delay adjustment.
        Automatically falls back to alternative models if daily quota is exhausted.
        """
        if not self.client:
            raise RuntimeError(
                "Google GenAI SDK not available. Install with `pip install google-genai` "
                "or adapt the code to your preferred LLM client."
            )

        # Check if primary model is exhausted, try fallback
        original_model = model
        if self.is_model_exhausted(model):
            fallback = self.get_fallback_model(model)
            if fallback:
                print(f"[LLMClient] ⚠️  {model} daily quota exhausted. Falling back to {fallback}")
                model = fallback
            else:
                print(f"[LLMClient] ⚠️  {model} daily quota exhausted and no fallback available.")
                raise RuntimeError(f"Model {model} daily quota exhausted and no fallback model available. "
                                 f"Please wait or use a different model.")

        last_error = None
        _dbg = _llm_debug_logging_enabled()
        for attempt in range(max_retries):
            sem = self._get_api_semaphore()
            sem.acquire()
            try:
                if self.min_delay > 0:
                    while True:
                        with LLMClient._global_pacing_lock:
                            elapsed = time.time() - LLMClient._global_last_call_time
                            wait = self.min_delay - elapsed
                        if wait <= 0:
                            break
                        if _dbg:
                            print(f"[DEBUG] Respecting min_delay={self.min_delay}s, sleeping for {wait:.2f}s")
                        time.sleep(wait)

                if _dbg:
                    api_key_preview = f"{self.api_key[:8]}...{self.api_key[-4:]}" if len(self.api_key) > 12 else "***"
                    print(f"[DEBUG] LLMClient.generate - Model: {model}, Attempt: {attempt + 1}/{max_retries}")
                    print(f"[DEBUG] API Key preview: {api_key_preview}, Length: {len(self.api_key)}")

                resp = self.client.models.generate_content(
                    model=model,
                    contents=user_prompt,
                    config={
                        "system_instruction": system_prompt,
                        "temperature": temperature,
                    },
                )

                with LLMClient._global_pacing_lock:
                    LLMClient._global_last_call_time = time.time()

                if _dbg:
                    print(f"[DEBUG] ✓ API call successful for model {model}")
                # Reset rate limit counter on success
                with self.lock:
                    self.rate_limit_count = 0
                    # Gradually reduce delay if we've had successful calls
                    if self.rate_limit_delay > self.min_delay:
                        self.rate_limit_delay = max(self.min_delay, self.rate_limit_delay * 0.9)

                if _dbg and hasattr(self, "last_usage") and self.last_usage:
                    print(f"[DEBUG] Token usage: {self.last_usage}")
                # Capture usage metadata if available
                usage_info = {}
                if hasattr(resp, 'usage_metadata'):
                    usage_info = {
                        "prompt_tokens": getattr(resp.usage_metadata, 'prompt_token_count', None),
                        "candidates_tokens": getattr(resp.usage_metadata, 'candidates_token_count', None),
                        "total_tokens": getattr(resp.usage_metadata, 'total_token_count', None),
                    }
                elif hasattr(resp, 'usage'):
                    usage_info = {
                        "prompt_tokens": getattr(resp.usage, 'prompt_token_count', None),
                        "candidates_tokens": getattr(resp.usage, 'candidates_token_count', None),
                        "total_tokens": getattr(resp.usage, 'total_token_count', None),
                    }
                
                # Store usage info in a class variable for retrieval
                if usage_info and any(usage_info.values()):
                    self.last_usage = usage_info
                    # Accumulate total usage
                    for key in self.total_usage:
                        if usage_info.get(key) is not None:
                            self.total_usage[key] += usage_info[key]
                
                # The SDK returns resp.text convenience property
                return (resp.text or "").strip()
            except Exception as e:
                last_error = e
                error_str = str(e)

                if _dbg:
                    print(f"[DEBUG] ✗ API call failed for model {model}, attempt {attempt + 1}/{max_retries}")
                    print(f"[DEBUG] Error type: {type(e).__name__}")
                    print(f"[DEBUG] Error message: {error_str[:300]}")

                # Check for API key errors specifically
                if "403" in error_str or "PERMISSION_DENIED" in error_str:
                    if _dbg:
                        api_key_preview = f"{self.api_key[:8]}...{self.api_key[-4:]}" if len(self.api_key) > 12 else "***"
                        print(f"[DEBUG] ⚠ API Key Error Detected!")
                        print(f"[DEBUG] API Key preview: {api_key_preview}, Length: {len(self.api_key)}")
                        print(f"[DEBUG] Full error: {error_str}")
                    # Don't retry on API key errors - they won't succeed
                    raise
                
                # Check for quota exhaustion (daily limit) - different from rate limits
                is_quota_exhausted = (
                    "RESOURCE_EXHAUSTED" in error_str or
                    ("quota" in error_str.lower() and "exceeded" in error_str.lower()) or
                    ("quota" in error_str.lower() and "daily" in error_str.lower()) or
                    ("429" in error_str and "quota" in error_str.lower())
                )
                
                # Check for rate limit errors (429 without quota message = per-minute limit)
                is_rate_limit = (
                    "429" in error_str and not is_quota_exhausted or
                    "rate limit" in error_str.lower() and "daily" not in error_str.lower()
                )
                
                # Handle daily quota exhaustion - try fallback model
                if is_quota_exhausted:
                    # Mark this model as exhausted
                    self.mark_model_exhausted(model, duration_hours=24.0)
                    
                    # Try fallback model if available
                    fallback = self.get_fallback_model(original_model)
                    if fallback and fallback != model:
                        print(f"[LLMClient] ⚠️  {model} daily quota exhausted. Switching to fallback: {fallback}")
                        # Recursively try with fallback model
                        try:
                            return self.generate(fallback, system_prompt, user_prompt, temperature, max_retries)
                        except Exception as fallback_error:
                            print(f"[LLMClient] ⚠️  Fallback {fallback} also failed: {fallback_error}")
                            raise RuntimeError(f"Both {original_model} and fallback {fallback} failed. "
                                             f"Original error: {error_str[:200]}")
                    else:
                        raise RuntimeError(f"Model {model} daily quota exhausted. "
                                         f"No fallback available. Please wait 24 hours or use a different model. "
                                         f"Error: {error_str[:200]}")
                
                # Handle per-minute rate limits (not daily quota)
                if is_rate_limit:
                    with self.lock:
                        self.rate_limit_count += 1
                        # Exponential backoff for rate limits: increase delay each time
                        self.rate_limit_delay = min(60.0, self.rate_limit_delay * 1.5)  # Cap at 60 seconds
                        wait_time = self.rate_limit_delay
                        print(
                            f"[WARN] Rate limit detected (count: {self.rate_limit_count}), "
                            f"waiting {wait_time:.1f} seconds..."
                        )

                    if attempt < max_retries - 1:
                        time.sleep(wait_time)
                        continue
                    else:
                        raise RuntimeError(f"Rate limit exceeded after {max_retries} attempts. "
                                         f"Consider reducing workers or increasing delays. "
                                         f"Last error: {error_str[:200]}")
                
                # Check if it's a transient error that we should retry
                is_transient = (
                    "503" in error_str or 
                    "UNAVAILABLE" in error_str or
                    "overloaded" in error_str.lower() or
                    "disconnected" in error_str.lower() or
                    "getaddrinfo" in error_str.lower() or
                    "timeout" in error_str.lower() or
                    "connection" in error_str.lower()
                )
                
                if is_transient and attempt < max_retries - 1:
                    # Exponential backoff: wait 2^attempt seconds
                    wait_time = 2 ** attempt
                    if _dbg:
                        print(f"[DEBUG] Transient error detected, retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    # Not transient or out of retries, raise the error
                    if _dbg:
                        print(f"[DEBUG] Non-transient error or max retries reached, raising error")
                    raise
            finally:
                sem.release()

        # If we get here, all retries failed
        raise RuntimeError(f"Failed after {max_retries} attempts. Last error: {last_error}")


# ---------- Prompt loaders ----------

@dataclass
class Prompts:
    # Subject-specific prompts (dict mapping subject -> prompt text)
    designer: Dict[str, str]
    implementer: Dict[str, str]
    classifier: Dict[str, str]
    
    # Universal prompts (single string, contains all subject sections)
    retry_controller: str
    verifier: str  # Contains if statements for all subjects
    style_checker: str  # Contains if statements for all subjects
    # TMUA by_paper_prompts: Paper1 / Paper2 text (ESAT loads leave these None)
    verifier_by_paper: Optional[Dict[str, str]] = None
    style_checker_by_paper: Optional[Dict[str, str]] = None
    retry_controller_by_paper: Optional[Dict[str, str]] = None


def load_prompts(base_dir: str) -> Prompts:
    """Load prompts from by_paper_prompts structure (for TMUA) or by_subject_prompts (for ESAT)."""
    Prompts.tmua_variation_modes = {}

    # Try by_paper_prompts first (TMUA structure)
    paper_prompt_dir = os.path.join(base_dir, "by_paper_prompts")
    subject_prompt_dir = os.path.join(base_dir, "by_subject_prompts")
    
    # Check which structure exists
    if os.path.exists(paper_prompt_dir):
        # TMUA structure: by_paper_prompts/Paper1/, by_paper_prompts/Paper2/
        # Load each paper separately so R_ schemas always use Paper2 prompts.
        designers: Dict[str, str] = {}
        implementers: Dict[str, str] = {}
        classifiers: Dict[str, str] = {}
        verifier_by_paper: Dict[str, str] = {}
        style_checker_by_paper: Dict[str, str] = {}
        retry_controller_by_paper: Dict[str, str] = {}
        variation_by_paper: Dict[str, Dict[str, str]] = {}

        for paper in ("Paper1", "Paper2"):
            paper_path = os.path.join(paper_prompt_dir, paper)
            if not os.path.exists(paper_path):
                continue

            sibling_fp = os.path.join(paper_path, f"{paper} Sibling Mode.md")
            far_fp = os.path.join(paper_path, f"{paper} Far Mode.md")
            variation_by_paper[paper] = {
                "sibling": read_text(sibling_fp) if os.path.isfile(sibling_fp) else "",
                "far": read_text(far_fp) if os.path.isfile(far_fp) else "",
            }

            designer_files = [f for f in os.listdir(paper_path) if 'Designer' in f and f.endswith('.md')]
            if designer_files:
                designers[paper] = read_text(os.path.join(paper_path, designer_files[0]))

            impl_files = [f for f in os.listdir(paper_path) if 'Implementer' in f and f.endswith('.md')]
            if impl_files:
                implementers[paper] = read_text(os.path.join(paper_path, impl_files[0]))

            class_files = [f for f in os.listdir(paper_path) if 'Classifier' in f and f.endswith('.md')]
            if class_files:
                classifiers[paper] = read_text(os.path.join(paper_path, class_files[0]))

            verifier_path = os.path.join(paper_path, f"{paper} Verifier.md")
            if not os.path.exists(verifier_path):
                verifier_files = [f for f in os.listdir(paper_path) if 'Verifier' in f and f.endswith('.md')]
                verifier_path = os.path.join(paper_path, verifier_files[0]) if verifier_files else ""
            if verifier_path and os.path.exists(verifier_path):
                verifier_by_paper[paper] = read_text(verifier_path)

            style_checker_path = os.path.join(paper_path, f"{paper} Style_checker.md")
            if not os.path.exists(style_checker_path):
                style_files = [f for f in os.listdir(paper_path) if 'Style' in f and f.endswith('.md')]
                style_checker_path = os.path.join(paper_path, style_files[0]) if style_files else ""
            if style_checker_path and os.path.exists(style_checker_path):
                style_checker_by_paper[paper] = read_text(style_checker_path)

            retry_controller_path = os.path.join(paper_path, f"{paper} Retry_controller.md")
            if not os.path.exists(retry_controller_path):
                retry_files = [f for f in os.listdir(paper_path) if 'Retry' in f and f.endswith('.md')]
                retry_controller_path = os.path.join(paper_path, retry_files[0]) if retry_files else ""
            if retry_controller_path and os.path.exists(retry_controller_path):
                retry_controller_by_paper[paper] = read_text(retry_controller_path)

        # Legacy single-string fields default to Paper1 (then Paper2) for any code that reads them directly
        retry_controller = retry_controller_by_paper.get("Paper1", "") or retry_controller_by_paper.get("Paper2", "")
        verifier = verifier_by_paper.get("Paper1", "") or verifier_by_paper.get("Paper2", "")
        style_checker = style_checker_by_paper.get("Paper1", "") or style_checker_by_paper.get("Paper2", "")

        Prompts.tmua_variation_modes = variation_by_paper

        return Prompts(
            designer=designers,
            implementer=implementers,
            classifier=classifiers,
            retry_controller=retry_controller,
            verifier=verifier,
            style_checker=style_checker,
            verifier_by_paper=verifier_by_paper or None,
            style_checker_by_paper=style_checker_by_paper or None,
            retry_controller_by_paper=retry_controller_by_paper or None,
        )
    
    elif os.path.exists(subject_prompt_dir):
        # ESAT structure: by_subject_prompts/Maths/, by_subject_prompts/Physics/, etc.
        subjects = {
            'mathematics': 'Maths',
            'physics': 'Physics',
            'biology': 'Biology',
            'chemistry': 'Chemistry'
        }
        
        designers = {}
        implementers = {}
        classifiers = {}
        
        for subject_key, folder_name in subjects.items():
            subject_path = os.path.join(subject_prompt_dir, folder_name)
            if not os.path.exists(subject_path):
                continue
            
            # Find and load Designer file (e.g., "Math Designer.md", "Biology Designer.md")
            designer_files = [f for f in os.listdir(subject_path) if 'Designer' in f and f.endswith('.md')]
            if designer_files:
                designers[subject_key] = read_text(os.path.join(subject_path, designer_files[0]))
            
            # Find and load Implementer file
            impl_files = [f for f in os.listdir(subject_path) if 'Implementer' in f and f.endswith('.md')]
            if impl_files:
                implementers[subject_key] = read_text(os.path.join(subject_path, impl_files[0]))
            
            # Find and load Classifier file
            class_files = [f for f in os.listdir(subject_path) if 'Classifier' in f and f.endswith('.md')]
            if class_files:
                classifiers[subject_key] = read_text(os.path.join(subject_path, class_files[0]))
        
        # Load universal prompts (contain all subject sections)
        retry_controller_path = os.path.join(subject_prompt_dir, "Retry_controller.md")
        verifier_path = os.path.join(subject_prompt_dir, "Verifier.md")
        style_checker_path = os.path.join(subject_prompt_dir, "Style_checker.md")
        
        retry_controller = read_text(retry_controller_path) if os.path.exists(retry_controller_path) else ""
        verifier = read_text(verifier_path) if os.path.exists(verifier_path) else ""
        style_checker = read_text(style_checker_path) if os.path.exists(style_checker_path) else ""
        
        return Prompts(
            designer=designers,
            implementer=implementers,
            classifier=classifiers,
            retry_controller=retry_controller,
            verifier=verifier,
            style_checker=style_checker
        )
    else:
        raise FileNotFoundError(
            f"Prompt directory not found. Expected either '{paper_prompt_dir}' or '{subject_prompt_dir}'"
        )


# ---------- Pipeline steps ----------

def choose_schema(schemas: Dict[str, Dict[str, str]], cfg: RunConfig) -> str:
    ids = [sid for sid in schemas.keys() if sid.startswith(cfg.allow_schema_prefixes)]
    if not ids:
        raise ValueError("No schemas available after prefix filter.")
    if cfg.schema_weights:
        weights = [cfg.schema_weights.get(sid, 1.0) for sid in ids]
        return random.choices(ids, weights=weights, k=1)[0]
    return random.choice(ids)

def get_schemas_sorted_by_category(schemas: Dict[str, Dict[str, str]], category_order: List[str] = None) -> List[Tuple[str, str]]:
    """
    Get schemas sorted by category and number.
    
    Args:
        schemas: Dictionary of schemas
        category_order: List of category prefixes in desired order (e.g., ["M", "P", "B", "C"])
        
    Returns:
        List of tuples (schema_id, category) sorted by category and schema number
    """
    if category_order is None:
        category_order = ["M", "P", "B", "C"]
    
    # Group schemas by category
    by_category = {}
    for schema_id in schemas.keys():
        prefix = schema_id[0].upper()
        if prefix in category_order:
            if prefix not in by_category:
                by_category[prefix] = []
            by_category[prefix].append(schema_id)
    
    # Sort schemas within each category by number
    for prefix in by_category:
        by_category[prefix].sort(key=lambda sid: int(re.search(r'\d+', sid).group()) if re.search(r'\d+', sid) else 999)
    
    # Build sorted list
    result = []
    for prefix in category_order:
        if prefix in by_category:
            for schema_id in by_category[prefix]:
                result.append((schema_id, prefix))
    
    return result


def is_tmua_allow_schema_prefixes(allow_schema_prefixes: Optional[Tuple[str, ...]]) -> bool:
    """
    True when every configured schema prefix is TMUA (first character M or R after uppercasing).
    Empty tuple is False (not treated as TMUA-only).
    """
    if not allow_schema_prefixes:
        return False
    for p in allow_schema_prefixes:
        u = (p or "").strip().upper()
        if not u or u[0] not in ("M", "R"):
            return False
    return True


def _is_tmua_run(cfg: RunConfig) -> bool:
    return is_tmua_allow_schema_prefixes(cfg.allow_schema_prefixes)


_TMUA_DIFFICULTY_KEYS = frozenset({"Hard", "Extreme"})


def normalize_tmua_difficulty_weights(weights: Optional[Dict[str, float]]) -> Dict[str, float]:
    """
    TMUA generation uses only Hard and Extreme. Strips Easy/Medium; fills missing tiers from env defaults.
    """
    env_hard = max(0.0, float(os.environ.get("W_HARD", "0.5")))
    env_ext = max(0.0, float(os.environ.get("W_EXTREME", "0.5")))
    defaults = {"Hard": env_hard, "Extreme": env_ext}

    filtered: Dict[str, float] = {}
    if weights:
        for k in _TMUA_DIFFICULTY_KEYS:
            v = weights.get(k)
            if v is not None and float(v) > 0:
                filtered[k] = float(v)
    for k in _TMUA_DIFFICULTY_KEYS:
        if k not in filtered and defaults[k] > 0:
            filtered[k] = defaults[k]
    if not filtered:
        return {"Hard": 0.5, "Extreme": 0.5}
    total = sum(filtered.values())
    if total <= 0:
        return {"Hard": 0.5, "Extreme": 0.5}
    return {k: v / total for k, v in filtered.items()}


def difficulty_weights_from_env(allow_schema_prefixes: Tuple[str, ...]) -> Dict[str, float]:
    """Env-based difficulty weights; TMUA (M/R-only prefixes) uses Hard + Extreme only."""
    if is_tmua_allow_schema_prefixes(allow_schema_prefixes):
        return normalize_tmua_difficulty_weights(
            {
                "Hard": float(os.environ.get("W_HARD", "0.5")),
                "Extreme": float(os.environ.get("W_EXTREME", "0.5")),
            }
        )
    return {
        "Easy": float(os.environ.get("W_EASY", "0.3")),
        "Medium": float(os.environ.get("W_MED", "0.5")),
        "Hard": float(os.environ.get("W_HARD", "0.2")),
    }


def choose_difficulty(cfg: RunConfig) -> str:
    if _is_tmua_run(cfg):
        if not cfg.difficulty_weights:
            return random.choice(["Hard", "Extreme"])
        filtered = {k: v for k, v in cfg.difficulty_weights.items() if k in _TMUA_DIFFICULTY_KEYS}
        if not filtered:
            return random.choice(["Hard", "Extreme"])
        diffs = list(filtered.keys())
        weights = [filtered[d] for d in diffs]
        return random.choices(diffs, weights=weights, k=1)[0]
    if not cfg.difficulty_weights:
        return random.choice(["Easy", "Medium", "Hard"])
    diffs = list(cfg.difficulty_weights.keys())
    weights = [cfg.difficulty_weights[d] for d in diffs]
    return random.choices(diffs, weights=weights, k=1)[0]

def normalize_and_validate_designer_output(obj: Dict[str, Any], schema_id: str) -> Dict[str, Any]:
    """
    Normalize and validate designer output.
    - Auto-injects missing paper field based on schema_id prefix
    - Converts legacy syllabus_tags to section1_primary_tag format
    - Validates paper-specific tag requirements
    - Logs any auto-injections
    """
    prefix = schema_id[0].upper()
    
    # Infer paper from schema_id prefix if not set
    paper = obj.get("paper")
    if not paper or paper is None:
        if prefix == "M":
            paper = "Paper1"
            print(f"[DESIGNER_VALIDATION] Paper missing → auto-injected paper1 for schema {schema_id}")
        elif prefix == "R":
            paper = "Paper2"
            print(f"[DESIGNER_VALIDATION] Paper missing → auto-injected paper2 for schema {schema_id}")
        obj["paper"] = paper
    
    # Normalize paper value (handle case variations)
    paper_lower = str(paper).lower()
    if paper_lower in ["paper1", "paper 1", "1"]:
        obj["paper"] = "Paper1"
        paper = "Paper1"
    elif paper_lower in ["paper2", "paper 2", "2"]:
        obj["paper"] = "Paper2"
        paper = "Paper2"
    
    # Convert legacy syllabus_tags to section1_primary_tag format
    if "syllabus_tags" in obj and "section1_primary_tag" not in obj:
        syllabus_tags = obj.get("syllabus_tags", [])
        if isinstance(syllabus_tags, list) and len(syllabus_tags) > 0:
            obj["section1_primary_tag"] = syllabus_tags[0]
            if len(syllabus_tags) > 1:
                obj["section1_secondary_tags"] = syllabus_tags[1:]
            else:
                obj["section1_secondary_tags"] = []
            print(f"[DESIGNER_VALIDATION] Converted legacy syllabus_tags to section1_primary_tag format for schema {schema_id}")
        del obj["syllabus_tags"]  # Remove legacy field
    
    # Ensure section1_secondary_tags is always a list
    if "section1_secondary_tags" in obj:
        if not isinstance(obj["section1_secondary_tags"], list):
            obj["section1_secondary_tags"] = [obj["section1_secondary_tags"]] if obj["section1_secondary_tags"] else []
    elif "section1_primary_tag" in obj:
        obj["section1_secondary_tags"] = []
    
    # Validate paper-specific tag requirements
    if paper == "Paper1":
        if "section1_primary_tag" not in obj or not obj["section1_primary_tag"]:
            raise ValueError(f"Designer tag validation failed: Paper 1 must have section1_primary_tag")
        # Paper1 should not have section2 tags
        if "section2_primary_tag" in obj:
            print(f"[DESIGNER_VALIDATION] Warning: Paper1 question has section2_primary_tag, removing it")
            del obj["section2_primary_tag"]
        if "section2_secondary_tags" in obj:
            del obj["section2_secondary_tags"]
    elif paper == "Paper2":
        if "section2_primary_tag" not in obj or not obj["section2_primary_tag"]:
            # Paper2 can optionally have section1 tags, but must have section2
            raise ValueError(f"Designer tag validation failed: Paper 2 must have section2_primary_tag")
        # Ensure section2_secondary_tags is a list
        if "section2_secondary_tags" not in obj:
            obj["section2_secondary_tags"] = []
        elif not isinstance(obj["section2_secondary_tags"], list):
            obj["section2_secondary_tags"] = [obj["section2_secondary_tags"]] if obj["section2_secondary_tags"] else []
    
    # Validate paper matches schema prefix
    if prefix == "M" and paper != "Paper1":
        raise ValueError(f"Designer tag validation failed: Paper label mismatch: Designer output 'paper: {paper}' but schema prefix M_ indicates Paper1")
    elif prefix == "R" and paper != "Paper2":
        raise ValueError(f"Designer tag validation failed: Paper label mismatch: Designer output 'paper: {paper}' but schema prefix R_ indicates Paper2")
    
    return obj


def designer_call(
    llm: LLMClient,
    prompts: Prompts,
    models: ModelsConfig,
    schema_block: str,
    schema_id: str,
    difficulty: str,
    exemplar_ids: List[str] = None,
    variation_mode: Optional[str] = None,
    base_dir: Optional[str] = None,
) -> Dict[str, Any]:
    subject_prompts = get_subject_prompts(prompts, schema_id)

    is_tmua = "Paper1" in prompts.designer or "Paper2" in prompts.designer
    mode_lower = ""
    system_prompt = subject_prompts["designer"]

    if is_tmua:
        paper_key = tmua_paper_key_from_schema_id(schema_id)
        vm = (variation_mode or os.environ.get("VARIATION_MODE", "") or "").strip()
        mode_lower = _resolve_tmua_variation_mode(vm or None, base_dir)
        vbp = getattr(Prompts, "tmua_variation_modes", None) or {}
        system_prompt, _injected = _inject_tmua_variation_policy(
            subject_prompts["designer"], paper_key, mode_lower, vbp
        )
        user = _tmua_designer_user_prompt(schema_block, difficulty, exemplar_ids, mode_lower)
    else:
        exemplar_section = ""
        if exemplar_ids:
            sample_ids = random.sample(exemplar_ids, min(len(exemplar_ids), 3))
            texts = fetch_exemplar_texts(sample_ids)
            if texts:
                exemplar_section = "\n\n# AUTHENTIC NSAA EXAMPLES\n"
                for i, text in enumerate(texts):
                    exemplar_section += f"Example {i+1}:\n\"\"\"\n{text}\n\"\"\"\n\n"
                exemplar_section += (
                    "\nUse these real examples to calibrate the mathematical complexity "
                    "and concise phrasing of your new design."
                )

        user = f"""You will receive a schema and a target difficulty.

Schema:
{schema_block}{exemplar_section}

Target difficulty: {difficulty}

Return exactly one idea plan in the required YAML format."""

    txt = llm.generate(model=models.designer, system_prompt=system_prompt, user_prompt=user, temperature=0.7)
    # Try to load YAML, with prompt stripping if needed
    try:
        obj = safe_json_load(txt, strip_prompt=False)
    except ValueError as e:
        error_msg = str(e)
        # If error suggests prompt contamination (e.g., "expected a single document" with prompt text)
        if "expected a single document" in error_msg or "You are a" in txt[:200]:
            # Try again with prompt stripping
            obj = safe_json_load(txt, strip_prompt=True)
        else:
            raise
    if not isinstance(obj, dict) or "schema_id" not in obj:
        raise ValueError(f"Designer output invalid YAML/object. Raw output:\n{txt}")

    if is_tmua and mode_lower:
        obj["variation_mode"] = mode_lower.upper()

    # Normalize schema_id like "M3..." to "M3" when possible
    # but keep original too.
    out_schema = str(obj.get("schema_id", "")).strip()
    # Soft check: it should contain schema_id token
    if schema_id not in out_schema:
        # not fatal—designer might use full id; just record a warning
        obj["_warning"] = f"Designer schema_id '{out_schema}' does not include expected '{schema_id}'."
    
    # Normalize and validate designer output (auto-inject missing fields, convert legacy format)
    obj = normalize_and_validate_designer_output(obj, schema_id)
    
    obj["_raw_text"] = txt
    return obj

def implementer_call(llm: LLMClient, prompts: Prompts, models: ModelsConfig, idea_plan: Dict[str, Any]) -> Dict[str, Any]:
    # Get subject from idea_plan's schema_id
    schema_id = idea_plan.get("schema_id", "M1")
    subject_prompts = get_subject_prompts(prompts, schema_id)
    
    user = "Designer idea plan (YAML):\n" + prompt_json_dumps(idea_plan)
    txt = llm.generate(model=models.implementer, system_prompt=subject_prompts['implementer'], user_prompt=user, temperature=0.6)
    
    # Check if output is empty or suspiciously short
    if not txt or not txt.strip():
        raise ValueError(f"Implementer output is empty. This usually means the AI didn't generate any output.")
    
    # Check if output looks like it might be empty YAML or just whitespace
    cleaned_check = txt.strip()
    if len(cleaned_check) < 10 or cleaned_check in ['null', '~', '{}', '[]']:
        raise ValueError(f"Implementer output appears to be empty or invalid. Raw output:\n{txt[:500]}...")
    
    try:
        obj = safe_json_load(txt, strip_prompt=False)
    except ValueError as e:
        error_msg = str(e)
        # If error suggests prompt contamination, try with prompt stripping
        if "expected a single document" in error_msg or "You are a" in txt[:200] or "TMUA" in txt[:200]:
            try:
                obj = safe_json_load(txt, strip_prompt=True)
            except Exception as e2:
                raise ValueError(f"Implementer output failed to parse as YAML (even after prompt stripping): {e2}\n\nRaw output:\n{txt[:500]}...")
        elif "empty or contains only whitespace" in error_msg or "YAML parsed to None" in error_msg:
            # Provide more helpful error message for empty YAML
            raise ValueError(f"Implementer output is empty or invalid YAML. This may indicate the AI didn't follow the output format.\n\nRaw output (first 500 chars):\n{txt[:500]}...")
        else:
            raise ValueError(f"Implementer output failed to parse as YAML: {e}\n\nRaw output:\n{txt[:500]}...")

    # Normalise common structural quirks from the Implementer
    obj = normalize_implementer_output(obj)
    
    if not isinstance(obj, dict):
        raise ValueError(f"Implementer output is not a dictionary. Got type: {type(obj)}\n\nRaw output:\n{txt[:500]}...")
    
    if "question" not in obj:
        raise ValueError(f"Implementer output missing 'question' field. Available keys: {list(obj.keys())}\n\nRaw output:\n{txt[:500]}...")
    
    if "solution" not in obj:
        raise ValueError(f"Implementer output missing 'solution' field. Available keys: {list(obj.keys())}\n\nRaw output:\n{txt[:500]}...")
    
    # Validate distractor_map exists (it's required by the prompt)
    if "distractor_map" not in obj or not isinstance(obj.get("distractor_map"), dict):
        raise ValueError(f"Implementer output missing 'distractor_map' field (required). Available keys: {list(obj.keys())}\n\nRaw output:\n{txt[:500]}...")
    
    # NEW: Validate distractor_map has content (not empty)
    distractor_map = obj.get("distractor_map", {})
    num_options = len(obj.get("question", {}).get("options", {}))
    
    if len(distractor_map) == 0:
        raise ValueError(
            f"Implementer output has EMPTY distractor_map. This is not allowed!\n"
            f"The distractor_map must explain the reasoning error for each wrong option.\n"
            f"Question has {num_options} options but distractor_map is empty: {distractor_map}\n\n"
            f"Raw output:\n{txt[:500]}..."
        )
    
    if len(distractor_map) < 3:
        raise ValueError(
            f"Implementer output has insufficient distractor_map entries.\n"
            f"Got {len(distractor_map)} entries, need at least 3 (for options A, B, C, D minimum).\n"
            f"Distractor map: {distractor_map}\n"
            f"Available option keys: {list(obj.get('question', {}).get('options', {}).keys())}\n\n"
            f"Raw output:\n{txt[:500]}..."
        )
    
    obj["_raw_text"] = txt
    return obj

def verifier_call(llm: LLMClient, prompts: Prompts, models: ModelsConfig, question_obj: Dict[str, Any], schema_id: str) -> Dict[str, Any]:
    subject = get_subject_from_schema(schema_id)
    
    # Add subject tag to question_obj
    question_with_subject = {
        "subject": subject,
        **question_obj
    }
    
    verifier_src = prompts.verifier
    if prompts.verifier_by_paper:
        paper = tmua_paper_key_from_schema_id(schema_id)
        verifier_src = prompts.verifier_by_paper.get(paper) or prompts.verifier_by_paper.get("Paper1") or verifier_src
    # Filter verifier prompt to include only relevant subject instructions
    filtered_prompt = filter_prompt_by_subject(verifier_src, subject)
    
    user = "Question package to verify (YAML):\n" + prompt_json_dumps(question_with_subject)
    txt = llm.generate(model=models.verifier, system_prompt=filtered_prompt, user_prompt=user, temperature=0.2)
    obj = safe_json_load(txt)
    if not isinstance(obj, dict) or "verdict" not in obj:
        raise ValueError(f"Verifier output invalid YAML/object. Raw output:\n{txt}")
    obj["_raw_text"] = txt
    return obj

def style_call(llm: LLMClient, prompts: Prompts, models: ModelsConfig, question_obj: Dict[str, Any], schema_id: str, verifier_obj: Optional[Dict[str, Any]]=None, base_dir: Optional[str] = None) -> Dict[str, Any]:
    subject = get_subject_from_schema(schema_id)
    
    payload = {
        "subject": subject,
        "question": question_obj
    }
    if verifier_obj:
        payload["verifier_report"] = verifier_obj
    
    style_checker_prompt = ""
    if prompts.style_checker_by_paper:
        paper = tmua_paper_key_from_schema_id(schema_id)
        style_checker_prompt = (
            prompts.style_checker_by_paper.get(paper)
            or prompts.style_checker_by_paper.get("Paper1")
            or ""
        )
    if not style_checker_prompt and prompts.style_checker:
        style_checker_prompt = prompts.style_checker
    if not style_checker_prompt:
        # Fallback: Try to load from paper-based or subject-based structure
        if base_dir is None:
            base_dir = os.path.dirname(__file__)
        
        # Try TMUA paper-based structure first
        paper_prompt_dir = os.path.join(base_dir, "by_paper_prompts")
        if os.path.exists(paper_prompt_dir):
            # Determine paper from schema_id
            paper = "Paper1"  # Default
            if schema_id.startswith("R_"):
                paper = "Paper2"
            
            paper_path = os.path.join(paper_prompt_dir, paper)
            style_checker_path = os.path.join(paper_path, f"{paper} Style_checker.md")
            if not os.path.exists(style_checker_path):
                # Try alternative naming
                style_files = [f for f in os.listdir(paper_path) if 'Style' in f and f.endswith('.md')]
                if style_files:
                    style_checker_path = os.path.join(paper_path, style_files[0])
            
            if os.path.exists(style_checker_path):
                style_checker_prompt = read_text(style_checker_path)
            else:
                raise FileNotFoundError(f"Style checker prompt not found at {style_checker_path}")
        else:
            # Fallback to ESAT subject-based structure
            prompt_dir = os.path.join(base_dir, "by_subject_prompts")
            style_checker_file_map = {
                "physics": "Style_checker_physics.md",
                "chemistry": "Style_checker_chemistry.md",
                "biology": "Style_checker_biology.md",
                "mathematics": "Style_checker.md",
            }
            
            style_checker_filename = style_checker_file_map.get(subject, "Style_checker.md")
            style_checker_path = os.path.join(prompt_dir, style_checker_filename)
            if os.path.exists(style_checker_path):
                style_checker_prompt = read_text(style_checker_path)
            else:
                raise FileNotFoundError(f"Style checker prompt not found at {style_checker_path}")
    
    user = "Package to style-check (YAML):\n" + prompt_json_dumps(payload)
    txt = llm.generate(model=models.style_judge, system_prompt=style_checker_prompt, user_prompt=user, temperature=0.3)
    obj = safe_json_load(txt)
    if not isinstance(obj, dict) or "verdict" not in obj:
        raise ValueError(f"Style checker output invalid YAML/object. Raw output:\n{txt}")
    obj["_raw_text"] = txt
    return obj

def classifier_call(llm: LLMClient, prompts: Prompts, models: ModelsConfig, question_obj: Dict[str, Any], 
                    schema_id: str, curriculum_parser) -> Dict[str, Any]:
    """
    Call the classifier AI to assign curriculum tags to a question.
    
    For Math: Returns paper (Math 1/Math 2) + tags from that paper
    For P/B/C: Returns tags only
    
    Args:
        llm: LLM client
        prompts: Prompts object
        models: Models config
        question_obj: Question package
        schema_id: Schema ID (e.g., "M1", "P3", "B1", "C1")
        curriculum_parser: CurriculumParser instance
    
    Returns:
        Dictionary with primary_tag, secondary_tags, confidence scores, and paper (for Math only)
    """
    subject_prompts = get_subject_prompts(prompts, schema_id)
    
    # Get available topics (NO SCHEMA ID - as per new requirement)
    available_topics = curriculum_parser.get_available_topics_for_schema(schema_id)
    
    # Format topics (include section info for TMUA)
    topics_list = []
    for topic in available_topics:
        topic_dict = {
            "code": topic["code"],
            "title": topic["title"],
            "paper": topic.get("paper_name", topic.get("paper", "Unknown"))
        }
        # Add section info if available (for TMUA)
        if "section_type" in topic:
            topic_dict["section_type"] = topic["section_type"]
        if "note" in topic:
            topic_dict["note"] = topic["note"]
        topics_list.append(topic_dict)
    
    topics_text = prompt_json_dumps({
        "available_topics": topics_list
    })
    
    # User prompt WITHOUT schema_id
    user = f"""Available curriculum topics:
{topics_text}

Question package (YAML):
{prompt_json_dumps(question_obj)}

Analyze the question and assign appropriate curriculum tags."""
    
    model = getattr(models, 'classifier', None) or models.style_judge
    txt = llm.generate(
        model=model,
        system_prompt=subject_prompts['classifier'],  # Subject-specific
        user_prompt=user,
        temperature=0.3
    )
    
    # Try to load YAML with improved error handling and retry logic
    # Classifier output may contain markdown formatting, so strip it first
    max_retries = 3
    obj = None
    last_error = None
    
    for attempt in range(max_retries):
        try:
            # Always strip markdown on first attempt (classifier often outputs markdown)
            # On retries, markdown is already stripped in the fix section below
            strip_md = (attempt == 0)  # Strip markdown on first attempt
            # Also strip prompt contamination (explanatory text before YAML)
            obj = safe_json_load(txt, strip_markdown=strip_md, strip_prompt=(attempt == 0))
            break  # Success
        except ValueError as e:
            last_error = e
            error_msg = str(e)
            
            # If YAML parsing fails, try more aggressive preprocessing
            if "YAML parsing error" in error_msg or "mapping values" in error_msg or "scanning an alias" in error_msg or "expected alphabetic" in error_msg:
                if attempt < max_retries - 1:
                    # Try to fix: strip markdown, quote unquoted values with colons
                    # Strip markdown formatting first (always do this on retry, even if already done)
                    txt = strip_markdown_formatting(txt)
                    
                    # Also strip code fences in case they were added
                    txt = strip_code_fences(txt)
                    
                    # Then try to fix unquoted colons
                    lines = txt.split('\n')
                    fixed_lines = []
                    for line in lines:
                        # Skip comments and empty lines
                        if not line.strip() or line.strip().startswith('#'):
                            fixed_lines.append(line)
                            continue
                        
                        # Check for key: value pattern
                        if ':' in line and not line.strip().startswith('-'):
                            # Try to split on first colon
                            colon_pos = line.find(':')
                            if colon_pos > 0:
                                key_part = line[:colon_pos].rstrip()
                                value_part = line[colon_pos + 1:].lstrip()
                                
                                # If value has another colon and isn't quoted/math, quote it
                                if ':' in value_part:
                                    # Check if it's already quoted or is math
                                    is_quoted = (value_part.startswith('"') and value_part.endswith('"')) or \
                                               (value_part.startswith("'") and value_part.endswith("'"))
                                    is_math = value_part.startswith('$') and value_part.endswith('$')
                                    
                                    if not is_quoted and not is_math:
                                        # Quote the value
                                        # CRITICAL: Escape backslashes first to prevent YAML escape sequence errors
                                        escaped_value = value_part.replace('\\', '\\\\')  # Escape all backslashes
                                        escaped_value = escaped_value.replace('"', '\\"')  # Then escape quotes
                                        fixed_lines.append(f"{key_part}: \"{escaped_value}\"")
                                        continue
                        
                        fixed_lines.append(line)
                    
                    txt = '\n'.join(fixed_lines)
                    continue  # Retry with fixed text
                else:
                    # Last attempt failed, raise with context
                    raise ValueError(
                        f"Classifier YAML parsing failed after {max_retries} attempts. "
                        f"Error: {error_msg}\n"
                        f"First 500 chars of output:\n{txt[:500]}"
                    )
            else:
                # Not a YAML parsing error, re-raise
                raise
    
    if obj is None:
        raise ValueError(f"Failed to parse classifier output: {last_error}")
    
    # CRITICAL: Validate that obj is a dictionary, not a list or other type
    if not isinstance(obj, dict):
        raise ValueError(f"Classifier output is not a dictionary. Got {type(obj).__name__}: {obj}\n\n"
                        f"This usually means the AI output YAML was a list or other non-dict structure.\n"
                        f"Raw output (first 500 chars):\n{txt[:500]}")
    
    # Validate output based on subject
    prefix = schema_id[0].upper()
    if prefix == 'M':
        # Math requires 'paper' field
        paper = obj.get("paper")
        if not paper:
            # Auto-inject paper based on schema prefix
            if schema_id.startswith("M_"):
                paper = "Paper1"
                obj["paper"] = paper
                print(f"[CLASSIFIER_VALIDATION] Paper missing → auto-injected paper1 for schema {schema_id}")
            elif schema_id.startswith("R_"):
                paper = "Paper2"
                obj["paper"] = paper
                print(f"[CLASSIFIER_VALIDATION] Paper missing → auto-injected paper2 for schema {schema_id}")
            else:
                raise ValueError(f"Math classifier missing 'paper' field and cannot infer from schema_id {schema_id}")
        
        # Normalize paper value
        paper_lower = str(paper).lower()
        if paper_lower in ["paper1", "paper 1", "1"]:
            paper = "Paper1"
            obj["paper"] = "Paper1"
        elif paper_lower in ["paper2", "paper 2", "2"]:
            paper = "Paper2"
            obj["paper"] = "Paper2"
        
        if "primary_tag" not in obj:
            raise ValueError(f"Classifier missing 'primary_tag' field")
        
        # CRITICAL: Validate paper-specific tag requirements
        primary_tag = obj.get("primary_tag", "")
        if paper == "Paper1":
            # Paper1 must have section1_primary_tag, not section2
            if not primary_tag.startswith("M") and not primary_tag.startswith("MM"):
                raise ValueError(f"Paper1 question must have section1_primary_tag starting with M or MM, got: {primary_tag}")
            if "section2_primary_tag" in obj:
                print(f"[CLASSIFIER_VALIDATION] Warning: Paper1 question has section2_primary_tag, removing it")
                del obj["section2_primary_tag"]
        elif paper == "Paper2":
            # Paper2 must have section2_primary_tag
            if "section2_primary_tag" not in obj:
                # Convert primary_tag to section2_primary_tag if it exists
                if primary_tag:
                    obj["section2_primary_tag"] = primary_tag
                    del obj["primary_tag"]
                    print(f"[CLASSIFIER_VALIDATION] Converted primary_tag to section2_primary_tag for Paper2")
                else:
                    raise ValueError(f"Paper2 question must have section2_primary_tag")
            # Paper2 can optionally have section1 tags, but section2 is required
        
        # CRITICAL: Validate that Math classifier didn't assign Chemistry/Biology/Physics tags
        if primary_tag and not (primary_tag.startswith("M") or primary_tag.startswith("MM")):
            # Check if it's a chemistry/biology/physics tag
            if primary_tag.startswith("chemistry-") or primary_tag.startswith("biology-") or primary_tag.startswith("P-"):
                raise ValueError(f"Math schema {schema_id} classified with wrong subject tag: {primary_tag}. "
                               f"This indicates the question is actually {primary_tag.split('-')[0]}, not mathematics. "
                               f"Use a {primary_tag.split('-')[0].upper()[0]} schema instead.")
    else:
        # P/B/C only need primary_tag
        if "primary_tag" not in obj:
            raise ValueError(f"Classifier missing 'primary_tag' field")
        
        # CRITICAL: Validate that non-Math classifier assigned correct subject tag
        primary_tag = obj.get("primary_tag", "")
        expected_prefix = {
            'P': 'P-',
            'B': 'biology-',
            'C': 'chemistry-'
        }.get(prefix, '')
        
        if primary_tag and expected_prefix:
            if not primary_tag.startswith(expected_prefix):
                # Check if it's a Math tag (wrong subject)
                if primary_tag.startswith("M1-") or primary_tag.startswith("M2-"):
                    raise ValueError(f"{prefix} schema {schema_id} classified with Math tag: {primary_tag}. "
                                   f"This indicates the question is actually mathematics, not {get_subject_from_schema(schema_id)}. "
                                   f"Use an M schema instead.")
                # Check if it's a different non-Math subject
                elif primary_tag.startswith("P-") and prefix != 'P':
                    raise ValueError(f"{prefix} schema {schema_id} classified with Physics tag: {primary_tag}. "
                                   f"Use a P schema instead.")
                elif primary_tag.startswith("chemistry-") and prefix != 'C':
                    raise ValueError(f"{prefix} schema {schema_id} classified with Chemistry tag: {primary_tag}. "
                                   f"Use a C schema instead.")
                elif primary_tag.startswith("biology-") and prefix != 'B':
                    raise ValueError(f"{prefix} schema {schema_id} classified with Biology tag: {primary_tag}. "
                                   f"Use a B schema instead.")
    
    obj["_raw_text"] = txt
    return obj


# Alias for backward compatibility
def tag_labeler_call(llm: LLMClient, prompts: Prompts, models: ModelsConfig, question_obj: Dict[str, Any], 
                     schema_id: str, curriculum_parser) -> Dict[str, Any]:
    """Backward compatibility alias for classifier_call."""
    return classifier_call(llm, prompts, models, question_obj, schema_id, curriculum_parser)


def tag_labeler_station(llm: LLMClient, prompts: Prompts, models: ModelsConfig, question_obj: Dict[str, Any],
                       schema_id: str, curriculum_parser, base_dir: str) -> Optional[Dict[str, Any]]:
    """
    Tag Labeler Station - Runs at the END of the pipeline after question is accepted.
    
    Assigns curriculum tags (primary_tag, secondary_tags) based on TMUA curriculum structure.
    This is a separate AI station that runs after all verification stages pass.
    
    Args:
        llm: LLM client
        prompts: Prompts object
        models: Models config
        question_obj: Accepted question package
        schema_id: Schema ID (e.g., "M_a1b2c3d4", "R_a1b2c3d4")
        curriculum_parser: CurriculumParser instance
        base_dir: Base directory for loading prompts
    
    Returns:
        Dictionary with primary_tag, secondary_tags, confidence scores, paper (for Math), and reasoning.
        Returns None if tag labeling fails (non-blocking).
    """
    if not curriculum_parser:
        return None
    
    # Determine paper from schema_id prefix (M_ = Paper1, R_ = Paper2)
    paper = None
    if schema_id.startswith("M_"):
        paper = "Paper1"
    elif schema_id.startswith("R_"):
        paper = "Paper2"
    
    if not paper:
        # Try to infer from idea_plan if available in question_obj
        idea_plan = question_obj.get("idea_plan", {})
        paper = idea_plan.get("paper")
    
    if not paper:
        # Default to Paper1 for M schemas
        paper = "Paper1"
    
    # Load Tag_Labeler prompt for the appropriate paper
    paper_prompt_dir = os.path.join(base_dir, "by_paper_prompts", paper)
    tag_labeler_file = os.path.join(paper_prompt_dir, f"{paper} Tag_Labeler.md")
    
    # Fallback to Paper1 if Paper2 prompt doesn't exist
    if not os.path.exists(tag_labeler_file):
        tag_labeler_file = os.path.join(base_dir, "by_paper_prompts", "Paper1", "Paper1 Tag_Labeler.md")
    
    if not os.path.exists(tag_labeler_file):
        # No prompt file available, skip tag labeling
        return None
    
    tag_labeler_prompt = read_text(tag_labeler_file)
    
    # Get available topics for the paper
    available_topics = curriculum_parser.get_available_topics_for_schema(schema_id)
    
    # Format topics
    topics_list = []
    for topic in available_topics:
        topic_dict = {
            "code": topic["code"],
            "title": topic["title"],
            "paper": topic.get("paper_name", topic.get("paper", "Unknown"))
        }
        if "section_type" in topic:
            topic_dict["section_type"] = topic["section_type"]
        if "note" in topic:
            topic_dict["note"] = topic["note"]
        topics_list.append(topic_dict)
    
    topics_text = prompt_json_dumps({
        "available_topics": topics_list
    })
    
    user = f"""Available curriculum topics for {paper}:
{topics_text}

Question package (YAML):
{prompt_json_dumps(question_obj)}

Analyze the question and assign appropriate curriculum tags according to the TMUA {paper} curriculum structure."""

    # Use classifier model (or fallback to style_judge)
    model = getattr(models, 'classifier', None) or models.style_judge
    
    try:
        txt = llm.generate(
            model=model,
            system_prompt=tag_labeler_prompt,
            user_prompt=user,
            temperature=0.3
        )
        
        # Load YAML with markdown stripping (Tag_Labeler may output markdown)
        obj = safe_json_load(txt, strip_markdown=True, strip_prompt=True)
        
        # CRITICAL: Validate that obj is a dictionary, not a list
        if not isinstance(obj, dict):
            raise ValueError(f"Tag Labeler output is not a dictionary. Got {type(obj).__name__}: {obj}\n\n"
                           f"This usually means the AI output YAML was a list or other non-dict structure.\n"
                           f"Raw output (first 500 chars):\n{txt[:500]}")
        
        # Validate required fields
        if "primary_tag" not in obj:
            raise ValueError(f"Tag Labeler missing 'primary_tag' field")
        
        # Validate paper field for Math questions
        if schema_id[0].upper() == 'M':
            if "paper" not in obj:
                obj["paper"] = paper
            else:
                # Normalize paper value
                paper_value = obj.get("paper", "").lower()
                if paper_value in ["paper1", "paper 1", "1"]:
                    obj["paper"] = "Paper1"
                elif paper_value in ["paper2", "paper 2", "2"]:
                    obj["paper"] = "Paper2"
                else:
                    obj["paper"] = paper
        
        # Normalize primary_tag if needed
        primary_tag = obj.get("primary_tag", "")
        if primary_tag and curriculum_parser:
            normalized_primary = curriculum_parser.normalize_topic_code(primary_tag)
            if normalized_primary:
                primary_tag = normalized_primary
                obj["primary_tag"] = primary_tag
        
        # Process secondary_tags
        secondary_tags_list = obj.get("secondary_tags", [])
        if not isinstance(secondary_tags_list, list):
            if secondary_tags_list is None:
                secondary_tags_list = []
            else:
                secondary_tags_list = [secondary_tags_list]
        
        secondary_tags = []
        for tag in secondary_tags_list:
            if isinstance(tag, dict):
                tag_code = tag.get("code", "")
            elif isinstance(tag, str):
                tag_code = tag
            else:
                tag_code = str(tag) if tag else ""
            
            if tag_code:
                # Normalize if needed
                if curriculum_parser:
                    normalized_tag = curriculum_parser.normalize_topic_code(tag_code)
                    if normalized_tag:
                        tag_code = normalized_tag
                secondary_tags.append(tag_code)
        
        obj["secondary_tags"] = secondary_tags
        
        # Build result dict with all required fields
        result = {
            "primary_tag": primary_tag,
            "secondary_tags": secondary_tags,
            "primary_confidence": obj.get("primary_confidence", 0.0),
            "reasoning": obj.get("reasoning", ""),
            "_raw_text": txt
        }
        
        # Add paper field for Math questions
        if schema_id[0].upper() == 'M':
            result["paper"] = obj.get("paper", paper)
        
        return result
        
    except Exception as e:
        # Tag labeling failures are non-blocking - log but don't raise
        error_msg = str(e)
        print(f"⚠ Tag Labeler Station failed (non-fatal): {error_msg[:200]}...")
        return None

def implementer_regen_call(llm: LLMClient, prompts: Prompts, models: ModelsConfig,
                           idea_plan: Dict[str, Any],
                           previous_attempt: Dict[str, Any],
                           verifier_report: Dict[str, Any],
                           style_report: Optional[Dict[str, Any]]=None) -> Dict[str, Any]:
    # Get subject from idea_plan's schema_id
    schema_id = idea_plan.get("schema_id", "M1")
    subject_prompts = get_subject_prompts(prompts, schema_id)

    retry_text = prompts.retry_controller
    if prompts.retry_controller_by_paper:
        paper = tmua_paper_key_from_schema_id(schema_id)
        retry_text = (
            prompts.retry_controller_by_paper.get(paper)
            or prompts.retry_controller_by_paper.get("Paper1")
            or retry_text
        )
    
    user = (
        retry_text.strip()
        + "\n\nidea_plan:\n"
        + prompt_json_dumps(idea_plan)
        + "\nprevious_attempt:\n"
        + prompt_json_dumps(previous_attempt)
        + "\nverifier_report:\n"
        + yaml.safe_dump(verifier_report, sort_keys=False)
    )
    if style_report:
        user += "\nstyle_report:\n" + yaml.safe_dump(style_report, sort_keys=False)

    txt = llm.generate(model=models.implementer, system_prompt=subject_prompts['implementer'], user_prompt=user, temperature=0.6)
    try:
        obj = safe_json_load(txt, strip_prompt=False)
    except ValueError as e:
        error_msg = str(e)
        # If error suggests prompt contamination, try with prompt stripping
        if "expected a single document" in error_msg or "You are a" in txt[:200] or "TMUA" in txt[:200]:
            try:
                obj = safe_json_load(txt, strip_prompt=True)
            except Exception as e2:
                raise ValueError(f"Implementer regen output failed to parse as YAML (even after prompt stripping): {e2}\n\nRaw output:\n{txt[:500]}...")
        else:
            raise ValueError(f"Implementer regen output failed to parse as YAML: {e}\n\nRaw output:\n{txt[:500]}...")

    # Normalise common structural quirks from the Implementer
    obj = normalize_implementer_output(obj)
    
    if not isinstance(obj, dict):
        raise ValueError(f"Implementer regen output is not a dictionary. Got type: {type(obj)}\n\nRaw output:\n{txt[:500]}...")
    
    if "question" not in obj:
        raise ValueError(f"Implementer regen output missing 'question' field. Available keys: {list(obj.keys())}\n\nRaw output:\n{txt[:500]}...")
    
    if "solution" not in obj:
        raise ValueError(f"Implementer regen output missing 'solution' field. Available keys: {list(obj.keys())}\n\nRaw output:\n{txt[:500]}...")
    
    # Validate distractor_map exists (it's required by the prompt)
    if "distractor_map" not in obj or not isinstance(obj.get("distractor_map"), dict):
        raise ValueError(f"Implementer regen output missing 'distractor_map' field (required). Available keys: {list(obj.keys())}\n\nRaw output:\n{txt[:500]}...")
    
    # NEW: Validate distractor_map has content (not empty)
    distractor_map = obj.get("distractor_map", {})
    num_options = len(obj.get("question", {}).get("options", {}))
    
    if len(distractor_map) == 0:
        raise ValueError(
            f"Implementer regen output has EMPTY distractor_map. This is not allowed!\n"
            f"The distractor_map must explain the reasoning error for each wrong option.\n"
            f"Question has {num_options} options but distractor_map is empty: {distractor_map}\n\n"
            f"Raw output:\n{txt[:500]}..."
        )
    
    if len(distractor_map) < 3:
        raise ValueError(
            f"Implementer regen output has insufficient distractor_map entries.\n"
            f"Got {len(distractor_map)} entries, need at least 3.\n"
            f"Distractor map: {distractor_map}\n\n"
            f"Raw output:\n{txt[:500]}..."
        )
    
    obj["_raw_text"] = txt
    return obj


# ---------- Controller ----------

def extract_verdict(obj: Dict[str, Any]) -> str:
    return str(obj.get("verdict", "")).strip().upper()

def extract_severity(obj: Dict[str, Any]) -> str:
    return str(obj.get("severity", "")).strip()

def is_fixable(severity: str) -> bool:
    return severity == "fixable_with_regeneration"

def is_structural(severity: str) -> bool:
    return severity == "structural_flaw"


# ---------- KaTeX Validation and Fixing ----------

def validate_question_katex(question_obj: Dict[str, Any], schema_id: str) -> Tuple[bool, List[Dict[str, Any]]]:
    """
    Validate KaTeX formatting in all math fields of a question object.
    
    Args:
        question_obj: Question package dictionary
        schema_id: Schema ID to determine if chemistry extension is needed
        
    Returns:
        Tuple of (is_valid, list_of_errors) where each error is a dict with:
        - field: field name (e.g., "question.stem", "solution.reasoning")
        - errors: list of error strings
    """
    try:
        from katex_validator import validate_katex_formatting
    except ImportError:
        # KaTeX validator not available, skip validation
        return True, []
    
    all_errors = []
    
    # Get subject from schema_id for subject-specific validation
    subject = get_subject_from_schema(schema_id)
    # Map to validation subject (mathematics -> None for backward compatibility)
    validation_subject = subject if subject in ["physics", "chemistry", "biology"] else None
    
    # Validate question stem
    question = question_obj.get("question", {})
    if isinstance(question, dict):
        stem = question.get("stem", "")
        if stem:
            is_valid, errors = validate_katex_formatting(stem, skip_render_test=False, subject=validation_subject)
            if not is_valid:
                all_errors.append({
                    "field": "question.stem",
                    "errors": errors
                })
        
        # Validate options
        options = question.get("options", {})
        if isinstance(options, dict):
            for opt_key, opt_text in options.items():
                if opt_text:
                    is_valid, errors = validate_katex_formatting(str(opt_text), skip_render_test=False, subject=validation_subject)
                    if not is_valid:
                        all_errors.append({
                            "field": f"question.options.{opt_key}",
                            "errors": errors
                        })
    
    # Validate solution
    solution = question_obj.get("solution", {})
    if isinstance(solution, dict):
        reasoning = solution.get("reasoning", "")
        if reasoning:
            is_valid, errors = validate_katex_formatting(reasoning, skip_render_test=False, subject=validation_subject)
            if not is_valid:
                all_errors.append({
                    "field": "solution.reasoning",
                    "errors": errors
                })
        
        key_insight = solution.get("key_insight", "")
        if key_insight:
            is_valid, errors = validate_katex_formatting(key_insight, skip_render_test=False, subject=validation_subject)
            if not is_valid:
                all_errors.append({
                    "field": "solution.key_insight",
                    "errors": errors
                })
    
    # Validate distractor_map
    distractor_map = question_obj.get("distractor_map", {})
    if isinstance(distractor_map, dict):
        for opt_key, distractor_text in distractor_map.items():
            if distractor_text:
                is_valid, errors = validate_katex_formatting(str(distractor_text), skip_render_test=False, subject=validation_subject)
                if not is_valid:
                    all_errors.append({
                        "field": f"distractor_map.{opt_key}",
                        "errors": errors
                    })
    
    return len(all_errors) == 0, all_errors


def fix_katex_issues(llm: LLMClient, prompts: Prompts, models: ModelsConfig,
                    question_obj: Dict[str, Any], katex_errors: List[Dict[str, Any]],
                    schema_id: str, attempt: int, base_dir: str) -> Dict[str, Any]:
    """
    Fix KaTeX formatting issues in a question object by prompting the LLM.
    
    Args:
        llm: LLM client
        prompts: Prompts object
        models: Models config
        question_obj: Original question object with KaTeX errors
        katex_errors: List of error dicts from validate_question_katex
        schema_id: Schema ID for subject-specific handling
        attempt: Current attempt number (for logging)
        base_dir: Base directory for loading prompts
        
    Returns:
        Fixed question object
    """
    # Load KaTeX fixer prompt - try paper-based structure first (TMUA), then subject-based (ESAT)
    paper_prompt_dir = os.path.join(base_dir, "by_paper_prompts")
    subject_prompt_dir = os.path.join(base_dir, "by_subject_prompts")
    
    katex_fixer_prompt = None
    katex_fixer_path = None
    
    # Try TMUA paper-based structure first
    if os.path.exists(paper_prompt_dir):
        # Determine paper from schema_id
        paper = "Paper1"  # Default
        if schema_id.startswith("R_"):
            paper = "Paper2"
        
        paper_path = os.path.join(paper_prompt_dir, paper)
        katex_fixer_path = os.path.join(paper_path, f"{paper} Format_Fixer.md")
        if not os.path.exists(katex_fixer_path):
            # Try alternative naming
            format_files = [f for f in os.listdir(paper_path) if ('Format' in f or 'KaTeX' in f or 'Fixer' in f) and f.endswith('.md')]
            if format_files:
                katex_fixer_path = os.path.join(paper_path, format_files[0])
        
        if os.path.exists(katex_fixer_path):
            katex_fixer_prompt = read_text(katex_fixer_path)
    
    # Fallback to ESAT subject-based structure
    if not katex_fixer_prompt and os.path.exists(subject_prompt_dir):
        katex_fixer_path = os.path.join(subject_prompt_dir, "KaTeX_Fixer.md")
        if os.path.exists(katex_fixer_path):
            katex_fixer_prompt = read_text(katex_fixer_path)
    
    # If still not found, use a default minimal prompt
    if not katex_fixer_prompt:
        katex_fixer_prompt = """You are a KaTeX formatting expert. Fix ONLY the KaTeX formatting errors in the provided YAML.
Do NOT change any mathematical content, numbers, or logic. Only fix markup syntax (e.g., $ delimiters, escaping).
Return the complete fixed question package in YAML format."""
        print(f"⚠ Warning: KaTeX fixer prompt not found. Using default prompt.")
    
    # Format error report
    error_report = "KaTeX Validation Errors:\n"
    for error_info in katex_errors:
        field = error_info["field"]
        errors = error_info["errors"]
        error_report += f"\nField: {field}\n"
        for err in errors:
            error_report += f"  - {err}\n"
    
    # Build user prompt
    user_prompt = (
        "Original question package (YAML):\n"
        + yaml.safe_dump(question_obj, sort_keys=False)
        + "\n\n"
        + error_report
        + "\n\n"
        + "Please fix ONLY the KaTeX formatting errors listed above. "
        + "CRITICAL: Do NOT change any mathematical content, logic, numeric values, or algebraic operators. "
        + "Only escape/repair markup (e.g., fix $ delimiters, escape special characters). "
        + "Preserve all numbers, equations, and mathematical meaning exactly as they are. "
        + "Return the complete fixed question package in YAML format."
    )
    
    # Call LLM with format_fixer model if available, otherwise use implementer
    fixer_model = getattr(models, 'format_fixer', None) or models.implementer
    txt = llm.generate(
        model=fixer_model,
        system_prompt=katex_fixer_prompt,
        user_prompt=user_prompt,
        temperature=0.2  # Very low temperature for precise formatting fixes only
    )
    
    try:
        fixed_obj = safe_json_load(txt)
    except Exception as e:
        raise ValueError(f"KaTeX fixer output failed to parse as YAML: {e}\n\nRaw output:\n{txt[:500]}...")
    
    # Normalize output (same as implementer)
    fixed_obj = normalize_implementer_output(fixed_obj)
    
    # Validate structure
    if not isinstance(fixed_obj, dict):
        raise ValueError(f"KaTeX fixer output is not a dictionary. Got type: {type(fixed_obj)}")
    
    if "question" not in fixed_obj:
        raise ValueError(f"KaTeX fixer output missing 'question' field")
    
    if "solution" not in fixed_obj:
        raise ValueError(f"KaTeX fixer output missing 'solution' field")
    
    # DIFF GUARD: Check that format fixer didn't change mathematical meaning
    # Extract numeric values and algebraic operators from original and fixed
    import re
    
    def extract_math_content(obj):
        """Extract numeric values and operators from question text for comparison."""
        content = []
        if "question" in obj and isinstance(obj["question"], dict):
            stem = obj["question"].get("stem", "")
            # Extract numbers and operators
            numbers = re.findall(r'\d+\.?\d*', stem)
            operators = re.findall(r'[+\-*/=<>≤≥]', stem)
            content.extend(numbers)
            content.extend(operators)
        return sorted(content)
    
    original_math = extract_math_content(question_obj)
    fixed_math = extract_math_content(fixed_obj)
    
    # If math content changed significantly, reject the fix
    if original_math != fixed_math:
        # Allow minor differences (e.g., spacing), but not major changes
        original_set = set(original_math)
        fixed_set = set(fixed_math)
        if len(original_set.symmetric_difference(fixed_set)) > 2:  # More than 2 differences
            raise ValueError(
                f"KaTeX fixer changed mathematical content unexpectedly. "
                f"Original math elements: {original_math[:10]}, Fixed: {fixed_math[:10]}. "
                f"Rejecting fix to preserve mathematical meaning."
            )
    
    fixed_obj["_raw_text"] = txt
    fixed_obj["_katex_fix_attempt"] = attempt
    
    return fixed_obj

def normalize_options(question_obj: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ensures options dict only contains non-empty A-H keys.
    """
    q = question_obj.get("question", {})
    opts = q.get("options", {}) if isinstance(q, dict) else {}
    if not isinstance(opts, dict):
        return question_obj
    cleaned = {}
    for k, v in opts.items():
        kk = str(k).strip()
        if kk in list("ABCDEFGH") and v is not None and str(v).strip() != "":
            cleaned[kk] = v
    q["options"] = cleaned
    question_obj["question"] = q
    return question_obj

def build_bank_item(idea_plan: Dict[str, Any], question_obj: Dict[str, Any], verifier_obj: Dict[str, Any], style_obj: Dict[str, Any],
                    schema_id: str, difficulty: str, models: ModelsConfig, attempts: int, token_usage: Optional[Dict[str, int]] = None,
                    tags: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    question_obj = normalize_options(question_obj)
    stem = question_obj.get("question", {}).get("stem", "")
    fingerprint = sha1_short(f"{schema_id}|{difficulty}|{stem}")
    
    # Determine paper field based on schema_id prefix (for TMUA)
    # M_ prefix = Paper 1, R_ prefix = Paper 2
    paper = None
    if schema_id.startswith("M_"):
        paper = "Paper1"
    elif schema_id.startswith("R_"):
        paper = "Paper2"
    
    # Ensure idea_plan has paper field set (if it's a dict and paper is determined)
    if isinstance(idea_plan, dict) and paper:
        idea_plan["paper"] = paper
    
    item = {
        "id": f"{schema_id}-{difficulty}-{fingerprint}",
        "schema_id": schema_id,
        "difficulty": difficulty,
        "idea_plan": idea_plan,
        "question_package": question_obj,
        "verifier_report": verifier_obj,
        "style_report": style_obj,
        "models": {
            "designer": models.designer,
            "implementer": models.implementer,
            "verifier": models.verifier,
            "style_judge": models.style_judge,
        },
        "attempts": attempts,
        "created_at": datetime.datetime.now().isoformat(),
    }
    
    # Add paper field to item (for TMUA questions)
    if paper:
        item["paper"] = paper
    
    # Add paper to tags if tags exist (for consistency with existing code)
    if tags and isinstance(tags, dict) and paper:
        tags["paper"] = paper
    
    if token_usage:
        item["token_usage"] = token_usage
    if tags:
        item["tags"] = tags
    return item

def run_once(base_dir: str, cfg: RunConfig, models: ModelsConfig, 
             callbacks: Optional[Dict[str, Callable]] = None,
             forced_schema_id: Optional[str] = None,
             curriculum_parser=None) -> Dict[str, Any]:
    if callbacks is None:
        callbacks = {}
    if cfg.seed is not None:
        random.seed(cfg.seed)

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("Missing GEMINI_API_KEY environment variable.")

    prompts = load_prompts(base_dir)
    
    # Helper function to extract markdown from code blocks
    def extract_markdown_from_code_blocks(text: str) -> str:
        """Extract markdown content from markdown code blocks."""
        pattern = r'```markdown\s*\n(.*?)(?:\n---\s*\n)?```'
        matches = re.findall(pattern, text, re.DOTALL)
        if matches:
            cleaned_matches = [m.strip() for m in matches if m.strip()]
            if cleaned_matches:
                extracted = '\n\n'.join(cleaned_matches)
                if extracted.strip() and '## **' in extracted:
                    return extracted
        return text
    
    # Try to find schema files - check multiple locations
    schemas_path = None
    schemas_md = None
    
    # First, try TMUA schema files in multiple locations
    base_dir_path = Path(base_dir)
    scripts_dir = base_dir_path.parent
    esat_schemas_dir = scripts_dir / "esat_question_generator" / "schemas"
    tmua_schemas_dir = base_dir_path / "schemas"  # Also check local schemas directory
    
    # Check if we're using TMUA (M or R prefixes)
    is_tmua = any(prefix in cfg.allow_schema_prefixes for prefix in ("M", "R"))
    
    if is_tmua:
        # For TMUA, try to load both Paper1 and Paper2 schemas
        # Try esat_question_generator/schemas/ first (shared location)
        paper1_path = esat_schemas_dir / "Schemas_TMUA_Paper1.md"
        paper2_path = esat_schemas_dir / "Schemas_TMUA_Paper2.md"
        
        # If not found, try local tmua_question_generator/schemas/
        if not paper1_path.exists() and tmua_schemas_dir.exists():
            paper1_path = tmua_schemas_dir / "Schemas_TMUA_Paper1.md"
        if not paper2_path.exists() and tmua_schemas_dir.exists():
            paper2_path = tmua_schemas_dir / "Schemas_TMUA_Paper2.md"
        
        if paper1_path.exists() and paper2_path.exists():
            # Load both files and combine
            paper1_md_raw = read_text(str(paper1_path))
            paper2_md_raw = read_text(str(paper2_path))
            paper1_md = extract_markdown_from_code_blocks(paper1_md_raw)
            paper2_md = extract_markdown_from_code_blocks(paper2_md_raw)
            schemas_md = paper1_md + "\n\n" + paper2_md
            schemas_path = f"{paper1_path} + {paper2_path}"
            print(f"[run_once] Using TMUA schema files: {paper1_path} and {paper2_path}")
        elif paper1_path.exists():
            # Only Paper1 exists
            paper1_md_raw = read_text(str(paper1_path))
            schemas_md = extract_markdown_from_code_blocks(paper1_md_raw)
            schemas_path = str(paper1_path)
            print(f"[run_once] Using TMUA Paper1 schema file: {schemas_path}")
        elif paper2_path.exists():
            # Only Paper2 exists
            paper2_md_raw = read_text(str(paper2_path))
            schemas_md = extract_markdown_from_code_blocks(paper2_md_raw)
            schemas_path = str(paper2_path)
            print(f"[run_once] Using TMUA Paper2 schema file: {schemas_path}")
    
    # Fallback to old locations if TMUA files not found
    if not schemas_md:
        # Try Schemas_NSAA.md in local schemas directory
        schemas_path = os.path.join(base_dir, "schemas", "Schemas_NSAA.md")
        if os.path.exists(schemas_path):
            schemas_md = read_text(schemas_path)
            print(f"[run_once] Using schema file: {schemas_path}")
        else:
            # Try Schemas.md in base directory
            schemas_path = os.path.join(base_dir, "Schemas.md")
            if os.path.exists(schemas_path):
                schemas_md = read_text(schemas_path)
                print(f"[run_once] Using schema file: {schemas_path}")
    
    if not schemas_md:
        raise FileNotFoundError(
            f"Schema file not found. Tried:\n"
            f"  - {esat_schemas_dir / 'Schemas_TMUA_Paper1.md'}\n"
            f"  - {esat_schemas_dir / 'Schemas_TMUA_Paper2.md'}\n"
            f"  - {tmua_schemas_dir / 'Schemas_TMUA_Paper1.md'}\n"
            f"  - {tmua_schemas_dir / 'Schemas_TMUA_Paper2.md'}\n"
            f"  - {os.path.join(base_dir, 'schemas', 'Schemas_NSAA.md')}\n"
            f"  - {os.path.join(base_dir, 'Schemas.md')}"
        )
    
    schemas = parse_schemas_from_markdown(schemas_md, allow_prefixes=cfg.allow_schema_prefixes)
    if schemas and forced_schema_id:
        sample_sids = [forced_schema_id] if forced_schema_id in schemas else list(schemas.keys())[:3]
        print(f"[run_once] Loaded {len(schemas)} schemas. Forced schema_id '{forced_schema_id}' {'found' if forced_schema_id in schemas else 'NOT FOUND'} in schemas. Sample IDs: {sample_sids}")

    # Load curriculum parser if tag labeling is enabled and not already provided
    if curriculum_parser is None and cfg.enable_tag_labeling:
        try:
            # Try TMUA parser first (handles markdown Spec.md)
            try:
                from tmua_curriculum_parser import CurriculumParser
            except ImportError:
                # Fallback to ESAT parser (handles JSON)
                from curriculum_parser import CurriculumParser
            
            curriculum_file = cfg.curriculum_file_path
            if curriculum_file is None:
                # Default to TMUA Spec.md in by_paper_prompts
                curriculum_file = os.path.join(base_dir, "by_paper_prompts", "Spec.md")
            curriculum_parser = CurriculumParser(curriculum_file)
        except (ImportError, Exception) as e:
            print(f"⚠ Warning: Could not load curriculum parser: {e}")
            print("   Tag labeling will be disabled for this run.")
            curriculum_parser = None

    # Configure rate limiting from environment variables
    min_delay = float(os.environ.get("API_MIN_DELAY", "0.5"))  # Default 0.5s between calls
    rate_limit_delay = float(os.environ.get("API_RATE_LIMIT_DELAY", "5.0"))  # Default 5s on rate limit
    llm = LLMClient(api_key=api_key, min_delay=min_delay, rate_limit_delay=rate_limit_delay)

    run_id = now_stamp()
    run_dir = os.path.join(base_dir, cfg.out_dir, run_id)
    ensure_dir(run_dir)

    paths = {
        "accepted": os.path.join(run_dir, "accepted.jsonl"),
        "rejected": os.path.join(run_dir, "rejected.jsonl"),
        "logs": os.path.join(run_dir, "logs.jsonl"),
        "stats": os.path.join(run_dir, "stats.json"),
    }

    stats = {
        "run_id": run_id,
        "accepted": 0,
        "rejected": 0,
        "by_schema": {},
        "failures": {},
    }

    # Generate one item per run_once; you can wrap to generate N items.
    # Use forced_schema_id if provided (for systematic generation), otherwise choose randomly
    if forced_schema_id and forced_schema_id in schemas:
        schema_id = forced_schema_id
    else:
        schema_id = choose_schema(schemas, cfg)
    schema_block = schemas[schema_id]["block"]
    exemplar_ids = schemas[schema_id].get("exemplar_ids", [])
    difficulty = choose_difficulty(cfg)

    if callbacks and "on_schema_selected" in callbacks:
        callbacks["on_schema_selected"](schema_id, difficulty)

    stats["by_schema"].setdefault(schema_id, {"attempted": 0, "accepted": 0, "rejected": 0})
    stats["by_schema"][schema_id]["attempted"] += 1

    # Designer (with limited retries for malformed YAML)
    if callbacks and "on_stage_start" in callbacks:
        callbacks["on_stage_start"]("Designer", f"Designing idea for {schema_id} ({difficulty})")
    
    idea_plan = None
    designer_err = None
    for d_try in range(cfg.max_designer_retries + 1):
        try:
            if callbacks and "on_stage_progress" in callbacks:
                callbacks["on_stage_progress"]("Designer", f"Attempt {d_try + 1}/{cfg.max_designer_retries + 1}")
            idea_plan = designer_call(
                llm,
                prompts,
                models,
                schema_block,
                schema_id,
                difficulty,
                exemplar_ids,
                variation_mode=getattr(cfg, "variation_mode", None),
                base_dir=base_dir,
            )
            if callbacks and "on_stage_complete" in callbacks:
                callbacks["on_stage_complete"]("Designer", idea_plan)
            break
        except ValueError as e:
            # Check if this is a YAML parsing error
            error_str = str(e)
            is_yaml_error = "YAML" in error_str or "yaml" in error_str.lower()
            
            designer_err = error_str
            if callbacks and "on_stage_error" in callbacks:
                callbacks["on_stage_error"]("Designer", error_str)
            
            # Log with detailed YAML error info
            log_entry = {
                "stage": "designer",
                "schema_id": schema_id,
                "difficulty": difficulty,
                "attempt": d_try + 1,
                "error": designer_err,
                "is_yaml_error": is_yaml_error,
            }
            dump_jsonl(paths["logs"], log_entry)
            
            # Print helpful error message
            if is_yaml_error:
                print(f"\n⚠ Designer attempt {d_try + 1}/{cfg.max_designer_retries + 1}: Invalid YAML detected")
                print(f"   Error: {error_str[:200]}...")
                if d_try < cfg.max_designer_retries:
                    print(f"   → Retrying with new AI generation...")
                else:
                    print(f"   → Max retries reached. Giving up.")
            else:
                print(f"\n⚠ Designer attempt {d_try + 1}/{cfg.max_designer_retries + 1} failed: {error_str[:200]}...")
                if d_try < cfg.max_designer_retries:
                    print(f"   → Retrying...")
        except Exception as e:
            # Other exceptions (not YAML-related)
            designer_err = str(e)
            if callbacks and "on_stage_error" in callbacks:
                callbacks["on_stage_error"]("Designer", str(e))
            dump_jsonl(paths["logs"], {
                "stage": "designer",
                "schema_id": schema_id,
                "difficulty": difficulty,
                "attempt": d_try + 1,
                "error": designer_err,
                "is_yaml_error": False,
            })
            print(f"\n⚠ Designer attempt {d_try + 1}/{cfg.max_designer_retries + 1} failed: {str(e)[:200]}...")
            if d_try < cfg.max_designer_retries:
                print(f"   → Retrying...")
    if idea_plan is None:
        stats["rejected"] += 1
        stats["by_schema"][schema_id]["rejected"] += 1
        rejected_item = {
            "schema_id": schema_id,
            "difficulty": difficulty,
            "stage": "designer",
            "error": designer_err,
            "created_at": datetime.datetime.now().isoformat(),
            "run_id": run_id,
        }
        dump_jsonl(paths["rejected"], rejected_item)
        
        # Backup rejected question
        try:
            from backup_manager import backup_question_from_pipeline
            backup_question_from_pipeline(rejected_item, base_dir, status="rejected")
        except (ImportError, Exception):
            pass  # Non-fatal
        with open(paths["stats"], "w", encoding="utf-8") as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        return {"run_dir": run_dir, "status": "designer_failed"}

    # Implementer + Retry controller
    previous_attempt = None
    verifier_report = None
    style_report = None

    for attempt in range(cfg.max_implementer_retries + 1):
        try:
            if attempt == 0:
                if callbacks and "on_stage_start" in callbacks:
                    callbacks["on_stage_start"]("Implementer", f"Implementing question (Attempt {attempt + 1})")
                q_pkg = implementer_call(llm, prompts, models, idea_plan)
                if callbacks and "on_stage_complete" in callbacks:
                    callbacks["on_stage_complete"]("Implementer", q_pkg)
            else:
                if callbacks and "on_stage_start" in callbacks:
                    callbacks["on_stage_start"]("Implementer", f"Regenerating question (Attempt {attempt + 1})")
                q_pkg = implementer_regen_call(
                    llm, prompts, models,
                    idea_plan=idea_plan,
                    previous_attempt=previous_attempt,
                    verifier_report=verifier_report,
                    style_report=style_report
                )
                if callbacks and "on_stage_complete" in callbacks:
                    callbacks["on_stage_complete"]("Implementer", q_pkg)
            previous_attempt = q_pkg

            if callbacks and "on_stage_start" in callbacks:
                callbacks["on_stage_start"]("Verifier", "Verifying question correctness")
            verifier_report = verifier_call(llm, prompts, models, q_pkg, schema_id)
            v_verdict = extract_verdict(verifier_report)
            if callbacks and "on_stage_complete" in callbacks:
                callbacks["on_stage_complete"]("Verifier", verifier_report)

            dump_jsonl(paths["logs"], {
                "stage": "verifier",
                "schema_id": schema_id,
                "difficulty": difficulty,
                "attempt": attempt + 1,
                "verdict": v_verdict,
                "report": verifier_report,
            })

            if v_verdict != "PASS":
                severity = extract_severity(verifier_report)
                stats["failures"].setdefault(str(verifier_report.get("failure_type", "unknown")), 0)
                stats["failures"][str(verifier_report.get("failure_type", "unknown"))] += 1
                
                if callbacks and "on_stage_error" in callbacks:
                    failure_reasons = verifier_report.get("reasons", ["Unknown error"])
                    error_msg = f"FAILED: {', '.join(failure_reasons) if isinstance(failure_reasons, list) else str(failure_reasons)}"
                    callbacks["on_stage_error"]("Verifier", error_msg)

                if is_structural(severity):
                    # discard idea immediately
                    rejected_item = {
                        "schema_id": schema_id,
                        "difficulty": difficulty,
                        "attempt": attempt + 1,
                        "stage": "verifier",
                        "verifier_report": verifier_report,
                        "idea_plan": idea_plan,
                        "question_package": q_pkg,
                        "created_at": datetime.datetime.now().isoformat(),
                        "run_id": run_id,
                    }
                    dump_jsonl(paths["rejected"], rejected_item)
                    # Backup rejected question
                    try:
                        from backup_manager import backup_question_from_pipeline
                        backup_question_from_pipeline(rejected_item, base_dir, status="rejected")
                    except (ImportError, Exception):
                        pass
                    stats["rejected"] += 1
                    stats["by_schema"][schema_id]["rejected"] += 1
                    with open(paths["stats"], "w", encoding="utf-8") as f:
                        json.dump(stats, f, ensure_ascii=False, indent=2)
                    return {"run_dir": run_dir, "status": "rejected_structural_verifier"}

                # fixable -> retry if attempts remain
                if attempt < cfg.max_implementer_retries and is_fixable(severity):
                    continue

                # fixable but out of retries OR unknown severity -> reject
                rejected_item = {
                    "schema_id": schema_id,
                    "difficulty": difficulty,
                    "attempt": attempt + 1,
                    "stage": "verifier",
                    "verifier_report": verifier_report,
                    "idea_plan": idea_plan,
                    "question_package": q_pkg,
                    "created_at": datetime.datetime.now().isoformat(),
                    "run_id": run_id,
                }
                dump_jsonl(paths["rejected"], rejected_item)
                # Backup rejected question
                try:
                    from backup_manager import backup_question_from_pipeline
                    backup_question_from_pipeline(rejected_item, base_dir, status="rejected")
                except (ImportError, Exception):
                    pass
                stats["rejected"] += 1
                stats["by_schema"][schema_id]["rejected"] += 1
                with open(paths["stats"], "w", encoding="utf-8") as f:
                    json.dump(stats, f, ensure_ascii=False, indent=2)
                return {"run_dir": run_dir, "status": "rejected_verifier"}

            # Style Judge
            if callbacks and "on_stage_start" in callbacks:
                callbacks["on_stage_start"]("Style Judge", "Checking exam authenticity")
            style_report = style_call(llm, prompts, models, q_pkg, schema_id, verifier_obj=verifier_report, base_dir=base_dir)
            s_verdict = extract_verdict(style_report)
            if callbacks and "on_stage_complete" in callbacks:
                callbacks["on_stage_complete"]("Style Judge", style_report)

            dump_jsonl(paths["logs"], {
                "stage": "style_checker",
                "schema_id": schema_id,
                "difficulty": difficulty,
                "attempt": attempt + 1,
                "verdict": s_verdict,
                "report": style_report,
            })

            if s_verdict != "PASS":
                severity = extract_severity(style_report)
                
                if callbacks and "on_stage_error" in callbacks:
                    failure_reasons = style_report.get("regen_instructions", ["Unknown error"])
                    error_msg = f"FAILED: {', '.join(failure_reasons) if isinstance(failure_reasons, list) else str(failure_reasons)}"
                    callbacks["on_stage_error"]("Style Judge", error_msg)

                if is_structural(severity):
                    rejected_item = {
                        "schema_id": schema_id,
                        "difficulty": difficulty,
                        "attempt": attempt + 1,
                        "stage": "style_checker",
                        "style_report": style_report,
                        "verifier_report": verifier_report,
                        "idea_plan": idea_plan,
                        "question_package": q_pkg,
                        "created_at": datetime.datetime.now().isoformat(),
                        "run_id": run_id,
                    }
                    dump_jsonl(paths["rejected"], rejected_item)
                    # Backup rejected question
                    try:
                        from backup_manager import backup_question_from_pipeline
                        backup_question_from_pipeline(rejected_item, base_dir, status="rejected")
                    except (ImportError, Exception):
                        pass
                    stats["rejected"] += 1
                    stats["by_schema"][schema_id]["rejected"] += 1
                    with open(paths["stats"], "w", encoding="utf-8") as f:
                        json.dump(stats, f, ensure_ascii=False, indent=2)
                    return {"run_dir": run_dir, "status": "rejected_structural_style"}

                if attempt < cfg.max_implementer_retries and is_fixable(severity):
                    continue

                rejected_item = {
                    "schema_id": schema_id,
                    "difficulty": difficulty,
                    "attempt": attempt + 1,
                    "stage": "style_checker",
                    "style_report": style_report,
                    "verifier_report": verifier_report,
                    "idea_plan": idea_plan,
                    "question_package": q_pkg,
                    "created_at": datetime.datetime.now().isoformat(),
                    "run_id": run_id,
                }
                dump_jsonl(paths["rejected"], rejected_item)
                # Backup rejected question
                try:
                    from backup_manager import backup_question_from_pipeline
                    backup_question_from_pipeline(rejected_item, base_dir, status="rejected")
                except (ImportError, Exception):
                    pass
                stats["rejected"] += 1
                stats["by_schema"][schema_id]["rejected"] += 1
                with open(paths["stats"], "w", encoding="utf-8") as f:
                    json.dump(stats, f, ensure_ascii=False, indent=2)
                return {"run_dir": run_dir, "status": "rejected_style"}

            # PASS both gates -> KaTeX Validation (with retry logic)
            katex_validation_passed = False
            katex_attempt = 0
            max_katex_attempts = 3
            
            while not katex_validation_passed and katex_attempt < max_katex_attempts:
                if callbacks and "on_stage_start" in callbacks:
                    callbacks["on_stage_start"]("KaTeX Validator", f"Validating KaTeX formatting (Attempt {katex_attempt + 1}/{max_katex_attempts})")
                
                is_valid, katex_errors = validate_question_katex(q_pkg, schema_id)
                
                if is_valid:
                    katex_validation_passed = True
                    if callbacks and "on_stage_complete" in callbacks:
                        callbacks["on_stage_complete"]("KaTeX Validator", "KaTeX validation passed")
                else:
                    katex_attempt += 1
                    if katex_attempt < max_katex_attempts:
                        # Try to fix KaTeX issues
                        if callbacks and "on_stage_progress" in callbacks:
                            error_summary = f"{len(katex_errors)} field(s) with errors"
                            callbacks["on_stage_progress"]("KaTeX Validator", f"Fixing KaTeX errors: {error_summary}")
                        
                        try:
                            q_pkg = fix_katex_issues(llm, prompts, models, q_pkg, katex_errors, schema_id, katex_attempt, base_dir)
                            if callbacks and "on_stage_progress" in callbacks:
                                callbacks["on_stage_progress"]("KaTeX Validator", "Retrying validation after fix")
                        except Exception as e:
                            # Fix attempt failed, log and continue to next attempt or reject
                            error_str = str(e)
                            dump_jsonl(paths["logs"], {
                                "stage": "katex_fixer",
                                "schema_id": schema_id,
                                "difficulty": difficulty,
                                "attempt": katex_attempt,
                                "error": error_str,
                                "katex_errors": katex_errors
                            })
                            if callbacks and "on_stage_error" in callbacks:
                                callbacks["on_stage_error"]("KaTeX Fixer", error_str)
                    else:
                        # Max attempts reached, reject question
                        if callbacks and "on_stage_error" in callbacks:
                            error_summary = f"KaTeX validation failed after {max_katex_attempts} attempts"
                            callbacks["on_stage_error"]("KaTeX Validator", error_summary)
                        
                        rejected_item = {
                            "schema_id": schema_id,
                            "difficulty": difficulty,
                            "attempt": attempt + 1,
                            "stage": "katex_validation",
                            "katex_errors": katex_errors,
                            "verifier_report": verifier_report,
                            "style_report": style_report,
                            "idea_plan": idea_plan,
                            "question_package": q_pkg,
                            "created_at": datetime.datetime.now().isoformat(),
                            "run_id": run_id,
                        }
                        dump_jsonl(paths["rejected"], rejected_item)
                        # Backup rejected question
                        try:
                            from backup_manager import backup_question_from_pipeline
                            backup_question_from_pipeline(rejected_item, base_dir, status="rejected")
                        except (ImportError, Exception):
                            pass
                        stats["rejected"] += 1
                        stats["by_schema"][schema_id]["rejected"] += 1
                        with open(paths["stats"], "w", encoding="utf-8") as f:
                            json.dump(stats, f, ensure_ascii=False, indent=2)
                        return {"run_dir": run_dir, "status": "rejected_katex_validation"}
            
            if not katex_validation_passed:
                # Should not reach here, but safety check
                return {"run_dir": run_dir, "status": "rejected_katex_validation"}
            
            # PASS KaTeX gate -> build item; tag then persist so accepted.jsonl matches DB/backup
            token_usage = llm.total_usage.copy() if llm.total_usage else None
            item = build_bank_item(
                idea_plan=idea_plan,
                question_obj=q_pkg,
                verifier_obj=verifier_report,
                style_obj=style_report,
                schema_id=schema_id,
                difficulty=difficulty,
                models=models,
                attempts=attempt + 1,
                token_usage=token_usage,
                tags=None,
            )
            item["_run_id"] = run_id

            tags = None
            if cfg.enable_tag_labeling and curriculum_parser:
                try:
                    if callbacks and "on_stage_start" in callbacks:
                        callbacks["on_stage_start"]("Tag Labeler Station", "Assigning curriculum tags")
                    
                    tag_result = tag_labeler_station(llm, prompts, models, q_pkg, schema_id, curriculum_parser, base_dir)
                    
                    if tag_result:
                        # Process tag_result into tags format
                        primary_tag = tag_result.get("primary_tag", "")
                        secondary_tags = tag_result.get("secondary_tags", [])
                        
                        # Normalize tags if needed
                        if primary_tag and curriculum_parser:
                            normalized_primary = curriculum_parser.normalize_topic_code(primary_tag)
                            if normalized_primary:
                                primary_tag = normalized_primary
                        
                        normalized_secondary = []
                        for tag in secondary_tags:
                            if curriculum_parser:
                                normalized_tag = curriculum_parser.normalize_topic_code(tag)
                                if normalized_tag:
                                    tag = normalized_tag
                            normalized_secondary.append(tag)
                        
                        # Build confidence object
                        confidence = {
                            "primary": tag_result.get("primary_confidence", 0.0)
                        }
                        for tag in normalized_secondary:
                            confidence[tag] = 0.0  # Default confidence for secondary tags
                        
                        tags = {
                            "primary_tag": primary_tag,
                            "secondary_tags": normalized_secondary,
                            "confidence": confidence,
                            "labeled_at": datetime.datetime.now().isoformat(),
                            "labeled_by": "tag_labeler_station",
                            "reasoning": tag_result.get("reasoning", "")
                        }
                        
                        # Add paper field for Math questions
                        if "paper" in tag_result:
                            tags["paper"] = tag_result["paper"]

                        item["tags"] = tags

                        dump_jsonl(paths["logs"], {
                            "stage": "tag_labeler_station",
                            "schema_id": schema_id,
                            "difficulty": difficulty,
                            "attempt": attempt + 1,
                            "tags": tags,
                        })
                        
                        if callbacks and "on_stage_complete" in callbacks:
                            callbacks["on_stage_complete"]("Tag Labeler Station", tag_result)
                except Exception as e:
                    # Tag labeling failures should not block question generation
                    error_msg = str(e)
                    print(f"⚠ Tag Labeler Station failed (non-fatal): {error_msg[:200]}...")
                    
                    dump_jsonl(paths["logs"], {
                        "stage": "tag_labeler_station",
                        "schema_id": schema_id,
                        "difficulty": difficulty,
                        "attempt": attempt + 1,
                        "error": error_msg,
                    })
                    if callbacks and "on_stage_error" in callbacks:
                        callbacks["on_stage_error"]("Tag Labeler Station", error_msg)

            dump_jsonl(paths["accepted"], item)
            stats["accepted"] += 1
            stats["by_schema"][schema_id]["accepted"] += 1
            with open(paths["stats"], "w", encoding="utf-8") as f:
                json.dump(stats, f, ensure_ascii=False, indent=2)

            # Backup question (all questions, accepted and rejected)
            try:
                from backup_manager import backup_question_from_pipeline
                backup_path = backup_question_from_pipeline(item, base_dir, status="pending_review")
                if backup_path:
                    try:
                        print(f"✓ Backed up question to: {backup_path}")
                    except UnicodeEncodeError:
                        print(f"[OK] Backed up question to: {backup_path}")
            except ImportError:
                print("⚠ Backup manager not available, skipping backup")
            except Exception as e:
                print(f"⚠ Backup error (non-fatal): {e}")
            
            # Sync to database (silently - no console output)
            # Only questions that pass verifier + style judge will be saved
            try:
                from db_sync import sync_question_from_pipeline
                db_id = sync_question_from_pipeline(item, base_dir, status="approved")
                if db_id:
                    item["_db_id"] = db_id
            except ImportError:
                pass  # Silent fail
            except Exception:
                pass  # Silent fail - errors logged in db_sync.py
            
            # HTML generation disabled - questions are saved to database and shown in UI
            # No need to generate HTML files or open previews

            if callbacks and "on_success" in callbacks:
                callbacks["on_success"](item)
            # Silent mode - no console output, questions saved to database
            
            return {"run_dir": run_dir, "status": "accepted", "item_id": item["id"], "item": item}

        except ValueError as e:
            # Check if this is a YAML parsing error
            error_msg = str(e)
            is_yaml_error = "YAML" in error_msg or "yaml" in error_msg.lower() or "parsing" in error_msg.lower()
            
            # Print error to console for debugging
            if is_yaml_error:
                print(f"\n⚠ Implementer attempt {attempt + 1}/{cfg.max_implementer_retries + 1}: Invalid YAML detected")
                print(f"   Error: {error_msg[:300]}...")
                if attempt < cfg.max_implementer_retries:
                    print(f"   → Retrying with new AI generation...")
                else:
                    print(f"   → Max retries reached. Giving up.")
            else:
                print(f"\n⚠ Error at attempt {attempt + 1}: {error_msg[:300]}")
                if "question" in error_msg.lower() or "solution" in error_msg.lower():
                    print("  → Missing required fields in Implementer output")
                if attempt < cfg.max_implementer_retries:
                    print(f"  → Retrying... ({attempt + 1}/{cfg.max_implementer_retries})")
            
            dump_jsonl(paths["logs"], {
                "stage": "pipeline_exception",
                "schema_id": schema_id,
                "difficulty": difficulty,
                "attempt": attempt + 1,
                "error": error_msg,
                "is_yaml_error": is_yaml_error,
            })
            # Treat exceptions as fixable and try again if possible
            if attempt < cfg.max_implementer_retries:
                continue
        except Exception as e:
            error_msg = str(e)
            # Print error to console for debugging
            print(f"\n⚠ Error at attempt {attempt + 1}: {error_msg[:300]}")
            if "YAML" in error_msg or "invalid" in error_msg.lower():
                print("  → This looks like a YAML parsing/validation issue")
            if "question" in error_msg.lower() or "solution" in error_msg.lower():
                print("  → Missing required fields in Implementer output")
            
            dump_jsonl(paths["logs"], {
                "stage": "pipeline_exception",
                "schema_id": schema_id,
                "difficulty": difficulty,
                "attempt": attempt + 1,
                "error": error_msg,
                "is_yaml_error": False,
            })
            # Treat exceptions as fixable and try again if possible
            if attempt < cfg.max_implementer_retries:
                print(f"  → Retrying... ({attempt + 1}/{cfg.max_implementer_retries})")
                continue
            stats["rejected"] += 1
            stats["by_schema"][schema_id]["rejected"] += 1
            rejected_item = {
                "schema_id": schema_id,
                "difficulty": difficulty,
                "attempt": attempt + 1,
                "stage": "exception",
                "error": str(e),
                "idea_plan": idea_plan,
                "created_at": datetime.datetime.now().isoformat(),
                "run_id": run_id,
            }
            dump_jsonl(paths["rejected"], rejected_item)
            # Backup rejected question
            try:
                from backup_manager import backup_question_from_pipeline
                backup_question_from_pipeline(rejected_item, base_dir, status="rejected")
            except (ImportError, Exception):
                pass
            with open(paths["stats"], "w", encoding="utf-8") as f:
                json.dump(stats, f, ensure_ascii=False, indent=2)
            return {"run_dir": run_dir, "status": "rejected_exception"}

    # Should never reach here
    return {"run_dir": run_dir, "status": "unknown"}


def run_many(n: int, base_dir: str, cfg: RunConfig, models: ModelsConfig) -> None:
    """
    Runs n independent items (each creates its own run directory).
    """
    for i in range(n):
        print(f"\n{'='*60}")
        print(f"Generating question {i+1}/{n}...")
        print(f"{'='*60}")
        try:
            res = run_once(base_dir=base_dir, cfg=cfg, models=models)
            status = res.get("status", "unknown")
            if status == "accepted":
                try:
                    print(f"✓ [{i+1}/{n}] SUCCESS - Question ID: {res.get('item_id', 'N/A')}")
                except UnicodeEncodeError:
                    print(f"[OK] [{i+1}/{n}] SUCCESS - Question ID: {res.get('item_id', 'N/A')}")
            else:
                try:
                    print(f"✗ [{i+1}/{n}] FAILED - Status: {status}")
                except UnicodeEncodeError:
                    print(f"[FAIL] [{i+1}/{n}] FAILED - Status: {status}")
                if "run_dir" in res:
                    print(f"  Check logs: {res['run_dir']}")
        except Exception as e:
            try:
                print(f"✗ [{i+1}/{n}] EXCEPTION: {str(e)[:200]}")
            except UnicodeEncodeError:
                print(f"[ERROR] [{i+1}/{n}] EXCEPTION: {str(e)[:200]}")
            import traceback
            traceback.print_exc()


def safe_load_dotenv(filepath: str) -> bool:
    """Safely load .env file, handling encoding issues and BOM"""
    if not os.path.exists(filepath):
        return False
    
    try:
        # Read file and remove BOM if present
        with open(filepath, 'r', encoding='utf-8-sig') as f:  # utf-8-sig automatically strips BOM
            content = f.read()
        
        # Write back without BOM
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Now load it
        load_dotenv(filepath, encoding="utf-8", override=True)
        return True
    except UnicodeDecodeError:
        try:
            # Try UTF-16 LE (Windows sometimes saves as this)
            with open(filepath, 'r', encoding='utf-16-le') as f:
                content = f.read()
            # Remove BOM if present and write as UTF-8
            if content.startswith('\ufeff'):
                content = content[1:]
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            load_dotenv(filepath, encoding="utf-8", override=True)
            return True
        except Exception as e:
            # If all else fails, try without encoding specification
            try:
                load_dotenv(filepath, override=True)
                return True
            except Exception as e2:
                print(f"Warning: Could not load {filepath} due to encoding issues. Using environment variables only.")
                print(f"  Error: {e2}")
                return False
    except Exception as e:
        print(f"Warning: Could not load {filepath}: {e}")
        return False


def main():
    # Load environment variables from .env.local (handle encoding issues)
    safe_load_dotenv(".env.local")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))

    # Check and display key environment variables
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    n_items = os.environ.get("N_ITEMS", "1")
    max_retries = os.environ.get("MAX_IMPLEMENTER_RETRIES", "2")
    schema_prefixes = os.environ.get("SCHEMA_PREFIXES", "M,P")
    allow_prefixes = tuple(p.strip() for p in schema_prefixes.split(",") if p.strip())
    
    print(f"Configuration loaded from .env.local:")
    print(f"  GEMINI_API_KEY: {'***' + gemini_key[-4:] if len(gemini_key) > 4 else 'NOT SET'}")
    print(f"  N_ITEMS: {n_items}")
    print(f"  MAX_IMPLEMENTER_RETRIES: {max_retries}")
    print(f"  SCHEMA_PREFIXES: {schema_prefixes}")
    print()

    cfg = RunConfig(
        max_implementer_retries=int(max_retries),
        max_designer_retries=int(os.environ.get("MAX_DESIGNER_RETRIES", "2")),
        seed=int(os.environ["SEED"]) if os.environ.get("SEED") else None,
        difficulty_weights=difficulty_weights_from_env(allow_prefixes),
        schema_weights=None,
        out_dir=os.environ.get("OUT_DIR", "runs"),
        allow_schema_prefixes=allow_prefixes,
    )

    models = get_default_models_config()

    n = int(n_items)
    run_many(n=n, base_dir=base_dir, cfg=cfg, models=models)


# ---------- GUI Interface ----------

class PipelineGUI:
    """Single-question pipeline visualizer. Console output mirrors stages (see terminal where you launched)."""

    # Must cover every on_stage_* name from run_once or callbacks will KeyError and the UI looks "stuck".
    PIPELINE_STAGES = (
        "Designer",
        "Implementer",
        "Verifier",
        "Style Judge",
        "KaTeX Validator",
        "Format Fixer",
        "Tag Labeler Station",
    )

    def __init__(self, root: tk.Tk, base_dir: str, cfg: RunConfig, models: ModelsConfig):
        self.root = root
        self.base_dir = base_dir
        self.cfg = cfg
        self.models = models
        self.running = False
        
        root.title("TMUA Question Generator - Pipeline Visualizer")
        root.geometry("1200x800")
        
        # Main container
        main_frame = ttk.Frame(root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        root.columnconfigure(0, weight=1)
        root.rowconfigure(0, weight=1)
        
        # Control panel
        control_frame = ttk.Frame(main_frame)
        control_frame.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        
        self.start_button = ttk.Button(control_frame, text="Generate Math Question", command=self.start_generation)
        self.start_button.grid(row=0, column=0, padx=5)
        
        self.status_label = ttk.Label(control_frame, text="Ready", font=("Arial", 10, "bold"))
        self.status_label.grid(row=0, column=1, padx=10)
        
        # Pipeline stages
        stages_frame = ttk.LabelFrame(main_frame, text="Pipeline Stages", padding="10")
        stages_frame.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(0, 10))
        main_frame.rowconfigure(1, weight=1)
        
        # Stage widgets
        self.stage_widgets = {}
        stages = list(self.PIPELINE_STAGES)
        
        for i, stage in enumerate(stages):
            frame = ttk.Frame(stages_frame)
            frame.grid(row=i, column=0, sticky=(tk.W, tk.E), pady=5)
            stages_frame.columnconfigure(0, weight=1)
            
            # Status indicator
            status_canvas = tk.Canvas(frame, width=20, height=20, highlightthickness=0)
            status_canvas.grid(row=0, column=0, padx=5)
            self.stage_widgets[f"{stage}_status"] = status_canvas
            self.update_stage_status(stage, "pending")
            
            # Stage label
            label = ttk.Label(frame, text=f"{stage}:", font=("Arial", 10, "bold"))
            label.grid(row=0, column=1, sticky=tk.W, padx=5)
            
            # Stage info
            info_label = ttk.Label(frame, text="Waiting...", foreground="gray")
            info_label.grid(row=0, column=2, sticky=tk.W, padx=5)
            self.stage_widgets[f"{stage}_info"] = info_label
            
            # Output text area
            output_text = scrolledtext.ScrolledText(frame, height=8, width=80, wrap=tk.WORD, state=tk.DISABLED)
            output_text.grid(row=1, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=5)
            self.stage_widgets[f"{stage}_output"] = output_text
        
        # Final result with tabs
        result_frame = ttk.LabelFrame(main_frame, text="Final Question", padding="10")
        result_frame.grid(row=2, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S))
        main_frame.rowconfigure(2, weight=1)
        
        # Create notebook for tabs
        notebook = ttk.Notebook(result_frame)
        notebook.pack(fill=tk.BOTH, expand=True)
        
        # Question tab
        question_frame = ttk.Frame(notebook)
        notebook.add(question_frame, text="Question")
        self.result_text = scrolledtext.ScrolledText(question_frame, wrap=tk.WORD, state=tk.DISABLED, font=("Consolas", 10))
        self.result_text.pack(fill=tk.BOTH, expand=True)
        
        # Solution tab
        solution_frame = ttk.Frame(notebook)
        notebook.add(solution_frame, text="Solution")
        self.solution_text = scrolledtext.ScrolledText(solution_frame, wrap=tk.WORD, state=tk.DISABLED, font=("Consolas", 10))
        self.solution_text.pack(fill=tk.BOTH, expand=True)
        
        # Details tab
        details_frame = ttk.Frame(notebook)
        notebook.add(details_frame, text="Details")
        self.details_text = scrolledtext.ScrolledText(details_frame, wrap=tk.WORD, state=tk.DISABLED, font=("Consolas", 9))
        self.details_text.pack(fill=tk.BOTH, expand=True)
    
    def _console(self, message: str) -> None:
        ts = datetime.datetime.now().strftime("%H:%M:%S")
        try:
            print(f"[{ts}] [TMUA Pipeline GUI] {message}", flush=True)
        except Exception:
            pass

    @staticmethod
    def _normalize_stage(stage: str) -> str:
        """Map internal stage names onto UI rows."""
        if stage == "KaTeX Fixer":
            return "KaTeX Validator"
        return stage

    def update_stage_status(self, stage: str, status: str):
        """Update the status indicator circle"""
        canvas = self.stage_widgets[f"{stage}_status"]
        canvas.delete("all")
        
        colors = {
            "pending": "gray",
            "running": "orange",
            "success": "green",
            "error": "red"
        }
        color = colors.get(status, "gray")
        canvas.create_oval(5, 5, 15, 15, fill=color, outline="black", width=1)
    
    def update_stage_info(self, stage: str, info: str):
        """Update the stage info label"""
        self.stage_widgets[f"{stage}_info"].config(text=info, foreground="black")
    
    def append_stage_output(self, stage: str, text: str):
        """Append text to stage output"""
        output = self.stage_widgets[f"{stage}_output"]
        output.config(state=tk.NORMAL)
        output.insert(tk.END, text + "\n")
        output.see(tk.END)
        output.config(state=tk.DISABLED)
        self.root.update_idletasks()
    
    def clear_stage_output(self, stage: str):
        """Clear stage output"""
        output = self.stage_widgets[f"{stage}_output"]
        output.config(state=tk.NORMAL)
        output.delete(1.0, tk.END)
        output.config(state=tk.DISABLED)
    
    def clear_all_results(self):
        """Clear all result tabs"""
        self.result_text.config(state=tk.NORMAL)
        self.result_text.delete(1.0, tk.END)
        self.result_text.config(state=tk.DISABLED)
        self.solution_text.config(state=tk.NORMAL)
        self.solution_text.delete(1.0, tk.END)
        self.solution_text.config(state=tk.DISABLED)
        self.details_text.config(state=tk.NORMAL)
        self.details_text.delete(1.0, tk.END)
        self.details_text.config(state=tk.DISABLED)
    
    def format_yaml(self, data: Any) -> str:
        """Format data as YAML string"""
        try:
            return yaml.safe_dump(data, sort_keys=False, default_flow_style=False, allow_unicode=True)
        except:
            return str(data)
    
    def start_generation(self):
        """Start the generation process in a separate thread"""
        if self.running:
            return
        
        self.running = True
        self.start_button.config(state=tk.DISABLED)
        self.status_label.config(text="Running...", foreground="orange")
        self._console("Generate clicked — pipeline thread starting (keep this terminal visible for logs).")
        
        # Clear all outputs
        for stage in self.PIPELINE_STAGES:
            self.update_stage_status(stage, "pending")
            self.update_stage_info(stage, "Waiting...")
            self.clear_stage_output(stage)
        
        # Clear all result tabs
        self.clear_all_results()
        
        # Run in separate thread
        thread = threading.Thread(target=self.run_pipeline, daemon=True)
        thread.start()
    
    def run_pipeline(self):
        """Run the pipeline with GUI callbacks"""
        callbacks = {
            "on_schema_selected": self.on_schema_selected,
            "on_stage_start": self.on_stage_start,
            "on_stage_progress": self.on_stage_progress,
            "on_stage_complete": self.on_stage_complete,
            "on_stage_error": self.on_stage_error,
            "on_success": self.on_success,
        }
        
        try:
            self._console("Calling run_once() … (Designer API call can take 30–120+ seconds; not frozen.)")
            result = run_once(self.base_dir, self.cfg, self.models, callbacks=callbacks)
            self._console(f"run_once() returned status={result.get('status', 'unknown')!r}")
            status = result.get('status', 'unknown')
            if status == 'accepted':
                item_id = result.get('item_id', 'N/A')
                item = result.get('item')  # Get the item if available
                if item:
                    # on_success callback should have already been called, but ensure GUI updates
                    pass
                self.root.after(0, lambda: self.status_label.config(
                    text=f"Success! Question ID: {item_id}", 
                    foreground="green"
                ))
            else:
                self.root.after(0, lambda status=status: self.status_label.config(
                    text=f"Failed: {status}", 
                    foreground="red"
                ))
                # Show error in result area
                error_result = json.dumps(result, indent=2)
                def update():
                    self.result_text.config(state=tk.NORMAL)
                    self.result_text.delete(1.0, tk.END)
                    self.result_text.insert(1.0, f"Generation failed with status: {status}\n\nResult: {error_result}")
                    self.result_text.config(state=tk.DISABLED)
                self.root.after(0, update)
        except SystemExit as e:
            import traceback
            error_msg = str(e) or "SystemExit"
            tb = traceback.format_exc()
            self._console(f"SystemExit (e.g. missing GEMINI_API_KEY): {error_msg}")
            self._console(tb)

            def show_exit():
                self.status_label.config(text=f"Stopped: {error_msg[:70]}", foreground="red")
                self.result_text.config(state=tk.NORMAL)
                self.result_text.delete(1.0, tk.END)
                self.result_text.insert(1.0, f"{error_msg}\n\n{tb}")
                self.result_text.config(state=tk.DISABLED)

            self.root.after(0, show_exit)
        except Exception as e:
            import traceback
            error_msg = f"Exception: {str(e)}\n\n{traceback.format_exc()}"
            error_short = str(e)[:50]
            self._console(error_msg)
            self.root.after(0, lambda: (
                self.status_label.config(text=f"Error: {error_short}...", foreground="red"),
                self.result_text.config(state=tk.NORMAL),
                self.result_text.delete(1.0, tk.END),
                self.result_text.insert(1.0, error_msg),
                self.result_text.config(state=tk.DISABLED)
            ))
        finally:
            def update():
                self.start_button.config(state=tk.NORMAL)
            self.root.after(0, update)
            self.running = False
            self._console("Pipeline thread finished; button re-enabled.")
    
    def on_schema_selected(self, schema_id: str, difficulty: str):
        """Callback when schema is selected"""
        self._console(f"Schema selected: {schema_id} ({difficulty})")
        def update():
            self.status_label.config(
                text=f"Selected: {schema_id} ({difficulty})", foreground="blue"
            )
        self.root.after(0, update)
    
    def on_stage_start(self, stage: str, info: str):
        """Callback when a stage starts"""
        row = self._normalize_stage(stage)
        self._console(f"→ {stage} (UI row: {row}): {info[:160]}")
        def update():
            try:
                self.update_stage_status(row, "running")
                self.update_stage_info(row, info)
                self.append_stage_output(row, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Starting: {info}")
            except KeyError:
                self._console(f"KEYERROR: missing UI row for stage={stage!r} row={row!r}")
        self.root.after(0, update)
    
    def on_stage_progress(self, stage: str, progress: str):
        """Callback for stage progress updates"""
        row = self._normalize_stage(stage)
        self._console(f"… {stage}: {progress[:120]}")
        def update():
            try:
                self.update_stage_info(row, progress)
                self.append_stage_output(row, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {progress}")
            except KeyError:
                self._console(f"KEYERROR progress: stage={stage!r} row={row!r}")
        self.root.after(0, update)
    
    def on_stage_complete(self, stage: str, data: Any):
        """Callback when a stage completes"""
        row = self._normalize_stage(stage)
        self._console(f"✓ {stage} complete (UI row: {row})")
        def update():
            try:
                self.update_stage_status(row, "success")
                self.update_stage_info(row, "Complete")
                self.append_stage_output(row, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Completed successfully\n")
                self.append_stage_output(row, "Output:\n" + self.format_yaml(data))
            except KeyError:
                self._console(f"KEYERROR complete: stage={stage!r} row={row!r}")
        self.root.after(0, update)
    
    def on_stage_error(self, stage: str, error: str):
        """Callback when a stage encounters an error"""
        row = self._normalize_stage(stage)
        self._console(f"✗ {stage} ERROR: {error[:500]}")
        def update():
            try:
                self.update_stage_status(row, "error")
                self.update_stage_info(row, f"Error: {error[:50]}...")
                self.append_stage_output(row, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] ERROR: {error}")
            except KeyError:
                self._console(f"KEYERROR on_stage_error: stage={stage!r} row={row!r}")
        self.root.after(0, update)
    
    def on_success(self, item: Dict[str, Any]):
        """Callback when question is successfully generated"""
        question = item.get("question_package", {}).get("question", {})
        solution = item.get("question_package", {}).get("solution", {})
        stem = question.get("stem", "N/A")
        options = question.get("options", {})
        correct = question.get("correct_option", "N/A")
        distractor_map = item.get("question_package", {}).get("distractor_map", {})
        
        # Question tab content
        question_text = f"QUESTION:\n{'='*60}\n\n{stem}\n\n"
        question_text += "OPTIONS:\n" + "="*60 + "\n"
        for opt, text in sorted(options.items()):
            try:
                marker = " ✓ [CORRECT]" if opt == correct else ""
            except UnicodeEncodeError:
                marker = " [CORRECT]" if opt == correct else ""
            question_text += f"\n{opt}: {text}{marker}"
        question_text += f"\n\n{'='*60}\nCorrect Answer: {correct}\n"
        
        # Solution tab content
        solution_text = "SOLUTION:\n" + "="*60 + "\n\n"
        if solution.get("reasoning"):
            solution_text += "REASONING:\n" + "-"*60 + "\n"
            solution_text += solution.get("reasoning", "N/A") + "\n\n"
        if solution.get("key_insight"):
            solution_text += "KEY INSIGHT:\n" + "-"*60 + "\n"
            solution_text += solution.get("key_insight", "N/A") + "\n"
        
        # Details tab content
        details_text = f"Question ID: {item.get('id', 'N/A')}\n"
        details_text += f"Schema: {item.get('schema_id', 'N/A')}\n"
        details_text += f"Difficulty: {item.get('difficulty', 'N/A')}\n"
        details_text += f"Attempts: {item.get('attempts', 'N/A')}\n"
        details_text += f"Created: {item.get('created_at', 'N/A')}\n\n"
        details_text += "="*60 + "\n\n"
        details_text += "DISTRACTOR ANALYSIS:\n" + "-"*60 + "\n"
        for opt, desc in sorted(distractor_map.items()):
            marker = " [CORRECT]" if opt == correct else ""
            details_text += f"\n{opt}: {desc}{marker}\n"
        details_text += "\n" + "="*60 + "\n\n"
        details_text += "VERIFIER REPORT:\n" + "-"*60 + "\n"
        verifier = item.get("verifier_report", {})
        details_text += f"Verdict: {verifier.get('verdict', 'N/A')}\n"
        details_text += f"Confidence: {verifier.get('confidence', 'N/A')}\n"
        if verifier.get("notes"):
            details_text += "\nNotes:\n"
            for note in verifier.get("notes", []):
                details_text += f"  • {note}\n"
        details_text += "\n" + "="*60 + "\n\n"
        details_text += "STYLE REPORT:\n" + "-"*60 + "\n"
        style = item.get("style_report", {})
        details_text += f"Verdict: {style.get('verdict', 'N/A')}\n"
        if style.get("scores"):
            details_text += "\nScores:\n"
            for key, val in style.get("scores", {}).items():
                details_text += f"  {key}: {val}/10\n"
        if style.get("summary"):
            details_text += f"\nSummary: {style.get('summary')}\n"
        
        def update():
            # Update question tab
            self.result_text.config(state=tk.NORMAL)
            self.result_text.delete(1.0, tk.END)
            self.result_text.insert(1.0, question_text)
            self.result_text.config(state=tk.DISABLED)
            
            # Update solution tab
            self.solution_text.config(state=tk.NORMAL)
            self.solution_text.delete(1.0, tk.END)
            self.solution_text.insert(1.0, solution_text)
            self.solution_text.config(state=tk.DISABLED)
            
            # Update details tab
            self.details_text.config(state=tk.NORMAL)
            self.details_text.delete(1.0, tk.END)
            self.details_text.insert(1.0, details_text)
            self.details_text.config(state=tk.DISABLED)
        self.root.after(0, update)


def run_gui():
    """Run the GUI interface"""
    if not _TKINTER_AVAILABLE:
        print("Tkinter not available. Falling back to command-line mode.")
        main()
        return
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    # Load .env.local from monorepo root first (same as generate_with_progress), then local
    qgen_root = os.path.dirname(base_dir)
    project_root = os.path.dirname(qgen_root)
    for env_path in (
        os.path.join(project_root, ".env.local"),
        os.path.join(base_dir, ".env.local"),
        ".env.local",
    ):
        if os.path.isfile(env_path):
            safe_load_dotenv(env_path)
            print(f"[TMUA Pipeline GUI] Loaded env: {env_path}", flush=True)
            break
    else:
        safe_load_dotenv(".env.local")

    key_ok = bool(os.environ.get("GEMINI_API_KEY", "").strip())
    print(
        f"[TMUA Pipeline GUI] GEMINI_API_KEY: {'set' if key_ok else 'MISSING — add to .env.local at project root'}",
        flush=True,
    )
    
    # Configuration for math questions only
    gui_prefixes = ("M",)
    cfg = RunConfig(
        max_implementer_retries=int(os.environ.get("MAX_IMPLEMENTER_RETRIES", "2")),
        max_designer_retries=int(os.environ.get("MAX_DESIGNER_RETRIES", "2")),
        seed=None,
        difficulty_weights=difficulty_weights_from_env(gui_prefixes),
        schema_weights=None,
        out_dir=os.environ.get("OUT_DIR", "runs"),
        allow_schema_prefixes=gui_prefixes,
    )
    
    models = get_default_models_config()
    # Override style_judge for this specific function if needed
    if os.environ.get("MODEL_STYLE"):
        models.style_judge = os.environ.get("MODEL_STYLE")
    
    root = tk.Tk()
    app = PipelineGUI(root, base_dir, cfg, models)
    root.mainloop()


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--gui":
        run_gui()
    else:
        main()
              