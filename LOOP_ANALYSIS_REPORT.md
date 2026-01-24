# Loop & Repeated Fetching Analysis Report

**Generated:** 2025-01-27  
**Project:** NocalcProject (Supabase)

## 🔍 Summary

Found **several instances** of repeated data fetching that contribute to egress usage. Most are **acceptable** (timers, UI updates), but **2 critical issues** need attention.

---

## 🔴 **CRITICAL ISSUES** (High Egress Impact)

### 1. **Question Review Page Polling** ⚠️ **MEDIUM-HIGH IMPACT**

**File:** `src/app/questions/review/page.tsx` (Lines 457-516)

**Issue:** Polls generation status every 2 seconds, which triggers Supabase queries.

```typescript
// Poll every 2 seconds while generating
interval = setInterval(pollStatus, 2000); // ⚠️ Every 2 seconds

const pollStatus = async () => {
  const response = await fetch("/api/questions/generate"); // Queries Supabase
  // ... triggers fetchQuestions() and fetchStats() on completion
};
```

**Impact:**
- **30 API calls per minute** while page is open during generation
- Each call likely queries Supabase for generation status
- **If left open for 10 minutes = 300 API calls**

**Potential Infinite Loop Risk:**
```typescript
// ⚠️ RISK: fetchQuestions/fetchStats in dependency array
useEffect(() => {
  fetchQuestions();
  fetchStats();
}, [page, fetchQuestions, fetchStats]); // If these functions change identity, loop!

useEffect(() => {
  if (generationStatus.status === "completed") {
    fetchQuestions(); // Could trigger if status changes
    fetchStats();
  }
}, [generationStatus.status, fetchQuestions, fetchStats]); // Same risk
```

**Fix:** Increase polling interval to 10 seconds, or use WebSockets/SSE.

---

### 2. **Question Bank Hook - Prefetch Loop** ⚠️ **LOW-MEDIUM IMPACT**

**File:** `src/hooks/useQuestionBank.ts` (Line 381)

**Issue:** When getting question from cache, automatically prefetches more questions.

```typescript
// Prefetch more questions in background
if (questionCache.current.length < 3) {
  prefetchQuestions(10).catch(() => {}); // Fetches 10 more questions
}
```

**Impact:**
- Each time user views a question, if cache is low, fetches 10 more
- **Could trigger repeatedly** if cache depletes quickly
- With our optimizations, each prefetch now fetches `10 * 2 = 20 questions` (was 500)

**Note:** This is **less concerning** after batch size fixes, but still worth monitoring.

---

## ⚠️ **POTENTIAL ISSUES** (Monitor Closely)

### 3. **Review Page Multiple useEffect Dependencies**

**File:** `src/app/questions/review/page.tsx` (Lines 505-516)

**Issue:** Three `useEffect` hooks depend on `fetchQuestions` and `fetchStats`.

**Risk:** If these functions are not properly memoized, they could change identity on every render, causing infinite loops.

**Current Status:** Functions are defined with `useCallback`, which should prevent this, but worth verifying.

**Check:**
```typescript
const fetchQuestions = useCallback(async () => {
  // ... implementation
}, [/* dependencies? */]); // Are dependencies stable?

const fetchStats = useCallback(async () => {
  // ... implementation  
}, [/* dependencies? */]); // Are dependencies stable?
```

---

## ✅ **ACCEPTABLE LOOPS** (Low Egress Impact)

### Timer/UI Updates (No Data Fetching)

These are **OK** - they only update local state, not fetch from Supabase:

1. **Paper Solve Timer** (`src/app/papers/solve/page.tsx:70`)
   - Updates countdown timer every 1 second
   - **No Supabase queries**

2. **Question Bank Timer** (`src/app/questions/bank/page.tsx:173, 192`)
   - Updates elapsed time every 100ms
   - **No Supabase queries**

3. **Drill Timer** (`src/components/drill/Timer.tsx:25`)
   - Updates timer display every 100ms
   - **No Supabase queries**

4. **Loading State Animation** (`src/hooks/useLoadingState.ts:42`)
   - Updates progress bar every 150ms
   - **No Supabase queries**

### Background Prefetching (Next.js Route Prefetching)

**File:** `src/hooks/useBackgroundPrefetch.ts` (Line 77)

**Issue:** Uses `setInterval` to prefetch routes

**Impact:** ✅ **OK** - This prefetches Next.js routes (HTML/JS), **not Supabase queries**. No egress impact.

---

## 📊 Egress Impact Summary

| Issue | Impact | Priority | Estimated Calls/Min |
|-------|--------|----------|---------------------|
| Review Page Polling | ⚠️ Medium-High | 🔴 High | 30 calls/min |
| Question Bank Prefetch | ⚠️ Low-Medium | ⚠️ Medium | Variable |
| Timer Updates | ✅ None | ✅ OK | 0 (no queries) |

---

## 🛠️ Recommended Fixes

### Fix 1: Increase Polling Interval (EASY - 2 minutes)

**File:** `src/app/questions/review/page.tsx` (Line 493)

```typescript
// ❌ BEFORE
interval = setInterval(pollStatus, 2000); // Every 2 seconds

// ✅ AFTER
interval = setInterval(pollStatus, 10000); // Every 10 seconds
```

**Impact:** **80% reduction** in polling calls (30/min → 6/min)

---

### Fix 2: Verify useCallback Dependencies (EASY - 5 minutes)

**File:** `src/app/questions/review/page.tsx` (Lines 112, 143)

Ensure `fetchQuestions` and `fetchStats` have stable dependencies:

```typescript
const fetchQuestions = useCallback(async () => {
  // ... implementation
}, [page]); // Only depend on page, not other state

const fetchStats = useCallback(async () => {
  // ... implementation  
}, []); // No dependencies if it doesn't use any state
```

**Impact:** Prevents potential infinite loops

---

### Fix 3: Debounce Prefetch (OPTIONAL - Medium effort)

**File:** `src/hooks/useQuestionBank.ts` (Line 381)

Add debouncing to prevent rapid prefetch calls:

```typescript
// Add debounce ref
const prefetchDebounceRef = useRef<NodeJS.Timeout | null>(null);

// In fetchQuestion, replace:
if (questionCache.current.length < 3) {
  prefetchQuestions(10).catch(() => {});
}

// With:
if (questionCache.current.length < 3 && !prefetchDebounceRef.current) {
  prefetchDebounceRef.current = setTimeout(() => {
    prefetchQuestions(10).catch(() => {});
    prefetchDebounceRef.current = null;
  }, 1000); // Wait 1 second before prefetching
}
```

**Impact:** Prevents rapid prefetch calls when navigating quickly

---

## 🔍 How to Monitor

### Check Browser Network Tab
1. Open DevTools → Network tab
2. Filter by "XHR" or "Fetch"
3. Look for:
   - Repeated calls to `/api/questions/generate`
   - Repeated calls to `/api/question-bank/questions`
   - Any calls happening every 2 seconds

### Check Supabase Dashboard
1. Go to: Project Settings → API → Logs
2. Look for:
   - Frequent queries to same tables
   - Queries happening in rapid succession
   - High query volume during generation

---

## ✅ Next Steps

1. **Immediate:** Increase polling interval from 2s → 10s
2. **Verify:** Check `useCallback` dependencies to prevent loops
3. **Monitor:** Watch network tab for unexpected repeated calls
4. **Optional:** Add debouncing to prefetch if needed

---

**Generated by:** Auto (Cursor AI)  
**Priority:** Fix polling interval first (easy win)





