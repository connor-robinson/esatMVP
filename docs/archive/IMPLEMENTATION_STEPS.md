# Implementation Steps for Security Handover

Follow these steps in order to secure your codebase before handover.

## Step 1: Create Development Environment (30 min)

### 1.1 Create New Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Name: `nocalc-dev` or `nocalc-staging`
4. Choose a region close to you
5. Set a database password (save it securely)
6. Wait for project to initialize

### 1.2 Copy Database Schema
1. In your **production** Supabase project, go to SQL Editor
2. Run this to export schema:
   ```sql
   -- Get all table creation statements
   SELECT 
     'CREATE TABLE ' || tablename || ' (...);' as ddl
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```
3. Or use the migrations from `supabase/migrations/` folder
4. Run the migrations in your **new dev project** SQL Editor

### 1.3 Seed Test Data (Optional)
1. Create 10-20 test questions with status='approved'
2. Don't copy real user data
3. Use dummy data for testing

---

## Step 2: Create Development Vercel Project (15 min)

### 2.1 Create New Vercel Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your repository
4. Create a new branch: `dev` or `staging`
5. Connect to this branch

### 2.2 Set Environment Variables
In Vercel Project Settings → Environment Variables, add:

**For Preview/Development:**
```
NEXT_PUBLIC_SUPABASE_URL=https://[your-dev-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[dev-anon-key]
NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=false
```

**DO NOT ADD:**
- `SUPABASE_SERVICE_ROLE_KEY` (remove if exists)
- `GEMINI_API_KEY` (remove if exists)
- Production credentials

---

## Step 3: Fix Critical Security Issues (45 min)

### 3.1 Fix Question Update Route

**File:** `src/app/api/question-bank/questions/[id]/route.ts`

1. Open the file
2. Replace the entire `PATCH` function with the code from `SECURE_QUESTION_UPDATE_EXAMPLE.ts`
3. Save the file

**What changed:**
- Removed service role key usage
- Added authentication requirement
- Now respects RLS policies

### 3.2 Fix Questions API Route

**File:** `src/app/api/questions/route.ts`

1. Open the file
2. Replace the `GET` function with code from `SECURE_QUESTIONS_API_EXAMPLE.ts`
3. Save the file

**What changed:**
- Added authentication check
- Restricted to approved questions only
- Added status validation

### 3.3 Test the Changes

```bash
# Start dev server
npm run dev

# Test authentication
# Try accessing /api/questions without login - should get 401
# Login and try again - should work
```

---

## Step 4: Update Database RLS Policies (20 min)

### 4.1 Run Migration

1. Go to your **dev Supabase project** SQL Editor
2. Open `supabase/migrations/20250101000000_restrict_question_access.sql`
3. Copy the contents
4. Paste into SQL Editor
5. Click "Run"

### 4.2 Verify Policies

Run this query to check:
```sql
SELECT * FROM pg_policies WHERE tablename = 'ai_generated_questions';
```

You should see:
- "Users can read approved questions only" (SELECT policy)

### 4.3 Test Access

1. Login to your app as a test user
2. Try to query questions - should only see approved ones
3. Try to access pending/rejected questions - should fail

---

## Step 5: Remove Service Role Key from Code (10 min)

### 5.1 Search for Service Role Usage

```bash
# Search for service role key usage
grep -r "SUPABASE_SERVICE_ROLE_KEY" src/
grep -r "service_role" src/
```

### 5.2 Remove from Environment

1. Go to Vercel → Project Settings → Environment Variables
2. Find `SUPABASE_SERVICE_ROLE_KEY`
3. Delete it (or don't set it for dev environment)

### 5.3 Verify No Hardcoded Keys

```bash
# Check for hardcoded keys (should return nothing)
grep -r "eyJ" src/  # JWT tokens start with eyJ
grep -r "AIza" src/  # Google API keys start with AIza
```

---

## Step 6: Disable Question Generation (5 min)

### 6.1 Set Feature Flag

In Vercel Environment Variables:
```
NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=false
```

### 6.2 Verify UI

1. Deploy to dev environment
2. Check that question generation UI is hidden
3. Try accessing `/api/questions/generate` - should return 403

---

## Step 7: Create Documentation (15 min)

### 7.1 Create .env.local.example

Already created - verify it exists and has correct template.

### 7.2 Share Documentation

Share these files with the professional:
- ✅ `SECURITY_HANDOVER_GUIDE.md` (full guide)
- ✅ `HANDOVER_SUMMARY.md` (quick reference)
- ✅ `.env.local.example` (template)
- ✅ `IMPLEMENTATION_STEPS.md` (this file)

**DO NOT share:**
- ❌ `.env.local` (with real values)
- ❌ Production credentials
- ❌ Service role keys

---

## Step 8: Test Restricted Environment (20 min)

### 8.1 Test Authentication

1. Try accessing protected routes without login
2. Should get 401 Unauthorized
3. Login and try again - should work

### 8.2 Test Question Access

1. Login as dev user
2. Query questions API
3. Should only see approved questions
4. Try to access pending questions - should fail

### 8.3 Test Question Updates

1. Try updating a question
2. Should work if authenticated
3. Should respect RLS policies

### 8.4 Test Production Isolation

1. Verify dev project can't access production data
2. Try using dev credentials on production URL - should fail

---

## Step 9: Create Handover Package (10 min)

### 9.1 Prepare Repository

1. Create a branch: `dev-handover` or `staging`
2. Commit all security fixes
3. Push to GitHub

### 9.2 Create Access Document

Create a file `DEV_ACCESS.md`:

```markdown
# Development Environment Access

## Supabase
- URL: https://[dev-project].supabase.co
- Anon Key: [dev-anon-key]
- Dashboard: [link]

## Vercel
- Project: [dev-project-name]
- URL: https://[dev-project].vercel.app
- Branch: dev

## Test User
- Email: dev@example.com
- Password: [temporary-password]

## Environment Variables
See .env.local.example

## Important Notes
- Service role key is NOT provided (security)
- Only approved questions are accessible
- Question generation is disabled
```

### 9.3 Share Access

1. Share `DEV_ACCESS.md` with professional
2. Share repository access (read-only or specific branch)
3. Share dev Supabase project access (limited permissions)
4. Share dev Vercel project access

---

## Step 10: Final Verification (15 min)

### Checklist

- [ ] Dev Supabase project created
- [ ] Dev Vercel project created
- [ ] Service role key removed from code
- [ ] Authentication added to API routes
- [ ] RLS policies updated
- [ ] Question generation disabled
- [ ] Test user created
- [ ] Documentation prepared
- [ ] Access credentials prepared
- [ ] Tested restricted access
- [ ] Production credentials secured

---

## Troubleshooting

### Issue: Can't access questions

**Solution:**
1. Check RLS policies are applied
2. Verify user is authenticated
3. Check question status is 'approved'

### Issue: Can't update questions

**Solution:**
1. Check authentication is working
2. Verify RLS update policy exists
3. Check user has permission

### Issue: Service role key still required

**Solution:**
1. Check all API routes use authenticated client
2. Verify no Python scripts need it (or run separately)
3. Update RLS policies to allow authenticated updates

---

## Next Steps After Handover

1. Professional works in dev environment
2. You review changes before merging to production
3. Test thoroughly in dev before production deployment
4. Keep production credentials secure

---

**Estimated Total Time:** 3-4 hours

**Priority:** Complete Steps 1-3 first (critical security fixes)
