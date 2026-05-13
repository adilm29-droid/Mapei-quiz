-- =============================================================
-- 009 — One question = one mark; recompute every existing score
--
-- Per Tarun 2026-05-13: simplify scoring so each question is worth
-- exactly one mark. Quiz 1 used to have weighted points (2/3/4 per
-- question, max 57); after this migration it's flat 1pt/question, so
-- a 30-question quiz maxes at 30. Wrong / skipped = 0 marks; a 26/30
-- score means 26 correct, 4 wrong/skipped.
--
-- Three things happen:
--   1. questions.points := 1 everywhere
--   2. quizzes.max_score := count of questions for that quiz
--   3. attempts.final_score for every COMPLETED attempt is recomputed
--      by counting correct answers in the stored `answers` JSON
--      against the canonical `correct_answer` on each question.
--
-- Incomplete / soft-deleted attempts are left alone — their score is
-- ambiguous and not referenced by the leaderboard anyway.
--
-- Apply via the Supabase SQL editor. Idempotent (re-running is safe;
-- step 3 will produce the same result each time).
-- =============================================================

-- 1. Flatten question weights to 1 mark each ------------------
update questions set points = 1 where points <> 1;

-- 2. Recompute every quiz's max_score from its question count -
update quizzes q
set max_score = sub.cnt
from (
  select quiz_id, count(*)::int as cnt
  from questions
  group by quiz_id
) sub
where q.id = sub.quiz_id
  and q.max_score is distinct from sub.cnt;

-- 3. Recompute final_score for every completed attempt --------
-- Match each question by its UUID key inside the JSONB `answers`
-- payload. The trick: `answers->>(q.id::text)` returns the stored
-- letter (or NULL if the user never answered that question).
update attempts a
set final_score = sub.correct
from (
  select
    att.id as attempt_id,
    (
      select count(*)::int
      from questions q
      where q.quiz_id = att.quiz_id
        and (att.answers ->> (q.id::text)) = q.correct_answer
    ) as correct
  from attempts att
  where att.is_complete = true
    and att.deleted_at is null
) sub
where a.id = sub.attempt_id
  and a.final_score is distinct from sub.correct;

-- Verify — two separate SELECTs so the UNION ALL type mismatch
-- (integer[] vs text[]) the original version triggered can't happen.
select 'questions points distinct' as label,
       array_agg(distinct points::text) as values
from questions;

select 'quizzes max_score per quiz' as label,
       array_agg(q.title || ' = ' || q.max_score::text order by q.week_number) as values
from quizzes q
where q.deleted_at is null;

-- =============================================================
-- DOWN MIGRATION (manual)
-- =============================================================
-- There is no clean down migration — the previous weighted points
-- and max_scores are not preserved in this migration. To restore,
-- re-run migrations 002 and 004 (which carry the original values),
-- then recompute final_score the old way (sum of points for correct).
