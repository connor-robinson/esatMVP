#!/usr/bin/env python3
"""
Batch Processing Utilities

Helper functions for batch question processing pipeline.
"""

import json
import re
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path

from db_sync import normalize_math_spacing
from katex_validator import validate_katex_formatting


def generate_run_id() -> str:
    """Generate a unique run ID for this batch processing session."""
    return str(uuid.uuid4())


def get_processing_metadata(verifier_report: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Extract or initialize processing metadata from verifier_report.
    
    Args:
        verifier_report: Existing verifier_report JSONB from database
        
    Returns:
        Processing metadata dictionary
    """
    if verifier_report and isinstance(verifier_report, dict):
        processing = verifier_report.get("processing", {})
        if processing:
            return processing
    
    # Initialize default processing metadata
    return {
        "status": "pending",
        "stage": None,
        "run_id": None,
        "attempts": 0,
        "lock_expires_at": None,
        "errors": []
    }


def update_processing_metadata(
    verifier_report: Optional[Dict[str, Any]],
    status: str,
    stage: Optional[str] = None,
    run_id: Optional[str] = None,
    lock_expires_at: Optional[str] = None,
    error: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Update processing metadata in verifier_report structure.
    
    Args:
        verifier_report: Existing verifier_report JSONB
        status: New processing status
        stage: Current stage name
        run_id: Run ID for locking
        lock_expires_at: Lock expiration timestamp (ISO format)
        error: Error message to add
        **kwargs: Additional metadata fields (e.g., rewrite, tag, etc.)
        
    Returns:
        Updated verifier_report dictionary
    """
    if verifier_report is None:
        verifier_report = {}
    
    if "processing" not in verifier_report:
        verifier_report["processing"] = {}
    
    processing = verifier_report["processing"]
    processing["status"] = status
    
    if stage is not None:
        processing["stage"] = stage
    
    if run_id is not None:
        processing["run_id"] = run_id
    
    if lock_expires_at is not None:
        processing["lock_expires_at"] = lock_expires_at
    
    if error is not None:
        if "errors" not in processing:
            processing["errors"] = []
        processing["errors"].append({
            "timestamp": datetime.now().isoformat(),
            "stage": stage,
            "error": error
        })
    
    # Update attempts
    if status == "running":
        processing["attempts"] = processing.get("attempts", 0) + 1
    
    # Add any additional metadata
    for key, value in kwargs.items():
        if key not in ["processing"]:  # Don't overwrite processing
            verifier_report[key] = value
    
    return verifier_report


def build_rewriter_input(question: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build input JSON for rewriter prompt from database question.
    
    Args:
        question: Question row from database
        
    Returns:
        Input dictionary for rewriter prompt
    """
    return {
        "stem": question.get("question_stem", ""),
        "options": question.get("options", {}),
        "correct_option": question.get("correct_option", ""),
        "solution_reasoning_raw": question.get("solution_reasoning") or "",
        "key_insight_raw": question.get("solution_key_insight") or "",
        "distractor_map_raw": question.get("distractor_map") or {}
    }


def fix_json_escapes(text: str) -> str:
    """
    Fix common JSON escaping issues, particularly unescaped backslashes in LaTeX.
    
    Args:
        text: JSON string that may have escaping issues
        
    Returns:
        Fixed JSON string
    """
    # Find JSON string values and fix unescaped backslashes
    # This is a heuristic approach - we look for patterns like "key": "value with \text"
    # and escape backslashes that aren't already escaped
    
    import re
    
    # Pattern to match JSON string values: "key": "value"
    # We need to be careful not to break already-escaped sequences
    def fix_string_value(match):
        key_part = match.group(1)  # "key":
        value_part = match.group(2)  # "value"
        
        # Fix unescaped backslashes in the value (but preserve \\, \n, \t, etc.)
        # Replace \ that's not followed by another \ or a valid escape sequence
        fixed_value = re.sub(r'\\(?![\\nrtbf"/u])', r'\\\\', value_part)
        
        return f'{key_part} {fixed_value}'
    
    # Match JSON string values: "key": "value with potential \issues"
    # This regex looks for ": " followed by a quoted string
    pattern = r'("(?:[^"\\]|\\.)*"\s*:\s*)("(?:[^"\\]|\\.)*")'
    
    # Apply fix to string values
    fixed_text = re.sub(pattern, fix_string_value, text)
    
    return fixed_text


def parse_rewriter_output(output_text: str, expected_option_keys: List[str]) -> Dict[str, Any]:
    """
    Parse JSON output from rewriter and validate.
    Tries multiple strategies to handle common JSON errors.

    Args:
        output_text: Raw output from LLM
        expected_option_keys: List of option keys (A-H) that must be in distractor_map

    Returns:
        Parsed output dictionary

    Raises:
        ValueError: If JSON is invalid or missing required fields
    """
    # Strip code fences if present
    text = output_text.strip()
    if text.startswith("```"):
        # Remove ```json or ``` markers
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    
    # Try parsing with multiple strategies
    strategies = [
        ("direct", lambda t: json.loads(t)),
        ("fix_unescaped_backslashes", lambda t: json.loads(re.sub(r'\\(?![\\nrtbf"/u])', r'\\\\', t))),
        ("fix_escapes", lambda t: json.loads(fix_json_escapes(t))),
    ]
    
    last_error = None
    for strategy_name, strategy_func in strategies:
        try:
            result = strategy_func(text)
            if strategy_name != "direct":
                print(f"[DEBUG] JSON parsing succeeded using strategy: {strategy_name}")
            break
        except json.JSONDecodeError as e:
            last_error = e
            continue
    else:
        # All strategies failed - provide detailed error
        if last_error:
            # Show more context about the JSON error
            error_pos = getattr(last_error, 'pos', None)
            error_line = getattr(last_error, 'lineno', None)
            error_col = getattr(last_error, 'colno', None)
            
            error_details = f"JSON parse error (all strategies failed): {str(last_error)}"
            if error_line:
                error_details += f" at line {error_line}"
            if error_col:
                error_details += f", column {error_col}"
            if error_pos:
                # Show context around error
                start = max(0, error_pos - 50)
                end = min(len(text), error_pos + 50)
                error_details += f"\nContext: ...{text[start:end]}..."
        else:
            error_details = "JSON parse error: All parsing strategies failed"
        
        error_details += f"\n\nFull output (first 1000 chars):\n{output_text[:1000]}"
        raise ValueError(error_details)
    
    # Validate required fields
    required_fields = ["key_insight_hint", "solution_reasoning_katex", "distractor_map"]
    missing_fields = [field for field in required_fields if field not in result]
    if missing_fields:
        raise ValueError(f"Missing required fields: {missing_fields}. Output keys: {list(result.keys())}")
    
    # Validate distractor_map has all option keys
    distractor_map = result.get("distractor_map", {})
    if not isinstance(distractor_map, dict):
        raise ValueError(f"distractor_map must be a dictionary, got {type(distractor_map).__name__}: {distractor_map}")
    
    missing_keys = set(expected_option_keys) - set(distractor_map.keys())
    if missing_keys:
        raise ValueError(f"distractor_map missing keys: {sorted(missing_keys)}. Has: {sorted(distractor_map.keys())}, Expected: {sorted(expected_option_keys)}")
    
    return result


def validate_rewriter_output(output: Dict[str, Any], question: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate rewriter output for correctness.
    
    Args:
        output: Parsed rewriter output
        question: Original question from database
        
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []
    
    # Validate KaTeX formatting (lint only - render test happens in stage_render_test)
    import time
    reasoning = output.get("solution_reasoning_katex", "")
    if reasoning:
        print(f"[DEBUG] Validating KaTeX (lint) for solution_reasoning (length: {len(reasoning)})...")
        katex_start = time.time()
        try:
            is_valid, katex_errors = validate_katex_formatting(reasoning, skip_render_test=True)
        except Exception as e:
            print(f"[ERROR] KaTeX validation exception for reasoning: {e}")
            import traceback
            print(traceback.format_exc())
            raise
        katex_time = time.time() - katex_start
        print(f"[TIMING] KaTeX lint for reasoning took {katex_time:.2f}s (valid: {is_valid})")
        if not is_valid:
            errors.extend([f"Solution reasoning KaTeX: {e}" for e in katex_errors])
    
    key_insight = output.get("key_insight_hint", "")
    if key_insight:
        print(f"[DEBUG] Validating KaTeX (lint) for key_insight (length: {len(key_insight)})...")
        katex_start = time.time()
        try:
            is_valid, katex_errors = validate_katex_formatting(key_insight, skip_render_test=True)
        except Exception as e:
            print(f"[ERROR] KaTeX validation exception for key_insight: {e}")
            import traceback
            print(traceback.format_exc())
            raise
        katex_time = time.time() - katex_start
        print(f"[TIMING] KaTeX lint for key_insight took {katex_time:.2f}s (valid: {is_valid})")
        if not is_valid:
            errors.extend([f"Key insight KaTeX: {e}" for e in katex_errors])
    
    # Validate distractor_map values are strings
    distractor_map = output.get("distractor_map", {})
    for key, value in distractor_map.items():
        if not isinstance(value, str):
            errors.append(f"distractor_map[{key}] must be a string, got {type(value)}")
        elif not value.strip():
            errors.append(f"distractor_map[{key}] is empty")
    
    return len(errors) == 0, errors


def normalize_rewriter_output(output: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize math spacing in rewriter output.
    
    Args:
        output: Parsed rewriter output
        
    Returns:
        Normalized output with math spacing fixed
    """
    normalized = output.copy()
    
    # Normalize solution_reasoning_katex
    if "solution_reasoning_katex" in normalized:
        normalized["solution_reasoning_katex"] = normalize_math_spacing(
            normalized["solution_reasoning_katex"]
        )
    
    # Normalize key_insight_hint
    if "key_insight_hint" in normalized:
        normalized["key_insight_hint"] = normalize_math_spacing(
            normalized["key_insight_hint"]
        )
    
    # Normalize distractor_map values
    if "distractor_map" in normalized:
        normalized_distractor_map = {}
        for key, value in normalized["distractor_map"].items():
            if isinstance(value, str):
                normalized_distractor_map[key] = normalize_math_spacing(value)
            else:
                normalized_distractor_map[key] = value
        normalized["distractor_map"] = normalized_distractor_map
    
    return normalized


def map_rewriter_output_to_db(output: Dict[str, Any]) -> Dict[str, Any]:
    """
    Map rewriter output fields to database column names.
    
    Args:
        output: Normalized rewriter output
        
    Returns:
        Dictionary with database column names as keys
    """
    return {
        "solution_reasoning": output.get("solution_reasoning_katex", ""),
        "solution_key_insight": output.get("key_insight_hint", ""),
        "distractor_map": output.get("distractor_map", {})
    }


def create_lock_expires_at(ttl_minutes: int = 30) -> str:
    """
    Create lock expiration timestamp.
    
    Args:
        ttl_minutes: Time to live in minutes
        
    Returns:
        ISO format timestamp string
    """
    expires_at = datetime.now() + timedelta(minutes=ttl_minutes)
    return expires_at.isoformat()


def is_lock_expired(lock_expires_at: Optional[str]) -> bool:
    """
    Check if a lock has expired.
    
    Args:
        lock_expires_at: ISO format timestamp string
        
    Returns:
        True if expired or None, False if still valid
    """
    if lock_expires_at is None:
        return True
    
    try:
        expires_dt = datetime.fromisoformat(lock_expires_at.replace('Z', '+00:00'))
        return datetime.now() >= expires_dt
    except (ValueError, AttributeError):
        # If we can't parse it, consider it expired
        return True


def format_progress_message(
    total: int,
    done: int,
    failed: int,
    current_id: Optional[str] = None,
    current_stage: Optional[str] = None
) -> str:
    """
    Format progress message for CLI display.
    
    Args:
        total: Total questions
        done: Completed questions
        failed: Failed questions
        current_id: Current question ID
        current_stage: Current stage name
        
    Returns:
        Formatted progress string
    """
    remaining = total - done - failed
    msg = f"Progress: {done}/{total} done | {failed} failed | {remaining} remaining"
    
    if current_id and current_stage:
        msg += f" | Processing {current_id[:8]}... stage={current_stage}"
    
    return msg

