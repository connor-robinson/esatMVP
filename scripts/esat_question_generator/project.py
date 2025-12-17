#!/usr/bin/env python3
"""
ESAT / ENGAA Question Generator Pipeline (v1)

Implements:
Schema -> Designer -> Implementer -> Verifier -> Style Judge -> Save
with Retry Controller (max retries on fixable failures).

Directory layout expected (relative to this script):
esat_question_generator/
├── 1. Designer/
│   ├── Prompt.md
│   └── Schemas.md
├── 2. Implementer/
│   └── Prompt.md
├── 3. Verifier/
│   └── Prompt.md
├── 4. retry controller/
│   └── Prompt.md
└── 5. style checker/
    └── Prompt.md

Notes:
- This script is interface-free. It writes JSONL logs/output files under runs/<timestamp>/.
- Requires a Gemini API key in .env.local file: GEMINI_API_KEY
- Uses Google GenAI Python SDK: `google-genai` (recommended) or falls back to REST stub.
- Loads environment variables from .env.local using python-dotenv
"""

from __future__ import annotations

import os
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


@dataclass
class RunConfig:
    max_implementer_retries: int = 2
    max_designer_retries: int = 2  # if designer outputs invalid YAML, etc.
    seed: Optional[int] = None
    difficulty_weights: Dict[str, float] = None  # type: ignore
    schema_weights: Optional[Dict[str, float]] = None  # optional weighting by schema_id
    out_dir: str = "runs"
    allow_schema_prefixes: Tuple[str, ...] = ("M", "P")  # choose both maths & physics by default


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
        if hasattr(e, "problem_mark") and e.problem_mark:
            lines = cleaned.split("\n")
            line_num = e.problem_mark.line
            if 0 <= line_num < len(lines):
                error_msg += f"\nProblem at line {line_num + 1}: {lines[line_num]}"
        raise ValueError(
            "YAML parsing error: "
            + error_msg
            + "\n\nFirst 1000 chars of input:\n"
            + cleaned[:1000]
        )


def normalize_implementer_output(obj: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalise Implementer YAML into the expected structure.

    Some models nest `solution` under `question.solution` instead of top-level.
    This function promotes it to the top-level `solution` key so downstream
    agents (Verifier, Style Judge) see the expected schema.
    """
    q = obj.get("question")
    if isinstance(q, dict):
        # If solution is nested under question, promote it
        if "solution" in q and "solution" not in obj and isinstance(q["solution"], dict):
            obj["solution"] = q["solution"]
    return obj

def dump_jsonl(path: str, obj: Dict[str, Any]) -> None:
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


# ---------- Schema parsing ----------

SCHEMA_HEADER_RE = re.compile(r"^##\s+\*\*((?:M|P)\d+)\.\s*(.+?)\*\*\s*$", re.MULTILINE)

def parse_schemas_from_markdown(md: str, allow_prefixes: Tuple[str, ...]=("M","P")) -> Dict[str, Dict[str, str]]:
    """
    Parses Schemas.md into blocks keyed by schema_id (e.g., M1, P3).
    Returns: { "M1": {"title": "...", "block": "## M1...."} , ... }
    """
    matches = list(SCHEMA_HEADER_RE.finditer(md))
    schemas: Dict[str, Dict[str, str]] = {}
    for i, m in enumerate(matches):
        schema_id = m.group(1).strip()
        if not schema_id.startswith(allow_prefixes):
            continue
        title = m.group(2).strip()
        start = m.start()
        end = matches[i+1].start() if i+1 < len(matches) else len(md)
        block = md[start:end].strip()
        schemas[schema_id] = {"title": title, "block": block}
    if not schemas:
        raise ValueError("No schemas parsed. Ensure Schemas.md uses headings like: ## **M1. Title** or ## **P1. Title**")
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
                    time.sleep(wait_time)
                    continue
                else:
                    # Not transient or out of retries, raise the error
                    raise
        
        # If we get here, all retries failed
        raise RuntimeError(f"Failed after {max_retries} attempts. Last error: {last_error}")


# ---------- Prompt loaders ----------

@dataclass
class Prompts:
    designer: str
    implementer: str
    verifier: str
    retry_controller: str
    style_checker: str


def load_prompts(base_dir: str) -> Prompts:
    def p(*parts: str) -> str:
        return os.path.join(base_dir, *parts)

    return Prompts(
        designer=read_text(p("1. Designer", "Prompt.md")),
        implementer=read_text(p("2. Implementer", "Prompt.md")),
        verifier=read_text(p("3. Verifier", "Prompt.md")),
        retry_controller=read_text(p("4. retry controller", "Prompt.md")),
        style_checker=read_text(p("5. style checker", "Prompt.md")),
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

def choose_difficulty(cfg: RunConfig) -> str:
    if not cfg.difficulty_weights:
        return random.choice(["Easy", "Medium", "Hard"])
    diffs = list(cfg.difficulty_weights.keys())
    weights = [cfg.difficulty_weights[d] for d in diffs]
    return random.choices(diffs, weights=weights, k=1)[0]

def designer_call(llm: LLMClient, prompts: Prompts, models: ModelsConfig, schema_block: str, schema_id: str, difficulty: str) -> Dict[str, Any]:
    user = f"""You will receive a schema and a target difficulty.

Schema:
{schema_block}

Target difficulty: {difficulty}

Return exactly one idea plan in the required YAML format."""
    txt = llm.generate(model=models.designer, system_prompt=prompts.designer, user_prompt=user, temperature=0.7)
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
    user = "Designer idea plan (YAML):\n" + yaml.safe_dump(idea_plan, sort_keys=False)
    txt = llm.generate(model=models.implementer, system_prompt=prompts.implementer, user_prompt=user, temperature=0.6)
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
    
    obj["_raw_text"] = txt
    return obj

def verifier_call(llm: LLMClient, prompts: Prompts, models: ModelsConfig, question_obj: Dict[str, Any]) -> Dict[str, Any]:
    user = "Question package to verify (YAML):\n" + yaml.safe_dump(question_obj, sort_keys=False)
    txt = llm.generate(model=models.verifier, system_prompt=prompts.verifier, user_prompt=user, temperature=0.2)
    obj = safe_yaml_load(txt)
    if not isinstance(obj, dict) or "verdict" not in obj:
        raise ValueError(f"Verifier output invalid YAML/object. Raw output:\n{txt}")
    obj["_raw_text"] = txt
    return obj

def style_call(llm: LLMClient, prompts: Prompts, models: ModelsConfig, question_obj: Dict[str, Any], verifier_obj: Optional[Dict[str, Any]]=None) -> Dict[str, Any]:
    payload = {"question": question_obj}
    if verifier_obj:
        payload["verifier_report"] = verifier_obj
    user = "Package to style-check (YAML):\n" + yaml.safe_dump(payload, sort_keys=False)
    txt = llm.generate(model=models.style_judge, system_prompt=prompts.style_checker, user_prompt=user, temperature=0.3)
    obj = safe_yaml_load(txt)
    if not isinstance(obj, dict) or "verdict" not in obj:
        raise ValueError(f"Style checker output invalid YAML/object. Raw output:\n{txt}")
    obj["_raw_text"] = txt
    return obj

def implementer_regen_call(llm: LLMClient, prompts: Prompts, models: ModelsConfig,
                           idea_plan: Dict[str, Any],
                           previous_attempt: Dict[str, Any],
                           verifier_report: Dict[str, Any],
                           style_report: Optional[Dict[str, Any]]=None) -> Dict[str, Any]:
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

    txt = llm.generate(model=models.implementer, system_prompt=prompts.implementer, user_prompt=user, temperature=0.6)
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
                    schema_id: str, difficulty: str, models: ModelsConfig, attempts: int, token_usage: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
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
    return item

def run_once(base_dir: str, cfg: RunConfig, models: ModelsConfig, 
             callbacks: Optional[Dict[str, Callable]] = None) -> Dict[str, Any]:
    if callbacks is None:
        callbacks = {}
    if cfg.seed is not None:
        random.seed(cfg.seed)

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("Missing GEMINI_API_KEY environment variable.")

    prompts = load_prompts(base_dir)
    schemas_md = read_text(os.path.join(base_dir, "1. Designer", "Schemas.md"))
    schemas = parse_schemas_from_markdown(schemas_md, allow_prefixes=cfg.allow_schema_prefixes)

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
        except Exception as e:
            designer_err = str(e)
            if callbacks and "on_stage_error" in callbacks:
                callbacks["on_stage_error"]("Designer", str(e))
            dump_jsonl(paths["logs"], {
                "stage": "designer",
                "schema_id": schema_id,
                "difficulty": difficulty,
                "attempt": d_try + 1,
                "error": designer_err,
            })
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
            verifier_report = verifier_call(llm, prompts, models, q_pkg)
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
            style_report = style_call(llm, prompts, models, q_pkg, verifier_obj=verifier_report)
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

            # PASS both gates -> save
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
            )
            # Add run_id to item
            item["_run_id"] = run_id

            # Validate and fix MathJax formatting
            try:
                from mathjax_validator import validate_question_package, fix_mathjax_formatting
                is_valid, errors = validate_question_package(q_pkg)
                if not is_valid:
                    print(f"⚠ MathJax validation warnings: {errors}")
                    # Fix formatting issues
                    q_pkg = fix_mathjax_formatting(q_pkg)
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
                # mathjax_validator not available, skip validation
                pass
            except Exception as e:
                print(f"⚠ MathJax validation error (non-fatal): {e}")
            
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
                    print(f"✓ Backed up question to: {backup_path}")
            except ImportError:
                print("⚠ Backup manager not available, skipping backup")
            except Exception as e:
                print(f"⚠ Backup error (non-fatal): {e}")
            
            # Sync to database
            try:
                from db_sync import sync_question_from_pipeline
                db_id = sync_question_from_pipeline(item, base_dir, status="pending_review")
                if db_id:
                    item["_db_id"] = db_id
            except ImportError:
                print("⚠ Database sync not available, skipping sync")
            except Exception as e:
                print(f"⚠ Database sync error (non-fatal): {e}")
            
            # Save HTML file for easy viewing/sharing (optional, don't fail if it errors)
            try:
                # Import here to avoid circular dependency issues
                import importlib.util
                spec = importlib.util.spec_from_file_location("show_last_question", 
                    os.path.join(base_dir, "show_last_question.py"))
                if spec and spec.loader:
                    show_module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(show_module)
                    html_content = show_module.create_html_viewer(item)
                    html_path = os.path.join(run_dir, f"{item['id']}.html")
                    with open(html_path, 'w', encoding='utf-8') as f:
                        f.write(html_content)
            except Exception as e:
                # Don't fail the pipeline if HTML generation fails
                pass  # Silently skip HTML generation if it fails

            if callbacks and "on_success" in callbacks:
                callbacks["on_success"](item)
            else:
                # Print question to console if no GUI
                print("\n" + "="*70)
                print("✓ QUESTION SUCCESSFULLY GENERATED!")
                print("="*70)
                question = item.get("question_package", {}).get("question", {})
                print(f"\nQuestion: {question.get('stem', 'N/A')}")
                print(f"\nOptions:")
                for opt, text in sorted(question.get("options", {}).items()):
                    marker = " ✓ CORRECT" if opt == question.get("correct_option") else ""
                    print(f"  {opt}: {text}{marker}")
                print(f"\nCorrect Answer: {question.get('correct_option', 'N/A')}")
                if token_usage:
                    print(f"\nToken Usage:")
                    print(f"  Prompt tokens: {token_usage.get('prompt_tokens', 0):,}")
                    print(f"  Completion tokens: {token_usage.get('candidates_tokens', 0):,}")
                    print(f"  Total tokens: {token_usage.get('total_tokens', 0):,}")
                print(f"\nSaved to: {paths['accepted']}")
                print("="*70 + "\n")
            
            return {"run_dir": run_dir, "status": "accepted", "item_id": item["id"], "item": item}

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
                print(f"✓ [{i+1}/{n}] SUCCESS - Question ID: {res.get('item_id', 'N/A')}")
            else:
                print(f"✗ [{i+1}/{n}] FAILED - Status: {status}")
                if "run_dir" in res:
                    print(f"  Check logs: {res['run_dir']}")
        except Exception as e:
            print(f"✗ [{i+1}/{n}] EXCEPTION: {str(e)[:200]}")
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
            marker = " ✓ [CORRECT]" if opt == correct else ""
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
