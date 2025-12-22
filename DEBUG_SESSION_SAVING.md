# Debugging: Session Data Not Saving to Supabase

## Quick Checks

### 1. Are you logged in?
Open browser console (F12) and run:
```javascript
const { data } = await (await fetch('/api/auth/session')).json()
console.log('User:', data?.user?.id)
```

If it shows `undefined`, you're not logged in. Go to `/login` first.

### 2. Check Browser Console Logs

After completing a session, look for these logs in the console:

**Expected logs:**
```
[builder] failed to finalize session  // ❌ ERROR (if something went wrong)
[session-saver] Saving analytics for session: ...  // ✅ GOOD
[session-saver] Successfully saved analytics  // ✅ GOOD
```

**If you see:**
- `[finalizeSession] Skipping - no user session` → You're not logged in
- `[builder] failed to finalize session` → Database error (check error details)
- `[session-saver] Error...` → Analytics save failed (check error details)

### 3. Check Supabase Tables

Open Supabase Studio:
```bash
npx supabase studio
```

Navigate to http://localhost:54323 and check these tables:

**builder_sessions**
```sql
SELECT * FROM builder_sessions 
WHERE user_id = auth.uid() 
ORDER BY created_at DESC 
LIMIT 5;
```

**builder_attempts**
```sql
SELECT * FROM builder_attempts 
WHERE user_id = auth.uid() 
ORDER BY attempted_at DESC 
LIMIT 10;
```

**topic_progress**
```sql
SELECT * FROM topic_progress 
WHERE user_id = auth.uid();
```

**user_daily_metrics**
```sql
SELECT * FROM user_daily_metrics 
WHERE user_id = auth.uid() 
ORDER BY metric_date DESC;
```

## Common Issues

### Issue 1: Not Logged In
**Symptoms:** No data being saved, console shows "Skipping - no user session"

**Fix:**
1. Go to `/login`
2. Log in with your credentials
3. Try completing a session again

### Issue 2: Migration Not Applied
**Symptoms:** Error about "relation does not exist" or "column does not exist"

**Fix:**
```bash
cd C:/Users/anson/Desktop/nocalcMVP2_real
npx supabase db push
```

### Issue 3: RLS Policies Blocking Inserts
**Symptoms:** Error like "new row violates row-level security policy"

**Check RLS policies:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('builder_sessions', 'builder_attempts', 'topic_progress', 'user_daily_metrics');

-- Check policies
SELECT * FROM pg_policies 
WHERE tablename IN ('builder_sessions', 'builder_attempts', 'topic_progress', 'user_daily_metrics');
```

### Issue 4: Session Not Being Finalized
**Symptoms:** builder_sessions exists but ended_at is NULL

**This means:** Session started but didn't finish properly

**Possible causes:**
- Page was refreshed during session
- Browser crashed
- JavaScript error prevented finalization

## Testing Steps

1. **Start fresh session:**
   - Go to `/skills/drill`
   - Select 1-2 topics
   - Set 5 questions
   - Start session

2. **Open browser console (F12) BEFORE answering:**
   - Keep console open during entire session
   - Watch for any errors in red

3. **Complete all questions:**
   - Answer all 5 questions
   - You should see the results page

4. **Check console for logs:**
   - Look for `[session-saver]` logs
   - Copy any errors and share them

5. **Check database:**
   - Run the SQL queries above
   - Check if data appeared

## Get More Debug Info

Add this to browser console to see what's happening:
```javascript
// Override console.log to catch session-saver logs
const originalLog = console.log;
console.log = function(...args) {
  if (args[0] && args[0].includes('[session-saver]')) {
    console.warn('🔍 SESSION SAVE:', ...args);
  }
  originalLog.apply(console, args);
};

// Also catch errors
const originalError = console.error;
console.error = function(...args) {
  if (args[0] && (args[0].includes('[session-saver]') || args[0].includes('[builder]'))) {
    console.warn('❌ SESSION ERROR:', ...args);
  }
  originalError.apply(console, args);
};

console.log('✅ Debug logging enabled. Complete a session now.');
```

## Manual Database Check

If you want to see exactly what's in the database:

```sql
-- Get your user ID
SELECT auth.uid() as my_user_id;

-- Check all your sessions
SELECT 
  id,
  started_at,
  ended_at,
  attempts,
  (ended_at IS NOT NULL) as completed,
  created_at
FROM builder_sessions 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- Check your attempts
SELECT 
  session_id,
  is_correct,
  time_spent_ms,
  attempted_at
FROM builder_attempts 
WHERE user_id = auth.uid()
ORDER BY attempted_at DESC
LIMIT 20;

-- Check your topic stats
SELECT 
  topic_id,
  questions_attempted,
  questions_correct,
  ROUND((questions_correct::float / NULLIF(questions_attempted, 0) * 100)::numeric, 1) as accuracy_percent,
  average_time_ms,
  last_practiced
FROM topic_progress 
WHERE user_id = auth.uid()
ORDER BY last_practiced DESC;

-- Check your daily metrics
SELECT 
  metric_date,
  total_questions,
  correct_answers,
  ROUND((correct_answers::float / NULLIF(total_questions, 0) * 100)::numeric, 1) as accuracy_percent,
  sessions_count
FROM user_daily_metrics 
WHERE user_id = auth.uid()
ORDER BY metric_date DESC;
```

## Next Steps

Based on what you find, let me know:
1. Are you logged in? (user ID shows in console)
2. What errors appear in console? (copy them)
3. Do builder_sessions rows exist? (run the SQL above)
4. Do the sessions have ended_at filled in?
5. Do topic_progress and user_daily_metrics have any rows?

