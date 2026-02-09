# TMUA Question Writing Guide

This guide explains how to format questions, write KaTeX math expressions, and maintain the authentic TMUA style when writing questions for the platform.

---

## Table of Contents

1. [Question Structure](#question-structure)
2. [KaTeX Formatting Rules](#katex-formatting-rules)
3. [TMUA Style Guidelines](#tmua-style-guidelines)
4. [Paper 1 vs Paper 2](#paper-1-vs-paper-2)
5. [Common Mistakes to Avoid](#common-mistakes-to-avoid)

---

## Question Structure

### Basic Format

Questions are stored in YAML format with the following structure:

```yaml
question:
  stem: >
    (The question text goes here)
  options:
    A: (Option A text)
    B: (Option B text)
    C: (Option C text)
    D: (Option D text)
    E: (Option E text)
    F: (Option F text)
    # Include G and H only if needed (4-8 options total)
  correct_option: A
solution:
  reasoning: >
    (Step-by-step solution explanation)
  key_insight: >
    (1-2 sentence hint that helps students start, but doesn't give the answer)
distractor_map:
  A: (Why this wrong answer is plausible - specific misconception)
  B: (Why this wrong answer is plausible)
  C: (Why this wrong answer is plausible)
  # ... etc for all options
```

### Key Fields Explained

- **`stem`**: The question text itself. Should be concise and direct.
- **`options`**: Multiple choice answers (A through H). Default to 6 options (A-F) unless you genuinely need more.
- **`correct_option`**: The letter of the correct answer.
- **`solution.reasoning`**: Complete solution showing the correct method. Keep it clean and concise - no teaching tone.
- **`solution.key_insight`**: A brief hint (1-2 sentences) that helps stuck students begin, but must NOT reveal the answer or correct option.
- **`distractor_map`**: **REQUIRED** - Must explain why each wrong option is plausible. Be specific about the misconception (e.g., "wrong sign handling" not "calculation error").

---

## KaTeX Formatting Rules

### Critical Rules

**The website uses KaTeX to render mathematical expressions. You MUST follow these rules exactly.**

### 1. Delimiters

- **Inline math**: Use `$...$` (single dollar signs)
  - ✅ `The value of $x$ is $5$`
  - ✅ `When $x > 0$, we have $f(x) = x^2$`
  
- **Display math** (math on its own line): Use `$$...$$` (double dollar signs)
  - ✅ `The equation is: $$x^2 + y^2 = r^2$$`
  - ✅ `We solve: $$x^2 - 4 = 0$$`

- **NEVER use** LaTeX-style delimiters:
  - ❌ `\(...\)` for inline math
  - ❌ `\[...\]` for display math

### 2. Options Must Be Wrapped

**ALL options containing ANY math must be wrapped in `$...$`:**

- ✅ `A: "$-4$"` (negative number - must wrap)
- ✅ `B: "$\\frac{3}{2}$"` (fraction - must wrap)
- ✅ `C: "$k > 4$"` (inequality - must wrap)
- ✅ `D: "$2$"` (even simple numbers - must wrap if they represent math)
- ✅ `E: "All of the above"` (pure text - no math, no wrapping needed)
- ❌ `A: -4` (numeric literal without $...$ - WILL FAIL)
- ❌ `B: "\\frac{3}{2}"` (no $...$ delimiters - WILL FAIL)

### 3. Solution and Distractor Map

**ALL mathematical content in solutions and distractor maps must be wrapped:**

- ✅ `We solve $x^2 - 4 = 0$ to get $x = \\pm 2$.`
- ✅ `This uses $f'(x)$ instead of $f(x)$.`
- ❌ `We solve x^2 - 4 = 0 to get x = ± 2.` (no $...$ - WILL FAIL)
- ❌ `This uses f'(x) instead of f(x).` (no $...$ - WILL FAIL)

### 4. LaTeX Commands

- **Double-escape all backslashes** in YAML:
  - ✅ `$\\frac{3}{2}$` (double backslash)
  - ✅ `$\\sqrt{x}$`
  - ✅ `$\\ge$` (greater than or equal)
  - ✅ `$\\implies$`
  - ❌ `$\frac{3}{2}$` (single backslash - will break)

### 5. Spacing Around Math

The system automatically adds spacing around math expressions, but you should be aware:

- Math expressions get spaces before/after them automatically
- Punctuation (`. , ! ? ; : ) ] }`) doesn't get space after math
- Example: `The value is $x$.` → "The value is $x$." (no space before period)

### 6. Display Math Formatting

When using display math (`$$...$$`), put it on its own line:

```yaml
stem: >
  Find all solutions to:
  
  $$x^2 - 5x + 6 = 0$$
  
  where $x > 0$.
```

---

## TMUA Style Guidelines

### Core Principles

TMUA questions are **NOT routine exercises**. They test **smart reasoning and insights**, not heavy computation.

### What Makes a Good TMUA Question

1. **Tests a clever insight or trick**
   - Students must recognize a pattern, simplification, or strategic approach
   - Examples: recognizing perfect squares, using symmetry, spotting when conditions simplify
   - NOT acceptable: routine "set up equation → solve step by step" without requiring insight

2. **Short and direct**
   - Stem typically 1-5 lines
   - No teaching commentary or hints in the stem
   - Neutral exam phrasing: "What is...", "Which...", "How many...", "Find the complete set of..."

3. **No calculator needed**
   - All numbers chosen so math simplifies cleanly
   - Quadratics factor nicely
   - Discriminants are perfect squares when needed
   - Trig angles lead to simple exact values
   - Log/indices substitutions land on clean quadratics

4. **Clean solution once insight is spotted**
   - Target: ~4-7 clean steps (slightly longer than ESAT, but still clean)
   - May include one careful case split or parameter condition
   - Avoid heavy algebra expansion or messy arithmetic

5. **Realistic distractors**
   - Each wrong option is the correct result of a plausible wrong method
   - Common wrong paths:
     - Wrong domain restriction
     - Wrong sign/absolute value handling
     - Wrong intersection counting
     - Wrong parameter boundary (strict vs inclusive)
     - Wrong midpoint/symmetry reasoning
     - Treating "two solutions" as "two real roots" without checking validity

### Paper 1 Specific

- **Pure mathematics** focus (minimal/no context)
- **Short, directive stem** (not story-like)
- **Standard A-level toolkit** (AS-level pure maths: MM1-MM8, plus basic stats/probability: M1-M7)
- **6 options default** (A-F), can go up to 8 (A-H) if genuinely needed
- Tests **smart reasoning** - spotting tricks/patterns rather than brute force

### Paper 2 Specific

- **Mathematical reasoning** focus (logic, proof, error-spotting)
- Often analyzes statements, necessity vs sufficiency, quantifiers, counterexamples
- **No diagram dependency** - fully solvable from text
- Difficulty comes from **inference and validity**, not heavy algebra
- Uses templates (e.g., "exactly one true", "error spotting", "necessary/sufficient conditions")

---

## Paper 1 vs Paper 2

### Paper 1: Applications of Mathematical Knowledge

- **Content**: Section 1 only (MM1-MM8, M1-M7)
- **Style**: Pure maths, short stems, direct questions
- **Focus**: Smart computational insights, pattern recognition
- **Example asks**: "What is...", "Find the value of...", "How many solutions..."

### Paper 2: Mathematical Reasoning

- **Content**: Section 1 + Section 2 (reasoning: Arg1-Arg4, Prf1-Prf5, Err1-Err2)
- **Style**: Logic/proof/argument analysis
- **Focus**: Inference, validity, logical reasoning
- **Example asks**: "Which statements are true?", "What is the first error?", "Which is necessary/sufficient?"

---

## Common Mistakes to Avoid

### KaTeX Formatting Mistakes

1. **Forgetting to wrap options in `$...$`**
   - ❌ `A: -4`
   - ✅ `A: "$-4$"`

2. **Using wrong delimiters**
   - ❌ `\(x\)` or `\[x\]`
   - ✅ `$x$` or `$$x$$`

3. **Single backslash in LaTeX commands**
   - ❌ `$\frac{3}{2}$`
   - ✅ `$\\frac{3}{2}$`

4. **Not wrapping math in solutions/distractors**
   - ❌ `We solve x^2 = 4 to get x = 2`
   - ✅ `We solve $x^2 = 4$ to get $x = 2$`

### Style Mistakes

1. **Routine mechanical problems**
   - ❌ "Solve this quadratic step by step" (no insight required)
   - ✅ "Recognize this perfect square form" (insight required)

2. **Too wordy or story-like**
   - ❌ Long contextual setup
   - ✅ Short, direct question

3. **Calculator-dependent numbers**
   - ❌ Messy decimals, ugly fractions
   - ✅ Clean integers, simple fractions, exact values

4. **Vague distractor descriptions**
   - ❌ "Calculation error"
   - ✅ "Wrong sign handling: forgot that $x < 0$ gives negative result"

5. **Missing distractor_map entries**
   - ❌ Only explaining some options
   - ✅ Must explain EVERY option (A through H if used)

### YAML Formatting Mistakes

1. **Special characters not quoted**
   - ❌ `E: False log law: $\log_3(...)$` (breaks YAML)
   - ✅ `E: "False log law: $\\log_3(...)$"` (quoted)

2. **Inequality symbols in text**
   - ❌ `A: x < 5` (breaks YAML)
   - ✅ `A: "$x < 5$"` (in math mode) or use wrappers `{<}`, `{>}` for text

3. **Incorrect indentation**
   - Use 2 spaces (not tabs, not 4 spaces)

---

## Quick Reference Checklist

Before submitting a question, verify:

- [ ] All options with math are wrapped in `$...$`
- [ ] Display math uses `$$...$$`, inline math uses `$...$`
- [ ] All LaTeX backslashes are double-escaped (`\\frac`, `\\sqrt`)
- [ ] Solution reasoning wraps all math in `$...$` or `$$...$$`
- [ ] Distractor map wraps all math in `$...$`
- [ ] Distractor map has entries for ALL options used
- [ ] Question tests a smart insight/trick, not routine solving
- [ ] Stem is short and direct (1-5 lines)
- [ ] All numbers are calculator-free (clean factoring, exact values)
- [ ] Solution is ~4-7 clean steps
- [ ] YAML is valid (proper indentation, quoted special characters)
- [ ] Exactly one correct option
- [ ] No ambiguity in wording or domains

---

## Examples

### Good Paper 1 Question

```yaml
question:
  stem: >
    For what values of $k$ does the equation $x^2 + kx + 4 = 0$ have exactly one real solution?
  options:
    A: "$k = 4$"
    B: "$k = -4$"
    C: "$k = \\pm 4$"
    D: "$k = 2$"
    E: "$k = -2$"
    F: "$k = \\pm 2$"
  correct_option: C
solution:
  reasoning: >
    For exactly one real solution, the discriminant must be zero: $\\Delta = k^2 - 16 = 0$.
    This gives $k^2 = 16$, so $k = \\pm 4$.
  key_insight: >
    Use the discriminant condition for equal roots.
distractor_map:
  A: "Only considered positive root, forgot negative solution"
  B: "Only considered negative root, forgot positive solution"
  C: "Correct: discriminant = 0 gives $k^2 = 16$"
  D: "Mistook coefficient relationship, used $k = 2$ instead of $k^2 = 16$"
  E: "Mistook coefficient relationship, used $k = -2$ instead of $k^2 = 16$"
  F: "Confused with $k^2 = 4$ instead of $k^2 = 16$"
```

**Why this is good:**
- Tests insight: recognizing discriminant condition
- Short, direct stem
- Clean numbers (perfect square discriminant)
- All options wrapped in `$...$`
- Specific distractor explanations
- ~3-4 step solution once insight is spotted

### Good Paper 2 Question

```yaml
question:
  stem: >
    Consider the statements:
    
    (I) If $n$ is even, then $n^2$ is even.
    (II) If $n^2$ is even, then $n$ is even.
    (III) $n$ is even if and only if $n^2$ is even.
    
    Which of the following is true?
  options:
    A: "Only (I) is true"
    B: "Only (II) is true"
    C: "Only (III) is true"
    D: "(I) and (II) are true, but (III) is false"
    E: "All three are true"
    F: "None are true"
  correct_option: E
solution:
  reasoning: >
    (I) is true: if $n = 2k$, then $n^2 = 4k^2 = 2(2k^2)$ is even.
    (II) is true: if $n^2$ is even and $n$ were odd, then $n = 2k+1$ gives $n^2 = 4k^2 + 4k + 1 = 2(2k^2 + 2k) + 1$, which is odd, contradiction.
    (III) is true: it combines (I) and (II) as a biconditional.
  key_insight: >
    Use direct proof for (I) and proof by contradiction for (II).
distractor_map:
  A: "Correctly identified (I) but missed that (II) is also true"
  B: "Correctly identified (II) but missed that (I) is also true"
  C: "Thought only the biconditional is true, missed that (I) and (II) individually are true"
  D: "Correctly identified (I) and (II) but incorrectly thought (III) is false (it's true as a biconditional)"
  E: "Correct: all three statements are true"
  F: "Incorrectly thought none are true"
```

**Why this is good:**
- Tests logical reasoning (Paper 2 focus)
- No diagram needed
- Clear structure with labeled statements
- All options explained
- Reasoning-driven, not computation-heavy

---

## Additional Resources

- **KaTeX Documentation**: https://katex.org/docs/supported.html
- **TMUA Official Specification**: Refer to curriculum documents for topic coverage
- **Reference Questions**: Study authentic TMUA past papers for style calibration

---

## Getting Help

If you're unsure about:
- **KaTeX syntax**: Check the examples above or test your math in a KaTeX renderer
- **Style questions**: Refer to authentic TMUA past papers
- **YAML formatting**: Use a YAML validator before submitting
- **Distractor quality**: Ask "What specific wrong reasoning leads to this answer?"

Remember: **When in doubt, look at authentic TMUA questions for reference!**



