# Schema IDs vs Curriculum Tags: Naming Convention Guide

## Overview

This document explains the critical distinction between **Schema IDs** (used during question generation) and **Curriculum Tags** (used for categorizing questions by ESAT curriculum topics). These two systems use different naming conventions to avoid confusion.

---

## Schema IDs

**Purpose**: Schema IDs are used by the **Designer AI agent** to select which thinking pattern/schema should be used when generating a question.

**Format**: 
- Mathematics: `M1`, `M2`, `M3`, `M4`, `M5`, `M6`, `M7`
- Physics: `P1`, `P2`, `P3`, `P4`, `P5`, `P6`, `P7`

**Where they're used**:
- In `1. Designer/Schemas.md` - defines the thinking patterns
- In `project.py` - passed to Designer to select schema
- In `db_sync.py` - stored in `schema_id` column in database
- In question generation pipeline - determines which schema to use

**Example**: A question generated with schema `M4` means it was designed using the "Reverse Algebra / Structure Recognition" thinking pattern.

**Important**: Schema IDs are **NOT** curriculum tags. They describe *how* the question was generated, not *what* curriculum topic it covers.

---

## Curriculum Tags

**Purpose**: Curriculum tags identify which ESAT curriculum topic(s) a question covers. These are assigned by the **Tag Labeler AI agent** after question generation.

**Format** (prefixed to avoid confusion with schema IDs):
- **Math 1 topics**: `M1-M1`, `M1-M2`, `M1-M3`, `M1-M4`, `M1-M5`, `M1-M6`, `M1-M7`
- **Math 2 topics**: `M2-MM1`, `M2-MM2`, `M2-MM3`, `M2-MM4`, `M2-MM5`, `M2-MM6`, `M2-MM7`
- **Physics topics**: `P-P1`, `P-P2`, `P-P3`, `P-P4`, `P-P5`, `P-P6`, `P-P7`

**Where they're used**:
- In `curriculum/ESAT_CURRICULUM.json` - defines the official ESAT curriculum
- In `curriculum_parser.py` - provides prefixed codes via `get_available_topics_for_schema()`
- In `6. Tag Labeler/Prompt.md` - instructs AI to use prefixed format
- In database - stored in `primary_tag` and `secondary_tags` columns
- In review interface - for filtering and sorting questions

**Example**: A question with curriculum tag `M1-M4` means it covers the Math 1 "Algebra" topic. A question with `M2-MM7` means it covers Math 2 "Differentiation and integration".

**Important**: Curriculum tags use **prefixed format** to distinguish them from schema IDs. Always use the prefixed format (e.g., `M1-M4`, not `M4`).

---

## Why the Distinction Matters

### Problem Before Prefixed Tags

Previously, there was confusion because:
- Schema ID `M1` (thinking pattern) looked identical to curriculum tag `M1` (Math 1 Units topic)
- Schema ID `P1` (thinking pattern) looked identical to curriculum tag `P1` (Physics Electricity topic)

This made it unclear whether `M1` referred to:
- The schema used during generation?
- The curriculum topic the question covers?

### Solution: Prefixed Curriculum Tags

By prefixing curriculum tags:
- Schema IDs remain: `M1`, `M2`, `P1`, `P2`, etc. (unchanged)
- Curriculum tags become: `M1-M1`, `M1-M2`, `M2-MM1`, `P-P1`, `P-P2`, etc. (prefixed)

Now it's clear:
- `M1` = Schema ID (thinking pattern)
- `M1-M1` = Curriculum tag (Math 1 Units topic)
- `M2-MM1` = Curriculum tag (Math 2 Algebra and functions topic)

---

## Mapping Between Systems

### Mathematics Schemas

When a question is generated with a Mathematics schema (M1-M7), the Tag Labeler can assign tags from **either** Math 1 or Math 2, as they are interchangeable:

**Schema M1** can map to:
- Curriculum tag `M1-M1` (Math 1: Units) OR
- Curriculum tag `M2-MM1` (Math 2: Algebra and functions)

**Schema M2** can map to:
- Curriculum tag `M1-M2` (Math 1: Number) OR
- Curriculum tag `M2-MM2` (Math 2: Coordinate geometry)

...and so on for M3-M7.

The Tag Labeler AI chooses based on which curriculum better matches the question's mathematical sophistication.

### Physics Schemas

When a question is generated with a Physics schema (P1-P7), the Tag Labeler can only assign Physics curriculum tags:

**Schema P1** → Curriculum tag `P-P1` (Electricity)
**Schema P2** → Curriculum tag `P-P2` (Magnetism)
**Schema P3** → Curriculum tag `P-P3` (Mechanics)
...and so on for P4-P7.

---

## Code Implementation

### Getting Available Topics for a Schema

```python
from curriculum_parser import CurriculumParser

parser = CurriculumParser()
available_topics = parser.get_available_topics_for_schema("M1")

# Returns topics with prefixed codes:
# [
#   {"code": "M1-M1", "title": "Units", "paper_name": "Mathematics 1", ...},
#   {"code": "M1-M2", "title": "Number", "paper_name": "Mathematics 1", ...},
#   {"code": "M2-MM1", "title": "Algebra and functions", "paper_name": "Mathematics 2", ...},
#   ...
# ]
```

### Normalizing Topic Codes

```python
# Convert raw code to prefixed format
prefixed = parser.normalize_topic_code("M1")  # Returns "M1-M1"
prefixed = parser.normalize_topic_code("MM1")  # Returns "M2-MM1"
prefixed = parser.normalize_topic_code("P1")   # Returns "P-P1"

# Already prefixed codes are returned as-is
prefixed = parser.normalize_topic_code("M1-M1")  # Returns "M1-M1"
```

### Validating Topic Codes

```python
# Accepts both raw and prefixed codes
parser.validate_topic_code("M1")     # True (raw)
parser.validate_topic_code("M1-M1") # True (prefixed)
parser.validate_topic_code("M2-MM1") # True (prefixed)
parser.validate_topic_code("P-P1")   # True (prefixed)
```

---

## Database Schema

### Schema ID Column
- **Column**: `schema_id` (text)
- **Format**: `M1`, `M2`, `M3`, `M4`, `M5`, `M6`, `M7`, `P1`, `P2`, `P3`, `P4`, `P5`, `P6`, `P7`
- **Purpose**: Records which schema was used during generation

### Curriculum Tag Columns
- **Column**: `primary_tag` (text)
- **Column**: `secondary_tags` (text[])
- **Format**: Prefixed codes like `M1-M1`, `M2-MM1`, `P-P1`, etc.
- **Purpose**: Records which curriculum topics the question covers

---

## For Future AI Agents

**CRITICAL RULES**:

1. **Schema IDs** (`M1-M7`, `P1-P7`) are used ONLY during question generation by the Designer agent. They are stored in the `schema_id` column.

2. **Curriculum Tags** (`M1-M1`, `M2-MM1`, `P-P1`, etc.) are used ONLY for categorizing questions by curriculum topic. They are stored in `primary_tag` and `secondary_tags` columns.

3. **NEVER** use raw topic codes (like `M1`, `MM1`, `P1`) as curriculum tags. Always use prefixed format (`M1-M1`, `M2-MM1`, `P-P1`).

4. When writing code that handles curriculum tags:
   - Use `curriculum_parser.get_available_topics_for_schema()` to get available topics (already prefixed)
   - Use `curriculum_parser.normalize_topic_code()` to convert raw codes to prefixed format
   - Use `curriculum_parser.validate_topic_code()` to validate (accepts both formats)

5. When updating the Tag Labeler prompt or any AI agent that assigns curriculum tags:
   - Always instruct it to use prefixed format
   - Provide examples showing prefixed format
   - Emphasize the distinction from schema IDs

---

## Migration Notes

If you need to update existing questions in the database that use raw codes:

1. Use `curriculum_parser.normalize_topic_code()` to convert raw codes to prefixed format
2. Update both `primary_tag` and `secondary_tags` columns
3. See `migrate_tags_to_prefixed.py` for a migration script

---

## Summary

| Aspect | Schema IDs | Curriculum Tags |
|--------|------------|-----------------|
| **Purpose** | Select thinking pattern during generation | Categorize by curriculum topic |
| **Format** | `M1`, `M2`, `P1`, `P2` | `M1-M1`, `M2-MM1`, `P-P1` |
| **Assigned by** | Designer AI (during generation) | Tag Labeler AI (after generation) |
| **Database column** | `schema_id` | `primary_tag`, `secondary_tags` |
| **Can change?** | No (fixed at generation time) | Yes (can be updated during review) |

**Remember**: Schema IDs describe *how* a question was generated. Curriculum tags describe *what* curriculum topic it covers.

























