-- =============================================================
-- 001 — Quiz weighted scoring + points/difficulty per question
--
-- This migration adapts the schema to the per-question weighted scoring
-- introduced by the first real quiz (mapei_quiz_1.json):
--   very_easy = 1pt · easy = 2pt · practical = 3pt · medium = 4pt
--
-- final_score becomes the weighted sum of points earned per attempt.
-- max_score is cached on the quizzes row so leaderboard math is cheap.
-- Idempotent — safe to re-run.
-- =============================================================

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS points     INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS difficulty TEXT    NOT NULL DEFAULT 'easy';

-- Difficulty enum constraint
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_difficulty_check;
ALTER TABLE questions
  ADD CONSTRAINT questions_difficulty_check
  CHECK (difficulty IN ('very_easy', 'easy', 'practical', 'medium'));

-- Cached total points for a quiz (sum of question.points). Computed at
-- import time. Optional — leaderboard math falls back to live SUM() if null.
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS max_score  INTEGER;

CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
