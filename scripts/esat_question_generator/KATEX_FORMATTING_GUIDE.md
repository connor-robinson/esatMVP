# KaTeX Formatting Guide

This guide documents all the KaTeX formatting rules, spacing normalization, and rendering logic used in the question review system. These rules ensure consistent math rendering across the application.

## Table of Contents
1. [Delimiters](#delimiters)
2. [Spacing Normalization](#spacing-normalization)
3. [Rendering Process](#rendering-process)
4. [Validation Rules](#validation-rules)
5. [Code References](#code-references)

---

## Delimiters

### Inline Math
- **Format**: `$...$` (single dollar signs)
- **Example**: `The value of $x$ is $5$`
- **Renders as**: Inline math within text flow

### Display Math
- **Format**: `$$...$$` (double dollar signs)
- **Example**: `The equation is $$x^2 + y^2 = r^2$$`
- **Renders as**: Block/display math on its own line

### Important Rules
- **MUST use only `$` and `$$` delimiters**
- **DO NOT use** LaTeX-style delimiters:
  - ❌ `\(...\)` for inline math
  - ❌ `\[...\]` for display math
- These will be automatically converted during normalization, but it's better to use the correct format from the start

---

## Spacing Normalization

The `normalize_math_spacing()` function ensures proper spacing around math blocks for better readability.

### Rules

1. **Space Before Math Block**:
   - Add space if:
     - Previous character is NOT whitespace
     - NOT at the start of the string
   - Example: `text$$math$$` → `text $$math$$`

2. **Space After Math Block**:
   - Add space if:
     - Next character is NOT whitespace
     - Next character is NOT punctuation
   - **Punctuation that doesn't get space after**: `. , ! ? ; : ) ] }`
   - Example: `text$$math$$text` → `text $$math$$ text`
   - Example: `text$$math$$.` → `text $$math$$.` (no space before period)

3. **Processing Order**:
   - Process display math (`$$...$$`) FIRST
   - Then process inline math (`$...$`)
   - **Never process inline math that overlaps with display math**

4. **Edge Cases**:
   - At start of string: `$$math$$text` → `$$math$$ text` (no space before)
   - At end of string: `text$$math$$` → `text $$math$$` (no space after)
   - Already has spaces: `text $$math$$ text` → unchanged

### Examples

```python
# Example 1: Basic spacing
"text$x$text" → "text $x$ text"
"text$$x^2$$text" → "text $$x^2$$ text"

# Example 2: Punctuation handling
"text$x$." → "text $x$."
"text$x$, text" → "text $x$, text"
"text$x$!" → "text $x$!"

# Example 3: Already spaced (no change)
"text $x$ text" → "text $x$ text"

# Example 4: At boundaries
"$$x^2$$text" → "$$x^2$$ text"  # Start of string
"text$$x^2$$" → "text $$x^2$$"  # End of string

# Example 5: Mixed inline and display
"text$x$ and $$y^2$$text" → "text $x$ and $$y^2$$ text"
# Display math is processed first, so inline math doesn't interfere
```

### Implementation Notes
- The function processes matches in **reverse order** to maintain correct string indices
- Uses regex patterns to find math blocks
- Checks for overlaps to avoid processing inline math inside display math

---

## Rendering Process

The rendering process converts text with KaTeX delimiters into displayable HTML/rendered math.

### Steps

1. **Parse Text into Segments** (`parse_math_content`):
   - Input: Raw text string with `$` and `$$` delimiters
   - Output: Array of segments: `{type: "text" | "inline" | "display", content: string}`
   
2. **Segment Types**:
   - `"text"`: Regular text content (HTML escaped)
   - `"inline"`: Inline math content (between `$...$`)
   - `"display"`: Display math content (between `$$...$$`)

3. **Processing Priority**:
   - Display math (`$$...$$`) takes precedence over inline math
   - If both are found at the same position, display math is processed first

4. **Rendering**:
   - Text segments: HTML escaped (`&`, `<`, `>`, `"`, `'`)
   - Inline math: Rendered with `displayMode: false`
   - Display math: Rendered with `displayMode: true`

5. **Error Handling**:
   - If math rendering fails, fallback to showing raw math with delimiters
   - Example: `$$invalid\latex$$` → `$$invalid\latex$$` (shown as text)

### Example

**Input**:
```
The value of $x$ when $x^2 = 4$ is $$x = \pm 2$$.
```

**Parsed Segments**:
```javascript
[
  {type: "text", content: "The value of "},
  {type: "inline", content: "x"},
  {type: "text", content: " when "},
  {type: "inline", content: "x^2 = 4"},
  {type: "text", content: " is "},
  {type: "display", content: "x = \\pm 2"},
  {type: "text", content: "."}
]
```

**Rendered HTML**:
```html
The value of <span class="katex">...</span> when <span class="katex">...</span> is <span class="katex-display">...</span>.
```

---

## Validation Rules

The `validate_katex_formatting()` function checks for common formatting errors.

### Validation Checks

1. **Mixed Delimiters**:
   - ❌ Rejects: `\(`, `\[`, `\)`, `\]`
   - ✅ Accepts: Only `$` and `$$`

2. **Unmatched Dollar Signs**:
   - Checks that all `$` signs are properly paired
   - Each inline math uses 2 `$` signs
   - Each display math uses 4 `$` signs
   - Total count should match: `len(inline_math) * 2 + len(display_math) * 4`

3. **Nested Dollar Signs**:
   - ❌ Rejects: `$...$...$` (three or more consecutive `$`)
   - Example: `$$x = $5$$` is invalid

4. **Unmatched Braces**:
   - Checks that `{` and `}` are balanced in math expressions
   - Example: `$x^{2$` is invalid (missing closing brace)

5. **Invalid LaTeX Commands**:
   - Basic check for malformed `\` commands
   - Example: `$\invalid$` may be flagged

### Example Errors

```python
# Unmatched dollar signs
"The value is $x" → Error: Mismatched dollar signs

# Mixed delimiters
"The value is \(x\)" → Error: Found LaTeX delimiters

# Nested dollar signs
"$$x = $5$$" → Error: Found single $ inside $$ block

# Unmatched braces
"$x^{2$" → Error: Unmatched braces in math expression
```

---

## Code References

### TypeScript/JavaScript
- **Parsing & Rendering**: `src/hooks/useKaTeX.ts`
  - `parseMathContent()`: Parses text into segments
  - `renderMath()`: Renders individual math expressions
  - `renderMathContent()`: Full rendering pipeline

- **Spacing Normalization**: `src/lib/utils/mathSpacing.ts`
  - `normalizeMathSpacing()`: Normalizes spacing around math delimiters
  - `normalizeQuestionMathSpacing()`: Applies to entire question objects

### Python
- **Spacing Normalization**: `scripts/esat_question_generator/db_sync.py`
  - `normalize_math_spacing()`: Python implementation (identical logic)
  - `normalize_question_math_spacing()`: Applies to question dicts

- **Validation**: `scripts/esat_question_generator/katex_validator.py`
  - `validate_katex_formatting()`: Validates formatting
  - `normalize_katex_formatting()`: Converts alternative delimiters
  - `validate_question_package()`: Validates entire question objects
  - `fix_katex_formatting()`: Fixes formatting issues

### Database
- **Column Comments**: `supabase/migrations/20251218000000_create_ai_questions_table.sql`
  - Documents that `question_stem` uses KaTeX with `$` and `$$` delimiters

---

## Usage in Tkinter App

When implementing the Tkinter app, ensure:

1. **Before Saving**: Apply `normalize_math_spacing()` to all text fields:
   - `question_stem`
   - All option values (`options` dict)
   - `solution_reasoning`
   - `solution_key_insight`
   - All distractor values (`distractor_map` dict)

2. **When Rendering**: Use `parse_math_content()` and `render_math_content()` to convert text to displayable format

3. **For Validation**: Use `validate_katex_formatting()` before saving to catch errors early

4. **Library**: Use Python's `katex` package or render via HTML with KaTeX CDN (recommended for Tkinter: use `tkinterweb` with HTML rendering)

---

## Quick Reference

### Delimiters
- Inline: `$math$`
- Display: `$$math$$`
- ❌ Don't use: `\(math\)`, `\[math\]`

### Spacing
- Always add spaces around math unless:
  - Already has space
  - Next to punctuation (`. , ! ? ; : ) ] }`)
  - At start/end of string

### Rendering
- Parse → Segments → Render each → Combine
- Display math takes precedence over inline math
- Fallback to raw text on render errors

### Validation
- Check for unmatched `$`
- Check for unmatched `{ }`
- Reject mixed delimiters
- Reject nested dollar signs












