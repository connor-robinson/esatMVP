# Schema Structure Guide

## Overview

Schemas define the **thinking patterns** that questions should test. Each schema represents a specific cognitive approach or problem-solving strategy that appears in ESAT/ENGAA exams.

## File Location

Schemas are defined in: `scripts/esat_question_generator/1. Designer/Schemas.md`

## Current Structure

### Format

Each schema follows this exact format:

```markdown
## **{PREFIX}{NUMBER}. {Title}**

**Core thinking move**  
One sentence describing the key cognitive pattern.

**Seen in / context**

- Context example 1
- Context example 2
- Context example 3

**Possible wrong paths**

- Common mistake 1
- Common mistake 2
- Common mistake 3

**Notes for generation**

- Generation guideline 1
- Generation guideline 2

---
```

### Schema ID Rules

- **Prefix**: `M` for Mathematics, `P` for Physics
- **Number**: Sequential (1, 2, 3, ...)
- **Format**: `M1`, `M2`, ..., `M7`, `P1`, `P2`, ..., `P7`
- **Regex Pattern**: `^##\s+\*\*((?:M|P)\d+)\.\s*(.+?)\*\*\s*$`

### Current Schemas

**Mathematics (M1-M7):**
- M1: Hidden Proportionality / Scaling
- M2: Reverse Algebra / Structure Recognition
- M3: Functional Behaviour from Constraints
- M4: Geometry → Algebra / Coordinates
- M5: Trigonometric Bounds and Extremes
- M6: Counting and Summation via Structure
- M7: Implicit Constraints / Geometric Optimisation

**Physics (P1-P7):**
- P1: Model Selection (Forces vs Energy vs Momentum)
- P2: Scaling Laws and Dimensional Reasoning
- P3: Graph Interpretation as Physics
- P4: Series / Parallel Reasoning
- P5: Limiting Case Reasoning
- P6: Wave Phase and Path Difference
- P7: Equilibrium with Multiple Constraints

## Guidelines for Creating New Schemas

### 1. **Naming Convention**

- Use the next available number in sequence
- If adding M8, M9, etc., continue from M7
- If adding P8, P9, etc., continue from P7
- Title should be concise and descriptive (3-8 words)

**Example:**
```markdown
## **M8. Pattern Recognition in Sequences**
```

### 2. **Required Sections**

Each schema **must** include all four sections:

#### a) **Core thinking move**
- One clear sentence
- Describes the cognitive pattern, not the topic
- Should be actionable: "Recognise...", "Infer...", "Use..."

**Good:**
> "Recognise how a quantity scales with size and work backwards from a ratio or difference."

**Bad:**
> "This is about scaling." (too vague)
> "Students should understand proportionality." (not actionable)

#### b) **Seen in / context**
- Bullet list of 3-5 concrete examples
- Shows where this thinking pattern appears
- Mix of specific and general contexts

**Example:**
```markdown
- Similar geometric objects (area vs volume)
- Same material, different size (mass, density, pressure)
- Reshaped objects (e.g. wire → resistance)
- Abstract "quantity scales with x^n" reasoning
```

#### c) **Possible wrong paths**
- Bullet list of 3-5 common mistakes
- These become distractor options
- Should be plausible but incorrect

**Example:**
```markdown
- Assuming linear scaling by default
- Applying the correct power but in the wrong direction
- Confusing ratios with absolute differences
```

#### d) **Notes for generation**
- Bullet list of 2-4 guidelines for AI generation
- Technical constraints or requirements
- What makes a good question for this schema

**Example:**
```markdown
- One scaling law only
- Numbers should collapse naturally
- Wrong answers should correspond to different assumed powers
```

### 3. **Schema Philosophy**

Each schema should represent:
- ✅ A **thinking pattern**, not a topic
- ✅ A **cognitive move** that can be applied across contexts
- ✅ Something that appears in **real ESAT/ENGAA questions**
- ✅ A pattern that can be **recognised** rather than memorised

**Avoid:**
- ❌ Topic-based schemas (e.g., "Quadratic Equations")
- ❌ Too specific (e.g., "Completing the square for x^2 + 4x")
- ❌ Too vague (e.g., "Problem Solving")

### 4. **Placement in File**

- Mathematics schemas (M1-M7) come first
- Physics schemas (P1-P7) come after a separator
- Use `---` as a separator between schemas
- Add a section header before Physics: `# **Physics Schemas (ESAT / ENGAA)**`

### 5. **Integration with Curriculum**

The system automatically maps schemas to curriculum topics:

- **M schemas** → Can use Math 1 (M1-M7) or Math 2 (MM1-MM7) topics
- **P schemas** → Can only use Physics (P1-P7) topics

You don't need to specify this in the schema file—it's handled by `curriculum_parser.py`.

## Example: Adding a New Schema

Let's say you want to add **M8. Pattern Recognition in Sequences**:

```markdown
---

## **M8. Pattern Recognition in Sequences**

**Core thinking move**  
Identify underlying patterns or recurrences without explicit formulas.

**Seen in / context**

- Fibonacci-like sequences
- Recursive definitions
- Periodic patterns in sequences
- Sums that telescope naturally

**Possible wrong paths**

- Attempting to find explicit formulas
- Missing the recursive structure
- Counting terms incorrectly
- Assuming linear patterns

**Notes for generation**

- Pattern should be discoverable in 2-3 steps
- Avoid requiring memorised formulas
- Wrong answers should reflect common pattern misidentifications

---
```

## Testing Your Schema

After adding a schema:

1. **Verify parsing**: Run the generator and check it appears in logs
2. **Test generation**: Generate a few questions with the new schema
3. **Check curriculum mapping**: Ensure topics are correctly filtered
4. **Review output**: Make sure questions match the schema's intent

## Schema Selection

The system selects schemas using:
- `allow_schema_prefixes`: Which prefixes to include (default: `("M", "P")`)
- `schema_weights`: Optional weighting for specific schemas
- Random selection from available schemas matching the prefix

To generate only from specific schemas, set environment variable:
```bash
SCHEMA_PREFIXES="M"  # Math only
SCHEMA_PREFIXES="P"  # Physics only
SCHEMA_PREFIXES="M,P"  # Both (default)
```

## Best Practices

1. **Keep it focused**: One clear thinking pattern per schema
2. **Be specific**: "Recognise structure" not "Do algebra"
3. **Show, don't tell**: Use examples in "Seen in / context"
4. **Think like a student**: Wrong paths should be realistic mistakes
5. **Guide generation**: Notes should help AI create good questions
6. **Maintain consistency**: Follow the exact format of existing schemas

## Common Mistakes to Avoid

❌ **Too broad**: "Problem Solving" or "Algebra"
❌ **Too narrow**: "Completing the square for quadratics with leading coefficient 1"
❌ **Topic-based**: "Quadratic Equations" (should be a thinking pattern)
❌ **Missing sections**: All four sections are required
❌ **Wrong format**: Must match the exact markdown structure
❌ **Inconsistent numbering**: Use sequential numbers (M8, M9, etc.)

## Questions?

- Check existing schemas for examples
- Review `project.py` line 200-220 for parsing logic
- See `curriculum_parser.py` for topic mapping rules




























