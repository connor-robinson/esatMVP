# Paper In Progress Pipeline - Deep Analysis

## Overview
This document analyzes the paper in progress logic, resume/pause pipeline, and identifies bugs and uncertainties.

## Architecture Overview

The system uses **three storage layers** for session state:
1. **Zustand Store** (in-memory) - Current session state
2. **IndexedDB** (local browser storage) - For offline resume capability
3. **Supabase Database** (server) - Persistent storage with `ended_at` field

A session is considered "in progress" when:
- `sessionId !== null` AND `endedAt === null` (in Zustand store)
- OR session exists in IndexedDB with `endedAt === null`
- OR session exists in database with `ended_at IS NULL`

## Critical Issues Identified

### 1. **Dual Storage System Without Synchronization**

**Problem**: The system maintains sessions in both IndexedDB and Supabase, but there's no guarantee they're in sync.

**Location**: 
- `src/lib/storage/sessionStorage.ts` - IndexedDB operations
- `src/store/paperSessionStore.ts` - Zustand store with `persistSessionToServer()`
- `src/components/papers/SessionRestore.tsx` - Only checks IndexedDB

**Issues**:
- `SessionRestore` only checks IndexedDB (`hasActiveSession()`), not the database
- If a session exists in database but not IndexedDB (e.g., after clearing browser data), it won't be detected
- If IndexedDB has a session but database doesn't (e.g., after logout/login), stale sessions appear
- No mechanism to reconcile differences between IndexedDB and database

**Impact**: Papers can appear "out of nowhere" if:
- User clears IndexedDB but database still has `ended_at IS NULL`
- User switches devices/browsers
- Database has orphaned sessions

---

### 2. **Mark Page Doesn't Check for Papers In Progress**

**Problem**: The mark page (`src/app/papers/mark/page.tsx`) doesn't fetch or display papers in progress from the database.

**Current Behavior**:
- Mark page only reads from Zustand store
- If user navigates directly to `/papers/mark` without an active session in store, no paper appears
- If a session exists in database with `ended_at IS NULL`, it won't be detected on mark page

**Expected Behavior**:
- Mark page should check database for sessions with `ended_at IS NULL`
- Should offer to resume if found
- Should load session data if user clicks resume

**Code Evidence**:
```typescript
// src/app/papers/mark/page.tsx - No useEffect to fetch in-progress sessions
const { sessionId, endedAt } = usePaperSessionStore();
// Only uses sessionId from store, doesn't check database
```

---

### 3. **Resume Session Logic Doesn't Restore Full State**

**Problem**: `resumeSession()` in `paperSessionStore.ts` doesn't properly restore all state, especially pipeline state.

**Location**: `src/store/paperSessionStore.ts:1436-1489`

**Issues**:

#### 3a. **Pipeline State Restoration**
```typescript
// Line 1444-1446
const wasOnInstruction = state.currentPipelineState === "instruction" && 
                        state.sectionInstructionTimer !== null && 
                        state.sectionInstructionTimer > 0;
```
- Only checks if `currentPipelineState === "instruction"` but doesn't verify if timer actually expired
- If timer expired while paused, it should skip to section, not restore instruction timer
- No validation that `sectionInstructionTimer` value is still valid

#### 3b. **Section Start Time Calculation**
```typescript
// Line 1472-1475
newSectionStartTimes[currentSectionIndex] = now;
newSectionDeadlines[currentSectionIndex] = newDeadline;
```
- Sets `sectionStartTime` to `now`, but this doesn't account for time already spent
- Should preserve original start time or calculate elapsed time correctly
- Can cause timer to show incorrect remaining time

#### 3c. **Missing State Restoration**
- Doesn't restore `visitedQuestions` array
- Doesn't restore `currentQuestionIndex` to where user left off
- Doesn't restore `sectionStarts` mapping
- Doesn't verify `allSectionsQuestions` is populated

**Impact**: When resuming, user might:
- Start at wrong question
- See incorrect timer
- Be on wrong section
- Lose navigation state

---

### 4. **Persistence Race Conditions**

**Problem**: Sessions are persisted with debouncing (800ms), which can cause race conditions.

**Location**: `src/store/paperSessionStore.ts:956-969`

**Issues**:

#### 4a. **Debounced Persistence**
```typescript
// Line 962-966
const timer = setTimeout(() => {
  get()
    .persistSessionToServer()
    .catch((error) => console.error("[papers] scheduled persist failed", error));
  set({ persistTimer: timer });
}, 800);
```
- If user navigates away before 800ms, changes might not be saved
- If multiple rapid changes occur, only last one persists
- No guarantee that critical state (like `endedAt`) is saved immediately

#### 4b. **Immediate Persistence Not Always Used**
```typescript
// Line 878-891 - setEndedAt
setEndedAt: async (endedAt) => {
  set({ endedAt });
  // ... delete from IndexedDB ...
  await get().persistSessionToServer({ immediate: true });
}
```
- `setEndedAt` uses `immediate: true`, but other critical operations might not
- `pauseSession()` doesn't call `persistSessionToServer()` at all
- `resumeSession()` doesn't persist immediately

**Impact**:
- Session state might be lost if user closes tab quickly
- Database might have stale `ended_at` values
- IndexedDB and database can be out of sync

---

### 5. **Session Detection Logic Inconsistencies**

**Problem**: Different parts of the app use different logic to detect active sessions.

**Locations**:
- `src/components/layout/Navbar.tsx:47` - `hasActiveSession = sessionId !== null && endedAt === null`
- `src/lib/storage/sessionStorage.ts:147-185` - Checks IndexedDB only
- `src/components/papers/SessionRestore.tsx:40` - Uses `hasActiveSession()` from IndexedDB

**Issues**:

#### 5a. **Navbar Logic**
```typescript
// Navbar.tsx:47
const hasActiveSession = sessionId !== null && endedAt === null;
```
- Only checks Zustand store, not IndexedDB or database
- If store is cleared but session exists elsewhere, won't show progress bar
- If store has stale data, shows progress bar incorrectly

#### 5b. **SessionRestore Logic**
```typescript
// SessionRestore.tsx:40
const activeSessionId = await hasActiveSession();
```
- Only checks IndexedDB
- Doesn't check database for sessions
- Doesn't check if Zustand store already has a session

**Impact**:
- Progress bar might not appear when it should
- Progress bar might appear when it shouldn't
- Multiple sessions might be detected simultaneously

---

### 6. **Load Session From Database Doesn't Restore Everything**

**Problem**: `loadSessionFromDatabase()` doesn't restore all necessary state for resume.

**Location**: `src/store/paperSessionStore.ts:971-1069`

**Issues**:

#### 6a. **Missing State Fields**
```typescript
// Line 1015-1020
set({
  // ... basic fields ...
  questions: [],  // ❌ Empty! Should load questions
  questionsLoading: false,
  questionsError: null,
  // Missing: isPaused, pausedAt, sectionElapsedTimes, etc.
});
```

#### 6b. **Doesn't Restore Pipeline State**
- Doesn't restore `isPaused` state
- Doesn't restore `pausedAt` timestamp
- Doesn't restore `sectionElapsedTimes`
- Doesn't restore `currentSectionIndex` correctly
- Doesn't restore `currentQuestionIndex` to where user left off

#### 6c. **Question Loading**
```typescript
// Line 1062-1064
if (paperId) {
  await get().loadQuestions(paperId);
}
```
- Loads questions, but doesn't wait for them to finish before returning
- Doesn't restore `currentQuestionIndex` after questions load
- Doesn't verify questions match `selectedSections`

**Impact**: When resuming from database:
- User starts at question 0, not where they left off
- Timer might be wrong
- Section state might be incorrect
- Pipeline state (instruction vs section) is lost

---

### 7. **No Cleanup of Orphaned Sessions**

**Problem**: Sessions with `ended_at IS NULL` can accumulate in the database.

**Issues**:
- No automatic cleanup of old in-progress sessions
- No mechanism to detect and mark stale sessions as ended
- If user abandons a session, it stays "in progress" forever
- Multiple in-progress sessions can exist for same paper

**Impact**:
- Database can have many orphaned sessions
- "Papers in progress" list can show old sessions
- Resume might load wrong session if multiple exist

---

### 8. **IndexedDB and Database State Mismatch**

**Problem**: When `setEndedAt()` is called, it deletes from IndexedDB but might not update database immediately.

**Location**: `src/store/paperSessionStore.ts:878-892`

```typescript
setEndedAt: async (endedAt) => {
  const state = get();
  set({ endedAt });
  
  // Delete from IndexedDB when session ends
  if (state.sessionId) {
    try {
      await deleteSession(state.sessionId);
    } catch (error) {
      console.error('[paperSessionStore] Failed to delete session from IndexedDB:', error);
    }
  }
  
  await get().persistSessionToServer({ immediate: true });
}
```

**Issues**:
- Deletes from IndexedDB first, then persists to database
- If database persist fails, IndexedDB is already deleted
- No rollback mechanism
- If user closes tab between delete and persist, state is lost

---

### 9. **Missing Refresh Logic**

**Problem**: No mechanism to refresh/check for papers in progress when navigating to mark page.

**Current Flow**:
1. User starts session → Saved to IndexedDB and database
2. User navigates to mark page → Only checks Zustand store
3. If store is empty, no session detected
4. User clicks "Resume" → Might load wrong session or fail

**Expected Flow**:
1. User navigates to mark page → Check database for `ended_at IS NULL`
2. If found, show "Resume" option
3. On resume, load full session state
4. Restore to exact position (question, section, timer, etc.)

---

### 10. **Uncertainties and Edge Cases**

#### 10a. **Multiple In-Progress Sessions**
- What happens if user has multiple sessions with `ended_at IS NULL`?
- Which one should be resumed?
- Should oldest or newest be prioritized?

#### 10b. **Session Expiration**
- Should sessions auto-expire after X days?
- Should timer continue counting while paused?
- What if deadline passed while session was paused?

#### 10c. **Concurrent Sessions**
- Can user have multiple sessions in progress simultaneously?
- Should system prevent this?
- How to handle switching between sessions?

#### 10d. **Device/Browser Switching**
- If user starts session on Device A, can they resume on Device B?
- Should IndexedDB be synced or only database?
- How to handle conflicts?

#### 10e. **Network Failures**
- What if database persist fails but IndexedDB succeeds?
- Should system retry failed persists?
- How to handle offline scenarios?

---

## Recommended Fixes

### Priority 1: Critical Bugs

1. **Add Database Check to Mark Page**
   - Fetch sessions with `ended_at IS NULL` on mount
   - Show resume option if found
   - Load session on resume click

2. **Fix Resume State Restoration**
   - Restore `currentQuestionIndex` to last visited question
   - Restore `isPaused` and `pausedAt` correctly
   - Restore `sectionElapsedTimes` and recalculate timers
   - Restore pipeline state (instruction vs section)

3. **Synchronize IndexedDB and Database**
   - On app load, check both IndexedDB and database
   - Reconcile differences (prefer database as source of truth)
   - Delete orphaned IndexedDB sessions

### Priority 2: Important Improvements

4. **Add Session Cleanup**
   - Auto-mark sessions as ended after X days of inactivity
   - Clean up orphaned sessions
   - Prevent multiple in-progress sessions for same paper

5. **Improve Persistence Reliability**
   - Use `beforeunload` event to persist critical state
   - Add retry logic for failed persists
   - Add queue for pending persists

6. **Unify Session Detection**
   - Create single source of truth for "active session"
   - Check all three storage layers consistently
   - Handle conflicts gracefully

### Priority 3: Nice to Have

7. **Add Session Expiration**
   - Auto-expire sessions after deadline
   - Show warning when session is about to expire
   - Allow extending deadline

8. **Improve Error Handling**
   - Better error messages for resume failures
   - Retry logic for network failures
   - Offline mode support

---

## Testing Scenarios

1. **Start session → Navigate away → Return**
   - Should detect session and offer resume

2. **Start session → Close tab → Reopen**
   - Should restore from IndexedDB or database

3. **Start session → Clear IndexedDB → Return**
   - Should restore from database

4. **Start session → Switch device → Resume**
   - Should restore from database

5. **Start session → Pause → Resume**
   - Should restore exact position and timer

6. **Multiple in-progress sessions**
   - Should handle gracefully (prevent or allow switching)

7. **Network failure during persist**
   - Should retry or queue for later

8. **Session expires while paused**
   - Should handle gracefully (mark as ended or extend)

---

## Conclusion

The paper in progress pipeline has several critical issues:
- **No synchronization** between IndexedDB and database
- **Mark page doesn't check** for in-progress sessions
- **Resume doesn't restore** full state correctly
- **Race conditions** in persistence
- **No cleanup** of orphaned sessions

These issues explain why papers appear "out of nowhere", resume doesn't work correctly, and sessions don't refresh properly. A comprehensive refactor is recommended to fix these issues systematically.



