-- 010 — HR Colleague Feedback Survey (/survey, /admin/hr)
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- RLS is ON with no policies: only the server (service-role key) can read or
-- write these tables. The browser anon key cannot see the passcode or who
-- rated which manager.

CREATE TABLE IF NOT EXISTS hr_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Starting staff passcode. Change it from Admin → HR Survey → Settings.
INSERT INTO hr_settings (key, value) VALUES ('passcode', '482913')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS hr_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_type TEXT NOT NULL CHECK (survey_type IN ('A','B')),
  period TEXT NOT NULL,                       -- e.g. 2026-H2 (Jan–Jun = H1, Jul–Dec = H2)
  department TEXT,
  assessed_name TEXT NOT NULL,
  respondent_name TEXT NOT NULL,
  respondent_email TEXT NOT NULL,
  answers SMALLINT[] NOT NULL CHECK (array_length(answers, 1) = 10 AND 1 <= ALL(answers) AND 5 >= ALL(answers)),
  total SMALLINT NOT NULL CHECK (total BETWEEN 10 AND 50),
  kpi_score SMALLINT NOT NULL CHECK (kpi_score BETWEEN 20 AND 100),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Set when the respondent was signed in as admin (admin may submit repeatedly)
ALTER TABLE hr_responses ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- One submission per respondent, per person rated, per survey type, per half-year.
-- Admin submissions are exempt.
DROP INDEX IF EXISTS hr_responses_once;
CREATE UNIQUE INDEX hr_responses_once
  ON hr_responses (lower(respondent_email), survey_type, lower(assessed_name), period)
  WHERE NOT is_admin;
CREATE INDEX IF NOT EXISTS hr_responses_report
  ON hr_responses (period, survey_type, lower(assessed_name));

ALTER TABLE hr_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_responses ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT key, value FROM hr_settings;
