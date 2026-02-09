# Simple Handover Instructions

Since team features aren't available, here's the simplest way to share access:

---

## ✅ What to Share (Just These 2 Things)

### 1. Project URL
```
https://bcbttpsokwoapjypwwwq.supabase.co
```

### 2. Anon Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjYnR0cHNva3dvYXBqeXB3d3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDY3NjgsImV4cCI6MjA3NDIyMjc2OH0.wqyQBq5xL3Q0J7iOLYtNgGk1aWQBqrfT2ADVD6VHi78
```

**That's it!** They can use these in their `.env.local` file.

---

## 🔒 Why This is Safe

1. **Anon key is public by design** - It's already in your frontend code
2. **RLS policies protect data** - They can only see approved questions
3. **No service role key** - They can't bypass security
4. **User data protected** - RLS ensures users only see their own data

---

## 📝 For the Professional

### Setup Steps:

1. **Create `.env.local` file:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://bcbttpsokwoapjypwwwq.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjYnR0cHNva3dvYXBqeXB3d3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDY3NjgsImV4cCI6MjA3NDIyMjc2OH0.wqyQBq5xL3Q0J7iOLYtNgGk1aWQBqrfT2ADVD6VHi78
   NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=false
   ```

2. **Install and run:**
   ```bash
   npm install
   npm run dev
   ```

3. **That's it!** They can now work with restricted access.

---

## 🚫 What They CAN'T Do

- ❌ See pending/rejected questions (only approved)
- ❌ See other users' data
- ❌ Access service role key
- ❌ Bypass RLS policies
- ❌ Delete protected tables

---

## ✅ What They CAN Do

- ✅ See approved questions only
- ✅ Work on the codebase
- ✅ Test features
- ✅ View their own data (if authenticated)
- ✅ Update questions (if authenticated, respects RLS)

---

## 📊 Current Status

- **Pending questions:** 1,179 (hidden)
- **Approved questions:** 0 (visible when approved)
- **Security:** ✅ RLS policies active

**Note:** They won't see any questions until you approve some. If you want them to see questions immediately, you can approve a few:

```sql
-- In Supabase SQL Editor
UPDATE ai_generated_questions 
SET status = 'approved' 
WHERE status = 'pending' 
LIMIT 20;
```

---

## 🎯 Bottom Line

**Just share the URL and anon key** - that's all they need! The security is already in place via RLS policies.

No team section needed. No dashboard access needed. Just the credentials.

---

**Files to share:**
- This file (`SIMPLE_HANDOVER_INSTRUCTIONS.md`)
- `DEV_ACCESS_CREDENTIALS.md` (for reference)
- The repository code

That's it! 🎉
