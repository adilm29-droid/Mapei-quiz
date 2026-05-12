-- =============================================================
-- 007 — Promote the beginner quiz to a practice quiz
--
-- The "Mapei Ceramic Line — Beginner Quiz (Very Simple)" was seeded
-- in migration 004 as a default-type quiz (type='actual') with
-- is_unlocked=false. That means it never appears in the home Practice
-- section (which filters on type='practice') and never appears in the
-- Ranked section either (locked). Net effect: invisible.
--
-- Per Tarun 2026-05-12: practice quizzes must always be open and
-- ready. Flip Quiz 2 to type='practice' + is_unlocked=true so it
-- shows up under 🎯 Practice on /home for every approved user.
--
-- Apply via the Supabase SQL editor. Idempotent.
-- =============================================================

update quizzes
set
  type = 'practice',
  is_unlocked = true
where title = 'Mapei Ceramic Line — Beginner Quiz (Very Simple)'
  and deleted_at is null;

-- Verify (for the SQL editor output)
select id, title, type, is_unlocked
from quizzes
where title = 'Mapei Ceramic Line — Beginner Quiz (Very Simple)';

-- =============================================================
-- DOWN MIGRATION (manual)
-- =============================================================
-- update quizzes
--   set type = 'actual', is_unlocked = false
--   where title = 'Mapei Ceramic Line — Beginner Quiz (Very Simple)';
