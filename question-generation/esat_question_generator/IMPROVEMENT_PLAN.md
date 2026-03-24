# AI Question Improvement Plan

## Problems Identified

### 1. KaTeX Formatting Issues
- Double backslashes (`\\\\`) stored correctly in DB, but some expressions may be malformed
- Inconsistent spacing around math delimiters
- Some LaTeX commands may be incorrect or missing
- Potential issues with nested expressions or special characters

### 2. AI-Sounding Language
- Overly formal: "We are given", "We iterate step by step"
- Too explicit: "First, find... Next, check..."
- Overly detailed step-by-step breakdowns
- Missing the concise, direct style of real exam solutions
- Solutions read like tutorials rather than exam mark schemes

---

## Solution Options

### **Option 1: Post-Processing Pipeline (RECOMMENDED)**
**Pros:**
- Fast: Can process all 672 questions in batch
- Non-destructive: Keep originals, create improved versions
- Targeted fixes: Address specific issues systematically
- Cost-effective: Single pass through all questions

**Cons:**
- May not catch all edge cases
- Requires good detection logic

**Implementation:**
1. **KaTeX Fixer Module**
   - Validate all math expressions
   - Fix common formatting errors
   - Normalize spacing around delimiters
   - Test rendering with actual KaTeX

2. **Language Humanizer Module**
   - Rewrite overly formal phrases
   - Condense verbose explanations
   - Remove AI-typical transitions
   - Make solutions more concise and direct

3. **Batch Processor**
   - Process all questions
   - Create backup before changes
   - Update database with fixes
   - Generate report of changes

---

### **Option 2: Regenerate with Better Prompts**
**Pros:**
- Addresses root cause
- Can improve future generations too
- More comprehensive fix

**Cons:**
- Expensive: 672 questions × API costs
- Time-consuming: Full regeneration cycle
- May introduce new issues
- Loses any manual improvements made

**Implementation:**
1. **Update Prompts**
   - Add "human-like solution style" guidelines
   - Include examples of good vs bad solutions
   - Emphasize conciseness and directness
   - Add KaTeX validation requirements

2. **Add Solution Style Guide**
   - Show examples from real exam papers
   - Define "exam mark scheme" style
   - Prohibit AI-typical phrases

3. **Regenerate All Questions**
   - Use improved prompts
   - Validate KaTeX during generation
   - Review sample before full run

---

### **Option 3: Hybrid Approach (BEST)**
**Pros:**
- Fixes KaTeX immediately (automated)
- Improves language with targeted rewrites
- Updates prompts for future generations
- Most comprehensive solution

**Cons:**
- Most work upfront
- Requires both automated fixes and prompt updates

**Implementation:**
1. **Phase 1: Fix KaTeX (Automated)**
   - Build KaTeX validator/fixer
   - Process all 672 questions
   - Fix formatting issues
   - Validate rendering

2. **Phase 2: Humanize Language (AI-Assisted)**
   - Create "humanizer" prompt
   - Process solutions through AI with style guide
   - Focus on making language more natural
   - Keep mathematical correctness

3. **Phase 3: Update Generation Prompts**
   - Add solution style guidelines
   - Include examples
   - Add KaTeX validation step
   - Test on new questions

---

## Recommended Implementation: Hybrid Approach

### Phase 1: KaTeX Fixer (Week 1)

**Create `fix_katex_batch.py`:**
```python
# Pseudo-code structure
1. Connect to Supabase
2. Fetch all questions
3. For each question:
   - Validate KaTeX in question_stem
   - Validate KaTeX in all options
   - Validate KaTeX in solution_reasoning
   - Validate KaTeX in solution_key_insight
   - Fix common issues:
     * Normalize backslashes
     * Fix spacing around delimiters
     * Correct malformed commands
     * Test rendering
4. Update database
5. Generate report
```

**Common Fixes:**
- `\\\\frac` → `\frac` (after JSON parsing)
- Add missing spaces: `text$x$text` → `text $x$ text`
- Fix unmatched delimiters
- Correct nested expressions
- Validate with actual KaTeX renderer

---

### Phase 2: Language Humanizer (Week 2)

**Create `humanize_solutions.py`:**
```python
# Pseudo-code structure
1. Connect to Supabase
2. Fetch all questions with solutions
3. For each question:
   - Send to AI with humanization prompt
   - Request: Rewrite solution to be more concise, direct, exam-style
   - Keep all math correct
   - Maintain key insights
4. Update solution_reasoning and solution_key_insight
5. Generate report
```

**Humanization Prompt Template:**
```
You are rewriting an AI-generated exam solution to sound more human and exam-like.

Original solution:
{solution_reasoning}

Requirements:
- Remove overly formal phrases: "We are given", "We iterate", "First, find", "Next, check"
- Make it more concise and direct
- Use exam mark scheme style: brief, clear, no unnecessary words
- Keep all mathematical content exactly correct
- Preserve all LaTeX/KaTeX formatting
- Maintain the key insight

Rewrite the solution to be more natural and exam-appropriate.
```

**Example Transformations:**
- ❌ "We are given $f(1) = 1$ and the recursive formula..."
- ✅ "Given $f(1) = 1$ and $f(2x) = 2f(x) + x$..."

- ❌ "We iterate step by step to find the value at $x=16$: 1. Substitute $x=1$: $f(2) = 2f(1) + 1 = 2(1) + 1 = 3$. 2. Substitute $x=2$:..."
- ✅ "Iterating: $f(2) = 2(1) + 1 = 3$, $f(4) = 2(3) + 2 = 8$, $f(8) = 2(8) + 4 = 20$, so $f(16) = 2(20) + 8 = 48$."

- ❌ "First, find the stationary points by differentiating: $$f'(x) = 3x^2 - 12x + 9$$ Next, check which points lie in the domain..."
- ✅ "Differentiating: $f'(x) = 3x^2 - 12x + 9 = 3(x-1)(x-3)$. Stationary points at $x=1,3$; only $x=3$ is in domain $x \ge 2$..."

---

### Phase 3: Update Generation Prompts (Week 3)

**Update `Math Implementer.md`:**
Add section on solution style:

```markdown
## Solution Style Requirements

Your solution must:
- Be concise and direct (exam mark scheme style)
- Avoid AI-typical phrases: "We are given", "We iterate", "First, find", "Next, check"
- Use brief, clear statements
- Show work without unnecessary transitions
- Sound like a real examiner wrote it, not an AI tutor

Good example:
"Differentiating: $f'(x) = 3x^2 - 12x + 9 = 3(x-1)(x-3)$. Stationary points at $x=1,3$; only $x=3$ is in domain $x \ge 2$. Evaluating: $f(2) = 12$, $f(3) = 10$. Since $f(x) \to \infty$ as $x \to \infty$, range is $f(x) \ge 10$."

Bad example:
"We are given the function $f(x) = x^3 - 6x^2 + 9x + 10$ for the domain $x \ge 2$. First, we find the stationary points by differentiating. Next, we check which points lie in the domain..."
```

**Add KaTeX Validation Step:**
```markdown
## KaTeX Formatting Requirements

- Use `$...$` for inline math, `$$...$$` for display math
- Ensure proper spacing around delimiters
- Test all expressions render correctly
- Avoid nested dollar signs
- Use proper LaTeX commands (e.g., `\frac`, not `/`)
```

---

## Implementation Priority

### High Priority (Do First)
1. ✅ **KaTeX Fixer** - Fixes rendering issues immediately
2. ✅ **Language Humanizer** - Makes solutions usable

### Medium Priority
3. ⚠️ **Update Prompts** - Prevents future issues

### Low Priority
4. 📝 **Monitoring** - Track quality of new questions

---

## Cost Estimation

### Option 1: Post-Processing Only
- KaTeX Fixer: ~$0 (local processing)
- Language Humanizer: ~$5-10 (AI API for 672 questions)
- **Total: ~$5-10**

### Option 2: Full Regeneration
- 672 questions × ~$0.01-0.02 per question = **~$7-13**
- Plus time for review

### Option 3: Hybrid
- KaTeX Fixer: ~$0
- Language Humanizer: ~$5-10
- Prompt updates: ~$0
- **Total: ~$5-10** (same as Option 1, but better long-term)

---

## Recommended Next Steps

1. **Start with KaTeX Fixer** (can do immediately)
   - Use existing `katex_validator.py` as base
   - Add batch processing
   - Test on sample questions first

2. **Then Language Humanizer** (requires API key)
   - Create humanization prompt
   - Test on 10-20 questions first
   - Review results before full batch

3. **Finally Update Prompts** (for future)
   - Update `Math Implementer.md`
   - Update `Style_checker.md` to catch AI language
   - Test on new question generation

---

## Success Metrics

- **KaTeX**: 100% of questions render without errors
- **Language**: Solutions read like exam mark schemes, not AI tutorials
- **Time**: Solutions are 30-50% shorter (more concise)
- **Quality**: Human reviewers can't tell they were AI-generated

---

## Files to Create/Modify

### New Files
- `scripts/esat_question_generator/fix_katex_batch.py`
- `scripts/esat_question_generator/humanize_solutions.py`
- `scripts/esat_question_generator/solution_style_guide.md`

### Modified Files
- `scripts/esat_question_generator/by_subject_prompts/Maths/Math Implementer.md`
- `scripts/esat_question_generator/by_subject_prompts/Style_checker.md`

---

## Questions to Consider

1. **Should we keep original solutions?**
   - Add `solution_reasoning_original` column?
   - Or just overwrite?

2. **How to handle review status?**
   - Reset to `pending_review` after changes?
   - Or mark as `needs_revision`?

3. **Validation before update?**
   - Test rendering in browser?
   - Or just validate KaTeX syntax?

4. **Rollback plan?**
   - Keep backup of original data?
   - How to restore if issues found?






















