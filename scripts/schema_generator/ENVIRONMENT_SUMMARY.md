# Schema Generator Environment Summary

## Directory Structure

The `scripts/schema_generator/` directory is the workspace for schema generation scripts and reference materials.

### Current Contents

- **Total Files**: 191 files
- **File Types**: 
  - 189 PDF files (past papers and answer keys)
  - 2 EXE files

### Directory Organization

```
scripts/schema_generator/
└── papers/
    ├── ENGAA Section 1/
    │   ├── ENGAA Section 1 2016/ (Answer Key, Conversion Table, Past Paper)
    │   ├── ENGAA Section 1 2017/ (Answer Key, Conversion Table, Past Paper)
    │   ├── ENGAA Section 1 2018/ (Answer Key, Conversion Table, Past Paper)
    │   ├── ENGAA Section 1 2019/ (Answer Key, Conversion Table, Past Paper)
    │   ├── ENGAA Section 1 2020/ (Answer Key, Conversion Table, Past Paper)
    │   ├── ENGAA Section 1 2021/ (Answer Key, Conversion Table, Past Paper)
    │   ├── ENGAA Section 1 2022/ (Answer Key, Conversion Table, Past Paper)
    │   ├── ENGAA Section 1 2023/ (Answer Key, Conversion Table, Past Paper)
    │   └── ENGAA Section 1 Spec/ (Answer Key, Past Paper)
    │
    ├── ENGAA Section 2/
    │   ├── ENGAA Section 2 2016/ (Answer Key, Conversion Table, Past Paper)
    │   ├── ENGAA Section 2 2017/ (Answer Key, Conversion Table, Past Paper)
    │   ├── ENGAA Section 2 2018/ (Answer Key, Conversion Table, Past Paper)
    │   ├── ENGAA Section 2 2019/ (Answer Key, Conversion Table, Past Paper)
    │   ├── ENGAA Section 2 2020/ (Answer Key, Conversion Table)
    │   ├── ENGAA Section 2 2021/ (Answer Key, Conversion Table)
    │   ├── ENGAA Section 2 2022/ (Answer Key, Conversion Table)
    │   ├── ENGAA Section 2 2023/ (Answer Key, Conversion Table, Past Paper)
    │   └── ENGAA Section 2 Spec/ (Answer Key, Past Paper)
    │
    ├── NSAA Section 1/
    │   └── (20 PDF files across years 2016-2023, including Spec papers)
    │
    ├── NSAA Section 2/
    │   └── (31 PDF files across years 2016-2023, including Spec papers)
    │
    ├── TMUA Paper 1/
    │   └── (40 PDF files + 2 EXE files across years 2017-2023, Practice, and Specimen papers)
    │
    └── TMUA Paper 2/
        └── (Multiple years 2017-2023, Practice, and Specimen papers with Answer Keys, Conversion Tables, Official Solutions, and Past Papers)
```

### Paper Types Available

1. **ENGAA** (Engineering Admissions Assessment)
   - Section 1: Mathematics and Physics
   - Section 2: Advanced Mathematics and Advanced Physics
   - Years: 2016-2023 + Specimen papers
   - File types per year: Past Paper, Answer Key, Conversion Table

2. **NSAA** (Natural Sciences Admissions Assessment)
   - Section 1: Mathematics and Science
   - Section 2: Biology, Chemistry, or Physics
   - Years: 2016-2023 + Specimen papers

3. **TMUA** (Test of Mathematics for University Admission)
   - Paper 1: Mathematical Knowledge and Application
   - Paper 2: Mathematical Reasoning
   - Years: 2017-2023 + Practice and Specimen papers
   - File types per year: Past Paper, Answer Key, Conversion Table, Official Solutions

## Environment Variables

The following environment variables are available in `.env.local` (root directory):

### API Keys
- `GEMINI_API_KEY` - Google Gemini API key for AI operations
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (full database access)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_URL` - Supabase URL (alternative/legacy)

### Configuration
- `MAX_IMPLEMENTER_RETRIES` - Maximum retry attempts for implementer operations
- `N_ITEMS` - Number of items parameter (likely for batch processing)
- `SCHEMA_PREFIXES` - Schema prefix configuration (likely for question schema IDs like M1-M7, P1-P7)

## Related Project Context

### Database Schema
- The project uses Supabase (PostgreSQL) for data storage
- Main table: `ai_generated_questions` - stores AI-generated ESAT questions
- Schema IDs follow pattern: `M1`-`M7` (Mathematics) or `P1`-`P7` (Physics)
- Questions have statuses: `pending_review`, `approved`, `rejected`, `needs_revision`
- Difficulty levels: `Easy`, `Medium`, `Hard`

### Related Scripts
- `scripts/esat_question_generator/` - Contains the main question generation pipeline
- Similar structure with Python scripts, prompts, and configuration files
- Uses similar environment variables (has its own `.env.local`)

## Working Environment

- **Operating System**: Windows 10 (PowerShell)
- **Python Environment**: Python 3.12 (based on `__pycache__` files in related scripts)
- **Project Root**: `c:\Users\anson\Desktop\nocalcMVP2_real\`
- **Script Location**: `scripts/schema_generator/`

## Notes for AI Assistants

1. **PDF Processing**: The papers directory contains 189 PDF files that may need to be processed, parsed, or analyzed for schema generation.

2. **File Naming Convention**: Papers follow a consistent naming pattern:
   - `{Exam} {Section/Paper} {Year} {Type}.pdf`
   - Types include: "Past Paper", "Answer Key", "Conversion Table", "Official Solutions"

3. **Environment Access**: Environment variables are stored in `.env.local` at the project root. Use standard Python libraries like `os` or `python-dotenv` to access them.

4. **Database Integration**: The project uses Supabase. You may need to:
   - Use `SUPABASE_SERVICE_ROLE_KEY` for admin operations
   - Use `SUPABASE_URL` for connection
   - Reference the database schema documentation in `scripts/esat_question_generator/DATABASE_SCHEMA.md`

5. **Schema Format**: Based on the database schema, schemas appear to use IDs like `M1`, `M2`, etc. for Mathematics and `P1`, `P2`, etc. for Physics. The `SCHEMA_PREFIXES` environment variable may contain relevant configuration.
















