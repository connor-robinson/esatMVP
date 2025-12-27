#!/usr/bin/env python3
"""
ESAT / ENGAA Question Generator Pipeline (v2 - Subject-Specific)

Implements:
Schema -> Designer -> Implementer -> Verifier -> Style Judge -> Classifier -> Save
with Retry Controller (max retries on fixable failures).

Directory layout expected (relative to this script):
esat_question_generator/
├── by_subject_prompts/
│   ├── Biology/
│   │   ├── Biology Classifier.md
│   │   ├── Biology Designer.md
│   │   └── Biology Implementer.md
│   ├── Chemistry/
│   │   ├── Chemistry Classifier.md
│   │   ├── Chemistry Designer.md
│   │   └── Chemistry Implementer.md
│   ├── Maths/
│   │   ├── Math Classifier.md
│   │   ├── Math Designer.md
│   │   └── Math Implementer.md
│   ├── Physics/
│   │   ├── Physics Classifier.md
│   │   ├── Physics Designer.md
│   │   └── Physics Implementer.md
│   ├── Retry_controller.md (universal)
│   ├── Verifier.md (universal with subject-specific sections)
│   ├── Style_checker.md (universal with subject-specific sections)
│   └── ESAT curriculum.md (curriculum data)
├── Schemas.md (universal schemas for all subjects: M1-M109, P1-P98, C1-C78, B1-B45)
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

# ---------- Optional dependencies ----------
try:
    import yaml  # PyYAML
except ImportError as e:
    raise SystemExit("Missing dependency: pyyaml. Install with `pip install pyyaml`") from e

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
    verifier: str = "gemini-3-pro-preview"
    style_judge: str = "gemini-2.5-flash"
    classifier: str = "gemini-2.5-flash"  # NEW: For curriculum tag classification


@dataclass
class RunConfig:
    max_implementer_retries: int = 2
    max_designer_retries: int = 2  # if designer outputs invalid YAML, etc.
    seed: Optional[int] = None
    difficulty_weights: Dict[str, float] = None  # type: ignore
    schema_weights: Optional[Dict[str, float]] = None  # optional weighting by schema_id
    out_dir: str = "runs"
    allow_schema_prefixes: Tuple[str, ...] = ("M", "P")  # choose both maths & physics by default
    enable_tag_labeling: bool = True  # Enable curriculum tag labeling
    curriculum_file_path: Optional[str] = None  # Path to curriculum JSON (default: curriculum/ESAT_CURRICULUM.json)


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
    Removes surrounding ```yaml ... ``` or ``` ... ``` fences if present.
    """
    t = text.strip()
    # Common patterns: ```yaml\n...\n``` or ```\n...\n```
    if t.startswith("```"):
        # Remove first fence line
        t = re.sub(r"^```[a-zA-Z0-9_-]*\s*\n", "", t)
        # Remove ending fence
        t = re.sub(r"\n```$", "", t.strip())
    return t.strip()

def safe_yaml_load(text: str) -> Any:
    """Safely load YAML, with clearer errors."""
    cleaned = strip_code_fences(text)
    try:
        result = yaml.safe_load(cleaned)
        if result is None:
            raise ValueError("YAML parsed to None (empty or invalid YAML).")
        return result
    except yaml.YAMLError as e:
        # Attach context about where parsing failed if available
        error_msg = str(e)
        line_info = ""
        if hasattr(e, "problem_mark") and e.problem_mark:
            lines = cleaned.split("\n")
            line_num = e.problem_mark.line
            col_num = e.problem_mark.column if hasattr(e.problem_mark, "column") else None
            if 0 <= line_num < len(lines):
                line_info = f"\nProblem at line {line_num + 1}"
                if col_num is not None:
                    line_info += f", column {col_num + 1}"
                line_info += f": {lines[line_num]}"
                # Show context lines if available
                if line_num > 0:
                    line_info += f"\nPrevious line: {lines[line_num - 1]}"
                if line_num < len(lines) - 1:
                    line_info += f"\nNext line: {lines[line_num + 1]}"
        
        # Show a preview of the problematic YAML
        preview = cleaned[:500] if len(cleaned) <= 500 else cleaned[:500] + "\n... (truncated)"
        
        raise ValueError(
            f"YAML parsing error: {error_msg}{line_info}\n\n"
            f"YAML preview (first 500 chars):\n{preview}"
        )


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

def get_subject_from_schema(schema_id: str) -> str:
    """Map schema_id prefix to subject name."""
    prefix = schema_id[0].upper()
    mapping = {
        'M': 'mathematics',
        'P': 'physics',
        'B': 'biology',
        'C': 'chemistry'
    }
    return mapping.get(prefix, 'mathematics')


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
    
    return {
        'designer': prompts.designer[subject],
        'implementer': prompts.implementer[subject],
        'classifier': prompts.classifier[subject]
    }


# ---------- Schema parsing ----------

# Updated regex to accept numbered (M1, P3), unique (M_a1b2c3d4), and unnumbered (M., P.) formats
SCHEMA_HEADER_RE = re.compile(r"^##\s+\*\*((?:M|P|B|C)(?:\d+|_[a-f0-9]{8}))\.?\s+(.+?)\*\*\s*$", re.MULTILINE)

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
        
        # Extract prefix (M, P, B, or C)
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
        schemas[schema_id] = {"title": title, "block": block}
    
    if not schemas:
        raise ValueError("No schemas parsed. Ensure Schemas.md uses headings like: ## **M1. Title** or ## **P1. Title** or ## **B1. Title** or ## **C1. Title** or ## **M. Title** or ## **P. Title**")
    return schemas


# ---------- Gemini client wrapper ----------

class LLMClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = None
        self.last_usage = None  # Store last API call's token usage
        self.total_usage = {"prompt_tokens": 0, "candidates_tokens": 0, "total_tokens": 0}  # Accumulate total usage
        if _GENAI_AVAILABLE:
            self.client = genai.Client(api_key=api_key)

    def generate(self, model: str, system_prompt: str, user_prompt: str, temperature: float=0.6, max_retries: int=3) -> str:
        """
        Returns model output as text.
        Retries on transient errors (503, network issues) with exponential backoff.
        """
        if not self.client:
            raise RuntimeError(
                "Google GenAI SDK not available. Install with `pip install google-genai` "
                "or adapt the code to your preferred LLM client."
            )

        last_error = None
        for attempt in range(max_retries):
            try:
                # Log API call details (for debugging)
                api_key_preview = f"{self.api_key[:8]}...{self.api_key[-4:]}" if len(self.api_key) > 12 else "***"
                print(f"[DEBUG] LLMClient.generate - Model: {model}, Attempt: {attempt + 1}/{max_retries}")
                print(f"[DEBUG] API Key preview: {api_key_preview}, Length: {len(self.api_key)}")
                
                # Gemini API: send system as instruction, user as contents
                # The SDK supports `config={"system_instruction": ...}`.
                resp = self.client.models.generate_content(
                    model=model,
                    contents=user_prompt,
                    config={
                        "system_instruction": system_prompt,
                        "temperature": temperature,
                    },
                )
                print(f"[DEBUG] ✓ API call successful for model {model}")
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
                
                # Detailed error logging
                print(f"[DEBUG] ✗ API call failed for model {model}, attempt {attempt + 1}/{max_retries}")
                print(f"[DEBUG] Error type: {type(e).__name__}")
                print(f"[DEBUG] Error message: {error_str[:300]}")
                
                # Check for API key errors specifically
                if "403" in error_str or "PERMISSION_DENIED" in error_str:
                    api_key_preview = f"{self.api_key[:8]}...{self.api_key[-4:]}" if len(self.api_key) > 12 else "***"
                    print(f"[DEBUG] ⚠ API Key Error Detected!")
                    print(f"[DEBUG] API Key preview: {api_key_preview}, Length: {len(self.api_key)}")
                    print(f"[DEBUG] Full error: {error_str}")
                    # Don't retry on API key errors - they won't succeed
                    raise
                
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
                    print(f"[DEBUG] Transient error detected, retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    # Not transient or out of retries, raise the error
                    print(f"[DEBUG] Non-transient error or max retries reached, raising error")
                    raise
        
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


def load_prompts(base_dir: str) -> Prompts:
    """Load prompts from new by_subject_prompts structure."""
    prompt_dir = os.path.join(base_dir, "by_subject_prompts")
    
    # Load subject-specific prompts
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
        subject_path = os.path.join(prompt_dir, folder_name)
        
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
    retry_controller = read_text(os.path.join(prompt_dir, "Retry_controller.md"))
    verifier = read_text(os.path.join(prompt_dir, "Verifier.md"))
    style_checker = read_text(os.path.join(prompt_dir, "Style_checker.md"))
    
    return Prompts(
        designer=designers,
        implementer=implementers,
        classifier=classifiers,
        retry_controller=retry_controller,
        verifier=verifier,
        style_checker=style_checker
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

def choose_difficulty(cfg: RunConfig) -> str:
    if not cfg.difficulty_weights:
        return random.choice(["Easy", "Medium", "Hard"])
    diffs = list(cfg.difficulty_weights.keys())
    weights = [cfg.difficulty_weights[d] for d in diffs]
    return random.choices(diffs, weights=weights, k=1)[0]

def designer_call(llm: LLMClient, prompts: Prompts, models: ModelsConfig, schema_block: str, schema_id: str, difficulty: str) -> Dict[str, Any]:
    subject_prompts = get_subject_prompts(prompts, schema_id)
    user = f"""You will receive a schema and a target difficulty.

Schema:
{schema_block}

Target difficulty: {difficulty}

Return exactly one idea plan in the required YAML format."""
    txt = llm.generate(model=models.designer, system_prompt=subject_prompts['designer'], user_prompt=user, temperature=0.7)
    obj = safe_yaml_load(txt)
    if not isinstance(obj, dict) or "schema_id" not in obj:
        raise ValueError(f"Designer output invalid YAML/object. Raw output:\n{txt}")
    # Normalize schema_id like "M3..." to "M3" when possible
    # but keep original too.
    out_schema = str(obj.get("schema_id", "")).strip()
    # Soft check: it should contain schema_id token
    if schema_id not in out_schema:
        # not fatal—designer might use full id; just record a warning
        obj["_warning"] = f"Designer schema_id '{out_schema}' does not include expected '{schema_id}'."
    obj["_raw_text"] = txt
    return obj

def implementer_call(llm: LLMClient, prompts: Prompts, models: ModelsConfig, idea_plan: Dict[str, Any]) -> Dict[str, Any]:
    # Get subject from idea_plan's schema_id
    schema_id = idea_plan.get("schema_id", "M1")
    subject_prompts = get_subject_prompts(prompts, schema_id)
    
    user = "Designer idea plan (YAML):\n" + yaml.safe_dump(idea_plan, sort_keys=False)
    txt = llm.generate(model=models.implementer, system_prompt=subject_prompts['implementer'], user_prompt=user, temperature=0.6)
    try:
        obj = safe_yaml_load(txt)
    except Exception as e:
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
    
    # Filter verifier prompt to include only relevant subject instructions
    filtered_prompt = filter_prompt_by_subject(prompts.verifier, subject)
    
    user = "Question package to verify (YAML):\n" + yaml.safe_dump(question_with_subject, sort_keys=False)
    txt = llm.generate(model=models.verifier, system_prompt=filtered_prompt, user_prompt=user, temperature=0.2)
    obj = safe_yaml_load(txt)
    if not isinstance(obj, dict) or "verdict" not in obj:
        raise ValueError(f"Verifier output invalid YAML/object. Raw output:\n{txt}")
    obj["_raw_text"] = txt
    return obj

def style_call(llm: LLMClient, prompts: Prompts, models: ModelsConfig, question_obj: Dict[str, Any], schema_id: str, verifier_obj: Optional[Dict[str, Any]]=None) -> Dict[str, Any]:
    subject = get_subject_from_schema(schema_id)
    
    payload = {
        "subject": subject,
        "question": question_obj
    }
    if verifier_obj:
        payload["verifier_report"] = verifier_obj
    
    # Filter style checker prompt to include only relevant subject instructions
    filtered_prompt = filter_prompt_by_subject(prompts.style_checker, subject)
    
    user = "Package to style-check (YAML):\n" + yaml.safe_dump(payload, sort_keys=False)
    txt = llm.generate(model=models.style_judge, system_prompt=filtered_prompt, user_prompt=user, temperature=0.3)
    obj = safe_yaml_load(txt)
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
    
    # Format topics
    topics_text = yaml.safe_dump({
        "available_topics": [
            {
                "code": topic["code"],
                "title": topic["title"],
                "paper": topic["paper_name"]
            }
            for topic in available_topics
        ]
    }, sort_keys=False)
    
    # User prompt WITHOUT schema_id
    user = f"""Available curriculum topics:
{topics_text}

Question package (YAML):
{yaml.safe_dump(question_obj, sort_keys=False)}

Analyze the question and assign appropriate curriculum tags."""
    
    model = getattr(models, 'classifier', None) or models.style_judge
    txt = llm.generate(
        model=model,
        system_prompt=subject_prompts['classifier'],  # Subject-specific
        user_prompt=user,
        temperature=0.3
    )
    
    obj = safe_yaml_load(txt)
    
    # Validate output based on subject
    prefix = schema_id[0].upper()
    if prefix == 'M':
        # Math requires 'paper' field
        if "paper" not in obj:
            raise ValueError(f"Math classifier missing 'paper' field")
        if "primary_tag" not in obj:
            raise ValueError(f"Classifier missing 'primary_tag' field")
        
        # CRITICAL: Validate that Math classifier didn't assign Chemistry/Biology/Physics tags
        primary_tag = obj.get("primary_tag", "")
        if primary_tag and not (primary_tag.startswith("M1-") or primary_tag.startswith("M2-")):
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

def implementer_regen_call(llm: LLMClient, prompts: Prompts, models: ModelsConfig,
                           idea_plan: Dict[str, Any],
                           previous_attempt: Dict[str, Any],
                           verifier_report: Dict[str, Any],
                           style_report: Optional[Dict[str, Any]]=None) -> Dict[str, Any]:
    # Get subject from idea_plan's schema_id
    schema_id = idea_plan.get("schema_id", "M1")
    subject_prompts = get_subject_prompts(prompts, schema_id)
    
    user = (
        prompts.retry_controller.strip()
        + "\n\nidea_plan:\n"
        + yaml.safe_dump(idea_plan, sort_keys=False)
        + "\nprevious_attempt:\n"
        + yaml.safe_dump(previous_attempt, sort_keys=False)
        + "\nverifier_report:\n"
        + yaml.safe_dump(verifier_report, sort_keys=False)
    )
    if style_report:
        user += "\nstyle_report:\n" + yaml.safe_dump(style_report, sort_keys=False)

    txt = llm.generate(model=models.implementer, system_prompt=subject_prompts['implementer'], user_prompt=user, temperature=0.6)
    try:
        obj = safe_yaml_load(txt)
    except Exception as e:
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
    schemas_md = read_text(os.path.join(base_dir, "Schemas.md"))
    schemas = parse_schemas_from_markdown(schemas_md, allow_prefixes=cfg.allow_schema_prefixes)

    # Load curriculum parser if tag labeling is enabled and not already provided
    if curriculum_parser is None and cfg.enable_tag_labeling:
        try:
            from curriculum_parser import CurriculumParser
            curriculum_file = cfg.curriculum_file_path
            if curriculum_file is None:
                curriculum_file = os.path.join(base_dir, "curriculum", "ESAT_CURRICULUM.json")
            curriculum_parser = CurriculumParser(curriculum_file)
        except (ImportError, Exception) as e:
            print(f"⚠ Warning: Could not load curriculum parser: {e}")
            print("   Tag labeling will be disabled for this run.")
            curriculum_parser = None

    llm = LLMClient(api_key=api_key)

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
            idea_plan = designer_call(llm, prompts, models, schema_block, schema_id, difficulty)
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
            style_report = style_call(llm, prompts, models, q_pkg, schema_id, verifier_obj=verifier_report)
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

            # PASS both gates -> Tag labeling (optional, non-blocking)
            tags = None
            if cfg.enable_tag_labeling and curriculum_parser:
                try:
                    if callbacks and "on_stage_start" in callbacks:
                        callbacks["on_stage_start"]("Tag Labeler", "Assigning curriculum tags")
                    
                    tag_result = tag_labeler_call(llm, prompts, models, q_pkg, schema_id, curriculum_parser)
                    
                    # CRITICAL: Validate schema_id matches the classified subject
                    schema_prefix = schema_id[0].upper()
                    primary_tag = tag_result.get("primary_tag", "")
                    
                    # Check if classifier assigned a tag that doesn't match the schema prefix
                    if primary_tag:
                        # Validate that Chemistry schemas get chemistry- tags, not Math tags
                        if schema_prefix == 'C':
                            if primary_tag.startswith("M1-") or primary_tag.startswith("M2-"):
                                print(f"⚠️  ERROR: Chemistry schema {schema_id} was classified as Math: {primary_tag}")
                                print(f"   This question should use an M schema, not a C schema.")
                                raise ValueError(f"Schema mismatch: Chemistry schema {schema_id} got Math tag {primary_tag}. "
                                               f"Question is actually mathematics - use an M schema instead.")
                            elif not primary_tag.startswith("chemistry-"):
                                print(f"⚠️  WARNING: Chemistry schema {schema_id} got unexpected tag: {primary_tag}")
                        elif schema_prefix == 'M':
                            # Math schemas should get M1- or M2- tags, not chemistry- tags
                            if primary_tag.startswith("chemistry-"):
                                print(f"⚠️  ERROR: Math schema {schema_id} was classified as Chemistry: {primary_tag}")
                                print(f"   This question should use a C schema, not an M schema.")
                                raise ValueError(f"Schema mismatch: Math schema {schema_id} got Chemistry tag {primary_tag}. "
                                               f"Question is actually chemistry - use a C schema instead.")
                    
                    # Normalize to prefixed format if needed (future-proofing)
                    if primary_tag and curriculum_parser:
                        normalized_primary = curriculum_parser.normalize_topic_code(primary_tag)
                        if normalized_primary:
                            primary_tag = normalized_primary
                    
                    secondary_tags_list = tag_result.get("secondary_tags", [])
                    secondary_tags = []
                    for tag in secondary_tags_list:
                        tag_code = tag.get("code", "") if isinstance(tag, dict) else str(tag)
                        if tag_code:
                            # Normalize to prefixed format if needed
                            if curriculum_parser:
                                normalized_tag = curriculum_parser.normalize_topic_code(tag_code)
                                if normalized_tag:
                                    tag_code = normalized_tag
                            secondary_tags.append(tag_code)
                    
                    # Build confidence object
                    confidence = {
                        "primary": tag_result.get("primary_confidence", 0.0)
                    }
                    if secondary_tags_list:
                        for i, tag in enumerate(secondary_tags_list):
                            if isinstance(tag, dict):
                                confidence[tag.get("code", "")] = tag.get("confidence", 0.0)
                    
                    tags = {
                        "primary_tag": primary_tag,
                        "secondary_tags": secondary_tags,
                        "confidence": confidence,
                        "labeled_at": datetime.datetime.now().isoformat(),
                        "labeled_by": "ai_generation",
                        "reasoning": tag_result.get("reasoning", "")
                    }
                    
                    # NEW: Add paper field for Math questions
                    if "paper" in tag_result:
                        tags["paper"] = tag_result["paper"]
                    
                    dump_jsonl(paths["logs"], {
                        "stage": "tag_labeler",
                        "schema_id": schema_id,
                        "difficulty": difficulty,
                        "attempt": attempt + 1,
                        "tags": tags,
                    })
                    
                    if callbacks and "on_stage_complete" in callbacks:
                        callbacks["on_stage_complete"]("Tag Labeler", tag_result)
                except Exception as e:
                    # Tag labeling failures should not block question generation
                    error_msg = str(e)
                    print(f"⚠ Tag labeling failed (non-fatal): {error_msg[:200]}...")
                    dump_jsonl(paths["logs"], {
                        "stage": "tag_labeler",
                        "schema_id": schema_id,
                        "difficulty": difficulty,
                        "attempt": attempt + 1,
                        "error": error_msg,
                    })
                    if callbacks and "on_stage_error" in callbacks:
                        callbacks["on_stage_error"]("Tag Labeler", error_msg)
            
            # Get token usage from LLM client
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
                tags=tags,
            )
            # Add run_id to item
            item["_run_id"] = run_id

            # Validate and fix KaTeX formatting
            try:
                from katex_validator import validate_question_package, fix_katex_formatting
                is_valid, errors = validate_question_package(q_pkg)
                if not is_valid:
                    print(f"⚠ KaTeX validation warnings: {errors}")
                    # Fix formatting issues
                    q_pkg = fix_katex_formatting(q_pkg)
                    # Rebuild item with fixed question package
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
                    )
            except ImportError:
                # katex_validator not available, skip validation
                pass
            except Exception as e:
                print(f"⚠ KaTeX validation error (non-fatal): {e}")

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
        difficulty_weights={
            "Easy": float(os.environ.get("W_EASY", "0.3")),
            "Medium": float(os.environ.get("W_MED", "0.5")),
            "Hard": float(os.environ.get("W_HARD", "0.2")),
        },
        schema_weights=None,
        out_dir=os.environ.get("OUT_DIR", "runs"),
        allow_schema_prefixes=tuple(schema_prefixes.split(",")),
    )

    models = ModelsConfig(
        designer=os.environ.get("MODEL_DESIGNER", "gemini-3-pro-preview"),
        implementer=os.environ.get("MODEL_IMPLEMENTER", "gemini-3-pro-preview"),
        verifier=os.environ.get("MODEL_VERIFIER", "gemini-3-pro-preview"),
        style_judge=os.environ.get("MODEL_STYLE", "gemini-2.5-flash"),
    )

    n = int(n_items)
    run_many(n=n, base_dir=base_dir, cfg=cfg, models=models)


# ---------- GUI Interface ----------

class PipelineGUI:
    def __init__(self, root: tk.Tk, base_dir: str, cfg: RunConfig, models: ModelsConfig):
        self.root = root
        self.base_dir = base_dir
        self.cfg = cfg
        self.models = models
        self.running = False
        
        root.title("ESAT Question Generator - Pipeline Visualizer")
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
        stages = ["Designer", "Implementer", "Verifier", "Style Judge"]
        
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
        
        # Clear all outputs
        for stage in ["Designer", "Implementer", "Verifier", "Style Judge"]:
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
            result = run_once(self.base_dir, self.cfg, self.models, callbacks=callbacks)
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
        except Exception as e:
            import traceback
            error_msg = f"Exception: {str(e)}\n\n{traceback.format_exc()}"
            error_short = str(e)[:50]
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
    
    def on_schema_selected(self, schema_id: str, difficulty: str):
        """Callback when schema is selected"""
        def update():
            self.status_label.config(
                text=f"Selected: {schema_id} ({difficulty})", foreground="blue"
            )
        self.root.after(0, update)
    
    def on_stage_start(self, stage: str, info: str):
        """Callback when a stage starts"""
        def update():
            self.update_stage_status(stage, "running")
            self.update_stage_info(stage, info)
            self.append_stage_output(stage, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Starting: {info}")
        self.root.after(0, update)
    
    def on_stage_progress(self, stage: str, progress: str):
        """Callback for stage progress updates"""
        def update():
            self.update_stage_info(stage, progress)
            self.append_stage_output(stage, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {progress}")
        self.root.after(0, update)
    
    def on_stage_complete(self, stage: str, data: Any):
        """Callback when a stage completes"""
        def update():
            self.update_stage_status(stage, "success")
            self.update_stage_info(stage, "Complete")
            self.append_stage_output(stage, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Completed successfully\n")
            self.append_stage_output(stage, "Output:\n" + self.format_yaml(data))
        self.root.after(0, update)
    
    def on_stage_error(self, stage: str, error: str):
        """Callback when a stage encounters an error"""
        def update():
            self.update_stage_status(stage, "error")
            self.update_stage_info(stage, f"Error: {error[:50]}...")
            self.append_stage_output(stage, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] ERROR: {error}")
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
    
    # Load environment (handle encoding issues)
    safe_load_dotenv(".env.local")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Configuration for math questions only
    cfg = RunConfig(
        max_implementer_retries=int(os.environ.get("MAX_IMPLEMENTER_RETRIES", "2")),
        max_designer_retries=int(os.environ.get("MAX_DESIGNER_RETRIES", "2")),
        seed=None,
        difficulty_weights={
            "Easy": float(os.environ.get("W_EASY", "0.3")),
            "Medium": float(os.environ.get("W_MED", "0.5")),
            "Hard": float(os.environ.get("W_HARD", "0.2")),
        },
        schema_weights=None,
        out_dir=os.environ.get("OUT_DIR", "runs"),
        allow_schema_prefixes=("M",),  # Math only for GUI
    )
    
    models = ModelsConfig(
        designer=os.environ.get("MODEL_DESIGNER", "gemini-3-pro-preview"),
        implementer=os.environ.get("MODEL_IMPLEMENTER", "gemini-3-pro-preview"),
        verifier=os.environ.get("MODEL_VERIFIER", "gemini-3-pro-preview"),
        style_judge=os.environ.get("MODEL_STYLE", "gemini-2.5-flash"),
    )
    
    root = tk.Tk()
    app = PipelineGUI(root, base_dir, cfg, models)
    root.mainloop()


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--gui":
        run_gui()
    else:
        main()
