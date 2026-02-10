# Developer Handover - Quick Reference

**TL;DR:** Share GitHub access, Supabase anon key, and Vercel dev project. Keep service role keys private.

---

## ✅ What to Share

### 1. GitHub Repository ✅
- **Action:** Add developer as collaborator with **Write** access
- **Protection:** Protect `main` branch (require PR reviews)
- **Safe:** Yes - they can't push to production if branch is protected

### 2. Supabase Access ✅
- **Action:** Share these two values:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://bcbttpsokwoapjypwwwq.supabase.co
  NEXT_PUBABASE_ANON_KEY=[your-anon-key]
  ```
- **Safe:** Yes - anon key is public by design, RLS protects data
- **Alternative:** Create separate dev Supabase project (more secure)

### 3. Vercel Access ✅
- **Action:** Create separate dev project OR add as Developer to production
- **Safe:** Yes - if separate dev project, or if production branch is protected
- **Best Practice:** Separate dev project with dev environment variables

### 4. Documentation ✅
- **Action:** Share `docs/guides/` folder
- **Safe:** Yes - all documentation is safe to share

---

## ❌ What NOT to Share

- ❌ `SUPABASE_SERVICE_ROLE_KEY` - Bypasses all security
- ❌ `GEMINI_API_KEY` - Production API key (if you want to keep private)
- ❌ Production database passwords
- ❌ Your admin account credentials

---

## 📋 Quick Setup Steps

1. **GitHub:**
   - Settings → Collaborators → Add developer
   - Settings → Branches → Protect `main` branch

2. **Supabase:**
   - Share URL + anon key (or create dev project)

3. **Vercel:**
   - Create dev project OR add as Developer
   - Share dev environment variables

4. **Send Developer:**
   - Repository URL
   - Supabase credentials
   - Vercel project access
   - Link to `docs/guides/WHAT_TO_SHARE_WITH_DEVELOPER.md`

---

## 🔗 Full Guide

See **[docs/guides/WHAT_TO_SHARE_WITH_DEVELOPER.md](docs/guides/WHAT_TO_SHARE_WITH_DEVELOPER.md)** for complete details.

---

## ✅ Checklist

- [ ] GitHub: Added as collaborator, `main` branch protected
- [ ] Supabase: Credentials shared (or dev project created)
- [ ] Vercel: Dev project created (or added as developer)
- [ ] Documentation: Shared `docs/guides/` folder
- [ ] Environment: Shared `.env.local.example`
- [ ] Service Role Key: **NOT shared** ✅
- [ ] Production Keys: **NOT shared** ✅

---

**That's it!** The developer now has everything they need to work safely.
