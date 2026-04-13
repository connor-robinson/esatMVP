-- One-off: set workflow status back to pending for rows still marked approved whose
-- last update (proxy for approval time) is strictly before start of **yesterday** in UTC.
-- Keeps approvals whose updated_at falls on **today** or **yesterday** (UTC calendar dates).
--
-- Preview first:
-- SELECT id, status, updated_at
-- FROM ai_generated_questions
-- WHERE status = 'approved'
--   AND updated_at < (((timezone('UTC', now()))::date - 1) AT TIME ZONE 'UTC');

UPDATE ai_generated_questions
SET status = 'pending',
    updated_at = now()
WHERE status = 'approved'
  AND updated_at < (((timezone('UTC', now()))::date - 1) AT TIME ZONE 'UTC');
