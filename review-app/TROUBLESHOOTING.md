# Troubleshooting Guide

## Common Issues and Solutions

### 500 Error When Saving Questions

If you see a 500 error when trying to save changes, check the following:

#### 1. Environment Variables

**Check if environment variables are set:**

In your Vercel project:
1. Go to Project Settings → Environment Variables
2. Verify these are set:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key

**To check locally:**
Create a `.env.local` file in `review-app/` directory:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

#### 2. Supabase Connection

**Check Supabase project status:**
- Go to https://app.supabase.com
- Verify your project is active (not paused)
- Check if you can access the database

#### 3. Database Permissions (RLS Policies)

**Check Row Level Security policies:**

The `ai_generated_questions` table needs policies that allow:
- **SELECT**: To read questions
- **UPDATE**: To update questions

Run this in Supabase SQL Editor to check:
```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'ai_generated_questions';

-- If no UPDATE policy exists, create one:
CREATE POLICY "Allow authenticated users to update questions"
ON ai_generated_questions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
```

#### 4. Check Vercel Logs

1. Go to your Vercel project dashboard
2. Click on the deployment
3. Go to "Functions" tab
4. Click on the failed function (`/api/review/[id]/update`)
5. Check the logs for detailed error messages

#### 5. Check Browser Console

1. Open browser DevTools (F12)
2. Go to "Console" tab
3. Look for detailed error messages
4. Go to "Network" tab
5. Click on the failed request
6. Check the "Response" tab for error details

### Common Error Messages

#### "Missing Supabase environment variables"
- **Solution**: Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel

#### "Failed to update question" with code "42501"
- **Solution**: RLS policy issue - check database permissions

#### "Failed to update question" with code "23505"
- **Solution**: Unique constraint violation - check for duplicate data

#### "Failed to update question" with code "23503"
- **Solution**: Foreign key violation - check referenced data exists

#### "Question not found"
- **Solution**: The question ID doesn't exist in the database

### Debugging Steps

1. **Check environment variables are loaded:**
   - The API route now logs whether env vars are present
   - Check Vercel function logs

2. **Verify Supabase connection:**
   - Test the connection in Supabase dashboard
   - Check if other API routes work (e.g., `/api/review/questions`)

3. **Test with a simple update:**
   - Try updating just one field (e.g., `question_stem`)
   - See if the error persists

4. **Check data format:**
   - Ensure `options` is a valid JSON object
   - Ensure `distractor_map` is a valid JSON object or null
   - Check for special characters that might break JSON

5. **Verify user authentication:**
   - If using auth, ensure user is logged in
   - Check `reviewed_by` field requirements

### Getting More Information

The updated error handling now provides:
- Detailed error messages in browser console
- Full error objects in Vercel function logs
- Environment variable status
- Supabase error codes and hints

Check these locations for detailed error information:
1. Browser Console (F12 → Console)
2. Browser Network Tab (F12 → Network → Click failed request)
3. Vercel Function Logs (Dashboard → Deployment → Functions)

