# Security Handover Guide

This guide outlines the steps needed to prepare your codebase for handover to a professional developer while restricting access to sensitive data and questions.

## 🎯 Goals

1. **Limit question access** - Professional should only see a subset of questions for testing
2. **Protect sensitive data** - User data, analytics, and production questions remain private
3. **Restrict API keys** - Use limited/development keys instead of production keys
4. **Create isolated environment** - Separate Supabase project or restricted access

---

## 📋 Pre-Handover Checklist

### ✅ Step 1: Create a Development/Staging Supabase Project

**Why:** Isolate the professional's work from your production data.

**Action:**
1. Create a new Supabase project in your Supabase dashboard
2. Name it something like: `nocalc-dev` or `nocalc-staging`
3. Copy only the **schema/structure** (not the data) using migrations
4. Optionally seed with a small subset of test questions (10-20 questions max)

**How to copy schema:**
```bash
# Export your current schema (structure only, no data)
pg_dump -h [your-prod-db-host] -U postgres -d postgres --schema-only > schema.sql

# Import to new dev project
psql -h [your-dev-db-host] -U postgres -d postgres < schema.sql
```

**Alternative:** Use Supabase migrations from your `supabase/migrations/` folder to set up the new project.

---

### ✅ Step 2: Update Environment Variables in Vercel

**Current Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your production Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your production anon key
- `SUPABASE_SERVICE_ROLE_KEY` - **CRITICAL: This bypasses all RLS policies**
- `GEMINI_API_KEY` - For question generation

**Action for Handover:**

1. **Create a new Vercel project** (or use preview environment):
   - Go to Vercel Dashboard → Create New Project
   - Name it: `nocalc-dev` or `nocalc-staging`
   - Connect to a **separate branch** (e.g., `dev` or `staging`)

2. **Set environment variables in the NEW Vercel project:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[your-dev-project].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[dev-project-anon-key]
   SUPABASE_SERVICE_ROLE_KEY=[dev-project-service-role-key]  # ⚠️ See Step 3
   GEMINI_API_KEY=[optional - can be omitted or use limited key]
   NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=false  # Disable question generation
   ```

3. **DO NOT share your production environment variables**

---

### ✅ Step 3: Restrict Service Role Key Access

**⚠️ CRITICAL SECURITY ISSUE:**

The service role key (`SUPABASE_SERVICE_ROLE_KEY`) **bypasses all Row Level Security (RLS) policies**. It's currently used in:
- `src/app/api/question-bank/questions/[id]/route.ts` (line 17)
- Python scripts for question generation

**Current Risk:**
- Anyone with the service role key can read/write ALL data
- Can access all questions, user data, analytics

**Actions:**

#### Option A: Remove Service Role Key (Recommended for Handover)

1. **Modify the API route** to use authenticated user instead:
   ```typescript
   // src/app/api/question-bank/questions/[id]/route.ts
   // REMOVE service role usage, use authenticated client:
   const supabase = createServerClient(); // Uses anon key with RLS
   const { data: { session } } = await supabase.auth.getSession();
   
   if (!session) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   ```

2. **Update RLS policies** to allow authenticated users to update questions:
   ```sql
   -- In Supabase SQL Editor
   CREATE POLICY "Authenticated users can update questions"
     ON ai_generated_questions FOR UPDATE
     TO authenticated
     USING (true)  -- Or restrict to specific users
     WITH CHECK (true);
   ```

3. **Remove `SUPABASE_SERVICE_ROLE_KEY` from Vercel environment variables** for the dev project

#### Option B: Create Limited Service Role (If Service Role is Required)

1. Create a new Supabase service account with limited permissions
2. Or use a separate Supabase project with minimal data (as in Step 1)

---

### ✅ Step 4: Review and Restrict Database RLS Policies

**Current RLS Status:**

Your database has RLS enabled, but some policies are too permissive:

1. **`ai_generated_questions` table:**
   - Current: All authenticated users can read ALL questions
   - **Action:** Restrict to only approved questions or limit by user

2. **Review these policies in Supabase SQL Editor:**

```sql
-- Check current policies
SELECT * FROM pg_policies WHERE tablename = 'ai_generated_questions';

-- Example: Restrict to only approved questions
DROP POLICY IF EXISTS "Users can read all questions" ON ai_generated_questions;
CREATE POLICY "Users can read approved questions only"
  ON ai_generated_questions FOR SELECT
  TO authenticated
  USING (status = 'approved');  -- Only show approved questions
```

**Recommended Restrictions for Handover:**

```sql
-- 1. Limit question access to approved only
CREATE POLICY "Users can read approved questions only"
  ON ai_generated_questions FOR SELECT
  TO authenticated
  USING (status = 'approved');

-- 2. Prevent access to user data
-- (Your existing policies should already restrict this, but verify)

-- 3. Limit question updates to specific users (optional)
CREATE POLICY "Only admins can update questions"
  ON ai_generated_questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
```

---

### ✅ Step 5: Disable Question Generation Features

**Current State:**
- Question generation uses `GEMINI_API_KEY`
- Feature is controlled by `NEXT_PUBLIC_ENABLE_QUESTION_GENERATION`

**Action:**
1. Set `NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=false` in Vercel
2. Or remove `GEMINI_API_KEY` entirely from dev environment
3. This will hide the question generation UI and API endpoints

**Files affected:**
- `src/lib/features.ts` - Feature flag check
- `src/app/api/questions/generate/route.ts` - Generation API

---

### ✅ Step 6: Limit API Route Access

**Review these API routes for authentication:**

1. **`/api/questions/route.ts`** - Fetches all questions
   - **Current:** No authentication check
   - **Action:** Add authentication requirement

2. **`/api/question-bank/questions/route.ts`** - Question bank queries
   - **Current:** Works without auth (but filters by status)
   - **Action:** Verify it only returns approved questions

3. **`/api/question-bank/questions/[id]/route.ts`** - Updates questions
   - **Current:** Uses service role key (bypasses RLS)
   - **Action:** Replace with authenticated user (see Step 3)

**Example fix for `/api/questions/route.ts`:**

```typescript
export async function GET(request: Request) {
  const supabase = createServerClient();
  
  // Add authentication check
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Rest of the code...
  // Also add filter to only return approved questions:
  let query = supabase
    .from("ai_generated_questions")
    .select("*", { count: "exact" })
    .eq("status", "approved")  // Only approved questions
    .order("created_at", { ascending: false });
}
```

---

### ✅ Step 7: Create a Restricted User Account

**For the professional to use:**

1. **In Supabase Dashboard:**
   - Go to Authentication → Users
   - Create a new user account
   - Email: `dev@yourproject.com` (or similar)
   - Set a temporary password

2. **Optional: Create a profile with limited role:**
   ```sql
   INSERT INTO profiles (id, username, role)
   VALUES (
     '[new-user-uuid]',
     'dev-user',
     'developer'  -- Not 'admin'
   );
   ```

3. **Share only this account** with the professional

---

### ✅ Step 8: Document What to Share

**Share with Professional:**
- ✅ Git repository (or specific branch)
- ✅ Dev Supabase project URL and anon key
- ✅ Dev Vercel project URL
- ✅ Dev user account credentials
- ✅ `.env.local.example` file (without real values)

**DO NOT Share:**
- ❌ Production Supabase credentials
- ❌ Production Vercel environment variables
- ❌ Service role keys
- ❌ Production database access
- ❌ Real user data
- ❌ Production API keys (GEMINI, etc.)

---

### ✅ Step 9: Create .env.local.example File

Create a template file for the professional:

```bash
# .env.local.example
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key-here
# SUPABASE_SERVICE_ROLE_KEY=not-provided-for-security
# GEMINI_API_KEY=not-provided-for-security
NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=false
```

---

### ✅ Step 10: Code Changes Summary

**Files that need modification:**

1. **`src/app/api/question-bank/questions/[id]/route.ts`**
   - Remove service role key usage
   - Add authentication check
   - Use `createServerClient()` instead

2. **`src/app/api/questions/route.ts`**
   - Add authentication check
   - Filter to only approved questions

3. **`src/lib/features.ts`**
   - Already has feature flags (no changes needed)

4. **Database RLS Policies**
   - Update to restrict question access
   - Verify user data is protected

---

## 🔒 Security Checklist Before Handover

- [ ] Created separate Supabase dev project
- [ ] Created separate Vercel dev project
- [ ] Removed/restricted service role key access
- [ ] Updated RLS policies to limit question access
- [ ] Disabled question generation features
- [ ] Added authentication to API routes
- [ ] Created restricted user account
- [ ] Removed production credentials from code
- [ ] Created `.env.local.example` file
- [ ] Documented what to share vs. not share

---

## 📝 Quick Reference: Environment Variables

### Production (DO NOT SHARE)
```
NEXT_PUBLIC_SUPABASE_URL=https://[prod-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[prod-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[prod-service-key]  # NEVER SHARE
GEMINI_API_KEY=[prod-gemini-key]
```

### Development (SHARE THIS)
```
NEXT_PUBLIC_SUPABASE_URL=https://[dev-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[dev-anon-key]
# SUPABASE_SERVICE_ROLE_KEY=not-provided
# GEMINI_API_KEY=not-provided
NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=false
```

---

## 🚨 Critical Security Notes

1. **Service Role Key = Full Database Access**
   - Never share this key
   - It bypasses all RLS policies
   - Can read/write all data

2. **Anon Key is Public**
   - Safe to share (it's in your frontend code)
   - Protected by RLS policies
   - Make sure RLS is properly configured

3. **Question Access**
   - Currently: All authenticated users can see all questions
   - Recommended: Only approved questions, or limit by user role

4. **User Data**
   - Verify RLS policies protect user data
   - Users should only see their own data

---

## 📞 Next Steps

1. Review this guide
2. Create dev Supabase project
3. Create dev Vercel project
4. Apply code changes (Steps 3-6)
5. Test the restricted environment
6. Share only dev credentials with professional

---

## 🔍 Verification Steps

After setup, verify:

1. **Can't access production data:**
   ```bash
   # Try querying production Supabase with dev key - should fail
   ```

2. **Limited question access:**
   - Login as dev user
   - Check that only approved questions are visible
   - Verify can't see pending/rejected questions

3. **No service role access:**
   - Verify service role key is not in dev environment
   - API routes should require authentication

4. **Question generation disabled:**
   - UI should not show question generation features
   - API endpoints should return 403

---

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- Your existing files:
  - `DEPLOYMENT_GUIDE.md` - Deployment setup
  - `API_KEY_SECURITY_GUIDE.md` - API key security
  - `PROTECTED_DATA.md` - Protected tables

---

**Last Updated:** 2025-01-XX
**Version:** 1.0
