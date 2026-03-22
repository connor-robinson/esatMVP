# YAML Escape Sequence Error Fix

## Problem

When auto-quoting values containing special characters, backslashes in the text (especially from LaTeX commands like `\sin`, `\log`, `\frac`) cause YAML parsing errors:

```
YAML parsing error: while scanning a double-quoted scalar
found unknown escape character 's'
```

## Root Cause

YAML double-quoted strings interpret backslashes as escape sequences:
- `\n` = newline ✅
- `\t` = tab ✅
- `\"` = quote ✅
- `\\` = backslash ✅
- `\s` = **ERROR** ❌ (not a valid escape sequence)
- `\2` = **ERROR** ❌ (not a valid escape sequence)

When we auto-quote a value like:
```yaml
E: "Misses the factor of 2 in the \sin calculation"
```

YAML sees `\s` and tries to interpret it as an escape sequence, but `\s` is not valid, so it throws an error.

## Solution

**Escape all backslashes before quoting:**

```python
# Before quoting:
escaped_value = value.replace('\\', '\\\\')  # \ becomes \\
escaped_value = escaped_value.replace('"', '\\"')  # " becomes \"
```

**Result:**
```yaml
# Before (ERROR):
E: "Misses the factor of 2 in the \sin calculation"

# After (WORKS):
E: "Misses the factor of 2 in the \\sin calculation"
```

YAML will parse `\\sin` as a literal backslash followed by "sin", which is what we want.

## Implementation

Updated in two places:
1. `preprocess_yaml_for_special_chars()` - Main preprocessing function
2. Classifier retry logic - When fixing unquoted colons

## Order Matters

**Correct order:**
1. Escape backslashes first: `\` → `\\`
2. Then escape quotes: `"` → `\"`

**Wrong order (would break):**
1. Escape quotes first: `"` → `\"`
2. Then escape backslashes: `\` → `\\` (but this would also escape the `\` in `\"`)

## Examples

### Example 1: LaTeX in distractor text
```yaml
# AI Output:
E: Misses the factor of 2 in the \sin calculation

# After preprocessing:
E: "Misses the factor of 2 in the \\sin calculation"
```

### Example 2: Multiple backslashes
```yaml
# AI Output:
A: Uses \log_2 and \sin^2 incorrectly

# After preprocessing:
A: "Uses \\log_2 and \\sin^2 incorrectly"
```

### Example 3: Backslash and quote
```yaml
# AI Output:
B: The "factor" of \frac{1}{2} is wrong

# After preprocessing:
B: "The \"factor\" of \\frac{1}{2} is wrong"
```

## Testing

To verify the fix works:
```python
import yaml

# Test case that previously failed
test_yaml = 'E: "Misses the factor of 2 in the \\sin calculation"'
result = yaml.safe_load(test_yaml)
print(result)  # Should work: {'E': 'Misses the factor of 2 in the \\sin calculation'}
```

## Result

✅ **All backslashes are now properly escaped before quoting**
✅ **YAML parsing errors from escape sequences are prevented**
✅ **LaTeX commands in quoted strings work correctly**






