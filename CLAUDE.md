# CLAUDE.md

Guidance for Claude Code working in this repo. Keep this current — when something on disk no longer matches a description here, update it.

## Stack

- **Next.js 16.2.4** (App Router) with **Turbopack** for both dev and build
- **React 19.2.5** + **TypeScript** (`strict: false`, `allowJs: true` for legacy)
- **Tailwind v3** with shadcn-style HSL theme tokens, `tailwindcss-animate`, custom gradient/glow plugin
- **Manrope** + **Inter Tight** + **Inter** + **JetBrains Mono** loaded via `next/font/google`
- **motion** (the new framer-motion namespace), **gsap** for cloud parallax, **lucide-react** icons, **@radix-ui/{react-slot,react-dialog,react-tabs,react-dropdown-menu,react-tooltip}** primitives, **class-variance-authority** + **clsx** + **tailwind-merge**, **sonner** for toasts, **zod** for validation
- **react-email** for all transactional templates
- **bcryptjs** + **jsonwebtoken** for auth
- **Supabase** (PostgreSQL) for storage, **Google Gemini** for question generation, **Zoho SMTP** via `nodemailer` for email

Path alias `@/*` resolves to `./src/*`.

## Build & Run

```bash
npm run dev      # next dev --turbopack on port 3000
npm run build    # next build --turbopack
npm start        # next start (production)
```

If `.next/` is locked or stale (Spotlight on macOS occasionally creates a `dist 2/` shadow dir):

```bash
until [ ! -d .next ]; do rm -rf .next 2>/dev/null; sleep 1; done && npm run dev
```

## Architecture

**Auth.** bcrypt-hashed passwords (server only), HTTP-only signed JWT cookie (`lpz_session`, HS256, 30-day, `{ userId, role }` payload). Two signup paths coexist:
- **Self-signup** at `/signin` → row inserted with `status='pending'` → admin gets HMAC-signed approve/deny email → user can log in.
- **Admin-creates** at `/admin/users` → row inserted with `status='approved'` → user gets credentials email immediately.

**Sessions.** `src/lib/session.ts` (sign/verify/cookies). `src/lib/passwords.ts` (bcrypt at 12 rounds). `src/lib/auth-guard.ts` exposes `requireSession()` + `requireAdmin()` for route handlers. `src/lib/cron-guard.ts` validates Vercel cron's bearer token.

**Pages are mostly Server Components.** They read the session server-side and `redirect('/signin')` if absent. Heavy data fetches are batched in the page itself; client components handle interactivity.

**Quiz attempts.** Server-side authoritative scoring. Each attempt stores its own `question_order` (Fisher-Yates of question UUIDs) AND `option_orders` (per-question A/B/C/D shuffle). The client only sees its display slot; the server translates back via the stored map at answer-save time. Strict 30-minute timer (`expires_at = started_at + 30min`). Lazy expiry sweep on every attempt-route hit (no cron needed for this).

**Gamification engine.** Pure modules in `src/lib/`:
- `scoring.ts` — `computeScore(questions, answers)`: weighted sum of correct-answer points
- `xp.ts` — `computeXpAward({ oldXp, correctCount, totalQuestions, isFirstMover, hitStreakMilestone })`: 50 base + 5/correct + 100 perfect + 25 first-mover + 50 streak-7 + 200 streak-30. `levelFromXp(xp) = floor(xp/1000) + 1`. 10-tier title roll-up.
- `streaks.ts` — `applyStreak(...)`: edge cases per architecture §8 (first-quiz, same-day, gap=1, gap=2-with-freeze, reset). Grants 1 freeze every 7 days (cap 3). Reports milestones at 7/30/100/365.
- `badges.ts` — `evaluateBadges(...)`: 13 of 14 catalog badges, idempotent inserts. `comeback_kid` is awarded by the leaderboard-reveal cron.
- `quiz-engine.ts` — Fisher-Yates, slot↔letter translation, display mapping, `QUIZ_TIME_LIMIT_MS`, `FREE_ATTEMPT_CAP`.
- `uae-time.ts` — fixed UTC+4 helpers (UAE doesn't observe DST).

**Cron.** Two daily Vercel cron jobs (Hobby plan limit):
- `/api/cron/reveal-leaderboards` — daily 20:05 UTC = 00:05 UAE. Flips `leaderboard_visible=true` for any quiz with ≥5 completes + 24h elapsed; emails every approved user.
- `/api/cron/daily-emails` — daily 14:00 UTC = 18:00 UAE. (a) Streak-at-risk emails to users with `current_streak ≥ 5` who haven't completed a quiz today (idempotent via `email_log`). (b) Weekly recap on Sundays.

### Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | static | Public landing (loading screen + hero + split-screen sign-in) |
| `/signin` | static | Standalone sign-in / register form |
| `/home` | dynamic, auth-guarded | Post-login podium home (header + podium + CTA + rival nudge + mistakes + badges) |
| `/quiz/[id]` | dynamic, auth-guarded | Take-the-quiz screen — timer, options, navigation, resume, time-up modal |
| `/quiz/[id]/results` | dynamic, auth-guarded | Orchestrated reveal — score tick → XP card → level-up → badge unlocks → streak |
| `/quiz/[id]/review` | dynamic, auth-guarded | Per-Q breakdown with explanations |
| `/leaderboard` | dynamic, auth-guarded | Tabs: This Quiz / All-Time. Top 10 + neighbors. |
| `/profile` | dynamic, auth-guarded | XP bar, streak block, flair picker, full badge grid |
| `/admin` | server-component layout | Auth gate (admin only) + tabs nav |
| `/admin/users` | dynamic, admin | Create / edit / reset / promote / suspend |
| `/admin/quizzes` | dynamic, admin | Upload JSON quiz · unlock toggle |
| `/admin/library` | dynamic, admin | Every question across every quiz, grouped by difficulty, search, repeat-detection |
| `/admin/requests` | dynamic, admin | Pending access requests · Approve / Deny |
| `/dashboard` | static | Tombstone redirect → `/home` |
| `/api/auth/{login,register,logout,decision}` | dynamic | Auth |
| `/api/me` | dynamic | Current user payload |
| `/api/me/active-badge` | dynamic | Set the flair shown on leaderboard |
| `/api/me/mistakes/[questionId]/reviewed` | dynamic | Mark/unmark a mistake as reviewed |
| `/api/admin/users/{,[id],[id]/reset-password}` | dynamic, admin | User CRUD |
| `/api/admin/quizzes/{,[id]/unlock}` | dynamic, admin | JSON import + unlock toggle |
| `/api/admin/access-requests/[id]/resolve` | dynamic, admin | Grant/deny re-attempt |
| `/api/quizzes/[id]/{start,request-access}` | dynamic | Start an attempt or request a 3rd |
| `/api/attempts/[id]/{,answer,submit}` | dynamic | Resume state · save answer · final submit (orchestrates score+XP+streak+badges) |
| `/api/cron/{reveal-leaderboards,daily-emails}` | dynamic | Vercel cron entries |
| `/api/send-email` | dynamic | Single email entry; renders react-email templates |
| `/api/generate` | dynamic | Gemini question generation (legacy) |
| `not-found.tsx` | static | Explicit 404 |

### Brand components

`src/components/brand/`:
- **`LogoMark.tsx`** — circular monogram only. `spin` prop applies the global `lpz-mark-spin` keyframe.
- **`LogoWordmark.tsx`** — "lapizblue" wordmark only.
- **`LogoFull.tsx`** — both side-by-side. `spinMark` prop forwards to LogoMark.

### Loading screen, hero, split-screen signin

`src/components/loading-screen.tsx` plays once per session. `/` is the public hero with the GSAP-animated cloud canvas + the rotating power verbs. `<AuthForm />` (in `src/components/auth/`) is shared between `/signin` and the `/` split-screen.

### UI primitives (`src/components/ui/`)

- `button.tsx` — shadcn-style with CVA variants
- `gradient-button.tsx` — animated gradient border + outer blur halo, 6 gradient variants × 4 sizes (the magic CTAs)
- `dialog.tsx`, `tabs.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`, `badge.tsx` — radix wrappers
- `number-ticker.tsx` — Framer Motion `useMotionValue` + `useTransform` for the score reveal

### Avatar

`src/components/avatar/avatar.tsx` — initials placeholder per design §5 v1, deterministic gradient from username, sm/md/lg/xl, `champion` (animated bobbing crown overlay), `isSelf` (pulse-aurora ring). `next/image` swap when `avatar_url` is set.

### Files with `// @ts-nocheck`

Mechanical-rename casualties from the JS → TS migration. Don't remove the directive without converting the whole file:

- `src/lib/supabase.ts` (legacy anon client; not imported by new code)
- `src/app/api/generate/route.ts`, `src/app/api/send-email/route.ts`
- `src/app/avatar/page.tsx`, `badges/page.tsx`, `reports/page.tsx` (legacy pages still referenced from old links)

New code is properly typed (everything under `src/lib/{session,passwords,auth-guard,cron-guard,scoring,xp,streaks,badges,quiz-engine,uae-time,types,utils,decision-token,supabase-admin,gradient-from-string}`, `src/components/`, `src/emails/`, all `src/app/api/{auth,me,admin,quizzes,attempts,cron}/**`).

### Database schema

`supabase/migrations/` (run in order):
1. `001_quiz_scoring.sql` — adds `questions.points`, `questions.difficulty`, `quizzes.max_score`
2. `002_seed_quiz_1.sql` — generated from `supabase/seeds/mapei_quiz_1.json`. 30 questions; max 57. Idempotent re-run.
3. `003_reset_to_fresh.sql` — wipe non-admin users + all per-user state + lock all quizzes; leaves Tarun + the seeded questions in place.

The original schema lives in `supabase/schema_reset.sql`. RLS is **off** on every app table — server uses the service-role key, browser never queries directly except via the legacy `supabase.ts` anon client which a few legacy pages still import.

`users` columns: `id`, `username`, `password_hash`, `email`, `first_name`, `last_name`, `role` (`admin|staff`), `status` (`pending|approved|rejected|suspended`), `avatar_url`, `xp`, `level`, `title`, `current_streak`, `longest_streak`, `streak_freezes`, `last_quiz_date`, `active_badge_id`, `created_at`, `updated_at`.

### Email types (`/api/send-email`)

| `type` | To | Trigger |
|---|---|---|
| `account_created` | new user | Admin creates user OR resets password |
| `new_registration` | `ADMIN_EMAIL` | Self-signup form submission. Body has HMAC-signed approve/deny buttons. |
| `password_reset_request` | `ADMIN_EMAIL` | User clicked "Forgot password" |
| `approved` | user | (legacy welcome — also fired from /api/auth/decision approve) |
| `quiz_assigned` | user | (legacy) |
| `certificate_earned` | user | (legacy) |
| `leaderboard_live` | every approved user | Reveal cron fires |
| `streak_milestone` | user | Streak hits 7/30/100/365 (currently fires from results screen via XP path; can also be sent server-side) |
| `streak_at_risk` | user | Daily-emails cron, when streak ≥ 5 and no quiz today (idempotent via `email_log`) |
| `weekly_recap` | every approved user | Daily-emails cron, Sundays only, only if user had any activity that week |
| `access_request_received` | `ADMIN_EMAIL` | User requests a 3rd attempt |
| `access_request_resolved` | user | Admin clicks Approve/Deny in `/admin/requests` |

`ADMIN_EMAIL` defaults to `'tarun.s@lapizblue.com'` (overridable). `ZOHO_EMAIL` is the SMTP login, NOT the destination.

## Environment variables

Required (gitignored, in `.env.local` locally and in Vercel for Production + Preview + Development):

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | `https://<project>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client (legacy pages) | `sb_publishable_…` |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | `sb_secret_…`. Bypasses RLS. **Rotate immediately if exposed.** |
| `SESSION_SECRET` | server | 96-char random hex; signs the JWT cookie. Min 32 chars. |
| `CRON_SECRET` | server | 96-char random hex; Vercel cron bearer auth. |
| `ZOHO_EMAIL`, `ZOHO_PASSWORD` | server | SMTP credentials |
| `GEMINI_API_KEY` | server (legacy `/api/generate`) | |
| `ADMIN_EMAIL` (optional) | server | Defaults to `'tarun.s@lapizblue.com'` |

After changing any Vercel env var: **redeploy with "Use existing Build Cache" UNCHECKED**.

## Vercel cron (`vercel.json`)

```json
{
  "crons": [
    { "path": "/api/cron/reveal-leaderboards", "schedule": "5 20 * * *" },
    { "path": "/api/cron/daily-emails",        "schedule": "0 14 * * *" }
  ]
}
```

(All times UTC. UAE = UTC+4. So 20:05 UTC = 00:05 UAE; 14:00 UTC = 18:00 UAE.)

## Styling

Two coexisting systems:
1. **New (every screen except a few legacy pages)** — Tailwind utility classes + shadcn HSL tokens, midnight-blue palette, gradient utilities (`bg-gradient-aurora`, etc.), `.tabular` for numerics, the design-system type scale.
2. **Legacy** — CSS variables in `globals.css`, Mapei red `#E30613`, inline styles. Still used by `/avatar`, `/badges`, `/reports`. Do not write new code in this style.

## Deployment

Vercel auto-deploys every push to `main`. The live URL is `https://mapei-quiz.vercel.app`. Hobby plan is sufficient.

## Operational quirks (learned the hard way)

- **macOS Spotlight breaks `npm install`**. If `node_modules/next/dist/` shows up as `dist 2/` (with a literal space), Spotlight indexed during extraction. Fix: `rm -rf node_modules package-lock.json && npm install` and don't touch the folder for ~30s. Adding `node_modules/` to Spotlight Privacy permanently solves it.
- **`.next` write conflicts**. Switching between `next build` and `next dev` without wiping yields ENOENT errors. Always `rm -rf .next` between modes.
- **Turbopack rejects `<style jsx>`** and **`@import` after other CSS rules**. Both already cleaned up; keep them out.
- **Vercel Hobby cron**: only daily schedules, max 2 jobs. We use both — the lazy-sweep pattern (run on every attempt-route hit) replaces a 3rd cron we'd otherwise need for incomplete-attempt cleanup.
- **zsh + `[id]` paths**: zsh globs `[id]` as a character class. Quote them in shell commands: `'src/app/quiz/[id]/...'`.

## Security notes

- **Passwords are bcrypt-hashed (12 rounds)** in `users.password_hash`. The browser never sees a hash.
- **Sessions are HTTP-only signed JWT cookies.** Payload is minimal — `{ userId, role }`. Anything else is fetched from DB.
- **The Supabase service-role key** bypasses RLS. Never log it, never return it from a client-reachable endpoint, never paste it in chat. Rotate immediately if exposed.
- **HMAC-signed approve/deny URLs** use `crypto.timingSafeEqual` for constant-time compare.
- **Cron routes** require `Authorization: Bearer ${CRON_SECRET}` (Vercel injects this automatically for routes referenced in `vercel.json`).
