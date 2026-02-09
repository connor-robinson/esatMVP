# How to Add Collaborator to Supabase Project

The team/collaborator feature may not be available on all Supabase plans or may be in a different location. Here are alternative ways to share access:

---

## Option 1: Share Credentials Directly (Simplest)

Since you're using the current project as dev, you can simply share:

1. **Project URL:** `https://bcbttpsokwoapjypwwwq.supabase.co`
2. **Anon Key:** (from `DEV_ACCESS_CREDENTIALS.md`)

The professional can:
- Use these credentials in their `.env.local` file
- Access the database via the Supabase client
- Work with the restricted access (only approved questions visible)

**Security:** This is safe because:
- They only have the anon key (not service role)
- RLS policies restrict what they can see
- They can't access pending questions or other users' data

---

## Option 2: Create a Separate Supabase Account

If you want dashboard access:

1. **Professional creates their own Supabase account** (free tier)
2. **You share the credentials** (URL + anon key)
3. They can use Supabase Studio (dashboard) by:
   - Going to the project URL
   - Using the anon key to authenticate
   - Or you can create a read-only database user (advanced)

---

## Option 3: Use Supabase Dashboard (If Available)

The team feature location varies by plan:

### For Free/Pro Plans:
1. Go to your Supabase Dashboard
2. Click on your project
3. Look for:
   - **Settings** → **Team** (if available)
   - **Project Settings** → **Members** (if available)
   - **Organization** → **Members** (if available)

### Alternative Locations:
- Top right corner → Your profile → **Organization Settings**
- Left sidebar → **Settings** → **Team** or **Members**
- Project overview page → **Team** tab

**Note:** Free tier may not have team collaboration features. You may need to upgrade to Pro ($25/month) for team features.

---

## Option 4: Share Database Connection (Advanced)

If you want to give them direct database access:

1. **Create a read-only database user:**
   ```sql
   -- In Supabase SQL Editor
   CREATE USER dev_user WITH PASSWORD 'secure-password-here';
   GRANT CONNECT ON DATABASE postgres TO dev_user;
   GRANT USAGE ON SCHEMA public TO dev_user;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO dev_user;
   ```

2. **Share connection string:**
   ```
   postgresql://dev_user:password@db.bcbttpsokwoapjypwwwq.supabase.co:5432/postgres
   ```

**Note:** This is more complex and usually not necessary. The anon key approach (Option 1) is simpler and safer.

---

## ✅ Recommended Approach

**Just share the credentials** (Option 1):

1. Share `DEV_ACCESS_CREDENTIALS.md` with the professional
2. They add the credentials to their `.env.local`
3. They can work normally with restricted access
4. No dashboard access needed for development work

**For dashboard access:**
- They can use Supabase Studio at: `https://supabase.com/dashboard/project/bcbttpsokwoapjypwwwq`
- But they'll need to be logged in to your account OR
- You can create a read-only database user (Option 4)

---

## 🔍 Check Your Supabase Plan

To see if you have team features:

1. Go to Supabase Dashboard
2. Click on your profile (top right)
3. Check **Organization** or **Billing**
4. See what plan you're on

**Free tier** typically doesn't include team collaboration. You'd need:
- **Pro plan** ($25/month) for team features
- Or use credential sharing (Option 1) instead

---

## 📝 What to Share

**Minimum (Recommended):**
- Project URL: `https://bcbttpsokwoapjypwwwq.supabase.co`
- Anon Key: (from credentials file)
- `.env.local.example` file

**Optional (if they need dashboard):**
- Your Supabase account login (not recommended)
- Or create read-only database user

---

## 🛡️ Security Note

Sharing the anon key is **safe** because:
- ✅ It's designed to be public (used in frontend code)
- ✅ RLS policies restrict access
- ✅ They can't see pending questions
- ✅ They can't see other users' data
- ✅ They don't have service role key

The anon key is already exposed in your frontend code, so sharing it is standard practice.

---

**Bottom line:** Just share the credentials from `DEV_ACCESS_CREDENTIALS.md` - that's all they need to work!
