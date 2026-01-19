# TMUA Schema Tracking

## ✅ Current Status
**TMUA papers are now EXCLUSIVELY included in the question pool.** All other papers (ENGAA/NSAA) are filtered out. TMUA schemas are saved to a separate file: `Schemas_TMUA.md`

## Overview
Schemas from TMUA (Test of Mathematics for University Admission) papers are automatically tracked and labeled with clear paper type indicators.

## Paper Type Labeling
- **Paper 1 (M prefix)**: Mathematical Knowledge - pure maths, algebra, calculus, geometry, etc.
- **Paper 2 (R prefix)**: Mathematical Reasoning - logical reasoning, problem-solving strategies, etc.

Schemas are clearly labeled in the "Notes for generation" section:
- Paper 1 schemas: "- From TMUA Paper 1 (Mathematical Knowledge)"
- Paper 2 schemas: "- From TMUA Paper 2 (Mathematical Reasoning)"

## How It Works

### 1. **Detection**
- When a candidate schema is generated, the system checks if any evidence question IDs contain "TMUA"
- Example evidence IDs: `["TMUA_Paper1_2021_Q5", "ENGAA_Section1_2020_Q3"]`
- If any evidence contains "TMUA", the schema is marked as TMUA-inspired

### 2. **Labeling in Schemas_TMUA.md**
- All TMUA schemas are saved to a **separate file**: `Schemas_TMUA.md` (not the main Schemas.md)
- Schemas automatically include a clear note in the **"Notes for generation"** section indicating paper type:
  - Paper 1: `"- From TMUA Paper 1 (Mathematical Knowledge)"`
  - Paper 2: `"- From TMUA Paper 2 (Mathematical Reasoning)"`
- This appears as the last bullet point in the Notes section

### 3. **Metadata Storage**
- TMUA status is stored in `_cache/schemas_meta.json`
- Each schema entry includes: `"has_tmua_evidence": true` or `false`
- Example:
  ```json
  {
    "M42": {
      "edits_count": 0,
      "locked": false,
      "has_tmua_evidence": true
    }
  }
  ```

### 4. **Decision Logs**
- All decision logs in `_logs/schema_decisions.jsonl` include `"has_tmua_evidence": true/false`
- This allows you to track which schemas were accepted/rejected and their TMUA status

## How to Use This Information

### Find TMUA Schemas
1. All TMUA schemas are in `Schemas_TMUA.md` (separate from main Schemas.md)
2. Search for "TMUA" or "tmua" in Schemas_TMUA.md
3. Look in the "Notes for generation" section of each schema for paper type labels

### Find TMUA Schemas via Metadata
1. Open `scripts/schema_generator/_cache/schemas_meta.json`
2. Search for `"has_tmua_evidence": true`
3. The schema ID (e.g., "M42") tells you which schema it is

### Find TMUA Schemas via Decision Logs
1. Open `scripts/schema_generator/_logs/schema_decisions.jsonl`
2. Search for `"has_tmua_evidence": true`
3. Check the `"assigned_schema_id"` field to see which schema was created

## Examples

### Paper 1 (Mathematical Knowledge) - M prefix:
```markdown
## **M42. Exploit symmetry in algebraic structures**

**Core thinking move**
Identify symmetric patterns in equations to simplify or transform them.

**Seen in / context**
- Equations with symmetric coefficients
- Polynomials with even/odd symmetry
- Systems with interchangeable variables

**Possible wrong paths**
- Missing symmetry patterns
- Over-complicating symmetric cases

**Notes for generation**
- Focus on recognizing symmetry early
- Use symmetry to reduce problem complexity
- From TMUA Paper 1 (Mathematical Knowledge)
```

### Paper 2 (Mathematical Reasoning) - R prefix:
```markdown
## **R15. Identify logical structure in problem statements**

**Core thinking move**
Extract the underlying logical framework from word problems to guide solution approach.

**Seen in / context**
- Problems with conditional statements
- Multi-step reasoning chains
- Problems requiring assumption identification

**Possible wrong paths**
- Jumping to conclusions without logical steps
- Missing intermediate reasoning steps

**Notes for generation**
- Break down complex statements into logical components
- Verify each step before proceeding
- From TMUA Paper 2 (Mathematical Reasoning)
```

The metadata would show:
```json
{
  "M42": {
    "edits_count": 0,
    "locked": false,
    "has_tmua_evidence": true
  }
}
```

## Notes
- **Current status**: ONLY TMUA papers are included in indexing (all other papers filtered out)
- TMUA schemas are saved to `Schemas_TMUA.md` (separate from main `Schemas.md`)
- Paper type is automatically detected from question IDs:
  - Questions with "TMUA_Paper1" or "TMUA Paper 1" → M prefix (Mathematical Knowledge)
  - Questions with "TMUA_Paper2" or "TMUA Paper 2" → R prefix (Mathematical Reasoning)
- The system automatically switches to `Schemas_TMUA.md` when TMUA questions are detected
- Paper type labels are automatically added to the "Notes for generation" section
- You can filter or search for TMUA schemas using any of the methods above
- To switch back to ENGAA/NSAA, you'll need to modify the filtering code


























