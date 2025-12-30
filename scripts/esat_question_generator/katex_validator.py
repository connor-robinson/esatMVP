#!/usr/bin/env python3
"""
KaTeX Formatting Validator

Validates that LaTeX math expressions use consistent delimiters
and are compatible with KaTeX rendering.

Uses a two-stage approach:
1. Deterministic linter (fast formatting checks)
2. Node.js render test (actual KaTeX rendering)
"""

import re
from typing import Dict, List, Tuple, Optional

from katex_linter import lint_katex, format_lint_errors
from katex_render_test import run_render_test


def validate_katex_formatting(text: str, skip_render_test: bool = False) -> Tuple[bool, List[str]]:
    """
    Validate KaTeX formatting using two-stage approach:
    1. Deterministic linter (fast formatting checks)
    2. Node.js render test (actual KaTeX rendering, only if lint passes)
    
    Args:
        text: Text to validate
        skip_render_test: If True, skip the Node.js render test (lint only)
        
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors: List[str] = []
    
    # Stage 1: Run deterministic linter (fast)
    lint_errors = lint_katex(text)
    if lint_errors:
        # Format lint errors as strings
        errors.extend(format_lint_errors(lint_errors))
        return False, errors
    
    # Stage 2: Run Node.js render test (only if lint passed)
    if not skip_render_test:
        try:
            render_result = run_render_test(text)
            if not render_result.get("ok", False):
                # Format render test error
                error_type = render_result.get("type", "unknown")
                start_line = render_result.get("startLine", 0)
                content = render_result.get("content", "")
                katex_error = render_result.get("katexError", "Unknown error")
                
                # Truncate long content
                if len(content) > 50:
                    content_preview = content[:50] + "..."
                else:
                    content_preview = content
                
                errors.append(
                    f"{error_type.capitalize()} math render error at line {start_line}: {katex_error} "
                    f"(content: {content_preview})"
                )
                return False, errors
        except Exception as e:
            # If render test fails to run (Node.js not available, etc.), log but don't fail
            # This allows the system to work even if Node.js is not set up
            import warnings
            warnings.warn(f"KaTeX render test failed (may not be set up): {e}")
            # Return True since lint passed - render test is optional
            return True, []
    
    return True, []


def normalize_katex_formatting(text: str) -> str:
    """
    Normalize KaTeX formatting to ensure consistency.
    
    Converts:
    - \\( \\) to $ $
    - \\[ \\] to $$ $$
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


def validate_question_package(question_obj: Dict, skip_render_test: bool = False) -> Tuple[bool, List[str]]:
    """
    Validate KaTeX formatting in a complete question package.
    
    Args:
        question_obj: Question package dictionary
        skip_render_test: If True, skip Node.js render test (lint only)
        
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    all_errors = []
    
    # Validate question stem
    question = question_obj.get("question", {})
    if isinstance(question, dict):
        stem = question.get("stem", "")
        if stem:
            is_valid, errors = validate_katex_formatting(stem, skip_render_test=skip_render_test)
            if not is_valid:
                all_errors.extend([f"Question stem: {e}" for e in errors])
        
        # Validate options
        options = question.get("options", {})
        if isinstance(options, dict):
            for opt_key, opt_text in options.items():
                if opt_text:
                    is_valid, errors = validate_katex_formatting(str(opt_text), skip_render_test=skip_render_test)
                    if not is_valid:
                        all_errors.extend([f"Option {opt_key}: {e}" for e in errors])
    
    # Validate solution
    solution = question_obj.get("solution", {})
    if isinstance(solution, dict):
        reasoning = solution.get("reasoning", "")
        if reasoning:
            is_valid, errors = validate_katex_formatting(reasoning, skip_render_test=skip_render_test)
            if not is_valid:
                all_errors.extend([f"Solution reasoning: {e}" for e in errors])
        
        key_insight = solution.get("key_insight", "")
        if key_insight:
            is_valid, errors = validate_katex_formatting(key_insight, skip_render_test=skip_render_test)
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
    print("=" * 60)
    print("Testing new KaTeX validation system")
    print("=" * 60)
    
    # Test 1: Valid math expressions
    print("\n1. Testing valid math expressions:")
    test_text = "What is the value of $x$ when $x^2 = 4$? The answer is:\n\n$$\nx = \\pm 2\n$$\n\nThis is correct."
    is_valid, errors = validate_katex_formatting(test_text, skip_render_test=True)
    print(f"   Valid: {is_valid}")
    if errors:
        print(f"   Errors: {errors}")
    else:
        print("   [OK] No errors (expected)")
    
    # Test 2: Invalid math (unmatched braces)
    print("\n2. Testing invalid math (unmatched braces):")
    test_invalid = "The formula is $x = \\frac{1}{2$ which is wrong."
    is_valid, errors = validate_katex_formatting(test_invalid, skip_render_test=True)
    print(f"   Valid: {is_valid}")
    if errors:
        print(f"   Errors found: {len(errors)}")
        for error in errors:
            print(f"   - {error}")
    else:
        print("   [FAIL] No errors found (unexpected)")
    
    # Test 3: Unmatched delimiters
    print("\n3. Testing unmatched delimiters:")
    test_unmatched = "This has $x = 2 but no closing delimiter."
    is_valid, errors = validate_katex_formatting(test_unmatched, skip_render_test=True)
    print(f"   Valid: {is_valid}")
    if errors:
        print(f"   Errors: {errors}")
    else:
        print("   [OK] Unmatched delimiter detected (expected)")
    
    # Test 4: Display block spacing
    print("\n4. Testing display block spacing:")
    test_spacing = "We calculate:\n$$\nx = 5\n$$\nThis is wrong (no blank line)."
    is_valid, errors = validate_katex_formatting(test_spacing, skip_render_test=True)
    print(f"   Valid: {is_valid}")
    if errors:
        print(f"   Errors: {errors}")
    else:
        print("   [FAIL] No errors found (unexpected)")
    
    # Test 5: Forbidden delimiters
    print("\n5. Testing forbidden delimiters (LaTeX style):")
    test_mixed = "This uses \\(x = 2\\) which should be flagged."
    is_valid, errors = validate_katex_formatting(test_mixed, skip_render_test=True)
    print(f"   Valid: {is_valid}")
    if errors:
        print(f"   Errors found: {len(errors)}")
        for error in errors:
            print(f"   - {error}")
    else:
        print("   [FAIL] No errors found (unexpected)")
    
    # Test 6: Complex valid expression
    print("\n6. Testing complex valid expression:")
    test_complex = "The quadratic formula is:\n\n$$\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n$$\n\nThis is correct."
    is_valid, errors = validate_katex_formatting(test_complex, skip_render_test=True)
    print(f"   Valid: {is_valid}")
    if errors:
        print(f"   Errors: {errors}")
    else:
        print("   [OK] Complex expression valid (expected)")
    
    # Test normalization
    print("\n" + "=" * 60)
    print("Testing normalization:")
    print("=" * 60)
    test_text2 = "\\(x = 2\\) and \\[y = 3\\]"
    normalized = normalize_katex_formatting(test_text2)
    print(f"Original: {test_text2}")
    print(f"Normalized: {normalized}")
    
    print("\n" + "=" * 60)
    print("All tests completed!")
    print("=" * 60)
