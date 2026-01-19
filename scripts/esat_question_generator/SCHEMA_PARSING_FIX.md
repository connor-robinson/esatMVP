# Schema Parsing Fix

## Issue
The schema parser only accepted numbered formats like `## **M1. Title**` or `## **P3. Title**`, but you wanted to use unnumbered formats like `## **M. Title**` or `## **P. Title**`.

## Fix Applied
Updated `parse_schemas_from_markdown()` in `project.py` to accept both formats:

- **Numbered format**: `## **M1. Title**` → schema_id: `M1`
- **Unnumbered format**: `## **M. Title**` → schema_id: `M_{sanitized_title}`

For unnumbered schemas, the schema_id is generated from the title (sanitized, lowercase, underscores instead of spaces). If multiple schemas have the same prefix and similar titles, a counter is appended.

## Example
```
## **P. Ideal Gas Law with Constant Conditions**
→ schema_id: `P_ideal_gas_law_with_constant`

## **M. Counting via Complementary Counting**
→ schema_id: `M_counting_via_complementary_counting`
```

## Usage
You can now use either format in `Schemas.md`:
- `## **M1. Pattern Recognition**` (numbered)
- `## **M. Pattern Recognition**` (unnumbered)

Both will be parsed correctly.

---

# Batch Rotation / Duplicate Prevention

## Current Behavior
**There is NO batch rotation or duplicate prevention.** 

The system uses **random selection**:
- Each question generation randomly selects a schema using `choose_schema()`
- The same schema can be selected multiple times in a batch
- There's no tracking of which schemas have been used

## How It Works
1. `generate_questions(n_questions)` generates until it has `n_questions` successful questions
2. Each attempt calls `run_once()` which calls `choose_schema()`
3. `choose_schema()` randomly picks from available schemas (optionally weighted)
4. No tracking of previous selections

## If You Want Duplicate Prevention
You would need to modify `choose_schema()` or `generate_questions()` to:
- Track which schemas have been used in the current batch
- Skip already-used schemas until all have been used
- Reset the tracking when starting a new batch

This is not currently implemented.



























