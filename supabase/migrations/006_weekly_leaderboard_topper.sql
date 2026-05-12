-- =============================================================
-- 006 — Weekly Leaderboard Topper achievement
--
-- Per Tarun's ask 2026-05-12. Adds a single global achievement that
-- can unlock multiple times — once per weekly leaderboard reveal where
-- the user finishes #1. The UI surfaces the count ("5× Leaderboard
-- Champion") so the user can flex repeats.
--
-- Mechanics:
--   - Add `unlock_count` to user_achievements (default 1). Existing
--     rows keep their value (NOT NULL DEFAULT 1 means they backfill).
--   - Insert the new global achievement `global:leaderboard_topper`.
--   - Backfill: walk every quiz that's already `leaderboard_visible=true`
--     and grant the #1 user. Idempotent — increments unlock_count if a
--     row already exists.
--
-- Apply via the Supabase SQL editor. Idempotent.
-- =============================================================

-- 1. Add unlock_count to user_achievements --------------------
alter table user_achievements
  add column if not exists unlock_count integer not null default 1;

-- 2. Insert leaderboard_topper global achievement -------------
-- threshold.type='weekly_leaderboard_topper' is a marker — granted
-- externally by the reveal-leaderboards cron, not by the evaluator.
insert into achievements (id, code, scope, quiz_id, name, description, icon, tier_color, threshold, display_order)
values (
  'global:leaderboard_topper',
  'leaderboard_topper',
  'global',
  null,
  'Leaderboard Topper',
  'Finish #1 on a weekly quiz leaderboard',
  'Crown',
  'champion',
  '{"type":"weekly_leaderboard_topper"}'::jsonb,
  5
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  tier_color = excluded.tier_color,
  threshold = excluded.threshold,
  display_order = excluded.display_order;

-- 3. Backfill — for every quiz already revealed, grant +1 to its #1.
-- Identifies the #1 per quiz via score desc, submitted_at asc (same tiebreak
-- the reveal cron uses). One grant per revealed quiz means the topper count
-- is exactly the number of weeks the user has been #1.
do $$
declare
  q record;
  topper_id uuid;
begin
  for q in
    select id from quizzes
    where leaderboard_visible = true
      and deleted_at is null
  loop
    select user_id into topper_id
    from attempts
    where quiz_id = q.id
      and is_leaderboard_attempt = true
      and deleted_at is null
      and is_complete = true
    order by final_score desc, submitted_at asc
    limit 1;

    if topper_id is not null then
      insert into user_achievements (user_id, achievement_id, unlocked_at, unlock_count)
      values (topper_id, 'global:leaderboard_topper', now(), 1)
      on conflict (user_id, achievement_id) do update
        set unlock_count = user_achievements.unlock_count + 1,
            unlocked_at = now();
    end if;
  end loop;
end $$;

-- =============================================================
-- DOWN MIGRATION (manual; run with care)
-- =============================================================
-- delete from user_achievements where achievement_id = 'global:leaderboard_topper';
-- delete from achievements where id = 'global:leaderboard_topper';
-- alter table user_achievements drop column if exists unlock_count;
