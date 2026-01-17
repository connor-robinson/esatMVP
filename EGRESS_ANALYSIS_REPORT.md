# Egress Usage Analysis Report

**Generated:** 2025-01-27  
**Project:** NocalcProject (Supabase)

## Executive Summary

Your Supabase project is likely exceeding egress limits due to several inefficient data fetching patterns. Egress refers to **all data leaving Supabase**, including:
- Database query responses (API responses)
- File/image downloads from Storage
- Real-time subscription updates
- Large JSON payloads

## 🚨 Critical Egress Issues Found

### 1. **MASSIVE BATCH QUERIES** (HIGHEST IMPACT)

#### Issue: Fetching 500-10,000 records at once

| File | Line | Query | Impact |
|------|------|-------|--------|
| `src/app/api/question-bank/questions/route.ts` | 203 | `.limit(500)` | ⚠️ **HIGH** - Fetches 500 questions with all columns |
| `src/app/api/question-bank/questions/route.ts` | 208 | `.limit(Math.max(limit * 5, 500))` | ⚠️ **HIGH** - Up to 2,500 records |
| `src/app/api/question-bank/progress/route.ts` | 89 | `.limit(5000)` | 🔴 **CRITICAL** - Fetches 5,000 question IDs |
| `src/lib/analytics.ts` | 103 | `.limit(10000)` | 🔴 **CRITICAL** - Fetches 10,000 sessions |
| `src/app/skills/analytics/page.tsx` | 358 | `.limit(500)` | ⚠️ **HIGH** - Leaderboard data |

**Problem:** These queries fetch huge amounts of data, then filter client-side. This wastes egress.

**Example from `question-bank/questions/route.ts`:**
```typescript
// ❌ BAD: Fetches 500 questions, filters to 20 client-side
if (random) {
  query = query.limit(500); // Wastes 480 questions of egress!
} else {
  const fetchLimit = Math.max(limit * 5, 500);
  query = query.limit(fetchLimit); // Could fetch 2,500 for limit=100!
}
```

---

### 2. **SELECT ALL QUERIES** (HIGH IMPACT)

#### Issue: Using `select('*')` fetches ALL columns including large fields

| File | Function | Table | Large Fields Included |
|------|----------|-------|----------------------|
| `src/lib/supabase/questions.ts` | `getQuestions()` | `questions` | `question_image`, `solution_image`, `solution_text` |
| `src/lib/supabase/questions.ts` | `getQuestion()` | `questions` | `question_image`, `solution_image`, `solution_text` |
| `src/app/api/questions/route.ts` | `GET()` | `ai_generated_questions` | `question_stem`, `options`, `distractor_map` |
| `src/app/api/question-bank/questions/route.ts` | `GET()` | `ai_generated_questions` | `question_stem`, `options`, `distractor_map` |

**Problem:** 
- `question_image` / `solution_image` are likely **URLs or base64 strings** (could be KBs each)
- `question_stem` contains full question text (can be lengthy)
- `options` and `distractor_map` are JSONB fields with potentially large data
- You're fetching these for **every question in large batches**

**Example:**
```typescript
// ❌ BAD: Fetches ALL columns for 100 questions
const { data, error } = await supabase
  .from('questions')
  .select('*')  // Includes images, large text fields!
  .eq('paper_id', paperId);
  
// If each question has 50KB of image URLs + text = 5MB per query!
```

---

### 3. **IMAGE URL DATA IN DATABASE** (MEDIUM-HIGH IMPACT)

#### Issue: Image URLs or base64 data stored in database rows

**Files Affected:**
- `src/types/papers.ts` - `questionImage: string`, `solutionImage?: string`
- `src/lib/supabase/questions.ts` - All queries include `question_image`, `solution_image`
- `src/components/papers/QuestionDisplay.tsx` - Displays images from URLs

**Finding:**
- `PROTECTED_DATA.md` mentions `question-images` storage bucket
- Images are referenced via URLs in database columns
- If URLs are long or base64-encoded, this adds significant egress

**Impact:** If you have 1,926 questions (from PROTECTED_DATA.md), and each has:
- `question_image` URL: ~200 bytes
- `solution_image` URL: ~200 bytes  
- Total: ~800KB just for URLs in `getQuestions()` calls

**If images are base64 in DB:** Could be 50-500KB per image, making this **catastrophic**.

---

### 4. **POLLING MECHANISMS** (MEDIUM IMPACT)

#### Issue: Repeated API calls polling Supabase

**File:** `src/app/questions/review/page.tsx` (lines 458-503)

```typescript
// Polls every 2 seconds while generating questions
const pollStatus = async () => {
  const response = await fetch("/api/questions/generate");
  // ... fetches status every 2 seconds
};

interval = setInterval(pollStatus, 2000); // ⚠️ Every 2 seconds!
```

**Impact:** If user leaves this page open during generation, this creates:
- 30 API calls per minute
- Each call likely queries Supabase for generation status
- Adds up over long sessions

---

### 5. **REDUNDANT QUERIES** (LOW-MEDIUM IMPACT)

#### Issue: Multiple queries for same data

**Examples:**
1. `src/app/api/question-bank/questions/route.ts` - Fetches ALL user attempts, then filters client-side
2. Analytics queries fetch large datasets when only aggregates needed

---

## 📊 Egress Calculation Examples

### Scenario 1: Question Bank API Call
```
GET /api/question-bank/questions?limit=20&random=true
```

**Current behavior:**
1. Fetches 500 questions with `select('*')`
2. Each question: ~5KB (text + JSONB + URLs)
3. **Total egress: ~2.5 MB**
4. Client filters to 20 questions (wastes 2.4 MB!)

**Optimized behavior:**
1. Fetch 20 questions with selective columns
2. Each question: ~2KB (only needed fields)
3. **Total egress: ~40 KB** (62x reduction!)

---

### Scenario 2: Loading Paper with 50 Questions
```
getQuestions(paperId) // Loads all questions for a paper
```

**Current behavior:**
1. Fetches 50 questions with `select('*')`
2. Includes `question_image`, `solution_image` URLs
3. **Total egress: ~250 KB** (assuming 5KB per question)

**If images are base64 in DB:** Could be **25-250 MB** (50-500KB per image)

---

### Scenario 3: Analytics Leaderboard
```
fetchLeaderboard() with 500 limit
```

**Current behavior:**
1. Fetches 500 sessions with all columns
2. Includes join with profiles
3. **Total egress: ~1-2 MB**

---

## 🔍 Additional Potential Sources

### Storage Bucket Access
- **Bucket:** `question-images` (from PROTECTED_DATA.md)
- **Impact:** If images are served from Supabase Storage, each image download counts as egress
- **Check:** Are images downloaded frequently? Are they cached?

### Real-time Subscriptions
- **Finding:** `SupabaseSessionProvider.tsx` uses `onAuthStateChange` (auth only, low impact)
- **Status:** ✅ No database real-time subscriptions found

### Large JSONB Fields
- `options` - Array of answer choices
- `distractor_map` - Complex JSON structure
- `graph_spec` / `graph_specs` - Potentially large graph data

---

## ✅ Quick Wins (Easy Fixes)

### 1. Reduce Batch Sizes
**Impact:** 🔴 **HIGH** - Immediate 80-95% reduction

```typescript
// ❌ BEFORE
query = query.limit(500);

// ✅ AFTER  
query = query.limit(limit * 2); // Only fetch 2x what you need
```

### 2. Use Selective Columns
**Impact:** ⚠️ **MEDIUM-HIGH** - 40-60% reduction per query

```typescript
// ❌ BEFORE
.select('*')

// ✅ AFTER - For list views
.select('id, question_number, answer_letter, exam_name, exam_year, paper_name')

// ✅ AFTER - Only when viewing question detail
.select('*') // Or fetch images separately
```

### 3. Remove Polling (or increase interval)
**Impact:** ⚠️ **MEDIUM** - Reduces repeated calls

```typescript
// ❌ BEFORE
setInterval(pollStatus, 2000); // Every 2 seconds

// ✅ AFTER
setInterval(pollStatus, 10000); // Every 10 seconds
// Or use WebSockets/Server-Sent Events
```

---

## 🛠️ Advanced Optimizations

### 1. Database-Side Filtering
**Instead of:** Fetch 500 → Filter client-side  
**Do:** Filter in database → Fetch only needed records

```typescript
// Move attemptedStatus filtering to database
// Use PostgREST filters instead of client-side filtering
```

### 2. Pagination with Cursors
**Instead of:** `limit(500)`  
**Do:** Cursor-based pagination (fetch next 20 after cursor)

### 3. Separate Image Endpoints
**Instead of:** Include images in list queries  
**Do:** 
- List endpoint: No images (just IDs)
- Detail endpoint: Includes images
- Or: Lazy-load images via separate API calls

### 4. Caching Strategy
- Use Next.js ISR/SSG for static question lists
- Cache question metadata
- CDN for images (if using Storage)

---

## 📋 Recommended Actions (Priority Order)

### 🔴 **CRITICAL - Do Immediately**

1. **Fix `question-bank/progress/route.ts`** (Line 89)
   - Change `.limit(5000)` → `.limit(500)` or use proper filtering

2. **Fix `analytics.ts`** (Line 103)  
   - Change `.limit(10000)` → Use aggregation queries instead

3. **Fix `question-bank/questions/route.ts`** (Lines 203, 208)
   - Reduce `.limit(500)` → `.limit(limit * 2)`
   - Move filtering to database-side

### ⚠️ **HIGH - Do This Week**

4. **Selective columns in `questions.ts`**
   - `getQuestions()` - Don't include images in list queries
   - Create separate `getQuestionDetails()` for full data

5. **Selective columns in question bank API**
   - Exclude `question_stem`, `options`, `distractor_map` from list views
   - Fetch only when viewing question detail

### ⚠️ **MEDIUM - Do This Month**

6. **Optimize polling** - Increase interval to 10 seconds
7. **Check image storage** - Verify images aren't base64 in DB
8. **Implement pagination** - Replace large limits with cursor-based pagination

---

## 🔍 How to Verify

### Check Supabase Dashboard
1. Go to: Project Settings → Usage
2. Check "Egress" graph for spikes
3. Look for patterns (certain times/days)

### Monitor API Calls
1. Add logging to track:
   - Query sizes (bytes returned)
   - Query frequency
   - Endpoints called

### Test Optimizations
1. Before/after comparison:
   - Same API call
   - Measure response size
   - Check egress usage

---

## 📝 Notes

- **Storage bucket `question-images`** may be serving images directly (check if URLs point to Supabase Storage)
- **No real-time subscriptions found** (good - those can add significant egress)
- **Question count:** ~1,926 questions in `questions` table (from PROTECTED_DATA.md)
- **AI questions:** Unknown count in `ai_generated_questions` table

---

## Estimated Savings

If all optimizations are implemented:
- **Batch size reduction:** 80-95% reduction on question bank APIs
- **Selective columns:** 40-60% reduction per query
- **Combined:** Potentially **90-98% reduction** in egress from these queries

**Before:** ~2.5 MB per question bank request  
**After:** ~40-50 KB per question bank request (50x reduction)

---

**Generated by:** Auto (Cursor AI)  
**Next Steps:** Review this report and prioritize fixes based on your actual usage patterns


