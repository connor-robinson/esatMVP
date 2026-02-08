# Quick Handover Summary

## 🎯 What You Need to Do

### 1. **Create Separate Environments** (30 minutes)
- Create a new Supabase project for development
- Create a new Vercel project (or use preview environment)
- Copy only the database schema (not data)

### 2. **Fix Critical Security Issue** (15 minutes)
- File: `src/app/api/question-bank/questions/[id]/route.ts`
- **Problem:** Uses service role key (bypasses all security)
- **Fix:** Use authenticated user instead (see code below)

### 3. **Update Environment Variables** (10 minutes)
- Remove `SUPABASE_SERVICE_ROLE_KEY` from dev environment
- Set `NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=false`
- Use dev Supabase credentials only

### 4. **Restrict Database Access** (20 minutes)
- Update RLS policies to only show approved questions
- Verify user data is protected

### 5. **Test Restricted Access** (15 minutes)
- Login as dev user
- Verify limited question access
- Verify can't access production data

---

## 🔴 Critical Security Issues Found

### Issue #1: Service Role Key in API Route
**File:** `src/app/api/question-bank/questions/[id]/route.ts`
**Risk:** Full database access, bypasses all RLS
**Status:** ⚠️ **MUST FIX BEFORE HANDOVER**

### Issue #2: No Authentication on Questions API
**File:** `src/app/api/questions/route.ts`
**Risk:** Anyone can query all questions
**Status:** ⚠️ **SHOULD FIX**

### Issue #3: All Questions Visible
**Database:** `ai_generated_questions` table
**Risk:** All authenticated users see all questions (including pending/rejected)
**Status:** ⚠️ **SHOULD RESTRICT**

---

## 📝 Code Fixes Needed

### Fix 1: Secure Question Update Route

Replace the service role usage in `src/app/api/question-bank/questions/[id]/route.ts`:

**Current (INSECURE):**
```typescript
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {...});
```

**Fixed (SECURE):**
```typescript
import { requireRouteUser } from '@/lib/supabase/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  // Require authentication
  const { user, supabase, error } = await requireRouteUser(request);
  
  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Use authenticated client (respects RLS)
  // Rest of code...
}
```

### Fix 2: Add Authentication to Questions API

**File:** `src/app/api/questions/route.ts`

Add at the start of `GET` function:
```typescript
const supabase = createServerClient();
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}

// Also filter to only approved questions:
.eq("status", "approved")
```

### Fix 3: Update RLS Policy

Run in Supabase SQL Editor:
```sql
-- Replace the permissive policy with a restrictive one
DROP POLICY IF EXISTS "Users can read all questions" ON ai_generated_questions;
CREATE POLICY "Users can read approved questions only"
  ON ai_generated_questions FOR SELECT
  TO authenticated
  USING (status = 'approved');
```

---

## 🔑 Environment Variables to Share

**✅ Safe to Share (Dev Environment):**
```
NEXT_PUBLIC_SUPABASE_URL=https://[dev-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[dev-anon-key]
NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=false
```

**❌ NEVER Share:**
```
SUPABASE_SERVICE_ROLE_KEY  # Full database access
GEMINI_API_KEY             # Production API key
Production Supabase credentials
Production Vercel credentials
```

---

## 📋 Pre-Handover Checklist

- [ ] Created dev Supabase project
- [ ] Created dev Vercel project  
- [ ] Fixed service role key usage
- [ ] Added authentication to API routes
- [ ] Updated RLS policies
- [ ] Disabled question generation
- [ ] Created `.env.local.example`
- [ ] Tested restricted access
- [ ] Documented what to share

---

## 📚 Full Documentation

See `SECURITY_HANDOVER_GUIDE.md` for complete step-by-step instructions.

---

**Priority:** Fix the service role key issue first - it's the biggest security risk.
