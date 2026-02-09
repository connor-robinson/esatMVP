# Pre-Handover Checklist

Review this checklist before sharing your codebase with the professional developer.

---

## ✅ Security Issues (CRITICAL)

### 1. API Keys & Credentials
- [x] **Service role key** - NOT in code (good!)
- [x] **Anon key** - Safe to share (public by design)
- [ ] **GEMINI_API_KEY** - Check if hardcoded anywhere (should be in .env only)
- [ ] **Any other API keys** - Verify not hardcoded

**Action:** Search for: `AIza`, `eyJ`, `sk-`, `pk_`, `ghp_`, `xoxb-`

### 2. Environment Variables
- [x] `.env.local` in `.gitignore` (good!)
- [x] `.env.local.example` created (good!)
- [ ] Verify no `.env` files are committed
- [ ] Check for hardcoded env values in code

**Action:** Run: `git ls-files | grep -E '\.env'`

### 3. Database Access
- [x] RLS policies applied (good!)
- [x] Question access restricted (good!)
- [ ] Service role key removed from API routes (see `HANDOVER_SUMMARY.md`)
- [ ] Authentication added to API routes

---

## 📝 Code Quality Issues

### 4. TODO/FIXME Comments
- [ ] Review all TODO comments
- [ ] Remove or document critical TODOs
- [ ] Check for sensitive information in comments

**Files with TODOs:**
- `src/app/page.tsx`
- `src/app/papers/mark/page.tsx`
- `src/app/papers/analytics/page.tsx`
- `src/app/api/question-bank/questions/[id]/route.ts` (has TODO about auth)

### 5. Console Logs
- [ ] Review console.log statements
- [ ] Remove debug logs with sensitive data
- [ ] Consider using a logging library for production

**Note:** Many console.logs found - review for sensitive data

### 6. Test/Debug Code
- [ ] Remove test data
- [ ] Remove debug endpoints
- [ ] Remove development-only features
- [ ] Check for `__DEV__` or `NODE_ENV === 'development'` blocks

---

## 🗂️ Files to Review/Remove

### 7. Documentation Files
**Keep (Share with professional):**
- ✅ `SECURITY_HANDOVER_GUIDE.md`
- ✅ `HANDOVER_SUMMARY.md`
- ✅ `SIMPLE_HANDOVER_INSTRUCTIONS.md`
- ✅ `DEV_ACCESS_CREDENTIALS.md`
- ✅ `BRAND_CONFIGURATION.md`

**Review (May contain sensitive info):**
- ⚠️ `API_KEY_SECURITY_GUIDE.md` - Contains old API key reference
- ⚠️ `DEV_ACCESS_CREDENTIALS.md` - Contains actual credentials (intentional for handover)

**Remove/Don't Share:**
- ❌ `supabase_backups/` - Contains actual data backups
- ❌ `commit_files.txt` - May contain sensitive info
- ❌ `files_to_restore.txt` - May contain sensitive info
- ❌ Any `.env` files (already in .gitignore)

### 8. Backup Files
- [ ] Remove `supabase_backups/` folder (contains real data)
- [ ] Remove any backup SQL files
- [ ] Remove any backup JSON files with real data

**Action:** Add to `.gitignore` if not already there

### 9. Python Scripts
**Review these files:**
- `apply_restructure_migrations.py`
- `apply_rls_fix.py`
- `apply_rls_direct.py`
- `apply_review_rls_fix.py`
- `question_status_viewer.py`
- `check_junk.py`

**Check for:**
- Hardcoded credentials
- Service role keys
- Personal information

---

## 🔍 Content Review

### 10. Brand Names
- [x] All "CantabPrep" replaced with "NoCalc" (good!)
- [x] Centralized brand config created (good!)
- [ ] Check for any remaining old brand names

### 11. Personal Information
- [ ] Check for personal emails in code
- [ ] Check for personal names
- [ ] Check for personal URLs
- [ ] Review homepage content for personal info

**Files to check:**
- `src/app/page.tsx`
- `homepage/homepage1.html`
- `homepage/homepage2.html`

### 12. Placeholder Content
- [ ] Replace placeholder text
- [ ] Replace placeholder images
- [ ] Replace placeholder links (`#`, `href="#"`)
- [ ] Check for "Lorem ipsum" or similar

---

## 🚨 Critical Issues Found

### ⚠️ Issue 1: Service Role Key in API Route
**File:** `src/app/api/question-bank/questions/[id]/route.ts`
**Status:** ⚠️ **MUST FIX**
**Action:** Replace with secure version from `SECURE_QUESTION_UPDATE_EXAMPLE.ts`

### ⚠️ Issue 2: API Key Reference in Documentation
**File:** `API_KEY_SECURITY_GUIDE.md`
**Status:** Contains old API key (revoked, but should be removed)
**Action:** Remove or redact the old key

### ⚠️ Issue 3: Backup Files
**Location:** `supabase_backups/`
**Status:** Contains real database data
**Action:** Remove or add to `.gitignore`

---

## ✅ What's Already Good

- ✅ `.env.local` in `.gitignore`
- ✅ Brand names centralized
- ✅ RLS policies applied
- ✅ Security documentation created
- ✅ Credentials document prepared
- ✅ No hardcoded service role keys in main code

---

## 📋 Recommended Actions Before Handover

### Priority 1 (Must Do):
1. [ ] Fix service role key usage in API route
2. [ ] Remove or redact old API key from `API_KEY_SECURITY_GUIDE.md`
3. [ ] Remove `supabase_backups/` folder or add to `.gitignore`
4. [ ] Review and remove any hardcoded credentials

### Priority 2 (Should Do):
5. [ ] Review TODO comments for sensitive info
6. [ ] Review console.logs for sensitive data
7. [ ] Check for personal information in code
8. [ ] Remove test/debug code

### Priority 3 (Nice to Have):
9. [ ] Clean up placeholder content
10. [ ] Review documentation files
11. [ ] Add comments explaining complex code
12. [ ] Verify all links work

---

## 🔍 Quick Verification Commands

```bash
# Check for hardcoded API keys
grep -r "AIza\|eyJ\|sk-\|pk_\|ghp_\|xoxb-" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/

# Check for .env files (should return nothing)
git ls-files | grep -E '\.env'

# Check for TODO comments
grep -r "TODO\|FIXME\|HACK" --include="*.ts" --include="*.tsx" src/

# Check for console.logs with sensitive data
grep -r "console\.log.*password\|console\.log.*key\|console\.log.*secret" --include="*.ts" --include="*.tsx" src/
```

---

## 📝 Files to Share

**Essential:**
- Repository code
- `DEV_ACCESS_CREDENTIALS.md`
- `SIMPLE_HANDOVER_INSTRUCTIONS.md`
- `BRAND_CONFIGURATION.md`

**Helpful:**
- `SECURITY_HANDOVER_GUIDE.md`
- `HANDOVER_SUMMARY.md`
- `.env.local.example`

**Don't Share:**
- `supabase_backups/`
- Any `.env` files
- `commit_files.txt`
- `files_to_restore.txt`
- Personal notes/documentation

---

**Last Updated:** 2025-01-XX
