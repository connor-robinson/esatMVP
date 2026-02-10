# What to Share with Developer - Complete Guide

This guide outlines exactly what you can and should share with a professional developer for handover.

---

## ✅ YES - Safe to Share

### 1. **GitHub Repository Access** ✅

**Option A: Full Repository Access (Recommended)**
- Add them as a **Collaborator** with **Write** access
- They can clone, push, create branches, open PRs
- **Protect your `main` branch** so they can't push directly to production

**How to add:**
1. Go to your GitHub repository
2. Settings → Collaborators → Add people
3. Enter their GitHub username/email
4. Grant **Write** access
5. **Important:** Go to Settings → Branches → Add rule for `main` branch
   - Require pull request reviews
   - Require status checks
   - Restrict pushes to admins only

**Option B: Fork Access (More Secure)**
- They fork your repository
- Work on their fork
- Submit pull requests to your repo
- You review and merge

**What they get:**
- ✅ Full codebase
- ✅ Git history
- ✅ All documentation
- ✅ Can work on features
- ❌ Can't push to `main` (if protected)

---

### 2. **Vercel Access** ✅

**Option A: Separate Dev Project (STRONGLY RECOMMENDED)**

1. **Create a new Vercel project:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Add New → Project
   - Import your GitHub repository
   - Create from a `dev` or `staging` branch
   - Name it: `nocalc-dev` or `nocalc-staging`

2. **Set Dev Environment Variables:**
   - Use dev Supabase credentials (see below)
   - Don't include production keys
   - Add only what's needed for development

3. **Add Developer as Collaborator:**
   - Project Settings → Collaborators
   - Add their email
   - Role: **Developer** (not Owner)
   - They can deploy to preview branches only

**Option B: Share Production Project (Less Secure)**

⚠️ **Only if you can't create a separate project:**
- Add them as **Developer** (not Owner)
- They can deploy to preview branches
- **Protect production branch:**
  - Settings → Git → Production Branch: `main`
  - Only you can deploy to `main`
- They can see environment variables (⚠️ includes production keys)

**What they get:**
- ✅ Can deploy preview deployments
- ✅ Can view logs
- ✅ Can test features
- ❌ Can't delete project
- ❌ Can't change billing
- ❌ Can't deploy to production (if protected)

---

### 3. **Supabase Access** ✅

**Option A: Share Credentials Only (Simplest & Safe)**

Just share these two values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://bcbttpsokwoapjypwwwq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Why this is safe:**
- ✅ Anon key is designed to be public (already in your frontend code)
- ✅ RLS policies protect data access
- ✅ They can only see approved questions
- ✅ They can't see other users' data
- ✅ They don't have service role key

**What they can do:**
- ✅ Use Supabase client in their code
- ✅ Query approved questions
- ✅ Test features locally
- ✅ Work with restricted data access

**What they can't do:**
- ❌ See pending/rejected questions
- ❌ See other users' data
- ❌ Bypass RLS policies
- ❌ Access service role key

**Option B: Add as Team Member (If Available)**

If you have Supabase Pro plan:
1. Go to Supabase Dashboard → Your Project
2. Settings → Team
3. Invite Team Member
4. Role: **Developer** (not Owner)

**Option C: Create Separate Dev Project (Best Practice)**

1. Create new Supabase project: `nocalc-dev`
2. Run migrations from `supabase/migrations/`
3. Add test data (10-20 questions, no real users)
4. Share dev project credentials
5. Add developer as team member

---

### 4. **Environment Variables Template** ✅

Share `.env.local.example` or create a template:

```env
# Supabase (Safe to share - anon key)
NEXT_PUBLIC_SUPABASE_URL=https://bcbttpsokwoapjypwwwq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Feature Flags
NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=false

# Node Environment
NODE_ENV=development
```

**DO NOT share:**
- ❌ `SUPABASE_SERVICE_ROLE_KEY` (production)
- ❌ `GEMINI_API_KEY` (if you want to keep it private)
- ❌ Any production-only keys

---

### 5. **Documentation** ✅

Share these documentation files:
- ✅ `README.md` - Main project documentation
- ✅ `docs/guides/` - All active guides
- ✅ `docs/README.md` - Documentation index
- ✅ `RESTRUCTURE_SUMMARY.md` - Project structure overview

---

## ❌ NO - Do NOT Share

### 1. **Service Role Keys** ❌
- `SUPABASE_SERVICE_ROLE_KEY` - Bypasses all security
- Never share this with anyone
- Only use in server-side code you control

### 2. **Production API Keys** ❌
- `GEMINI_API_KEY` - If you want to keep it private
- Any other production API keys
- Database passwords

### 3. **Production Database Access** ❌
- Direct database connection strings
- Production database credentials
- Real user data

### 4. **Admin Account Credentials** ❌
- Your Supabase account login
- Your Vercel account login
- Your GitHub account password

---

## 📋 Recommended Sharing Checklist

### Minimum Setup (Simplest):

- [ ] **GitHub:** Add as collaborator with write access
- [ ] **Supabase:** Share URL + anon key (credentials only)
- [ ] **Vercel:** Share dev project OR add as developer to production
- [ ] **Documentation:** Share `docs/guides/` folder
- [ ] **Environment:** Share `.env.local.example`

### Ideal Setup (Most Secure):

- [ ] **GitHub:** Add as collaborator, protect `main` branch
- [ ] **Supabase:** Create separate dev project, share dev credentials
- [ ] **Vercel:** Create separate dev project, share dev access
- [ ] **Documentation:** Share all guides
- [ ] **Test Data:** Seed dev database with test questions

---

## 🎯 Quick Start Package for Developer

Create a file called `DEVELOPER_SETUP.md` with:

```markdown
# Developer Setup Guide

## 1. Clone Repository
```bash
git clone [your-repo-url]
cd nocalcMVP2_real
```

## 2. Install Dependencies
```bash
npm install
```

## 3. Environment Variables
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://bcbttpsokwoapjypwwwq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key-here]
NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=false
NODE_ENV=development
```

## 4. Run Development Server
```bash
npm run dev
```

## 5. Access
- Local: http://localhost:3000
- Vercel Preview: [preview-url]
- Supabase Dashboard: [dashboard-url]

## Documentation
See `docs/README.md` for full documentation.
```

---

## 🔒 Security Summary

### What's Safe:
- ✅ GitHub repository (with branch protection)
- ✅ Supabase anon key (public by design)
- ✅ Vercel preview deployments
- ✅ Documentation files
- ✅ Environment variable templates

### What's NOT Safe:
- ❌ Service role keys
- ❌ Production API keys
- ❌ Admin account credentials
- ❌ Direct database access

---

## 📝 What to Send Developer

**Email or message with:**

1. **GitHub Repository:**
   ```
   Repository: [your-github-repo-url]
   Access: You've been added as collaborator
   Branch Protection: main branch is protected
   ```

2. **Supabase Credentials:**
   ```
   URL: https://bcbttpsokwoapjypwwwq.supabase.co
   Anon Key: [anon-key]
   Note: This is safe to share - RLS policies protect data
   ```

3. **Vercel Access:**
   ```
   Project: [project-name]
   Preview URL: [preview-url]
   Access: You've been added as developer
   ```

4. **Documentation:**
   ```
   See docs/README.md for full documentation
   Key guides in docs/guides/
   ```

5. **Setup Instructions:**
   ```
   See DEVELOPER_SETUP.md (create this file)
   ```

---

## ✅ Final Recommendation

**Best Practice Setup:**

1. ✅ **GitHub:** Full access, protect `main` branch
2. ✅ **Supabase:** Share anon key only (or create dev project)
3. ✅ **Vercel:** Separate dev project OR add as developer with branch protection
4. ✅ **Documentation:** Share all guides
5. ✅ **Environment:** Share template, not production keys

**This gives them:**
- Everything they need to work
- No access to production secrets
- Safe development environment
- Easy to revoke access later

---

## 🚨 Important Notes

1. **Protect Main Branch:**
   - Require PR reviews
   - Require status checks
   - No direct pushes

2. **Monitor Activity:**
   - Check GitHub commits
   - Review Vercel deployments
   - Monitor Supabase logs (if possible)

3. **Set Expiration:**
   - Document when access expires
   - Revoke access when project ends
   - Change passwords if shared

4. **Document Everything:**
   - What access was granted
   - What they can/can't do
   - How to revoke access

---

**Bottom Line:** You can safely share GitHub, Vercel (dev project), and Supabase anon key. Keep service role keys and production secrets private.
