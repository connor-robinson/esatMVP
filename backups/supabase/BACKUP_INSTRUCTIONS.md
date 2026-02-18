# Supabase Database Backup Instructions

## Quick Backup Options

### Option 1: Supabase Dashboard (Easiest - Recommended)
1. Go to https://app.supabase.com
2. Select your project: **NocalcProject** (bcbttpsokwoapjypwwwq)
3. Navigate to **Database** → **Backups**
4. Click **Download backup** or use the **Point-in-time recovery** feature
5. This will give you a complete `.sql` or `.dump` file

### Option 2: Using Supabase CLI (Most Complete)
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref bcbttpsokwoapjypwwwq

# Create a full backup
supabase db dump -f backups/supabase/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Option 3: Using pg_dump (Requires Database Password)
1. Get your database connection string from Supabase Dashboard:
   - Go to **Settings** → **Database**
   - Copy the **Connection string** (URI format)
   
2. Run pg_dump:
```bash
pg_dump "postgresql://postgres:[YOUR-PASSWORD]@db.bcbttpsokwoapjypwwwq.supabase.co:5432/postgres" > backups/supabase/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Option 4: Using Node.js Script (Already Created)
Run the backup script:
```bash
cd backups/supabase
node backup_data.js
```

**Note:** You'll need to set `SUPABASE_SERVICE_ROLE_KEY` environment variable for full data access.

## Current Database Statistics
- **questions**: 1,926 rows
- **papers**: 48 rows
- **paper_sessions**: 23 rows
- **paper_session_responses**: 63 rows
- **ai_generated_questions**: 1,181 rows
- **builder_sessions**: 97 rows
- **builder_session_questions**: 1,271 rows
- **profiles**: 5 rows
- **drill_sessions**: 40 rows
- **question_choice_stats**: 60 rows
- **user_daily_metrics**: 11 rows
- **topic_progress**: 8 rows

## Schema Backup
Your schema is already backed up in: `supabase/migrations/` directory
All migration files contain the complete schema definition.
