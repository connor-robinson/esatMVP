# Safe Access Sharing Guide

This guide explains how to safely share Supabase and Vercel access with a professional developer while maintaining security.

---

## 🎯 Strategy: Separate Dev Environment (Recommended)

**Best Practice:** Create a completely separate development environment that the professional can access freely, while keeping production isolated.

### Why This Approach?
- ✅ Professional can work without restrictions
- ✅ No risk to production data
- ✅ Can experiment freely
- ✅ Easy to reset if needed
- ✅ You maintain full control of production

---

## 📦 Part 1: Creating Full Backup

### Step 1: Backup Database Schema

**Option A: Using Supabase Dashboard (Easiest)**

1. Go to your **production** Supabase project
2. Navigate to **SQL Editor**
3. Run this query to get all table schemas:

```sql
-- Export all table creation statements
SELECT 
  'CREATE TABLE ' || schemaname || '.' || tablename || ' (...);' as ddl
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

4. Copy the results and save to `backup_schema_$(date +%Y%m%d).sql`

**Option B: Using pg_dump (Most Complete)**

```bash
# Install PostgreSQL client tools if needed
# Windows: Download from https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt-get install postgresql-client

# Get connection string from Supabase Dashboard → Settings → Database
# Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

pg_dump -h [YOUR-DB-HOST] \
        -U postgres \
        -d postgres \
        --schema-only \
        --no-owner \
        --no-privileges \
        > backup_schema_$(date +%Y%m%d).sql
```

**Option C: Backup Migrations (Recommended)**

Your migrations in `supabase/migrations/` are already a backup of your schema! Just copy that folder.

```bash
# Create timestamped backup
cp -r supabase/migrations supabase_backups/migrations_$(date +%Y%m%d)
```

### Step 2: Backup Database Data (Optional - Only if Needed)

⚠️ **Warning:** Only backup data if you need to restore it. For handover, you typically DON'T want to share real user data.

**If you need data backup:**

```bash
# Backup all data (can be large)
pg_dump -h [YOUR-DB-HOST] \
        -U postgres \
        -d postgres \
        --data-only \
        --no-owner \
        --no-privileges \
        > backup_data_$(date +%Y%m%d).sql

# Or backup specific tables only
pg_dump -h [YOUR-DB-HOST] \
        -U postgres \
        -d postgres \
        --table=questions \
        --table=papers \
        --data-only \
        > backup_questions_$(date +%Y%m%d).sql
```

**Recommended:** Only backup non-sensitive data like questions (not user data).

### Step 3: Backup Storage Buckets

**Using Supabase Dashboard:**

1. Go to **Storage** in your Supabase project
2. For each bucket:
   - Click on the bucket
   - Select all files
   - Click "Download" (if available)
   - Or use the API to download

**Using Supabase CLI (Better for large backups):**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref [YOUR-PROJECT-REF]

# Download storage bucket
supabase storage download [BUCKET-NAME] ./backup_storage_$(date +%Y%m%d)
```

**Using Python Script:**

```python
# backup_storage.py
from supabase import create_client
import os
from datetime import datetime

supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Need service role for storage

client = create_client(supabase_url, supabase_key)

# List all buckets
buckets = client.storage.list_buckets()
print(f"Found {len(buckets)} buckets")

# Download each bucket
for bucket in buckets:
    bucket_name = bucket.name
    backup_dir = f"backup_storage_{datetime.now().strftime('%Y%m%d')}/{bucket_name}"
    os.makedirs(backup_dir, exist_ok=True)
    
    # List files in bucket
    files = client.storage.from_(bucket_name).list()
    
    for file in files:
        # Download file
        file_data = client.storage.from_(bucket_name).download(file['name'])
        file_path = os.path.join(backup_dir, file['name'])
        
        with open(file_path, 'wb') as f:
            f.write(file_data)
        
        print(f"Downloaded: {file['name']}")
```

### Step 4: Backup Environment Variables

**Create a secure backup file (DO NOT commit to git):**

```bash
# backup_env_vars.txt (store securely, NOT in git)
# Production Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[prod-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[prod-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[prod-service-key]

# Production Vercel
VERCEL_PROJECT_ID=[prod-project-id]
VERCEL_ORG_ID=[org-id]

# Other keys
GEMINI_API_KEY=[key]

# Store this file:
# - In a password manager
# - Encrypted file
# - Secure cloud storage (not in repo)
```

### Step 5: Complete Backup Checklist

- [ ] Database schema backed up (migrations folder or SQL dump)
- [ ] Database data backed up (if needed, only non-sensitive)
- [ ] Storage buckets backed up
- [ ] Environment variables documented (stored securely)
- [ ] Migrations folder copied
- [ ] Code repository backed up (git remote)

---

## 🔐 Part 2: Sharing Supabase Access Safely

### Option A: Create Separate Dev Project (STRONGLY RECOMMENDED)

**This is the safest approach - what I recommended earlier.**

1. **Create New Supabase Project:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Click "New Project"
   - Name: `nocalc-dev` or `nocalc-staging`
   - Choose region
   - Set password

2. **Copy Schema Only:**
   - Run your migrations from `supabase/migrations/` in the new project
   - Or use the SQL dumps from backup

3. **Seed Test Data:**
   - Add 10-20 test questions
   - Create test users
   - NO real user data

4. **Share Dev Project Access:**
   - Go to Project Settings → Team
   - Click "Invite Team Member"
   - Enter professional's email
   - Role: **Developer** (not Owner)
   - They get full access to dev project only

**Benefits:**
- ✅ Zero risk to production
- ✅ Professional can experiment freely
- ✅ Easy to reset/delete dev project
- ✅ Production remains isolated

### Option B: Share Production Project with Limited Access

**⚠️ Only if you can't create a separate project**

1. **Add as Team Member:**
   - Go to Supabase Dashboard → Your Project
   - Settings → Team
   - Click "Invite Team Member"
   - Enter professional's email
   - Role: **Developer** (NOT Owner or Admin)

2. **Developer Role Permissions:**
   - Can read/write database
   - Can access API keys
   - Can view logs
   - **Cannot:** Delete project, change billing, remove team members

3. **Additional Restrictions (Set in Database):**
   - Use RLS policies to limit data access
   - Create read-only database user (advanced)
   - Use service role key only for specific operations

**⚠️ Risks:**
- Professional has access to all production data
- Can see user data, analytics, etc.
- Can modify production database
- Higher security risk

**Recommendation:** Use Option A (separate dev project) instead.

### Option C: Database-Level Access Control (Advanced)

If you must share production access, create a restricted database user:

```sql
-- Create read-only user for professional
CREATE USER dev_user WITH PASSWORD 'secure-password-here';

-- Grant connect permission
GRANT CONNECT ON DATABASE postgres TO dev_user;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO dev_user;

-- Grant SELECT on specific tables only
GRANT SELECT ON ai_generated_questions TO dev_user;
GRANT SELECT ON questions TO dev_user;
-- Don't grant access to user data tables

-- Revoke dangerous permissions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM dev_user;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM dev_user;

-- Then grant specific permissions back
GRANT SELECT ON ai_generated_questions TO dev_user;
```

**Then share:**
- Database connection string with `dev_user` credentials
- NOT the Supabase dashboard access

---

## 🚀 Part 3: Sharing Vercel Access

### Option A: Separate Dev Vercel Project (RECOMMENDED)

1. **Create New Vercel Project:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Import your repository
   - Create new branch: `dev` or `staging`
   - Connect to this branch

2. **Set Dev Environment Variables:**
   - Use dev Supabase credentials
   - Don't include production keys

3. **Add as Collaborator:**
   - Project Settings → Collaborators
   - Click "Add Collaborator"
   - Enter professional's email
   - Role: **Developer** (not Owner)

**Benefits:**
- ✅ Separate from production
- ✅ Can experiment freely
- ✅ Production deployments unaffected

### Option B: Share Production Project with Limited Role

1. **Add as Team Member:**
   - Vercel Dashboard → Your Team
   - Settings → Members
   - Invite professional's email
   - Role: **Developer**

2. **Developer Role Permissions:**
   - Can deploy to preview branches
   - Can view logs
   - Can manage environment variables (⚠️ can see all)
   - **Cannot:** Delete project, change domains, manage billing

3. **Restrict Production Deployments:**
   - Use Vercel's branch protection
   - Only allow deployments from `main` branch
   - Professional works on feature branches only

**⚠️ Risks:**
- Can see all environment variables
- Can deploy to production (if not restricted)
- Can view production logs/data

**Recommendation:** Use Option A (separate dev project).

---

## 📋 Recommended Setup for Handover

### What to Create:

1. **Dev Supabase Project:**
   - Name: `nocalc-dev`
   - Schema copied from production
   - Test data only (10-20 questions)
   - No real user data

2. **Dev Vercel Project:**
   - Name: `nocalc-dev`
   - Connected to `dev` branch
   - Dev environment variables only

3. **Dev User Account:**
   - Email: `dev@yourproject.com`
   - Password: Temporary (change after handover)
   - Role: Regular user (not admin)

### What to Share:

✅ **Safe to Share:**
- Dev Supabase project access (as Developer role)
- Dev Vercel project access (as Developer role)
- Dev user account credentials
- Repository access (read-only or specific branch)
- Documentation files

❌ **NEVER Share:**
- Production Supabase credentials
- Production Vercel credentials
- Service role keys
- Production API keys
- Real user data
- Production database access

---

## 🔒 Access Control Checklist

### Supabase Access:
- [ ] Created separate dev project OR
- [ ] Added as Developer (not Owner) to production
- [ ] Verified RLS policies restrict data access
- [ ] Tested that they can't access sensitive tables
- [ ] Documented what they can/can't access

### Vercel Access:
- [ ] Created separate dev project OR
- [ ] Added as Developer (not Owner) to production
- [ ] Restricted production deployments (branch protection)
- [ ] Verified they can't see production env vars (if sharing prod)
- [ ] Tested deployment permissions

### Repository Access:
- [ ] Added as collaborator (read or write)
- [ ] OR created separate branch for them
- [ ] Protected main/master branch
- [ ] Verified they can't push to production

---

## 🛡️ Security Best Practices

1. **Principle of Least Privilege:**
   - Give minimum access needed
   - Use Developer role, not Owner/Admin
   - Restrict to dev environment when possible

2. **Separate Environments:**
   - Always use separate dev/staging
   - Never share production credentials
   - Test in dev before production

3. **Monitor Access:**
   - Check Supabase audit logs regularly
   - Monitor Vercel deployment logs
   - Review git commit history

4. **Rotate Credentials:**
   - Change passwords after handover
   - Rotate API keys if compromised
   - Revoke access when project ends

5. **Document Everything:**
   - What access was granted
   - What they can/can't do
   - When access expires
   - How to revoke access

---

## 📝 Access Granting Template

Create a document like this when sharing access:

```markdown
# Access Credentials for [Professional Name]

## Supabase
- **Project:** nocalc-dev (Development)
- **URL:** https://[dev-project-id].supabase.co
- **Access Level:** Developer
- **Dashboard:** [link]
- **Anon Key:** [dev-anon-key]
- **Note:** This is a separate dev project, not production

## Vercel
- **Project:** nocalc-dev
- **URL:** https://[dev-project].vercel.app
- **Access Level:** Developer
- **Branch:** dev
- **Note:** Can deploy to preview branches only

## Repository
- **Access:** Read/Write to `dev` branch
- **Protected:** main branch (production)
- **URL:** [github-repo-url]

## Test User
- **Email:** dev@yourproject.com
- **Password:** [temporary-password]
- **Note:** Change password on first login

## Restrictions
- ❌ No access to production Supabase
- ❌ No access to production Vercel
- ❌ Cannot delete projects
- ❌ Cannot change billing
- ✅ Can work freely in dev environment

## Expiration
- Access expires: [date]
- Contact: [your-email] to extend

## Support
- Questions: [your-email]
- Documentation: See SECURITY_HANDOVER_GUIDE.md
```

---

## 🔄 Revoking Access Later

### When Project Ends:

1. **Supabase:**
   - Go to Project Settings → Team
   - Find professional's email
   - Click "Remove" or "Revoke Access"

2. **Vercel:**
   - Go to Project Settings → Collaborators
   - Find professional's email
   - Click "Remove"

3. **Repository:**
   - Go to Repository Settings → Collaborators
   - Remove access

4. **Change Passwords:**
   - Change any shared account passwords
   - Rotate API keys if needed

---

## ✅ Final Recommendation

**For Maximum Security:**

1. ✅ Create separate dev Supabase project
2. ✅ Create separate dev Vercel project
3. ✅ Add professional as Developer (not Owner)
4. ✅ Share only dev environment access
5. ✅ Keep production completely isolated
6. ✅ Document everything
7. ✅ Set access expiration date
8. ✅ Monitor activity logs

**This gives the professional:**
- Full access to work in dev environment
- No risk to your production data
- Ability to experiment freely
- Easy to revoke access later

---

**Next Steps:**
1. Create backups (Part 1)
2. Create dev environments (Part 2 & 3)
3. Share access with documentation
4. Monitor activity
