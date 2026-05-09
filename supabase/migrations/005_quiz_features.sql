-- =============================================================
-- 005 — Quiz feature update per CLAUDE_CODE_PROMPT.md §6
--
-- Additive migration. Existing tables get new columns; brand-new
-- tables get created. Adapted to our actual table names (`attempts`,
-- not `quiz_attempts`) and our existing `email_log` shape (column
-- names extended, not renamed).
--
-- Tarun, run this once in the Supabase SQL editor. Idempotent.
-- =============================================================

-- 1. Extend users -----------------------------------------------
alter table users
  add column if not exists total_xp integer not null default 0,
  add column if not exists completed_quizzes_count integer not null default 0,
  add column if not exists last_active_at timestamptz;

-- Backfill total_xp from existing xp column (we kept xp around)
update users set total_xp = xp where total_xp = 0 and xp > 0;

-- 2. Extend quizzes ---------------------------------------------
alter table quizzes
  add column if not exists type text not null default 'actual'
    check (type in ('actual','practice')),
  add column if not exists practice_for_quiz_id uuid references quizzes(id) on delete set null,
  add column if not exists cover_image_url text;

create index if not exists idx_quizzes_type on quizzes(type);
create index if not exists idx_quizzes_practice_for on quizzes(practice_for_quiz_id);

-- 3. Extend attempts (our table is `attempts`, spec calls it `quiz_attempts`) ----
alter table attempts
  add column if not exists is_leaderboard_attempt boolean not null default false,
  add column if not exists pdf_url text,
  add column if not exists ip_address inet,
  add column if not exists user_agent text,
  add column if not exists time_taken_seconds integer,
  add column if not exists xp_awarded integer not null default 0,
  add column if not exists deleted_at timestamptz;

-- Mark all existing completed first attempts as the leaderboard attempt
-- (so historical data stays correct under the new gate). Idempotent —
-- only updates rows that haven't been classified yet.
update attempts a
set is_leaderboard_attempt = true
where is_complete = true
  and is_leaderboard_attempt = false
  and deleted_at is null
  and attempt_number = (
    select min(attempt_number) from attempts a2
    where a2.user_id = a.user_id and a2.quiz_id = a.quiz_id and a2.is_complete = true
  );

-- One leaderboard attempt per user per quiz, ever.
create unique index if not exists uq_one_leaderboard_attempt_per_user_quiz
  on attempts(user_id, quiz_id)
  where is_leaderboard_attempt = true and deleted_at is null;

create index if not exists idx_attempts_user_quiz on attempts(user_id, quiz_id);
create index if not exists idx_attempts_leaderboard
  on attempts(quiz_id, final_score desc, time_taken_seconds asc)
  where is_leaderboard_attempt = true and deleted_at is null;

-- 4. New: practice_counters -------------------------------------
create table if not exists practice_counters (
  user_id uuid not null references users(id) on delete cascade,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  attempt_count integer not null default 0,
  last_practiced_at timestamptz not null default now(),
  practice_dates date[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, quiz_id)
);
create index if not exists idx_practice_counters_user on practice_counters(user_id);

-- 5. New: achievements + user_achievements ----------------------
-- Replaces the old flat `badges` / `user_badges` tables. Existing
-- rows in those legacy tables stay (we don't write to them anymore);
-- the migration below seeds the new catalog. New code only reads
-- from `achievements` / `user_achievements`.
create table if not exists achievements (
  id text primary key,
  code text not null,
  scope text not null check (scope in ('per_quiz','global')),
  quiz_id uuid references quizzes(id) on delete cascade,
  name text not null,
  description text not null,
  icon text not null,
  tier_color text not null,
  threshold jsonb not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_achievements_scope on achievements(scope);
create index if not exists idx_achievements_quiz on achievements(quiz_id);

create table if not exists user_achievements (
  user_id uuid not null references users(id) on delete cascade,
  achievement_id text not null references achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
create index if not exists idx_user_achievements_user on user_achievements(user_id);

-- 6. New: admin_actions ----------------------------------------
create table if not exists admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references users(id) on delete restrict,
  affected_user_id uuid references users(id) on delete set null,
  action_type text not null,
  payload jsonb not null default '{}',
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists idx_admin_actions_affected on admin_actions(affected_user_id);
create index if not exists idx_admin_actions_admin on admin_actions(admin_user_id);

-- 7. Extend existing email_log (we already have it) ------------
-- Existing columns: id, user_id, type, payload, sent_at.
-- Spec wants: subject, status, error_message. Add as nullable so
-- old code keeps working; new email layer writes the richer fields.
alter table email_log
  add column if not exists subject text,
  add column if not exists status text not null default 'sent'
    check (status in ('queued','sent','failed')),
  add column if not exists error_message text;

-- 8. Triggers --------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_practice_counters_updated_at on practice_counters;
create trigger trg_practice_counters_updated_at
  before update on practice_counters
  for each row execute procedure set_updated_at();

-- 9. RLS ON new tables ----------------------------------------
-- Existing tables intentionally left with RLS disabled (server-side
-- routes use the service-role key). The new tables follow the same
-- convention so server code can read/write freely. Flagging at the
-- end of the migration: if you ever expose a non-server-mediated
-- read path for these, enable RLS first.
alter table practice_counters disable row level security;
alter table achievements disable row level security;
alter table user_achievements disable row level security;
alter table admin_actions disable row level security;

-- 10. Storage buckets ------------------------------------------
-- Public read on avatars + quiz covers. Private on quiz PDFs (own
-- folder per user_id; admin override via the API).
insert into storage.buckets (id, name, public)
  values ('quiz-pdfs', 'quiz-pdfs', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('quiz-covers', 'quiz-covers', true)
  on conflict (id) do nothing;

-- 11. Seed the achievements catalog ----------------------------
-- 7 globals — fixed. Codes match lib/achievements/catalog.ts.
insert into achievements (id, code, scope, quiz_id, name, description, icon, tier_color, threshold, display_order) values
  ('global:first_steps',     'first_steps',     'global', null, 'First Steps',      'Complete your first quiz',                          'Footprints',    'spring',   '{"type":"first_completion"}'::jsonb,                  10),
  ('global:quiz_explorer',   'quiz_explorer',   'global', null, 'Quiz Explorer',    'Complete Attempt 1 on 5 different quizzes',         'Compass',       'aurora',   '{"type":"distinct_completions","value":5}'::jsonb,    20),
  ('global:quiz_veteran',    'quiz_veteran',    'global', null, 'Quiz Veteran',     'Complete Attempt 1 on 10 different quizzes',        'Medal',         'plasma',   '{"type":"distinct_completions","value":10}'::jsonb,   30),
  ('global:perfectionist',   'perfectionist',   'global', null, 'Perfectionist',    'Score 100% on 3 different quizzes',                 'Crown',         'champion', '{"type":"gold_count","value":3}'::jsonb,              40),
  ('global:mapei_scholar',   'mapei_scholar',   'global', null, 'Mapei Scholar',    'Score >= 90% on 5 different quizzes',               'GraduationCap', 'champion', '{"type":"silver_or_better_count","value":5}'::jsonb,  50),
  ('global:daily_driver',    'daily_driver',    'global', null, 'Daily Driver',     'Practice on 7 different days',                      'CalendarCheck', 'spring',   '{"type":"distinct_practice_days","value":7}'::jsonb,  60),
  ('global:repeat_offender', 'repeat_offender', 'global', null, 'Repeat Offender',  '50 total practice attempts',                        'Repeat',        'ember',    '{"type":"total_practice","value":50}'::jsonb,         70)
on conflict (id) do update set
  name = excluded.name, description = excluded.description, icon = excluded.icon,
  tier_color = excluded.tier_color, threshold = excluded.threshold,
  display_order = excluded.display_order;

-- 12. Per-quiz achievement seeder function --------------------
-- Call as: select seed_achievements_for_quiz('<quiz uuid>');
-- Idempotent — uses ON CONFLICT.
create or replace function seed_achievements_for_quiz(p_quiz_id uuid) returns void as $$
declare
  v_quiz_id_short text := replace(p_quiz_id::text, '-', '');
begin
  insert into achievements (id, code, scope, quiz_id, name, description, icon, tier_color, threshold, display_order) values
    (p_quiz_id::text || ':completed',    'completed',    'per_quiz', p_quiz_id, 'Completed',     'Finish Attempt 1',         'CheckCircle',  'slate',    '{"type":"attempt_1_done"}'::jsonb,           5),
    (p_quiz_id::text || ':bronze',       'bronze',       'per_quiz', p_quiz_id, 'Bronze',        'Score 80% or higher',      'Award',        'bronze',   '{"type":"score_pct","value":80}'::jsonb,    10),
    (p_quiz_id::text || ':silver',       'silver',       'per_quiz', p_quiz_id, 'Silver',        'Score 90% or higher',      'Award',        'silver',   '{"type":"score_pct","value":90}'::jsonb,    20),
    (p_quiz_id::text || ':gold',         'gold',         'per_quiz', p_quiz_id, 'Gold',          'Perfect score (100%)',     'Trophy',       'champion', '{"type":"score_pct","value":100}'::jsonb,   30),
    (p_quiz_id::text || ':trainee',      'trainee',      'per_quiz', p_quiz_id, 'Trainee',       'Practice 5 times',         'BookOpen',     'spring',   '{"type":"practice_count","value":5}'::jsonb, 40),
    (p_quiz_id::text || ':practitioner', 'practitioner', 'per_quiz', p_quiz_id, 'Practitioner',  'Practice 15 times',        'BookOpen',     'aurora',   '{"type":"practice_count","value":15}'::jsonb, 50),
    (p_quiz_id::text || ':master',       'master',       'per_quiz', p_quiz_id, 'Master',        'Practice 30 times',        'BookMarked',   'plasma',   '{"type":"practice_count","value":30}'::jsonb, 60)
  on conflict (id) do nothing;
end;
$$ language plpgsql;

-- 13. Auto-seed for existing actual quizzes
do $$
declare q record;
begin
  for q in select id from quizzes where type = 'actual' and deleted_at is null loop
    perform seed_achievements_for_quiz(q.id);
  end loop;
end $$;

-- ============================================================
-- DOWN MIGRATION (manual; run with care)
-- ============================================================
-- drop function if exists seed_achievements_for_quiz(uuid);
-- delete from achievements where scope = 'global';
-- drop trigger if exists trg_practice_counters_updated_at on practice_counters;
-- drop function if exists set_updated_at();
-- drop table if exists user_achievements;
-- drop table if exists achievements;
-- drop table if exists practice_counters;
-- drop table if exists admin_actions;
-- alter table email_log drop column if exists error_message, drop column if exists status, drop column if exists subject;
-- alter table attempts drop column if exists deleted_at, drop column if exists xp_awarded,
--   drop column if exists time_taken_seconds, drop column if exists user_agent,
--   drop column if exists ip_address, drop column if exists pdf_url,
--   drop column if exists is_leaderboard_attempt;
-- alter table quizzes drop column if exists cover_image_url, drop column if exists practice_for_quiz_id,
--   drop column if exists type;
-- alter table users drop column if exists last_active_at, drop column if exists completed_quizzes_count,
--   drop column if exists total_xp;
-- delete from storage.buckets where id in ('quiz-pdfs','avatars','quiz-covers');
