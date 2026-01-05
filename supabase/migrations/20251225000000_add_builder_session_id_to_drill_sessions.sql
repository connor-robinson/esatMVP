-- Migration: Add builder_session_id to drill_sessions
-- Description: Links drill_sessions back to the original builder_sessions for proper session tracking

-- Add the builder_session_id column (nullable for existing/legacy data)
ALTER TABLE drill_sessions 
ADD COLUMN IF NOT EXISTS builder_session_id uuid REFERENCES builder_sessions(id) ON DELETE CASCADE;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_drill_sessions_builder_session ON drill_sessions(builder_session_id);

-- Add comment
COMMENT ON COLUMN drill_sessions.builder_session_id IS 'Reference to the original builder_sessions.id that created this drill_session record';

