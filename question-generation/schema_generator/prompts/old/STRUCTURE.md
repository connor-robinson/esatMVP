# Schema Generator Prompts Folder Structure

## Overview

All schema generation prompts are now organized in this `prompts/` folder for easy editing and version control.

## File Structure

```
scripts/schema_generator/
├── schemagenerator.py          # Main Python script (loads prompts from this folder)
├── prompts/                     # ← All prompts are here
│   ├── README.md               # Detailed documentation
│   ├── STRUCTURE.md            # This file
│   ├── Schema_Candidate_Prompt.md
│   ├── Schema_Full_Prompt.md
│   ├── Schema_Compress_Prompt.md
│   ├── Schema_Split_Prompt.md
│   └── Schema_Enrich_Prompt.md
├── _cache/                      # Generated data (papers_index.json, etc.)
├── _logs/                       # Decision logs (schema_decisions.jsonl)
└── papers/                      # PDF files to process
```

## What Changed

**Before:**
- Prompts were hardcoded inside `schemagenerator.py` as Python f-strings
- Editing prompts required modifying Python code
- Difficult to track prompt changes in version control

**After:**
- Prompts are in separate `.md` files in the `prompts/` folder
- Edit prompts directly in markdown files
- Python code loads prompts using `load_prompt_template()`
- Changes take effect immediately on next run

## Quick Start

1. **To edit a prompt:** Open the relevant `.md` file and edit
2. **To test changes:** Run `python schemagenerator.py`
3. **To see what each prompt does:** Read `README.md`

## Python Integration

The `schemagenerator.py` file loads prompts like this:

```python
PROMPT_DIR = Path(__file__).parent / "prompts"
CANDIDATE_PROMPT_PATH = PROMPT_DIR / "Schema_Candidate_Prompt.md"
# ... etc

def load_prompt_template(path: Path) -> str:
    """Load a prompt template from a markdown file."""
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()
```

Variables like `{exam_type}`, `{corpus}`, `{candidate.title}` are replaced at runtime.

## Benefits

✅ **Easy to edit** - No Python knowledge needed  
✅ **Version control friendly** - Track prompt changes separately from code  
✅ **Collaborative** - Multiple people can edit prompts without touching code  
✅ **Testable** - Quickly iterate on prompt improvements  
✅ **Documented** - Each prompt file is self-documenting  

## Next Steps

To regenerate all schemas with your custom prompts:

1. Edit the prompts in this folder
2. Backup existing `Schemas.md`
3. Run the schema generator tool
4. Review and accept/merge candidates

See `README.md` for detailed instructions.

























