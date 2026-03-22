# Complete YAML Error Fixes

## Summary of All Fixes Applied

### 1. Backslash Escaping in Quoted Strings ✅

**Problem:** YAML interprets backslashes in double-quoted strings as escape sequences. LaTeX commands like `\cdot`, `\sin`, `\int`, `\,` cause errors like:
- `found unknown escape character 'c'` (from `\cdot`)
- `found unknown escape character 'i'` (from `\sin`)
- `found unknown escape character ','` (from `\,`)

**Solution:** Escape all backslashes before quoting:
```python
escaped_value = value.replace('\\', '\\\\')  # \ becomes \\
```

**Fixed in:**
- `preprocess_yaml_for_special_chars()` - Handles both key:value pairs and list items
- Already-quoted strings are now re-processed to escape backslashes
- List items with quoted strings are also escaped

### 2. Backslashes in Already-Quoted Strings ✅

**Problem:** When AI outputs `- "Confusing $8^x$ with $3 \cdot 2^x$"`, the backslashes inside the quotes still need escaping.

**Solution:** Extract content from quoted strings, escape backslashes, then re-quote:
```python
if (list_value.startswith('"') and list_value.endswith('"')):
    inner_content = list_value[1:-1]
    escaped_content = inner_content.replace('\\', '\\\\').replace('"', '\\"')
    processed_lines.append(f'{indent_and_dash}"{escaped_content}"')
```

### 3. Colons in List Items ✅

**Problem:** List items with colons like `- Here's a breakdown of the relevant topics:` cause YAML parsing errors.

**Solution:** Detect colons in list items and quote them:
```python
elif ':' in list_value and not list_value.startswith('$'):
    # Quote it
    escaped_value = list_value.replace('\\', '\\\\').replace('"', '\\"')
    processed_lines.append(f'{indent_and_dash}"{escaped_value}"')
```

### 4. Prompt Contamination Detection ✅

**Problem:** Sometimes AI outputs the system prompt instead of just YAML:
```
You are a **TMUA Paper 1 admissi...
---
schema_id: ...
```

This causes: `expected a single document in the stream but found another document`

**Solution:** Added `strip_prompt_contamination()` function that:
- Detects prompt-like patterns (e.g., "You are", "Your task", markdown headers with "TMUA")
- Finds where actual YAML starts (key:value patterns)
- Strips everything before the YAML start

**Applied to:**
- `designer_call()` - Detects and strips prompt contamination
- `implementer_call()` - Detects and strips prompt contamination
- `implementer_regen_call()` - Detects and strips prompt contamination

### 5. Single Quotes to Double Quotes Conversion ✅

**Problem:** Single-quoted strings don't interpret escape sequences, but if they contain backslashes or colons, they should be converted to double quotes for consistency.

**Solution:** Convert single-quoted strings with backslashes or colons to double-quoted:
```python
elif (value.startswith("'") and value.endswith("'")):
    inner_content = value[1:-1]
    if '\\' in inner_content or ':' in inner_content:
        escaped_content = inner_content.replace('\\', '\\\\').replace('"', '\\"')
        processed_lines.append(f"{indent}{key}: \"{escaped_content}\"")
```

## Error Examples Fixed

### Example 1: LaTeX in List Item
```yaml
# Before (ERROR):
- "Confusing $8^x$ with $3 \cdot 2^x$"
# Error: found unknown escape character 'c'

# After (FIXED):
- "Confusing $8^x$ with $3 \\cdot 2^x$"
```

### Example 2: LaTeX in Key-Value
```yaml
# Before (ERROR):
E: "Misses the factor of 2 in the \sin calculation"
# Error: found unknown escape character 'i'

# After (FIXED):
E: "Misses the factor of 2 in the \\sin calculation"
```

### Example 3: Colon in List Item
```yaml
# Before (ERROR):
- Here's a breakdown of the relevant topics:
# Error: mapping values are not allowed here

# After (FIXED):
- "Here's a breakdown of the relevant topics:"
```

### Example 4: Prompt Contamination
```yaml
# Before (ERROR):
You are a **TMUA Paper 1 admission**...
---
schema_id: M_123
# Error: expected a single document but found another document

# After (FIXED):
schema_id: M_123
```

## Testing

All fixes are applied to:
1. ✅ `preprocess_yaml_for_special_chars()` - Main preprocessing
2. ✅ `safe_yaml_load()` - YAML loading with prompt stripping option
3. ✅ `designer_call()` - Designer output parsing
4. ✅ `implementer_call()` - Implementer output parsing
5. ✅ `implementer_regen_call()` - Implementer regeneration parsing
6. ✅ Classifier retry logic - Already had backslash escaping

## Result

✅ **All YAML parsing errors from backslashes are fixed**
✅ **Colons in list items are properly quoted**
✅ **Prompt contamination is detected and stripped**
✅ **Already-quoted strings with backslashes are re-escaped**

The system should now handle all the edge cases that were causing YAML parsing errors.






