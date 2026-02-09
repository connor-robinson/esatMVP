# Development Environment Access Credentials

**Project:** NocalcProject (Using as Dev Environment)  
**Created:** 2025-01-XX  
**Status:** ✅ Security policies applied

---

## 🔐 Supabase Credentials

### Project Details
- **Project Name:** NocalcProject
- **Project ID:** `bcbttpsokwoapjypwwwq`
- **Project URL:** `https://bcbttpsokwoapjypwwwq.supabase.co`
- **Region:** eu-west-2

### API Keys
- **Anon Key (Publishable):** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjYnR0cHNva3dvYXBqeXB3d3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDY3NjgsImV4cCI6MjA3NDIyMjc2OH0.wqyQBq5xL3Q0J7iOLYtNgGk1aWQBqrfT2ADVD6VHi78`

⚠️ **IMPORTANT:** Service role key is NOT provided for security reasons.

---

## 🔒 Security Restrictions Applied

### Question Access
- ✅ **Authenticated users** can only see questions with `status = 'approved'`
- ✅ **Anonymous users** can only see approved questions
- ✅ Pending/rejected questions are hidden
- ✅ User data is protected by RLS (users only see their own data)

### Current Question Status
- **Pending:** 1,179 questions (hidden from view)
- **Deleted:** 2 questions (hidden from view)
- **Approved:** 0 questions (visible when status changes to approved)

**Note:** The professional will only see questions once they are approved. This is intentional for security.

---

## 📋 What the Professional Can Access

### ✅ Allowed:
- View approved questions only
- Read database schema (tables, columns, indexes)
- View their own user data (if authenticated)
- Update questions (if authenticated, respects RLS)
- Access Supabase dashboard (if added as team member)

### ❌ Restricted:
- Cannot see pending/rejected questions
- Cannot see other users' data
- Cannot access service role key
- Cannot delete protected tables
- Cannot modify production data without authentication

---

## 🚀 Setup Instructions for Professional

### 1. Environment Variables

Create `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://bcbttpsokwoapjypwwwq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjYnR0cHNva3dvYXBqeXB3d3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDY3NjgsImV4cCI6MjA3NDIyMjc2OH0.wqyQBq5xL3Q0J7iOLYtNgGk1aWQBqrfT2ADVD6VHi78
NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=false
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Access Application

Open [http://localhost:3000](http://localhost:3000)

---

## 🔍 Verification Queries

### Check RLS Policies
```sql
SELECT policyname, cmd, roles, qual
FROM pg_policies 
WHERE tablename = 'ai_generated_questions';
```

### Test Question Access (as authenticated user)
```sql
-- Should only return approved questions
SELECT id, status, question_stem 
FROM ai_generated_questions;
```

### Check Question Status Distribution
```sql
SELECT status, COUNT(*) as count
FROM ai_generated_questions
GROUP BY status;
```

---

## 📝 Important Notes

1. **No Approved Questions Yet:** Currently 0 approved questions exist. The professional will need to approve some questions first, or you can approve some before handover.

2. **Service Role Key:** Not provided. The professional should use authenticated user access instead.

3. **User Data Protection:** All user data tables have RLS enabled. Users can only see their own data.

4. **Question Updates:** The professional can update questions if authenticated, but the API route should be updated to remove service role key usage (see `HANDOVER_SUMMARY.md`).

5. **Storage Buckets:** If you have storage buckets, they may need separate configuration.

---

## 🛡️ Security Checklist

- [x] RLS policies restrict question access to approved only
- [x] Anonymous access restricted
- [x] User data protected by RLS
- [x] Service role key not shared
- [ ] API routes updated to remove service role usage (see `SECURE_QUESTION_UPDATE_EXAMPLE.ts`)
- [ ] Professional added as team member (Developer role) in Supabase dashboard
- [ ] Test user account created for professional

---

## 📞 Next Steps

1. **Add Professional as Team Member:**
   - Go to Supabase Dashboard → Project Settings → Team
   - Click "Invite Team Member"
   - Enter professional's email
   - Role: **Developer** (not Owner)
   - They'll receive an invitation email

2. **Create Test User Account:**
   - Professional can create their own account
   - Or you can create one in Supabase Dashboard → Authentication → Users

3. **Approve Some Questions (Optional):**
   - If you want the professional to see questions immediately
   - Update some questions to `status = 'approved'`

4. **Review Code Security:**
   - Update API routes to remove service role key usage
   - See `HANDOVER_SUMMARY.md` for details

---

## 📚 Related Documentation

- `SECURITY_HANDOVER_GUIDE.md` - Complete security guide
- `HANDOVER_SUMMARY.md` - Quick reference
- `SAFE_ACCESS_SHARING_GUIDE.md` - Access sharing best practices
- `SECURE_QUESTION_UPDATE_EXAMPLE.ts` - Secure API route example

---

**Last Updated:** 2025-01-XX  
**Security Status:** ✅ Protected
