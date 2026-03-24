# Schema Question Generation Targets

## Overview

Different subjects have different target question counts per schema, with specific difficulty distributions.

## Target Counts by Subject

### Mathematics (M) - 5 questions per schema
**Distribution:** Uses standard difficulty weights
- Default: Easy: 10%, Medium: 30%, Hard: 60%
- Can be adjusted via `difficulty_weights.txt`

### Physics (P) - 5 questions per schema
**Distribution:** Uses standard difficulty weights
- Default: Easy: 10%, Medium: 30%, Hard: 60%
- Can be adjusted via `difficulty_weights.txt`

### Chemistry (C) - 3 questions per schema
**Fixed Distribution:**
1. Hard
2. Hard
3. Medium

### Biology (B) - 2 questions per schema
**Fixed Distribution:**
1. Hard
2. Medium

## Implementation Details

### File: `simple_generator_ui.py`

#### `SchemaQueue.get_required_count(schema_id)`
Returns the target count based on schema prefix:
- `M` or `P` → 5
- `C` → 3
- `B` → 2

#### `GenerationController._choose_difficulty_for_schema(schema_id)`
Selects difficulty based on:
1. **Subject prefix** (M/P/B/C)
2. **Current progress** for that schema

**Logic:**
- **Chemistry (C):**
  - Questions 1-2: Hard
  - Question 3: Medium

- **Biology (B):**
  - Question 1: Hard
  - Question 2: Medium

- **Math & Physics (M/P):**
  - Uses weighted random selection from `difficulty_weights.txt`
  - Default: 10% Easy, 30% Medium, 60% Hard

## Example Generation Sequence

### Chemistry Schema C1
```
Attempt 1: Hard   → Success (1/3 complete)
Attempt 2: Hard   → Success (2/3 complete)
Attempt 3: Medium → Success (3/3 complete) ✓ Schema complete
```

### Biology Schema B1
```
Attempt 1: Hard   → Success (1/2 complete)
Attempt 2: Medium → Success (2/2 complete) ✓ Schema complete
```

### Math Schema M1
```
Attempt 1: Hard   → Success (1/5 complete)
Attempt 2: Medium → Success (2/5 complete)
Attempt 3: Hard   → Success (3/5 complete)
Attempt 4: Hard   → Success (4/5 complete)
Attempt 5: Medium → Success (5/5 complete) ✓ Schema complete
```

## Benefits

1. **Efficiency:** Biology and Chemistry schemas complete faster (fewer questions needed)
2. **Quality Focus:** B/C schemas prioritize hard questions
3. **Flexibility:** M/P schemas maintain dynamic difficulty distribution
4. **Scalability:** Different subjects can have different requirements

## Modifying Targets

To change the target counts or distributions:

1. **Target Counts:** Edit `get_required_count()` in `simple_generator_ui.py`
2. **M/P Difficulty Weights:** Edit `difficulty_weights.txt` file
3. **B/C Fixed Distributions:** Edit `_choose_difficulty_for_schema()` in `simple_generator_ui.py`

## Notes

- The system tracks progress per schema and automatically moves to the next incomplete schema
- Multiple generator instances can run in parallel without overlap (coverage refreshed from Supabase)
- Difficulty weights for M/P can be changed mid-run by editing `difficulty_weights.txt`

























