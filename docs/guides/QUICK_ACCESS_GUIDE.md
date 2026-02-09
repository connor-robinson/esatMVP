# Quick Access Sharing Guide

**TL;DR:** Create separate dev environments, give Developer (not Owner) access, keep production isolated.

---

## 🎯 Recommended Approach

### ✅ DO THIS:

1. **Create Dev Supabase Project**
   - New project in Supabase dashboard
   - Name: `nocalc-dev`
   - Copy schema only (run migrations)
   - Add 10-20 test questions

2. **Create Dev Vercel Project**
   - New project in Vercel
   - Connect to `dev` branch
   - Use dev Supabase credentials

3. **Add Professional as Developer**
   - Supabase: Project Settings → Team → Invite → Role: **Developer**
   - Vercel: Project Settings → Collaborators → Add → Role: **Developer**

4. **Share Only Dev Access**
   - Dev Supabase project
   - Dev Vercel project
   - Dev branch of repository

### ❌ DON'T DO THIS:

- Share production Supabase access
- Share production Vercel access
- Give Owner/Admin role
- Share service role keys
- Share production API keys

---

## 📦 Quick Backup Steps

### Option 1: Use Your Migrations (Easiest)

Your migrations in `supabase/migrations/` are already a backup!

```bash
# Just copy the folder
cp -r supabase/migrations backups/migrations_$(date +%Y%m%d)
```

### Option 2: Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Run: `SELECT * FROM pg_tables WHERE schemaname = 'public';`
3. Export table structures

### Option 3: pg_dump (Most Complete)

**Windows (PowerShell):**
```powershell
.\backup_database.ps1
```

**Mac/Linux:**
```bash
chmod +x backup_database.sh
./backup_database.sh
```

**Manual:**
```bash
# Get connection string from Supabase Dashboard → Settings → Database
pg_dump -h [HOST] -U postgres -d postgres --schema-only > backup.sql
```

---

## 🔐 Access Levels Explained

### Supabase Roles:

- **Owner**: Full control, can delete project, change billing
- **Admin**: Almost full control, can't delete project
- **Developer**: Can read/write database, view logs, can't delete project
- **Viewer**: Read-only access

**Recommendation:** Use **Developer** role

### Vercel Roles:

- **Owner**: Full control
- **Admin**: Can manage everything except billing
- **Developer**: Can deploy, view logs, manage env vars
- **Viewer**: Read-only

**Recommendation:** Use **Developer** role

---

## ✅ Quick Checklist

### Before Sharing:

- [ ] Created dev Supabase project
- [ ] Created dev Vercel project
- [ ] Backed up production database
- [ ] Copied schema to dev project
- [ ] Added professional as Developer (not Owner)
- [ ] Set dev environment variables
- [ ] Tested dev environment works
- [ ] Documented what was shared

### What to Share:

- [ ] Dev Supabase project access
- [ ] Dev Vercel project access
- [ ] Repository access (dev branch)
- [ ] Test user credentials
- [ ] Documentation files

### What NOT to Share:

- [ ] Production Supabase credentials
- [ ] Production Vercel credentials
- [ ] Service role keys
- [ ] Production API keys
- [ ] Real user data

---

## 🚀 Quick Setup (15 minutes)

### 1. Create Dev Supabase (5 min)

1. Supabase Dashboard → New Project
2. Name: `nocalc-dev`
3. Copy migrations from `supabase/migrations/`
4. Run in SQL Editor

### 2. Create Dev Vercel (5 min)

1. Vercel Dashboard → New Project
2. Import repo, connect to `dev` branch
3. Set env vars:
   ```
   NEXT_PUBLIC_SUPABASE_URL=[dev-project-url]
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[dev-anon-key]
   NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=false
   ```

### 3. Add Collaborator (5 min)

1. Supabase: Settings → Team → Invite → Developer
2. Vercel: Settings → Collaborators → Add → Developer
3. Share credentials document

---

## 📝 Access Document Template

Create `DEV_ACCESS.md`:

```markdown
# Development Environment Access

## Supabase
- Project: nocalc-dev
- URL: https://[dev-id].supabase.co
- Role: Developer
- Anon Key: [dev-key]

## Vercel
- Project: nocalc-dev
- URL: https://[dev].vercel.app
- Branch: dev
- Role: Developer

## Repository
- Branch: dev
- Access: Read/Write

## Restrictions
- No production access
- Cannot delete projects
- Cannot change billing
```

---

## 🔄 Revoking Access Later

**Supabase:**
- Settings → Team → Remove user

**Vercel:**
- Settings → Collaborators → Remove

**Repository:**
- Settings → Collaborators → Remove

---

## ❓ FAQ

**Q: Should I give them production access?**
A: No. Create separate dev environment.

**Q: Can they delete my data?**
A: Not if you use Developer role and separate dev project.

**Q: What if they need production access?**
A: They shouldn't. Use dev environment for all work.

**Q: How do I backup?**
A: Use migrations folder or pg_dump (see backup scripts).

**Q: Should I give Vercel access?**
A: Yes, but to dev project only, as Developer role.

---

## 📚 Full Documentation

For detailed steps, see:
- `SAFE_ACCESS_SHARING_GUIDE.md` - Complete guide
- `SECURITY_HANDOVER_GUIDE.md` - Security setup
- `IMPLEMENTATION_STEPS.md` - Step-by-step

---

**Bottom Line:** Separate dev environment + Developer role = Safe handover ✅
