-- =============================================================
-- 003 — Reset to fresh "pre-testing" state
--
-- Run this in Supabase SQL editor when you want the app back to a
-- clean demo state:
--   • zero non-admin users (vanessa, sample_account_v2, testflow, etc. gone)
--   • Tarun's gamification stats reset to 0 / Apprentice
--   • every quiz back to draft (is_unlocked = false, leaderboard hidden)
--   • all attempts / badges earned / mistakes / access requests / email log wiped
--
-- The seeded questions stay (you don't have to re-run 002).
-- The Tarun admin row stays (with his bcrypt'd password unchanged).
-- =============================================================

-- 1. Wipe per-user data
DELETE FROM email_log;
DELETE FROM reviewed_mistakes;
DELETE FROM user_badges;
DELETE FROM access_requests;
DELETE FROM attempts;

-- 2. Delete every non-admin user (vanessa, test users, etc.)
DELETE FROM users WHERE role != 'admin';

-- 3. Reset Tarun's gamification stats
UPDATE users
SET
  xp = 0,
  level = 1,
  title = 'Apprentice',
  current_streak = 0,
  longest_streak = 0,
  streak_freezes = 0,
  last_quiz_date = NULL,
  active_badge_id = NULL,
  updated_at = now()
WHERE role = 'admin';

-- 4. Lock every quiz back to draft
UPDATE quizzes
SET
  is_unlocked = false,
  leaderboard_visible = false,
  unlocked_at = NULL,
  leaderboard_revealed_at = NULL,
  updated_at = now();

-- 5. Patch the live Q2 (Adesilex P7 → Adesilex P10) without touching the others.
-- If you've already run the regenerated 002 since then, this UPDATE is a no-op
-- (the row already has the new text). Idempotent either way.
UPDATE questions
SET
  question_text = 'What colour options does Adesilex P10 come in?',
  option_a = 'Grey only',
  option_b = 'White only',
  option_c = 'White or Grey',
  option_d = '16 colours',
  correct_answer = 'B',
  explanation = 'Adesilex P10 is offered in white only — typically used for translucent or glass mosaics where a grey adhesive would bleed through and show. Unlike most cementitious adhesives that ship in both white and grey, P10 has only the white version.',
  category = 'Master'
WHERE quiz_id = (SELECT id FROM quizzes WHERE title = 'Mapei Ceramic Line — Product Knowledge')
  AND order_index = 1;

-- Sanity checks
SELECT 'users:' AS what, count(*) FROM users
UNION ALL SELECT 'quizzes (unlocked):', count(*) FROM quizzes WHERE is_unlocked = true
UNION ALL SELECT 'attempts:', count(*) FROM attempts
UNION ALL SELECT 'user_badges:', count(*) FROM user_badges;
