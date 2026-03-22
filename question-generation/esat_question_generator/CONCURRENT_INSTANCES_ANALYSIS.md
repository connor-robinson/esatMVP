# Concurrent Instance Analysis

## Current Behavior with Multiple Instances

When multiple instances of the question generator run simultaneously, several race conditions can occur:

### 1. **Schema Selection Race Condition** ⚠️

**Problem:**
- Instance A refreshes coverage from DB, sees M1 has 3/5 questions
- Instance B refreshes coverage (at nearly the same time), also sees M1 has 3/5 questions  
- Both instances select M1 and start generating questions
- Both work on the same schema simultaneously

**Impact:**
- Both instances will generate questions for M1
- Could result in 6, 7, 8+ questions instead of exactly 5
- Wasted API calls and resources

**Current Protection:**
- `refresh_coverage_from_db()` is called before each schema selection
- But there's still a window between refresh and selection where both instances can pick the same schema

### 2. **Coverage Refresh Timing Window** ⚠️

**Problem:**
- Instance A generates a question, saves to DB (transaction commits)
- Instance B refreshes coverage BEFORE Instance A's transaction commits
- Instance B doesn't see Instance A's new question yet
- Both instances think the schema needs more questions

**Impact:**
- Over-generation (more than required questions per schema)
- Both instances continue working on the same schema

**Current Protection:**
- Coverage is refreshed before each schema selection
- But database replication lag or transaction timing can still cause issues

### 3. **Duplicate Generation ID Collisions** ✅ (Handled)

**Problem:**
- Two instances generate questions for the same schema
- If they generate identical questions (same stem), they'll have the same `generation_id`
- Format: `{schema_id}-{difficulty}-{sha1_short(schema_id|difficulty|stem)}`

**Impact:**
- Second insert fails with duplicate key error (23505)
- Question is not saved, but no data is lost
- The first question remains intact

**Current Protection:**
- UNIQUE constraint on `generation_id` prevents duplicates
- Error handling silently catches duplicate key errors
- No data corruption or overwrites

### 4. **Session Count Inflation** ⚠️

**Problem:**
- Instance A generates question, saves to DB, increments session count
- Instance B doesn't see Instance A's session count
- Both instances track their own session counts separately
- Could lead to incorrect completion detection

**Impact:**
- Instance might think it's done when it's not (or vice versa)
- But the DB count check should catch this

**Current Protection:**
- `get_next_incomplete()` checks DB count separately as a safety check
- Even if session count says complete, it verifies DB has enough questions

## Summary of Issues

### ✅ Safe (No Data Loss)
- **Duplicate key collisions**: Handled gracefully, no overwrites
- **Database integrity**: UNIQUE constraints prevent corruption

### ⚠️ Potential Issues (No Data Loss, But Inefficient)
- **Over-generation**: Multiple instances can generate more than 5 questions per schema
- **Wasted resources**: Both instances working on the same schema simultaneously
- **Race conditions**: Schema selection timing windows

### 🔧 Recommended Fixes

1. **Add advisory locks or schema-level locking** to prevent multiple instances from selecting the same schema
2. **Use database transactions with row-level locking** when selecting schemas
3. **Add a "lock" mechanism** - mark a schema as "in progress" in the database
4. **Implement exponential backoff** if duplicate key errors occur frequently
5. **Add retry logic** for schema selection to avoid conflicts























