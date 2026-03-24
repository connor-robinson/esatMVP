#!/usr/bin/env python3
"""
Deterministic KaTeX Linter

Fast, rule-based linting that catches formatting issues without rendering.
Focuses on delimiter correctness, block formatting rules, and sanity checks.
"""

import re
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class LintError:
    """Structured lint error with location information."""
    code: str
    message: str
    line: int
    col: int = 1


# Forbidden delimiters that should not appear
FORBIDDEN_DELIMITERS = [
    (r"\(", r"\("),
    (r"\)", r"\)"),
    (r"\[", r"\["),
    (r"\]", r"\]"),
]

# Zero-width Unicode characters that can cause issues
ZERO_WIDTH_CHARS = {
    "\u200b",  # Zero-width space
    "\u200c",  # Zero-width non-joiner
    "\u200d",  # Zero-width joiner
    "\ufeff",  # Zero-width no-break space
}


def _get_line_col(text: str, position: int) -> tuple[int, int]:
    """Calculate line and column number from character position."""
    line = text.count("\n", 0, position) + 1
    last_newline = text.rfind("\n", 0, position)
    col = position - last_newline
    return line, col


def lint_katex(text: str, subject: Optional[str] = None) -> List[LintError]:
    """
    Lint KaTeX formatting deterministically.
    
    Checks:
    1. Zero-width Unicode characters
    2. Forbidden delimiters
    3. Display math block formatting
    4. Inline dollar pairing
    5. Brace balance (heuristic)
    6. Subject-specific checks (if subject provided)
    
    Args:
        text: Text to lint
        subject: Optional subject ("physics", "chemistry", "biology") for subject-specific checks
        
    Returns:
        List of LintError objects
    """
    errors: List[LintError] = []
    
    # 0) Check for zero-width characters
    for i, ch in enumerate(text):
        if ch in ZERO_WIDTH_CHARS:
            line, col = _get_line_col(text, i)
            errors.append(LintError(
                "ZERO_WIDTH_CHAR",
                f"Zero-width character U+{ord(ch):04X} at line {line} col {col}",
                line, col
            ))
    
    # 1) Check for forbidden delimiters
    for pattern, display_name in FORBIDDEN_DELIMITERS:
        for match in re.finditer(re.escape(pattern), text):
            i = match.start()
            line, col = _get_line_col(text, i)
            errors.append(LintError(
                "FORBIDDEN_DELIMITER",
                f"Forbidden delimiter '{display_name}' at line {line} col {col}",
                line, col
            ))
    
    # 2) Check display math block formatting
    lines = text.splitlines()
    in_display = False
    display_open_line = None
    
    for idx, raw in enumerate(lines, start=1):
        stripped = raw.strip()
        
        # Check if line contains $$
        if "$$" in raw:
            # Enforce that $$ must be on its own line (exactly "$$" after stripping)
            if stripped != "$$":
                errors.append(LintError(
                    "DISPLAY_LINE_NOT_PURE",
                    f"Line {idx}: '$$' must be on its own line (found extra text: '{stripped}')",
                    idx, 1
                ))
        
        if stripped == "$$":
            if not in_display:
                # Opening $$
                # Require blank line before (unless it's the first line)
                if idx > 1:
                    prev_line = lines[idx - 2].strip() if idx - 2 >= 0 else ""
                    if prev_line != "":
                        errors.append(LintError(
                            "DISPLAY_BLOCK_SPACING",
                            f"Line {idx}: missing blank line before opening $$",
                            idx, 1
                        ))
                in_display = True
                display_open_line = idx
            else:
                # Closing $$
                # Require blank line after (unless it's the last line)
                if idx < len(lines):
                    next_line = lines[idx].strip() if idx < len(lines) else ""
                    if next_line != "":
                        errors.append(LintError(
                            "DISPLAY_BLOCK_SPACING",
                            f"Line {idx}: missing blank line after closing $$",
                            idx, 1
                        ))
                in_display = False
                display_open_line = None
    
    # Check for unclosed display block
    if in_display:
        errors.append(LintError(
            "UNCLOSED_DISPLAY",
            f"Display math opened at line {display_open_line} is not closed",
            display_open_line or 1, 1
        ))
    
    # 3) Check inline dollar pairing and brace balance
    # Remove pure $$ lines to prevent confusion
    text_no_display_lines = "\n".join("" if ln.strip() == "$$" else ln for ln in lines)
    errors.extend(_lint_inline_dollars_and_braces(text_no_display_lines))
    
    # 4) Subject-specific checks
    if subject:
        _lint_subject_specific(text, subject.lower(), errors)
    
    return errors


def _lint_inline_dollars_and_braces(text: str) -> List[LintError]:
    """
    Lint inline dollar signs and check brace balance.
    
    Args:
        text: Text with display math lines removed
        
    Returns:
        List of LintError objects
    """
    errors: List[LintError] = []
    
    # Find all $ that are not escaped and not part of $$
    dollar_positions = []
    i = 0
    while i < len(text):
        ch = text[i]
        if ch == "$":
            prev = text[i - 1] if i > 0 else ""
            nxt = text[i + 1] if i + 1 < len(text) else ""
            # Ignore escaped $ (\$) and ignore $$ (should be removed already)
            if prev != "\\" and nxt != "$":
                dollar_positions.append(i)
        i += 1
    
    # Check if we have an odd number of dollars (unmatched)
    if len(dollar_positions) % 2 == 1:
        bad_i = dollar_positions[-1]
        line, col = _get_line_col(text, bad_i)
        errors.append(LintError(
            "UNMATCHED_DOLLAR",
            f"Unmatched inline $ at line {line} col {col}",
            line, col
        ))
        # Can't check braces if dollars are unmatched
        return errors
    
    # Extract math spans and check brace balance
    math_spans = []
    # Pair dollars in order
    for a, b in zip(dollar_positions[0::2], dollar_positions[1::2]):
        math_spans.append((a + 1, b))  # +1 to skip opening $
    
    for start, end in math_spans:
        seg = text[start:end]
        # Remove escaped braces to check balance
        seg_unescaped = seg.replace(r"\{", "").replace(r"\}", "")
        open_braces = seg_unescaped.count("{")
        close_braces = seg_unescaped.count("}")
        
        if open_braces != close_braces:
            line, col = _get_line_col(text, start)
            errors.append(LintError(
                "UNBALANCED_BRACES",
                f"Unbalanced braces in inline math starting at line {line} col {col} "
                f"({{: {open_braces}, }}: {close_braces})",
                line, col
            ))
    
    return errors


def _lint_subject_specific(text: str, subject: str, errors: List[LintError]) -> None:
    """
    Apply subject-specific linting rules.
    
    Args:
        text: Text to lint
        subject: Subject ("physics", "chemistry", "biology")
        errors: List to append errors to
    """
    if subject == "physics":
        # Check for Unicode math symbols
        unicode_symbols = {
            "×": "\\times",
            "→": "\\to or \\rightarrow",
            "−": "- (minus)",
            "±": "\\pm",
            "∓": "\\mp",
            "≤": "\\leq",
            "≥": "\\geq",
            "≠": "\\neq",
            "≈": "\\approx",
        }
        for symbol, replacement in unicode_symbols.items():
            if symbol in text:
                for i, ch in enumerate(text):
                    if ch == symbol:
                        line, col = _get_line_col(text, i)
                        errors.append(LintError(
                            "UNICODE_SYMBOL",
                            f"Unicode symbol '{symbol}' at line {line} col {col}, use LaTeX: {replacement}",
                            line, col
                        ))
    
    elif subject == "chemistry":
        # Check for chemical formulas outside \ce{}
        # Simple heuristic: patterns like H2O, CO2, etc. outside \ce{}
        # This is a heuristic - may have false positives, but catches common errors
        
        # Pattern for simple chemical formulas (element + optional number)
        chem_pattern = re.compile(r'\b[A-Z][a-z]?\d+\b')
        
        # Find all potential chemical formulas
        lines = text.splitlines()
        for line_num, line in enumerate(lines, start=1):
            # Skip lines that are inside \ce{} blocks (simple check)
            # Check if line contains \ce{ or is inside a \ce block
            # For simplicity, we check if the pattern appears outside $...$ blocks
            # This is heuristic and may miss some cases, but catches common errors
            
            # Remove content inside $...$ to avoid flagging math
            line_no_math = re.sub(r'\$[^$]*\$', '', line)
            
            # Check for patterns that look like chemical formulas
            matches = chem_pattern.finditer(line_no_math)
            for match in matches:
                # Check if it's inside \ce{} - simple heuristic
                context_start = max(0, match.start() - 50)
                context_end = min(len(line), match.end() + 50)
                context = line[context_start:context_end]
                
                # If \ce{ appears before this match, it's probably OK
                ce_before = context.rfind('\\ce{', 0, match.start() - context_start)
                if ce_before == -1:
                    # Potential issue - chemical formula outside \ce{}
                    errors.append(LintError(
                        "CHEM_FORMULA_OUTSIDE_CE",
                        f"Line {line_num}: Chemical formula pattern '{match.group()}' found outside \\ce{{}} at col {match.start() + 1}",
                        line_num, match.start() + 1
                    ))
        
        # Check for Unicode arrows (should use mhchem arrows inside \ce{})
        unicode_arrows = {"→", "←", "⇌", "⇄"}
        for i, ch in enumerate(text):
            if ch in unicode_arrows:
                line, col = _get_line_col(text, i)
                errors.append(LintError(
                    "UNICODE_ARROW",
                    f"Unicode arrow '{ch}' at line {line} col {col}, use mhchem arrow syntax inside \\ce{{}}",
                    line, col
                ))
    
    elif subject == "biology":
        # Minimal LaTeX policy - flag excessive math usage
        # Count math spans (approximate by counting $ signs)
        dollar_count = text.count('$')
        math_span_count = dollar_count // 2
        
        # Heuristic: if there are many math spans, flag it (unless it's clearly quantitative)
        # This is conservative - only flag if there are many math expressions
        if math_span_count > 5:
            # Check if question seems quantitative (contains numbers, calculations)
            has_calculations = bool(re.search(r'\d+\s*[+\-*/=]', text))
            if not has_calculations:
                errors.append(LintError(
                    "EXCESSIVE_MATH",
                    f"Excessive math usage ({math_span_count} math expressions) in non-quantitative biology question",
                    1, 1
                ))
        
        # Validate Markdown tables
        lines = text.splitlines()
        in_table = False
        table_start = None
        expected_cols = None
        
        for line_num, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            
            if stripped.startswith('|'):
                if not in_table:
                    in_table = True
                    table_start = line_num
                    # Count columns in header
                    expected_cols = stripped.count('|') - 1  # Subtract 1 for leading |
                else:
                    # Check column count matches
                    cols = stripped.count('|') - 1
                    if cols != expected_cols:
                        errors.append(LintError(
                            "TABLE_COLUMN_MISMATCH",
                            f"Line {line_num}: Table row has {cols} columns, expected {expected_cols}",
                            line_num, 1
                        ))
            elif stripped.startswith('|---'):
                # Separator row
                if not in_table:
                    errors.append(LintError(
                        "TABLE_SEPARATOR_WITHOUT_HEADER",
                        f"Line {line_num}: Table separator row without header",
                        line_num, 1
                    ))
                else:
                    # Check separator row has correct number of columns
                    cols = stripped.count('|') - 1
                    if cols != expected_cols:
                        errors.append(LintError(
                            "TABLE_SEPARATOR_COLUMN_MISMATCH",
                            f"Line {line_num}: Table separator has {cols} columns, expected {expected_cols}",
                            line_num, 1
                        ))
            else:
                if in_table and table_start:
                    # Table ended
                    in_table = False
                    table_start = None
                    expected_cols = None


def format_lint_errors(errors: List[LintError]) -> List[str]:
    """
    Format lint errors as human-readable strings.
    
    Args:
        errors: List of LintError objects
        
    Returns:
        List of formatted error strings
    """
    return [f"{e.code}: {e.message}" for e in errors]


if __name__ == "__main__":
    # Test the linter
    print("=" * 60)
    print("Testing KaTeX Linter")
    print("=" * 60)
    
    # Test 1: Valid text
    print("\n1. Testing valid text:")
    test1 = "The value is $x = 5$ and the result is $$y = 10$$."
    errors1 = lint_katex(test1)
    print(f"   Errors: {len(errors1)}")
    if errors1:
        for e in errors1:
            print(f"   - {e}")
    else:
        print("   [OK] No errors (expected)")
    
    # Test 2: Unmatched dollar
    print("\n2. Testing unmatched dollar:")
    test2 = "The value is $x = 5 but no closing delimiter."
    errors2 = lint_katex(test2)
    print(f"   Errors: {len(errors2)}")
    for e in errors2:
        print(f"   - {e.code}: {e.message}")
    
    # Test 3: Forbidden delimiter
    print("\n3. Testing forbidden delimiter:")
    test3 = "This uses \\(x = 2\\) which should be flagged."
    errors3 = lint_katex(test3)
    print(f"   Errors: {len(errors3)}")
    for e in errors3:
        print(f"   - {e.code}: {e.message}")
    
    # Test 4: Display block spacing
    print("\n4. Testing display block spacing:")
    test4 = "We calculate:\n$$\nx = 5\n$$\nThis is wrong."
    errors4 = lint_katex(test4)
    print(f"   Errors: {len(errors4)}")
    for e in errors4:
        print(f"   - {e.code}: {e.message}")
    
    # Test 5: Correct display block
    print("\n5. Testing correct display block:")
    test5 = "We calculate:\n\n$$\nx = 5\n$$\n\nThis is correct."
    errors5 = lint_katex(test5)
    print(f"   Errors: {len(errors5)}")
    if errors5:
        for e in errors5:
            print(f"   - {e}")
    else:
        print("   [OK] No errors (expected)")
    
    # Test 6: Unbalanced braces
    print("\n6. Testing unbalanced braces:")
    test6 = "The formula is $x = \\frac{1}{2$ which is wrong."
    errors6 = lint_katex(test6)
    print(f"   Errors: {len(errors6)}")
    for e in errors6:
        print(f"   - {e.code}: {e.message}")
    
    print("\n" + "=" * 60)
    print("All tests completed!")
    print("=" * 60)







