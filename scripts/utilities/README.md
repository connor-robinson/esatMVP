# Utility Scripts

This directory contains one-off Python scripts used for database migrations, fixes, and maintenance tasks.

## Scripts

### Database Migration Scripts

#### `apply_restructure_migrations.py`
**Purpose:** Applies restructuring migrations to the `ai_generated_questions` table in Supabase.

**What it does:**
- Resets all question statuses to 'pending' and updates constraints
- Removes review columns (reviewed_by, reviewed_at, review_notes)
- Maps tag codes to curriculum text names
- Renames paper column to subjects and populates values

**Usage:**
```bash
python scripts/utilities/apply_restructure_migrations.py
```

**Requirements:** Requires `.env.local` with Supabase credentials.

---

#### `apply_rls_fix.py`
**Purpose:** Applies Row Level Security (RLS) fixes to allow anonymous reads.

**What it does:**
- Updates RLS policies on database tables
- Allows anonymous users to read specific tables

**Usage:**
```bash
python scripts/utilities/apply_rls_fix.py
```

**Requirements:** Requires `.env.local` with Supabase credentials.

---

#### `apply_rls_direct.py`
**Purpose:** Applies RLS fixes directly using psycopg2 (PostgreSQL driver).

**What it does:**
- Direct database connection using psycopg2
- Updates RLS policies bypassing Supabase client

**Usage:**
```bash
python scripts/utilities/apply_rls_direct.py
```

**Requirements:** Requires `.env.local` with Supabase database connection string.

---

#### `apply_review_rls_fix.py`
**Purpose:** Applies RLS fix for review app - allows anonymous users to read and update questions.

**What it does:**
- Updates RLS policies to allow anonymous access
- Enables read and update operations for review workflow

**Usage:**
```bash
python scripts/utilities/apply_review_rls_fix.py
```

**Requirements:** Requires `.env.local` with Supabase credentials.

---

### Utility Scripts

#### `check_junk.py`
**Purpose:** Utility script to check database content.

**What it does:**
- Connects to SQLite database (`scripts/schema_generator/restructure/nsaa_state.db`)
- Queries specific questions from the questions queue
- Useful for debugging and data inspection

**Usage:**
```bash
python scripts/utilities/check_junk.py
```

**Requirements:** SQLite database file must exist.

---

#### `question_status_viewer.py`
**Purpose:** GUI application to display AI-generated question counts per schema.

**What it does:**
- Creates a tkinter GUI window
- Displays count of AI-generated questions per schema from Supabase
- Provides visual interface for monitoring question generation status

**Usage:**
```bash
python scripts/utilities/question_status_viewer.py
```

**Requirements:** 
- Requires `.env.local` with Supabase credentials
- Requires tkinter (usually included with Python)

---

## Environment Setup

All scripts that interact with Supabase require a `.env.local` file in the project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For some scripts
```

## Notes

- These scripts are **one-off utilities** and may not be actively maintained
- Always backup your database before running migration scripts
- Test scripts in a development environment first
- Some scripts may have hardcoded paths or assumptions about the database structure
