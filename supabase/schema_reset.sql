-- =============================================================
-- Lapiz Blue Quiz — Full Schema Reset (v1)
--
-- Run this ONCE in the Supabase SQL editor. It will:
--   1. Drop every existing app table (data loss)
--   2. Create the v1 schema per QUIZ_ARCHITECTURE.md §2
--   3. Seed the badge catalog (11 badges)
--   4. Seed Tarun as the only admin (password: LapizBlue@2026, bcrypt-hashed)
--   5. Disable RLS on all tables (server uses service-role key)
-- =============================================================

-- 1. Drop everything (in dependency order)
DROP TABLE IF EXISTS reviewed_mistakes CASCADE;
DROP TABLE IF EXISTS user_badges       CASCADE;
DROP TABLE IF EXISTS email_log         CASCADE;
DROP TABLE IF EXISTS access_requests   CASCADE;
DROP TABLE IF EXISTS attempts          CASCADE;
DROP TABLE IF EXISTS scores            CASCADE;  -- legacy
DROP TABLE IF EXISTS certificates      CASCADE;  -- legacy
DROP TABLE IF EXISTS assignments       CASCADE;  -- legacy
DROP TABLE IF EXISTS questions         CASCADE;
DROP TABLE IF EXISTS quizzes           CASCADE;
DROP TABLE IF EXISTS badges            CASCADE;
DROP TABLE IF EXISTS users             CASCADE;

-- 2. Schema

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username        TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  first_name      TEXT,
  last_name       TEXT,
  role            TEXT NOT NULL DEFAULT 'staff'   CHECK (role IN ('admin', 'staff')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  avatar_url      TEXT,
  xp              INTEGER NOT NULL DEFAULT 0,
  level           INTEGER NOT NULL DEFAULT 1,
  title           TEXT NOT NULL DEFAULT 'Apprentice',
  current_streak  INTEGER NOT NULL DEFAULT 0,
  longest_streak  INTEGER NOT NULL DEFAULT 0,
  streak_freezes  INTEGER NOT NULL DEFAULT 0,
  last_quiz_date  DATE,
  active_badge_id UUID,                           -- FK added later (chicken-and-egg)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_xp     ON users(xp DESC);

CREATE TABLE quizzes (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                    TEXT NOT NULL,
  week_number              INTEGER NOT NULL,
  is_unlocked              BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at              TIMESTAMPTZ,
  leaderboard_visible      BOOLEAN NOT NULL DEFAULT FALSE,
  leaderboard_revealed_at  TIMESTAMPTZ,
  deleted_at               TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quizzes_unlocked ON quizzes(is_unlocked) WHERE deleted_at IS NULL;

CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id         UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  option_a        TEXT NOT NULL,
  option_b        TEXT NOT NULL,
  option_c        TEXT NOT NULL,
  option_d        TEXT NOT NULL,
  correct_answer  CHAR(1) NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
  explanation     TEXT,
  category        TEXT,
  order_index     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_questions_quiz ON questions(quiz_id, order_index);

CREATE TABLE attempts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id                  UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  attempt_number           INTEGER NOT NULL,
  started_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at               TIMESTAMPTZ NOT NULL,
  submitted_at             TIMESTAMPTZ,
  is_complete              BOOLEAN NOT NULL DEFAULT FALSE,
  is_incomplete            BOOLEAN NOT NULL DEFAULT FALSE,
  final_score              INTEGER,
  question_order           JSONB NOT NULL,                  -- ["q1", "q5", ...]
  option_orders            JSONB NOT NULL DEFAULT '{}'::jsonb, -- {"q1": ["B","D","A","C"]}
  current_question_index   INTEGER NOT NULL DEFAULT 0,
  answers                  JSONB NOT NULL DEFAULT '{}'::jsonb, -- {"q1": "B"}
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT attempts_unique UNIQUE (user_id, quiz_id, attempt_number)
);
CREATE INDEX idx_attempts_user_quiz ON attempts(user_id, quiz_id);
CREATE INDEX idx_attempts_quiz      ON attempts(quiz_id) WHERE is_complete = TRUE;
CREATE INDEX idx_attempts_active    ON attempts(user_id) WHERE submitted_at IS NULL;

CREATE TABLE access_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id       UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'denied')),
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_access_requests_pending ON access_requests(status) WHERE status = 'pending';

CREATE TABLE badges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  icon_name       TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN ('skill', 'streak', 'discovery')),
  gradient        TEXT NOT NULL,           -- e.g. 'champion', 'aurora', 'plasma'
  condition_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id    UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_badges_unique UNIQUE (user_id, badge_id)
);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);

-- now we can add the FK from users.active_badge_id
ALTER TABLE users
  ADD CONSTRAINT users_active_badge_fk
  FOREIGN KEY (active_badge_id) REFERENCES badges(id) ON DELETE SET NULL;

CREATE TABLE reviewed_mistakes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  reviewed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reviewed_mistakes_unique UNIQUE (user_id, question_id)
);

CREATE TABLE email_log (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  type      TEXT NOT NULL,
  payload   JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_log_user_type ON email_log(user_id, type, sent_at DESC);

-- 3. Disable RLS (server uses service-role; browser auth flow is server-mediated)
ALTER TABLE users             DISABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes           DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions         DISABLE ROW LEVEL SECURITY;
ALTER TABLE attempts          DISABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests   DISABLE ROW LEVEL SECURITY;
ALTER TABLE badges            DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges       DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviewed_mistakes DISABLE ROW LEVEL SECURITY;
ALTER TABLE email_log         DISABLE ROW LEVEL SECURITY;

-- 4. Seed badges (per DESIGN_SYSTEM §11 + ARCHITECTURE §9)
INSERT INTO badges (code, name, description, icon_name, category, gradient) VALUES
  ('first_blood',    'First Quiz Done',     'Complete your very first quiz.',                                          'flag',          'discovery', 'aurora'),
  ('perfect_score',  'Bullseye',            'Score 30 / 30 on any quiz.',                                              'target',        'skill',     'champion'),
  ('speed_demon',    'Speed Demon',         'Submit a quiz with at least 27 / 30 in under 10 minutes.',                'zap',           'skill',     'sunset'),
  ('marathon_10',    'Quiz Marathon I',     'Complete 10 quizzes.',                                                    'medal',         'skill',     'spring'),
  ('marathon_50',    'Quiz Marathon II',    'Complete 50 quizzes.',                                                    'trophy',        'skill',     'plasma'),
  ('comeback_kid',   'Comeback Kid',        'Move from the bottom half to top 3 between two consecutive leaderboards.','trending-up',   'skill',     'spring'),
  ('streak_7',       'Week Warrior',        'Maintain a 7-day streak.',                                                'flame',         'streak',    'sunset'),
  ('streak_30',      'Month Master',        'Maintain a 30-day streak.',                                               'flame',         'streak',    'sunset'),
  ('streak_100',     'Quarter Champion',    'Maintain a 100-day streak.',                                              'flame',         'streak',    'champion'),
  ('streak_365',     'Year-Long Legend',    'Maintain a 365-day streak.',                                              'flame',         'streak',    'plasma'),
  ('early_bird',     'Early Bird',          'Complete a quiz before 8:00 UAE.',                                        'sunrise',       'discovery', 'sunset'),
  ('night_owl',      'Night Owl',           'Complete a quiz after 22:00 UAE.',                                        'moon',          'discovery', 'aurora'),
  ('weekender',     'Weekender',           'Complete quizzes on Saturday AND Sunday in the same week.',              'calendar-days', 'discovery', 'spring'),
  ('the_climb',      'The Climb',           'Improve your score by 5+ points in attempt 2 vs attempt 1.',              'mountain',      'discovery', 'aurora');

-- 5. Seed Tarun (admin, status=approved, bcrypt('LapizBlue@2026'))
-- Hash generated via: bcrypt.hashSync('LapizBlue@2026', 12)
INSERT INTO users (username, password_hash, email, first_name, last_name, role, status, level, title)
VALUES (
  'tarun',
  '$2b$12$ca4Em5jD/jWIPt2SLUnHSOKBHGXuAmgYfWsyI4uyrfYGmRedyonNa',
  'tarun.s@lapizblue.com',
  'Tarun',
  'Shukla',
  'admin',
  'approved',
  1,
  'Apprentice'
);

-- Done. Run a sanity check:
SELECT username, email, role, status FROM users;
SELECT COUNT(*) AS badge_count FROM badges;
