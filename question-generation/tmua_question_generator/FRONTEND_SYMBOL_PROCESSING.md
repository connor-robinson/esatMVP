# Frontend Symbol Processing Guide

## Summary: No Special Processing Needed ✅

**The frontend does not need TMUA-specific symbol unwrapping.** Question text is stored as plain strings (from JSON), the same characters users should see.

1. **Inequalities and comparison symbols** (`<`, `>`, `<=`, `>=`) appear directly in prose when the model outputs them inside JSON string values.
2. **JSON** only requires escaping `"`, `\`, and control characters inside strings — not `<` or `#`.
3. **HTML escaping** in text segments (e.g. `<` → `&lt;`) is enough for safe display outside math.

## Data Flow (TMUA JSON pipeline)

```
Model outputs JSON → Python parses → string fields stored → frontend receives text → escape text, render `$...$` with KaTeX
```

## Frontend Code

The frontend typically:

1. Splits text and math segments
2. Escapes HTML in text segments
3. Renders math with KaTeX

## Conclusion

✅ **Rely on normal HTML escaping** for text and KaTeX for math.
