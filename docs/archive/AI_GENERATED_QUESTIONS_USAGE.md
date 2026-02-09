# AI Generated Questions Table Usage Guide

## Overview

The `ai_generated_questions` table stores all AI-generated questions for both ESAT (Engineering and Science Admissions Test) and TMUA (Test of Mathematics for University Admission) exams. This document explains how to properly filter and categorize questions based on the table structure.

## Table Structure

### Key Columns

- **`test_type`**: `'ESAT'` or `'TMUA'` - The primary classification
- **`schema_id`**: Text identifier with subject prefix (e.g., `MATH1-001`, `PHYS-002`, `CHEM-003`, `BIO-004`, `M_001`, `R_001`)
- **`paper`**: Paper classification
  - For ESAT: `'Math 1'` or `'Math 2'` (only for mathematics questions)
  - For TMUA: `'Paper1'` or `'Paper2'`
  - `NULL` for ESAT non-math questions (Physics, Chemistry, Biology)

## Question Classification Hierarchy

When filtering or categorizing questions, follow this hierarchy:

### Step 1: Check `test_type` Column

First, determine if the question is **ESAT** or **TMUA**:

```sql
-- ESAT questions
WHERE test_type = 'ESAT' OR test_type IS NULL

-- TMUA questions
WHERE test_type = 'TMUA'
```

### Step 2a: If TMUA - Use `paper` Column

For TMUA questions, use the `paper` column to determine the paper:

- **TMUA Paper 1**: `test_type = 'TMUA' AND paper = 'Paper1'`
- **TMUA Paper 2**: `test_type = 'TMUA' AND paper = 'Paper2'`

**Note**: TMUA questions may also have `schema_id` patterns:
- Paper 1: `schema_id` starts with `M_` (e.g., `M_001`)
- Paper 2: `schema_id` starts with `R_` (e.g., `R_001`)

### Step 2b: If ESAT - Check `schema_id` First Character

For ESAT questions, examine the **first character** of `schema_id` to determine the subject:

#### Physics
- `schema_id` starts with `P` (e.g., `PHYS-001`, `P001`)
- `paper` is typically `NULL`

#### Chemistry
- `schema_id` starts with `C` (e.g., `CHEM-001`, `C001`)
- `paper` is typically `NULL`

#### Biology
- `schema_id` starts with `B` (e.g., `BIO-001`, `B001`)
- `paper` is typically `NULL`

#### Mathematics
- `schema_id` starts with `M` (e.g., `MATH1-001`, `MATH2-002`, `M1`, `M2`)
- **Then** check the `paper` column to determine:
  - **Math 1**: `paper = 'Math 1'`
  - **Math 2**: `paper = 'Math 2'`

## Filtering Examples

### Example 1: Get all ESAT Physics questions

```sql
SELECT * FROM ai_generated_questions
WHERE (test_type = 'ESAT' OR test_type IS NULL)
  AND schema_id LIKE 'P%';
```

### Example 2: Get all ESAT Math 1 questions

```sql
SELECT * FROM ai_generated_questions
WHERE (test_type = 'ESAT' OR test_type IS NULL)
  AND schema_id LIKE 'M%'
  AND paper = 'Math 1';
```

### Example 3: Get all TMUA Paper 1 questions

```sql
SELECT * FROM ai_generated_questions
WHERE test_type = 'TMUA'
  AND paper = 'Paper1';
```

### Example 4: Get all ESAT Chemistry questions

```sql
SELECT * FROM ai_generated_questions
WHERE (test_type = 'ESAT' OR test_type IS NULL)
  AND schema_id LIKE 'C%';
```

### Example 5: Get all ESAT Biology questions

```sql
SELECT * FROM ai_generated_questions
WHERE (test_type = 'ESAT' OR test_type IS NULL)
  AND schema_id LIKE 'B%';
```

## Implementation Notes

### Why This Hierarchy?

1. **`test_type` first**: This is the most fundamental classification (ESAT vs TMUA)
2. **`schema_id` for ESAT subjects**: Physics, Chemistry, and Biology questions don't have a `paper` value, so we must use `schema_id` prefix
3. **`paper` for ESAT Math**: Math questions have both `schema_id` starting with `M` AND a `paper` value (`Math 1` or `Math 2`)
4. **`paper` for TMUA**: TMUA questions are classified by paper number

### Common Pitfalls

1. **Don't rely solely on `paper` for ESAT**: Physics, Chemistry, and Biology have `paper = NULL`
2. **Don't assume all `M` prefixes are Math**: TMUA Paper 1 also uses `M_` prefix, but `test_type = 'TMUA'` distinguishes them
3. **Always check `test_type` first**: This prevents mixing ESAT and TMUA questions

## API Filtering Logic

When implementing filters in API routes, follow this pattern:

```typescript
// 1. Filter by test_type
if (paperType === 'ESAT' || paperType === 'All') {
  query = query.or('test_type.eq.ESAT,test_type.is.null');
} else if (paperType === 'TMUA') {
  query = query.eq('test_type', 'TMUA');
}

// 2. For ESAT, filter by schema_id prefix
if (subject === 'Physics') {
  query = query.ilike('schema_id', 'P%');
} else if (subject === 'Chemistry') {
  query = query.ilike('schema_id', 'C%');
} else if (subject === 'Biology') {
  query = query.ilike('schema_id', 'B%');
} else if (subject === 'Math 1') {
  query = query.ilike('schema_id', 'M%').eq('paper', 'Math 1');
} else if (subject === 'Math 2') {
  query = query.ilike('schema_id', 'M%').eq('paper', 'Math 2');
}

// 3. For TMUA, filter by paper
if (subject === 'TMUA Paper 1') {
  query = query.eq('paper', 'Paper1');
} else if (subject === 'TMUA Paper 2') {
  query = query.eq('paper', 'Paper2');
}
```

## Summary

| Test Type | Subject Detection | Paper Column Usage |
|-----------|------------------|-------------------|
| **ESAT** | `schema_id` first char: `P`=Physics, `C`=Chemistry, `B`=Biology, `M`=Math | Math only: `'Math 1'` or `'Math 2'` |
| **TMUA** | N/A | Always: `'Paper1'` or `'Paper2'` |



