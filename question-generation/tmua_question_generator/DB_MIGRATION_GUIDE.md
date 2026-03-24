# Database Migration Guide: Add TMUA Fields

## Problem

The database is missing columns needed for TMUA questions:
- `graphs` (jsonb) - Question graphs
- `solution_graphs` (jsonb) - Solution-only graphs
- `primary_tag` (text) - Primary curriculum tag
- `secondary_tags` (jsonb) - Secondary tags array
- `tags_confidence` (numeric) - Tag confidence score
- `tags_labeled_at` (timestamptz) - When tags were assigned
- `tags_labeled_by` (text) - Who/what assigned tags
- `test_type` (text) - 'ESAT' or 'TMUA'
- Paper constraint needs to allow 'Paper1' and 'Paper2'

## Solution: Choose One Method

### Method 1: Supabase CLI (Recommended) ✅

If you have Supabase CLI installed:

```bash
cd C:\Users\anson\Desktop\nocalcMVP2_real
npx supabase db push
```

This will apply all pending migrations, including the new one.

### Method 2: Supabase Dashboard SQL Editor ✅

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the contents of:
   ```
   supabase/migrations/20250115000000_add_tmua_fields_complete.sql
   ```
6. Click **Run** (or press Ctrl+Enter)

### Method 3: Direct PostgreSQL Connection

If you have `DATABASE_URL` or `SUPABASE_DB_PASSWORD` in `.env.local`:

```bash
cd scripts/tmua_question_generator
python apply_db_migration.py
```

**To get DATABASE_URL:**
1. Go to Supabase Dashboard
2. Settings → Database
3. Copy the "Connection string" (use "Session mode" or "Transaction mode")
4. Add to `.env.local` as `DATABASE_URL=postgresql://...`

### Method 4: Manual SQL Execution

If you have direct database access, run the SQL file directly:

```bash
psql -h [host] -U postgres -d postgres -f supabase/migrations/20250115000000_add_tmua_fields_complete.sql
```

## Verify Migration

After applying the migration, verify the columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ai_generated_questions'
AND column_name IN ('graphs', 'solution_graphs', 'primary_tag', 'secondary_tags', 
                    'tags_confidence', 'tags_labeled_at', 'tags_labeled_by', 'test_type')
ORDER BY column_name;
```

You should see all 8 columns listed.

## What the Migration Does

1. **Adds graph columns**: `graphs` and `solution_graphs` (both jsonb)
2. **Adds tag columns**: `primary_tag`, `secondary_tags`, `tags_confidence`, `tags_labeled_at`, `tags_labeled_by`
3. **Adds test_type**: Defaults to 'ESAT', allows 'TMUA'
4. **Updates paper constraint**: Now allows 'Paper1' and 'Paper2' in addition to 'Math 1' and 'Math 2'
5. **Creates indexes**: For efficient querying by `test_type` and `primary_tag`
6. **Adds comments**: Documentation for each new column

## After Migration

Once the migration is applied, you can:
- ✅ Sync questions with graphs to the database
- ✅ Store TMUA questions with proper test_type
- ✅ Store tags and tag metadata
- ✅ Use Paper1/Paper2 values for TMUA questions

## Troubleshooting

**Error: "column already exists"**
- This is fine! The migration uses `IF NOT EXISTS`, so it's safe to run multiple times.

**Error: "permission denied"**
- Make sure you're using the service role key or have admin database access.

**Error: "constraint already exists"**
- The migration drops and recreates constraints, so this should be handled automatically.






