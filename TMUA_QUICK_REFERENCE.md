# TMUA Question Writing - Quick Reference

## KaTeX Formatting (CRITICAL)

### Must-Do Rules
- ✅ **All options with math**: Wrap in `$...$` → `A: "$-4$"` not `A: -4`
- ✅ **Inline math**: `$x^2$` (single dollar signs)
- ✅ **Display math**: `$$x^2 + y^2 = r^2$$` (double dollar signs)
- ✅ **Double-escape backslashes**: `$\\frac{3}{2}$` not `$\frac{3}{2}$`
- ✅ **Solution/distractor math**: Wrap ALL math → `We solve $x^2 = 4$ to get $x = 2$`

### Never Do
- ❌ Use `\(...\)` or `\[...\]` delimiters
- ❌ Leave math unwrapped in options
- ❌ Single backslash in LaTeX commands
- ❌ Forget to wrap math in solutions/distractors

---

## Question Structure

```yaml
question:
  stem: > (1-5 lines, direct, no teaching tone)
  options:
    A: "$...$" (wrap math!)
    B: "$...$"
    # ... 4-8 options total (default 6)
  correct_option: A
solution:
  reasoning: > (clean solution, ~4-7 steps)
  key_insight: > (1-2 sentence hint, no answer)
distractor_map:
  A: (specific misconception, not "calculation error")
  B: (specific misconception)
  # ... ALL options must be explained
```

---

## TMUA Style Essentials

### Paper 1
- **Tests smart insight/trick** (not routine solving)
- **Short stem** (1-5 lines)
- **No calculator** (clean numbers, perfect squares)
- **~4-7 clean steps** once insight is spotted
- **6 options default** (A-F, can go to 8)

### Paper 2
- **Mathematical reasoning** (logic, proof, error-spotting)
- **No diagram dependency**
- **Inference-driven**, not computation-heavy

### Both
- ✅ One dominant idea only
- ✅ Realistic distractors (wrong reasoning paths)
- ✅ Calculator-free engineering
- ✅ Exactly one correct option
- ✅ No ambiguity

---

## Pre-Submit Checklist

- [ ] All math wrapped in `$...$` or `$$...$$`
- [ ] Double-escaped backslashes (`\\frac`)
- [ ] All options explained in distractor_map
- [ ] Tests insight/trick (not routine)
- [ ] Short, direct stem
- [ ] Clean numbers (no calculator needed)
- [ ] Valid YAML (2-space indent, quoted special chars)
- [ ] Exactly one correct option

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `A: -4` | `A: "$-4$"` |
| `$\frac{3}{2}$` | `$\\frac{3}{2}$` |
| `We solve x^2 = 4` | `We solve $x^2 = 4$` |
| "Calculation error" | "Wrong sign: forgot $x < 0$" |
| Missing distractor for option F | Add explanation for ALL options |

---

**Full guide**: See `TMUA_QUESTION_WRITING_GUIDE.md`



