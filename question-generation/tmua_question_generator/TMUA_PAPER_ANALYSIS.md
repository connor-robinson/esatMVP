# TMUA Paper 1 vs Paper 2: How to Differentiate Questions

## Confirmation: Paper Labeling Status

**PARTIALLY TRUE**: According to the database schema and code analysis:

1. **Database has `paper` field**: The migration `20250115000000_add_tmua_fields_complete.sql` shows:
   - `paper` column accepts `'Paper1'` or `'Paper2'` for TMUA
   - `test_type` column distinguishes `'ESAT'` vs `'TMUA'`

2. **However**: The `paper` field may not always be explicitly populated in the database:
   - `build_bank_item()` (project.py line 2595) does NOT set a top-level `paper` field
   - Paper info is stored in `idea_plan.paper` within the JSON structure
   - When saving to database, `paper` must be extracted from `idea_plan` or derived from `schema_id`

3. **The AI is correct**: Questions are not reliably labeled with `paper` field at the top level - it depends on how the database save function extracts it from `idea_plan` or derives it from `schema_id`.

## How Paper is Determined

### From Schema ID (Most Reliable):
- **Paper 1**: Schema IDs starting with `M_` (e.g., `M_206f3493`, `M_361a9633`)
- **Paper 2**: Schema IDs starting with `R_` (e.g., `R_12345678`)

**Code reference**: `tmua_curriculum_parser.py` lines 115-116:
- `M` prefix → Paper 1 (Section 1 topics only: MM1-MM8, M1-M7)
- `R` prefix → Paper 2 (Section 1 + Section 2 topics: MM1-MM8, M1-M7, Arg1-Arg4, Prf1-Prf5, Err1-Err2)

### From idea_plan (During Generation):
- `idea_plan.paper` field contains `"Paper1"` or `"Paper2"` (e.g., `{"paper": "Paper1", ...}`)
- This should match the schema prefix (validated in `project.py` lines 1622-1624)

### From Tags (Curriculum-based):
- **Paper 1 tags**: `MM1`, `MM2`, ..., `MM8`, `M1`, `M2`, ..., `M7` (Section 1 only)
- **Paper 2 tags**: Can include Section 2 tags: `Arg1`, `Arg2`, `Arg3`, `Arg4`, `Prf1`, `Prf2`, `Prf3`, `Prf4`, `Prf5`, `Err1`, `Err2`
- Note: Paper 2 can ALSO use Section 1 tags as secondary tags

## How to Access/Analyze Questions in Database

### SQL Queries:

**Find Paper 1 questions:**
```sql
-- By schema_id prefix
SELECT * FROM ai_generated_questions 
WHERE schema_id LIKE 'M_%' 
AND test_type = 'TMUA';

-- By paper field (if populated)
SELECT * FROM ai_generated_questions 
WHERE paper = 'Paper1' 
AND test_type = 'TMUA';
```

**Find Paper 2 questions:**
```sql
-- By schema_id prefix
SELECT * FROM ai_generated_questions 
WHERE schema_id LIKE 'R_%' 
AND test_type = 'TMUA';

-- By paper field (if populated)
SELECT * FROM ai_generated_questions 
WHERE paper = 'Paper2' 
AND test_type = 'TMUA';
```

**Find questions by tags:**
```sql
-- Paper 1 questions (Section 1 tags only)
SELECT * FROM ai_generated_questions 
WHERE test_type = 'TMUA'
AND (primary_tag LIKE 'MM%' OR primary_tag LIKE 'M%')
AND primary_tag NOT LIKE 'Arg%' 
AND primary_tag NOT LIKE 'Prf%' 
AND primary_tag NOT LIKE 'Err%';

-- Paper 2 questions (has Section 2 tags)
SELECT * FROM ai_generated_questions 
WHERE test_type = 'TMUA'
AND (primary_tag LIKE 'Arg%' 
     OR primary_tag LIKE 'Prf%' 
     OR primary_tag LIKE 'Err%'
     OR secondary_tags::text LIKE '%Arg%'
     OR secondary_tags::text LIKE '%Prf%'
     OR secondary_tags::text LIKE '%Err%');
```

## Summary: Reliable Differentiation Methods

**Most Reliable → Least Reliable:**

1. **Schema ID prefix** (`M_` = Paper 1, `R_` = Paper 2) - ✅ **Most reliable**
2. **Primary tag** (Section 2 tags = Paper 2) - ✅ Reliable if tagged correctly
3. **Paper field** in database - ⚠️ Depends on pipeline populating it
4. **idea_plan.paper** in JSON/JSONL files - ✅ Reliable in generation logs

## Recommendation

**For AI analysis**, use this priority order:
1. Check `schema_id` prefix: `M_` → Paper 1, `R_` → Paper 2
2. Fallback to `primary_tag`: If tag starts with `Arg`, `Prf`, or `Err` → Paper 2
3. Check `paper` field if available: `'Paper1'` or `'Paper2'`

