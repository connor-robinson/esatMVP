# Supabase Database Backup

## Quick Backup Instructions

Since you don't have Supabase Plus (which includes automated backups), here's how to create a local backup:

### Option 1: Run the Node.js Script (Recommended)

1. Get your Supabase Service Role Key:
   - Go to https://app.supabase.com
   - Select your project: **NocalcProject**
   - Go to **Settings** → **API**
   - Copy the **service_role** key (NOT the anon key)

2. Run the backup script:
   ```powershell
   cd backups\supabase
   $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
   node export_all_data.js
   ```

3. The script will create a file like `full_backup_2026-02-16_16-50-07.sql` with all your data.

### Option 2: Manual Export via Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Database** → **Tables**
4. For each table, click the table → **Export** → **CSV** or use the SQL Editor to export

### What Gets Backed Up

The backup includes:
- ✅ All table data (as SQL INSERT statements)
- ✅ Schema is already in `supabase/migrations/` directory

### Restoring the Backup

1. Apply migrations: Run all files in `supabase/migrations/` in order
2. Import data: Run the backup SQL file in Supabase SQL Editor

### Current Database Stats

- **Total tables**: 24
- **Total rows**: ~5,000+ across all tables
- **Largest tables**: 
  - `questions`: 1,926 rows
  - `ai_generated_questions`: 1,181 rows
  - `builder_session_questions`: 1,271 rows
  - `conversion_rows`: ~2,500+ rows

---

**Note**: The backup script requires the `SUPABASE_SERVICE_ROLE_KEY` to access all data, including data protected by Row Level Security (RLS).
