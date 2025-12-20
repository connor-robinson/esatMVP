# Mental Maths Analytics - Testing Guide

## What Was Changed

### 1. Session Data Saving (✅ Completed)
- **Created** `src/lib/analytics/session-saver.ts` - Comprehensive session analytics saver
- **Updated** `src/hooks/useBuilderSession.ts` - Now calls `saveSessionAnalytics()` on session completion
- **Features**:
  - Calculates per-topic stats (questions attempted, correct, avg time)
  - Updates `topic_progress` table incrementally (proper weighted averages)
  - Updates `user_daily_metrics` table for daily aggregation
  - Handles both new records and updates to existing records

### 2. Database Schema (✅ Completed)
- **Created** migration `supabase/migrations/20251221000000_create_user_daily_metrics_table.sql`
- **Added** `user_daily_metrics` table for daily aggregated stats:
  - `total_questions`, `correct_answers`, `total_time_ms`, `sessions_count`
  - Indexed by user_id and metric_date for fast queries
  - RLS policies enabled
- **Updated** `src/lib/supabase/types.ts` with new table types

### 3. Analytics Page UI (✅ Completed)
- **Removed** duplicate "Your Analytics" header and description text
- **Made card titles more prominent**:
  - Changed from `text-sm font-semibold` to `text-base font-bold`
  - Increased opacity from `text-white/70` to `text-white/80`
  - Applies to: StatsHero, TopicsOverviewSection, Leaderboard, PerformanceChartsSection, PastSessionsSection

### 4. Leaderboard Functionality (✅ Completed)
- **Updated** `fetchLeaderboard()` function to support topic filtering
- **Added** `selectedTopic` parameter - filters by specific topic or shows "all"
- **Fixed** leaderboard refresh on topic selection change
- **Filtered** out users with zero questions answered

### 5. Topic Performance Tracking (✅ Completed)
- Topic stats are now properly calculated and saved per session
- Per-topic breakdown is saved and updated in `topic_progress` table
- Analytics page now properly reflects topic-level performance

## How to Test

### Prerequisites
1. **Start Docker Desktop** (required for Supabase)
2. **Start Supabase**:
   ```bash
   npx supabase start
   ```
3. **Apply migrations**:
   ```bash
   npx supabase db push
   ```

### Clear Test Data
1. **Run the clear data script**:
   ```bash
   npx supabase db execute -f supabase/scripts/clear_test_data.sql
   ```

### Test Session Flow
1. **Start the dev server**:
   ```bash
   npm run dev
   ```
2. **Login** to the app
3. **Go to Skills > Drill** (`/skills/drill`)
4. **Create a session**:
   - Select 2-3 topics (e.g., Addition Fast, Multiplication)
   - Set question count to 10-20
   - Start the session
5. **Complete the session**:
   - Answer all questions (mix of correct and incorrect)
   - Note the variety of topics
6. **Check the results page**:
   - Should show overall stats
   - Should show per-topic breakdown
7. **Go to Skills > Analytics** (`/skills/analytics`)
8. **Verify Personal View**:
   - ✅ Total questions should match what you completed
   - ✅ Accuracy should be calculated correctly
   - ✅ Average speed should be shown
   - ✅ Topic Performance should show your strongest/weakest topics
   - ✅ Topics Overview should list all topics you practiced
9. **Verify Global View**:
   - ✅ Switch to "Global" tab
   - ✅ Select "All Topics" - should show your entry
   - ✅ Select a specific topic - leaderboard should update
   - ✅ Your entry should be highlighted
10. **Complete another session** with different topics/results
11. **Verify analytics updates**:
    - ✅ Total questions should increase
    - ✅ Accuracy should update (weighted average)
    - ✅ Topic stats should update correctly
    - ✅ Performance charts should show data points
    - ✅ Leaderboard should reflect new data

### Database Verification
1. **Open Supabase Studio**:
   ```bash
   npx supabase studio
   ```
   Navigate to http://localhost:54323

2. **Check tables**:
   - `builder_sessions` - should have your session records
   - `builder_attempts` - should have individual question attempts
   - `topic_progress` - should have per-topic stats
   - `user_daily_metrics` - should have today's aggregated stats

3. **Run SQL queries** (in SQL Editor):
   ```sql
   -- Check your topic progress
   SELECT * FROM topic_progress WHERE user_id = auth.uid();
   
   -- Check your daily metrics
   SELECT * FROM user_daily_metrics WHERE user_id = auth.uid();
   
   -- Check your sessions
   SELECT * FROM builder_sessions WHERE user_id = auth.uid() ORDER BY created_at DESC;
   ```

## Known Issues / Limitations
- Daily metrics table is new, so historical data won't exist for past days
- Leaderboard uses first 8 chars of user_id for other users (could be improved with user profiles)
- Streak calculation is not yet implemented (shows 0)
- Past sessions section uses mock data (needs to query actual sessions)

## Next Steps (Future Improvements)
1. Implement streak calculation (consecutive days with practice)
2. Pull real session data for Past Sessions section
3. Add user profile names to leaderboard
4. Implement topic performance charts (accuracy/speed over time per topic)
5. Add session replay/review functionality
6. Implement achievements/badges system

