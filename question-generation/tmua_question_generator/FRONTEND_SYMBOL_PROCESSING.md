# Frontend Symbol Processing Guide

## Summary: No Special Processing Needed ✅

**The frontend does NOT need to process wrapped symbols** because:

1. **Inequality wrappers (`{<}`, `{>}`, etc.)** are converted to actual symbols (`<`, `>`) in Python **before** data is stored in the database
2. **Auto-quoted strings** (with colons, hashes, etc.) - the quotes are just YAML syntax, not stored in the database
3. **Frontend HTML escaping** already handles all special characters correctly

## Data Flow

### 1. Inequality Wrappers (`{<}`, `{>}`, `{<=}`, `{>=}`)

**Python Processing:**
```
AI Output: "x {<} 5"
    ↓
preprocess_yaml_for_inequalities() converts: "x < 5"
    ↓
YAML parsing extracts: "x < 5" (actual symbol)
    ↓
Database stores: "x < 5" (actual symbol)
    ↓
Frontend receives: "x < 5"
    ↓
HTML escaping converts: "x &lt; 5" (for safe display)
```

**Result:** Frontend receives actual `<` and `>`, which are correctly escaped to `&lt;` and `&gt;` for HTML display.

### 2. Auto-Quoted Strings (colons, hashes, etc.)

**Python Processing:**
```
AI Output: E: False log law: $\log_3(...)$
    ↓
preprocess_yaml_for_special_chars() auto-quotes: E: "False log law: $\log_3(...)$"
    ↓
YAML parsing extracts: "False log law: $\log_3(...)$" (quotes are YAML syntax, not data)
    ↓
Database stores: "False log law: $\log_3(...)$" (actual text with colon)
    ↓
Frontend receives: "False log law: $\log_3(...)$"
    ↓
MathContent component processes: Colon is preserved, math is rendered
```

**Result:** Frontend receives actual text with colons, hashes, etc. No special processing needed.

### 3. Special Characters in Math Expressions

**Math expressions** (inside `$...$`) are handled by KaTeX:
- Colons, hashes, etc. inside math are part of the LaTeX expression
- KaTeX renders them correctly
- No special processing needed

## Frontend Code

The frontend uses `MathContent` component which:
1. Parses text and math segments
2. Escapes HTML in text segments (converts `<` → `&lt;`, `>` → `&gt;`)
3. Renders math segments with KaTeX

**Location:** `src/hooks/useKaTeX.ts` → `renderMathContent()`

**Current behavior:**
```typescript
// Text segments are HTML-escaped
const escaped = contentStr
  .replace(/</g, "&lt;")   // < becomes &lt;
  .replace(/>/g, "&gt;")   // > becomes &gt;
  .replace(/&/g, "&amp;")  // & becomes &amp;
  // ... other escapes
```

This is **correct** and handles all special characters safely.

## Verification

To verify the database contains actual symbols (not wrappers):

```sql
-- Check a few questions for wrapped symbols
SELECT 
  id,
  question_stem,
  options
FROM ai_generated_questions
WHERE question_stem LIKE '%{%'  -- Should return 0 rows (no wrappers)
   OR question_stem LIKE '%}%'  -- Should return 0 rows
LIMIT 10;
```

If you see `{<}` or `{>}` in the database, that would indicate a bug in the preprocessing.

## Conclusion

✅ **No changes needed on the frontend**

The Python preprocessing handles all symbol conversion before storage, and the frontend's existing HTML escaping handles display correctly.






