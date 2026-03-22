# YAML Parsing Solution - Special Characters Handling

## Problem

YAML parsing fails when AI-generated text contains special characters that YAML interprets as syntax:
- **Colon (`:`)** - Most common: `E: False log law: $\log_3(...)$` breaks because YAML sees nested key-value pairs
- **Hash (`#`)** - Comment indicator: `Section #1` becomes a comment
- **Pipe (`|`)** - Block scalar: `x | y` (set notation) breaks
- **Other reserved**: `@`, `&`, `*`, `!`, `%`, `?`

## Solution: Multi-Layer Approach

We use **three complementary strategies**:

### 1. **Automatic Preprocessing** (Primary Solution) ✅

**Function**: `preprocess_yaml_for_special_chars()`

**How it works**:
- Scans YAML for `key: value` patterns
- Detects values containing special characters
- Automatically wraps problematic values in double quotes
- Preserves existing quotes, multi-line strings, lists, and numbers

**Example**:
```yaml
# Before (breaks YAML):
distractor_map:
  E: False log law: $\log_3(3^x + 3^{-y}) = \log_3(3^x) + \log_3(3^{-y})$

# After (auto-quoted):
distractor_map:
  E: "False log law: $\log_3(3^x + 3^{-y}) = \log_3(3^x) + \log_3(3^{-y})$"
```

**Smart detection**:
- Detects colons in text (not in math expressions)
- Skips colons inside `$...$` math blocks
- Handles multiple colons correctly
- Preserves existing quoted strings

### 2. **AI Instructions** (Secondary Prevention) ✅

**Updated prompts**: Both `Paper1 Implementer.md` and `Paper2 Implementer.md`

**Instructions added**:
- Explicit rule: "QUOTE strings containing special characters"
- Examples showing correct vs incorrect formatting
- Reminder about inequality wrappers (`{<}`, `{>}`, etc.)

**Why this helps**:
- Reduces errors at the source
- AI learns to quote proactively
- Works as a safety net if preprocessing misses edge cases

### 3. **Wrapper System** (For Inequalities) ✅

**Already implemented**: `preprocess_yaml_for_inequalities()`

**How it works**:
- AI uses wrappers: `{<}`, `{>}`, `{<=}`, `{>=}`
- Preprocessor converts them back to `<`, `>`, `<=`, `>=` after YAML parsing
- Prevents YAML from interpreting these as flow indicators

## Special Characters List

| Character | YAML Meaning | Common Issue | Solution |
|-----------|-------------|-------------|----------|
| `:` | Key-value separator | `E: False log: ...` | Auto-quote |
| `#` | Comment | `Section #1` | Auto-quote |
| `\|` | Block scalar | `x \| y` (set notation) | Auto-quote |
| `@` | Reserved | Email addresses | Auto-quote |
| `&` | Anchor | `&reference` | Auto-quote |
| `*` | Alias | `*reference` | Auto-quote |
| `!` | Tag | `!tag` | Auto-quote |
| `%` | Directive | `%YAML` | Auto-quote |
| `?` | Complex key | `? key` | Auto-quote |
| `<` `>` | Flow indicators | Inequalities | Wrapper system |

## Why This Approach?

### ✅ **Automatic Preprocessing is Best Because**:

1. **Robust**: Handles cases AI might miss
2. **Transparent**: AI doesn't need to worry about every edge case
3. **Backward Compatible**: Works with existing generated questions
4. **Maintainable**: Centralized logic, easy to update

### ✅ **AI Instructions Help Because**:

1. **Reduces errors**: AI learns to quote proactively
2. **Faster**: Fewer retries needed
3. **Better output**: AI generates cleaner YAML

### ✅ **Wrapper System for Inequalities**:

1. **Specific solution**: Inequalities are common and predictable
2. **Post-processing**: Can convert back after parsing
3. **Clear pattern**: Easy for AI to learn

## Testing

The preprocessing handles these cases:

```yaml
# ✅ Case 1: Colon in distractor text
E: "False log law: $\log_3(...)$"

# ✅ Case 2: Hash in text
A: "Section #1: Find the value"

# ✅ Case 3: Colon in math (preserved)
A: "$f: X \to Y$"  # Colon inside $...$ is safe

# ✅ Case 4: Already quoted (preserved)
E: "Already quoted: text"

# ✅ Case 5: Number (not quoted)
correct_option: A

# ✅ Case 6: List (not quoted)
tags: [MM4, MM6]
```

## Implementation Details

**Order of preprocessing**:
1. Strip code fences (```yaml blocks)
2. Process inequality wrappers (`{<}` → `<`)
3. Auto-quote special characters
4. Parse with `yaml.safe_load()`

**Error handling**:
- If preprocessing fails, original error is shown with context
- Line numbers and column positions preserved
- Preview of problematic YAML included in error

## Result

**Before**: YAML parsing errors caused retries and failures
**After**: Automatic quoting prevents most parsing errors, AI instructions reduce them further

The system is now **robust against special character issues** while maintaining flexibility for the AI to generate natural text.






