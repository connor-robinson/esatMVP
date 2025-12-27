#!/usr/bin/env python3
"""
KaTeX Formatting Validator

Validates that LaTeX math expressions use consistent delimiters
and are compatible with KaTeX rendering.
"""

import re
from typing import Dict, List, Tuple, Optional


def validate_katex_formatting(text: str) -> Tuple[bool, List[str]]:
    """
    Validate that text uses consistent KaTeX delimiters.
    
    Args:
        text: Text to validate
        
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []
    
    # Check for mixed delimiters (should only use $ and $$)
    if re.search(r'\\[\(\[\)\]]', text):
        errors.append("Found LaTeX delimiters \\(, \\[, \\), \\] - use $ and $$ instead")
    
    # Check for unmatched dollar signs (basic check)
    inline_math = re.findall(r'\$[^$]+\$', text)
    display_math = re.findall(r'\$\$[^$]+\$\$', text)
    
    # Count all dollar signs
    dollar_count = text.count('$')
    
    # Each inline math uses 2 dollars, each display math uses 4
    expected_dollars = len(inline_math) * 2 + len(display_math) * 4
    
    if dollar_count != expected_dollars:
        errors.append(f"Mismatched dollar signs: found {dollar_count} but expected {expected_dollars} (likely unmatched $)")
    
    # Check for common LaTeX errors
    if re.search(r'\$\$[^$]*\$[^$]*\$\$', text):
        errors.append("Found single $ inside $$ block - likely formatting error")
    
    # Check for nested dollar signs (invalid)
    if re.search(r'\$[^$]*\$[^$]*\$', text):
        errors.append("Found nested dollar signs - check for unmatched $")
    
    # Validate basic LaTeX syntax (check for common errors)
    all_math = inline_math + display_math
    for math_expr in all_math:
        # Remove delimiters
        content = math_expr.strip('$')
        
        # Check for unmatched braces
        open_braces = content.count('{')
        close_braces = content.count('}')
        if open_braces != close_braces:
            errors.append(f"Unmatched braces in: {math_expr[:50]}...")
        
        # Check for common LaTeX errors
        if re.search(r'\\[^a-zA-Z]', content):
            errors.append(f"Invalid LaTeX command in: {math_expr[:50]}...")
    
    return len(errors) == 0, errors


def normalize_katex_formatting(text: str) -> str:
    """
    Normalize KaTeX formatting to ensure consistency.
    
    Converts:
    - \( \) to $ $
    - \[ \] to $$ $$
    - Fixes common spacing issues
    
    Args:
        text: Text to normalize
        
    Returns:
        Normalized text
    """
    # Convert \( \) to $ $
    text = re.sub(r'\\\(', '$', text)
    text = re.sub(r'\\\)', '$', text)
    
    # Convert \[ \] to $$ $$
    text = re.sub(r'\\\[', '$$', text)
    text = re.sub(r'\\\]', '$$', text)
    
    # Fix spacing around dollar signs (remove extra spaces)
    text = re.sub(r'\$\s+', '$', text)
    text = re.sub(r'\s+\$', '$', text)
    
    return text


def validate_question_package(question_obj: Dict) -> Tuple[bool, List[str]]:
    """
    Validate KaTeX formatting in a complete question package.
    
    Args:
        question_obj: Question package dictionary
        
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    all_errors = []
    
    # Validate question stem
    question = question_obj.get("question", {})
    if isinstance(question, dict):
        stem = question.get("stem", "")
        if stem:
            is_valid, errors = validate_katex_formatting(stem)
            if not is_valid:
                all_errors.extend([f"Question stem: {e}" for e in errors])
        
        # Validate options
        options = question.get("options", {})
        if isinstance(options, dict):
            for opt_key, opt_text in options.items():
                if opt_text:
                    is_valid, errors = validate_katex_formatting(str(opt_text))
                    if not is_valid:
                        all_errors.extend([f"Option {opt_key}: {e}" for e in errors])
    
    # Validate solution
    solution = question_obj.get("solution", {})
    if isinstance(solution, dict):
        reasoning = solution.get("reasoning", "")
        if reasoning:
            is_valid, errors = validate_katex_formatting(reasoning)
            if not is_valid:
                all_errors.extend([f"Solution reasoning: {e}" for e in errors])
        
        key_insight = solution.get("key_insight", "")
        if key_insight:
            is_valid, errors = validate_katex_formatting(key_insight)
            if not is_valid:
                all_errors.extend([f"Solution key insight: {e}" for e in errors])
    
    return len(all_errors) == 0, all_errors


def fix_katex_formatting(question_obj: Dict) -> Dict:
    """
    Fix KaTeX formatting issues in a question package.
    
    Args:
        question_obj: Question package dictionary
        
    Returns:
        Fixed question package dictionary
    """
    question = question_obj.get("question", {})
    if isinstance(question, dict):
        # Fix stem
        stem = question.get("stem", "")
        if stem:
            question["stem"] = normalize_katex_formatting(stem)
        
        # Fix options
        options = question.get("options", {})
        if isinstance(options, dict):
            fixed_options = {}
            for opt_key, opt_text in options.items():
                fixed_options[opt_key] = normalize_katex_formatting(str(opt_text))
            question["options"] = fixed_options
        
        question_obj["question"] = question
    
    # Fix solution
    solution = question_obj.get("solution", {})
    if isinstance(solution, dict):
        reasoning = solution.get("reasoning", "")
        if reasoning:
            solution["reasoning"] = normalize_katex_formatting(reasoning)
        
        key_insight = solution.get("key_insight", "")
        if key_insight:
            solution["key_insight"] = normalize_katex_formatting(key_insight)
        
        question_obj["solution"] = solution
    
    return question_obj


if __name__ == "__main__":
    # Test the validator
    test_text = "What is the value of $x$ when $x^2 = 4$? The answer is $$x = \pm 2$$."
    is_valid, errors = validate_katex_formatting(test_text)
    print(f"Valid: {is_valid}")
    if errors:
        print(f"Errors: {errors}")
    
    # Test normalization
    test_text2 = "\\(x = 2\\) and \\[y = 3\\]"
    normalized = normalize_katex_formatting(test_text2)
    print(f"Normalized: {normalized}")











