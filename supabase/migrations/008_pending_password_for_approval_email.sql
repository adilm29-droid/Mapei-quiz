-- =============================================================
-- 008 — Temporarily store the plaintext password for the approval email
--
-- Per Tarun 2026-05-12: the "your account is approved" email should
-- include the user's password so they don't need to remember what
-- they typed at registration. Passwords are bcrypt-hashed at register
-- time, so we keep a temporary plaintext copy on the user row
-- between registration and approval.
--
-- Lifecycle:
--   - Register flow writes pending_password_plain = <typed password>
--   - Approval flow (cron-style admin click) reads it, emails it,
--     then UPDATE users SET pending_password_plain = NULL
--   - Column is intentionally not added to any select * pathway —
--     code reads it only inside the approval handler.
--
-- Tarun explicitly accepts the security tradeoff (a plaintext password
-- sitting in the DB until admin approves, typically minutes to days).
--
-- Apply via the Supabase SQL editor. Idempotent.
-- =============================================================

alter table users
  add column if not exists pending_password_plain text;

-- =============================================================
-- DOWN MIGRATION (manual)
-- =============================================================
-- alter table users drop column if exists pending_password_plain;
