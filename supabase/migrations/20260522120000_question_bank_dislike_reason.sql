-- Add optional report reason to question_bank_dislikes

ALTER TABLE question_bank_dislikes
  ADD COLUMN IF NOT EXISTS reason text;

COMMENT ON COLUMN question_bank_dislikes.reason IS 'User-selected quick reason when reporting the question';

DROP POLICY IF EXISTS "Users can update own dislike" ON question_bank_dislikes;
CREATE POLICY "Users can update own dislike"
  ON question_bank_dislikes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
