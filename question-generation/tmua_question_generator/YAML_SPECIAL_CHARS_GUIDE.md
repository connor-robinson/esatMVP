# YAML Special Characters Guide

## Problem

YAML has special characters that can break parsing when they appear in unquoted strings:
- `:` (colon) - key-value separator
- `#` (hash) - comment indicator
- `@` (at) - reserved indicator
- `|` (pipe) - block scalar indicator
- `>` (greater) - folded block scalar
- `&` (ampersand) - anchor
- `*` (asterisk) - alias
- `!` (exclamation) - tag indicator
- `%` (percent) - directive indicator
- `?` (question) - complex key indicator
- `{` `}` `[` `]` - flow collection indicators

## Most Common Issues in TMUA Questions

1. **Colons in text**: `E: False log law application: $\log_3(...)`
   - Problem: YAML thinks `:` starts a new key-value pair
   - Solution: Quote the string: `E: "False log law application: $\log_3(...)"`

2. **Hash in text**: `#include` or `Section #1`
   - Problem: YAML treats `#` as start of comment
   - Solution: Quote the string: `"#include"` or `"Section #1"`

3. **Pipes in text**: `x | y` (set notation)
   - Problem: YAML treats `|` as block scalar
   - Solution: Quote the string: `"x | y"`

## Current Solution

We use a **preprocessing approach** that automatically quotes problematic values:

1. **Automatic quoting**: The `preprocess_yaml_for_special_chars()` function detects values containing special characters and wraps them in quotes
2. **AI instruction**: Prompts instruct the AI to quote strings containing special characters
3. **Wrapper system**: For inequalities, we use wrappers like `{<}`, `{>}` which are converted back after parsing

## Best Practice

**For AI-generated YAML:**
- Always quote strings that contain `:`, `#`, `|`, `@`, or other special characters
- Use the wrapper system for inequalities: `{<}`, `{>}`, `{<=}`, `{>=}`
- When in doubt, quote the string

**Example:**
```yaml
# ❌ BAD - will break YAML parsing
distractor_map:
  E: False log law: $\log_3(3^x + 3^{-y}) = \log_3(3^x) + \log_3(3^{-y})$

# ✅ GOOD - quoted string
distractor_map:
  E: "False log law: $\log_3(3^x + 3^{-y}) = \log_3(3^x) + \log_3(3^{-y})$"
```






