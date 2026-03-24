# Schema Generator Prompt Files

All schema generation prompts have been extracted into separate markdown files for easy editing.

## Prompt Files

### 1. `Schema_Candidate_Prompt.md`
**Purpose:** Generates initial schema candidates from batches of questions.

**Used by:** `prompt_candidates()` function

**Key variables:**
- `{exam_type}` - "ESAT/ENGAA/NSAA" or "TMUA"
- `{prefix_instructions}` - Subject prefix rules (M/P/B/C or M/R for TMUA)
- `{existing}` - List of existing schemas to avoid duplicates
- `{corpus}` - Question text from the current batch
- `{prefix_json}` - Valid prefix options for JSON output
- `{n_candidates}` - Number of candidates to generate

**Output:** JSON with candidate schemas (title, core_move, evidence, etc.)

---

### 2. `Schema_Full_Prompt.md`
**Purpose:** Expands a candidate into a full schema with all sections.

**Used by:** `prompt_full_schema()` function

**Key variables:**
- `{schema_file}` - Target file (Schemas.md or Schemas_TMUA.md)
- `{candidate.prefix}` - Schema prefix (M/P/B/C/R)
- `{prefix_desc}` - Description of what the prefix means
- `{candidate.title}` - Schema title
- `{candidate.core_move}` - One-sentence description
- `{candidate.evidence}` - Question IDs used as evidence
- `{tmua_note}` - Special note for TMUA schemas
- `{limit_text}` - Bullet limit constraints

**Output:** Full markdown schema block with all sections

---

### 3. `Schema_Compress_Prompt.md`
**Purpose:** Compresses a schema that exceeds bullet limits (max 4 per section).

**Used by:** `prompt_compress_schema()` function

**Key variables:**
- `{schema_markdown}` - The schema to compress

**Output:** Compressed markdown schema block

---

### 4. `Schema_Split_Prompt.md`
**Purpose:** Splits a candidate that represents two distinct thinking patterns.

**Used by:** `prompt_split_candidate()` function

**Key variables:**
- `{candidate.title}` - Original title
- `{candidate.core_move}` - Original core move
- `{candidate.evidence}` - Original evidence
- `{candidate.prefix}` - Schema prefix

**Output:** JSON with two new candidates

---

### 5. `Schema_Enrich_Prompt.md`
**Purpose:** Generates a replacement bullet for an existing schema section.

**Used by:** `prompt_enrich_bullet()` function

**Key variables:**
- `{target_schema_id}` - Schema being enriched
- `{section}` - Which section to enrich
- `{existing_bullet}` - Current bullet to replace
- `{candidate.title}` - New candidate title
- `{candidate.core_move}` - New candidate core move
- `{candidate.evidence}` - New candidate evidence

**Output:** Single replacement bullet text

---

## How to Edit

1. **Open the relevant `.md` file** in the `prompts` folder
2. **Edit the prompt text** as needed
3. **Keep the `{variable}` placeholders** intact - these get replaced by the Python code
4. **Save the file** - changes take effect immediately on next run

## Example Workflow

To improve how schemas are generated:

1. Edit `Schema_Candidate_Prompt.md` to change how initial candidates are created
2. Edit `Schema_Full_Prompt.md` to change the structure of full schemas
3. Run the schema generator tool - it will use your updated prompts

## Notes

- The Python code in `schemagenerator.py` loads these files using `load_prompt_template()`
- Variables are replaced using `.replace()` or `.format()` methods
- If a prompt file is missing, you'll get a `FileNotFoundError`
- Keep backups before making major changes!

## Regenerating All Schemas

To regenerate all schemas from scratch:

1. **Backup current schemas:**
   - Copy `Schemas.md` to `Schemas_backup.md`
   - Copy `Schemas_TMUA.md` to `Schemas_TMUA_backup.md` (if it exists)

2. **Clear or rename existing schemas:**
   - Rename `Schemas.md` to `Schemas_old.md`
   - This forces the tool to start fresh

3. **Edit prompts** (optional):
   - Update `Schema_Candidate_Prompt.md` with your new requirements
   - Update `Schema_Full_Prompt.md` for better schema structure

4. **Run the schema generator:**
   ```bash
   cd scripts/schema_generator
   python schemagenerator.py
   ```

5. **Index PDFs and generate candidates:**
   - Click "Index PDFs" in the UI
   - Click "Generate candidates"
   - Review and accept/merge/enrich as needed

The tool will create a new `schema_decisions.jsonl` file tracking which questions were used for each schema.

























