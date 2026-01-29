# Roadmap Pipeline Documentation

## Overview

This document explains how the roadmap system maps actual exam structures to the Math 1/Math 2/Physics curriculum, how parts are organized, and how questions are filtered.

## Key Principles

1. **Library (Plan Page)**: Shows ALL papers and ALL parts from database - no filtering
2. **Roadmap**: Shows ONLY relevant parts based on Math 1/Math 2/Physics curriculum
3. **Database Matching**: Roadmap parts MUST use exact `part_letter` and `part_name` values from database
4. **Question Filtering**: Uses flexible matching (`includes`) but exact matches preferred

## Exam Structure vs. What We Practice

### NSAA (Natural Sciences Admissions Assessment)

#### 2016-2019 Structure
**What Exists:**
- Section 1: Mathematics, Physics, Chemistry, Biology, Advanced Mathematics and Advanced Physics
- Section 2: Physics / Chemistry / Biology (long questions)

**What We Do:**
- **Math 1**: Mathematics (Section 1, Part A)
- **Math 2**: Advanced Mathematics and Advanced Physics (Section 1, Part E)
- **Physics**: Physics (Section 1, Part B)
- ❌ **Ignore**: Chemistry, Biology, Section 2 entirely

**Roadmap Configuration:**
```typescript
{
  id: 'nsaa-2019',
  year: 2019,
  examName: 'NSAA',
  label: 'Core Practice',
  parts: [
    { partLetter: 'Part A', partName: 'Mathematics', paperName: 'Section 1', examType: 'Official' },
    { partLetter: 'Part B', partName: 'Physics', paperName: 'Section 1', examType: 'Official' },
    { partLetter: 'Part E', partName: 'Advanced Mathematics and Advanced Physics', paperName: 'Section 1', examType: 'Official' },
    // Section 2: No parts (shown as empty in UI)
  ]
}
```

#### 2020-2023 Structure
**What Exists:**
- Section 1: Mathematics (mandatory), Physics / Chemistry / Biology (choose one)
- Section 2: Physics / Chemistry / Biology (choose one)

**What We Do:**
- **Math 1**: Mathematics (Section 1, Part A)
- **Physics**: Physics (Section 1, Part B + Section 2, Part B)
- ❌ **No standalone Math 2** - Math 2 content is implicitly inside harder Maths + Physics questions

**Roadmap Configuration:**
```typescript
{
  id: 'nsaa-2023',
  year: 2023,
  examName: 'NSAA',
  label: 'Core Practice',
  parts: [
    { partLetter: 'Part A', partName: 'Mathematics', paperName: 'Section 1', examType: 'Official' },
    { partLetter: 'Part B', partName: 'Physics', paperName: 'Section 1', examType: 'Official' },
    { partLetter: 'Part B', partName: 'Physics', paperName: 'Section 2', examType: 'Official' },
  ]
}
```

### ENGAA (Engineering Admissions Assessment)

#### 2016-2018 Structure
**What Exists:**
- Section 1: Mathematics and Physics, Advanced Mathematics and Advanced Physics
- Section 2: Advanced Physics (grouped questions)

**What We Do:**
- **Math 1**: Mathematics (Section 1, Part A, first half - questions 1-20)
- **Math 2**: Advanced Mathematics (Section 1, Part A, second half - questions 21-40)
- **Physics**: Physics + Advanced Physics (Sections 1 & 2)
- ✅ **Nothing to ignore** - ENGAA is already aligned

**Roadmap Configuration:**
```typescript
{
  id: 'engaa-2017',
  year: 2017,
  examName: 'ENGAA',
  label: 'Advanced Practice',
  parts: [
    // Section 1: Part A split - Math 1 (first half)
    { 
      partLetter: 'Part A', 
      partName: 'Mathematics and Physics', 
      paperName: 'Section 1', 
      examType: 'Official',
      questionRange: { start: 1, end: 20 } // Math 1
    },
    // Section 1: Part A split - Math 2 (second half)
    { 
      partLetter: 'Part A', 
      partName: 'Mathematics and Physics', 
      paperName: 'Section 1', 
      examType: 'Official',
      questionRange: { start: 21, end: 40 } // Math 2
    },
    // Section 1: Part B (Advanced)
    { 
      partLetter: 'Part B', 
      partName: 'Advanced Mathematics and Advanced Physics', 
      paperName: 'Section 1', 
      examType: 'Official',
      questionFilter: [32, 35, 36, 37, 41, 50, 51, 54] // Specific questions
    },
    // Section 2: Part A (Physics)
    { 
      partLetter: 'Part A', 
      partName: 'Physics', 
      paperName: 'Section 2', 
      examType: 'Official' 
    },
  ]
}
```

#### 2019-2023 Structure
**What Exists:**
- Section 1: Mathematics and Physics, Advanced Mathematics and Advanced Physics
- Section 2: Advanced Physics

**What We Do:**
- **Math 1**: Mathematics (Section 1, Part A - extract Maths portion)
- **Math 2**: Advanced Mathematics (Section 1, Part B)
- **Physics**: Physics + Advanced Physics (Sections 1 & 2)
- ✅ **This is the cleanest exam for the combo**

**Roadmap Configuration:**
```typescript
{
  id: 'engaa-2023',
  year: 2023,
  examName: 'ENGAA',
  label: 'Advanced Practice',
  parts: [
    // Section 1: Part A (Mathematics and Physics) - extract Maths portion
    { 
      partLetter: 'Part A', 
      partName: 'Mathematics and Physics', 
      paperName: 'Section 1', 
      examType: 'Official' 
    },
    // Section 1: Part B (Advanced Mathematics and Advanced Physics)
    { 
      partLetter: 'Part B', 
      partName: 'Advanced Mathematics and Advanced Physics', 
      paperName: 'Section 1', 
      examType: 'Official' 
    },
    // Section 2: Part A (Physics)
    { 
      partLetter: 'Part A', 
      partName: 'Physics', 
      paperName: 'Section 2', 
      examType: 'Official' 
    },
  ]
}
```

### TMUA (Test of Mathematics for University Admission)

#### 2016-Present Structure
**What Exists:**
- Paper 1: Applications of Maths
- Paper 2: Mathematical Reasoning

**What We Do:**
- **Math 1**: Paper 1
- **Math 2**: Paper 2
- ❌ **No Physics at all**

**Roadmap Configuration:**
```typescript
// Generated dynamically from database
{
  id: 'tmua-2023-paper1',
  year: 2023,
  examName: 'TMUA',
  label: 'Advanced Practice',
  parts: [
    { partLetter: 'Paper 1', partName: 'Paper 1', paperName: 'Paper 1', examType: 'Official' }
  ]
}
```

## Part Mapping Logic

### Database Schema
Questions in the database have:
- `part_letter`: e.g., "Part A", "Part B", "Part E"
- `part_name`: e.g., "Mathematics", "Physics", "Advanced Mathematics and Advanced Physics"
- `paper_name`: e.g., "Section 1", "Section 2", "Paper 1", "Paper 2"
- `exam_type`: "Official" or "Specimen"

### Question Matching
When filtering questions for a roadmap part:
```typescript
const partMatches =
  (q.partLetter === part.partLetter || q.partLetter?.includes(part.partLetter)) &&
  (q.partName === part.partName || q.partName?.includes(part.partName));
```

This uses flexible matching to handle variations like "Part A" vs "A", but exact matches are preferred.

### Question Range Filtering
For parts with `questionRange` (ENGAA 2016-2018 Section 1 Part A split):
```typescript
if (part.questionRange) {
  const inRange = q.questionNumber >= part.questionRange.start && 
                 q.questionNumber <= part.questionRange.end;
  if (!inRange) return false;
}
```

### Question Filter (Specific Questions)
For parts with `questionFilter` (ENGAA Section 1 Part B):
```typescript
if (part.questionFilter && part.questionFilter.length > 0) {
  return part.questionFilter.includes(q.questionNumber);
}
```

## Section Organization in UI

### Hierarchical Display
Parts are grouped by `paperName` (Section 1, Section 2, Paper 1, Paper 2) in the roadmap UI:

```
NSAA 2019 Official
├── Section 1 >
│   ├── Part A: Mathematics
│   ├── Part B: Physics
│   └── Part E: Advanced Mathematics and Advanced Physics
└── Section 2 >
    └── No Parts from section 2 applicable
```

### Part Key Generation
For completion tracking, parts are identified by:
- Base key: `${paperName}-${partLetter}-${examType}`
- With range: `${paperName}-${partLetter}-${examType}-${start}-${end}` (for questionRange)

This ensures parts with the same letter/name but different ranges are tracked separately.

## Section Mapping

The `sectionMapping.ts` file maps database parts to UI sections:

- **NSAA Part A** → "Mathematics"
- **NSAA Part B** → "Physics"
- **NSAA Part E** → "Advanced Mathematics and Advanced Physics"
- **ENGAA Part A (Section 1)** → "Mathematics and Physics"
- **ENGAA Part B (Section 1)** → "Advanced Mathematics and Advanced Physics"
- **ENGAA Part A (Section 2)** → "Physics"
- **TMUA Paper 1** → "Paper 1"
- **TMUA Paper 2** → "Paper 2"

## Completion Tracking

Parts are tracked using part IDs generated by `partIdUtils.ts`:
- Format: `{ExamName}-{Year}-{Section}-{Part}`
- Example: `NSAA-2023-Section1-Mathematics`

For parts with question ranges, the range is included in the key to ensure uniqueness.

## Big Picture: Exam → Relevance

- **TMUA**: Pure Math 1 + Math 2 (no Physics)
- **ENGAA**: Best Math 1 + Math 2 + Physics alignment
- **NSAA Pre-2020**: Usable but messy (has Math 2 as separate part)
- **NSAA 2020+**: Maths + Physics only, no real Math 2 (Math 2 content implicit in harder questions)

## Database Matching Requirements

**CRITICAL**: Roadmap parts must use exact `part_letter` and `part_name` values from the database.

Common variations to watch for:
- "Part A" vs "A"
- "Mathematics" vs "Maths"
- "Advanced Mathematics and Advanced Physics" vs "Advanced Maths & Advanced Physics"
- "Section 1" vs "Section1" vs "S1"

The question matching uses flexible `includes()` matching, but exact matches are preferred for reliability.

## Files Involved

- `src/lib/papers/roadmapConfig.ts` - Roadmap stage definitions
- `src/components/papers/roadmap/StageListCard.tsx` - UI component with hierarchical grouping
- `src/app/papers/roadmap/page.tsx` - Question filtering logic
- `src/lib/papers/sectionMapping.ts` - Part to section mapping
- `src/lib/papers/partIdUtils.ts` - Part ID generation for completion tracking
- `src/app/papers/plan/page.tsx` - Library (shows all parts, no filtering)

