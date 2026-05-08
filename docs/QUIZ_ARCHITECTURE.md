# Lapiz Blue Quiz — Architecture & Build Spec

> **For Claude Code:** This file is the authoritative spec for what to build and how. Pair it with `DESIGN_SYSTEM.md` (visuals/animations) and the 21st.dev component library. When in doubt, this file wins. Ask the user before deviating.

---

## 0. North-star principles

1. **Simplicity over cleverness.** Tarun explicitly asked for "absolutely simpler." No Redis, no real-time subscriptions, no microservices. Supabase + Next.js API routes is the entire backend.
2. **Decisive defaults.** Every edge case below has one chosen behavior. Don't reintroduce ambiguity.
3. **Strict & fair timing.** When in conflict, fairness > leniency. Timers don't pause.
4. **Small team optimization.** ~10–30 staff users. Don't build for scale Tarun doesn't have.
5. **Mobile-first.** Most staff will check leaderboard / take quiz on their phone.

---

## 1. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Already set up |
| Language | TypeScript (strict) | |
| Styling | Tailwind CSS | |
| UI Components | 21st.dev library | Browse for: cards, podium, progress bars, animated buttons, badge displays, modals |
| Animations | Framer Motion | All animations in `DESIGN_SYSTEM.md` use spring physics |
| Database | Supabase (Postgres) | Already set up. RLS is OFF — server-side service role only. |
| Auth | Custom username/password via Supabase | Already in place. **Migrate plaintext passwords to bcrypt.** |
| Email | Resend or Zoho SMTP via Nodemailer | Tarun's domain is lapizblue.com. Use the existing `ZOHO_EMAIL` / `ZOHO_PASSWORD` env vars. |
| Time zone | All quiz timestamps in `Asia/Dubai` (UTC+4) | Display in user's local for "your last attempt" but quiz logic is UAE time |
| Deployment | Vercel | Already deployed at mapei-quiz.vercel.app |

---

## 2. Data model

Use Supabase. Schema below. All FKs use `ON DELETE CASCADE` unless stated. Keep it normalized but don't over-engineer.

### `users`
```
id              uuid PK (default gen_random_uuid())
username        text unique not null
password_hash   text not null         -- bcrypt, NEVER plaintext
email           text unique not null
first_name      text
last_name       text
role            text not null default 'staff'  -- 'admin' | 'staff'
status          text not null default 'pending' -- 'pending' | 'approved' | 'rejected'
avatar_url      text                  -- nullable; defaults to placeholder
xp              integer not null default 0
level           integer not null default 1
title           text not null default 'Apprentice'  -- derived but cached
current_streak  integer not null default 0
longest_streak  integer not null default 0
streak_freezes  integer not null default 0
last_quiz_date  date                   -- for streak calc, UAE date
created_at      timestamptz default now()
updated_at      timestamptz default now()
```

### `quizzes`
```
id                      uuid PK
title                   text not null         -- "Week 1 — Mapei Adhesives"
week_number             integer not null
is_unlocked             boolean default false  -- admin toggles
unlocked_at             timestamptz
leaderboard_visible     boolean default false  -- auto-flips next day after ≥5 completes
leaderboard_revealed_at timestamptz
created_at              timestamptz default now()
```

### `questions`
```
id              uuid PK
quiz_id         uuid FK → quizzes
question_text   text not null
option_a        text not null
option_b        text not null
option_c        text not null
option_d        text not null
correct_answer  char(1) not null check in ('A','B','C','D')
explanation     text                   -- optional, shown in mistakes review
category        text                   -- "Adhesives", "Grouts" etc. used for category badges later
order_index     integer                -- canonical admin order
```

### `attempts`
The single most important table. One row per user per attempt.
```
id                       uuid PK
user_id                  uuid FK → users
quiz_id                  uuid FK → quizzes
attempt_number           integer not null     -- 1, 2, or 3+ if admin-granted
started_at               timestamptz not null default now()
expires_at               timestamptz not null  -- = started_at + 30 minutes (STRICT)
submitted_at             timestamptz           -- null until submitted
is_complete              boolean default false
is_incomplete            boolean default false  -- auto-set when expires_at passes with no submit
final_score              integer               -- 0–30, null until complete
question_order           jsonb not null        -- ["q1_uuid", "q5_uuid", ...] this user's shuffle
option_orders            jsonb not null        -- {"q1_uuid": ["B","D","A","C"], ...}
current_question_index   integer default 0     -- for resume
answers                  jsonb default '{}'    -- {"q1_uuid": "B", ...} as user picks them

constraint: unique(user_id, quiz_id, attempt_number)
```

### `access_requests`
When a user has used both auto-attempts and wants a 3rd:
```
id            uuid PK
user_id       uuid FK
quiz_id       uuid FK
requested_at  timestamptz default now()
status        text default 'pending' -- 'pending' | 'granted' | 'denied'
resolved_at   timestamptz
resolved_by   uuid FK → users (admin)
```

### `badges` (catalog)
Seeded once. Don't let admins create badges from UI in v1.
```
id              uuid PK
code            text unique  -- 'first_quiz', 'perfect_score' etc.
name            text
description     text
icon_name       text         -- maps to a Lucide / custom SVG name
category        text         -- 'skill' | 'streak' | 'discovery'
condition_json  jsonb        -- machine-readable rule, but eval is in code
```

### `user_badges`
```
id          uuid PK
user_id     uuid FK
badge_id    uuid FK
earned_at   timestamptz default now()
constraint: unique(user_id, badge_id)
```

### `email_log`
Prevent duplicate sends + audit trail.
```
id        uuid PK
user_id   uuid FK
type      text   -- 'account_created', 'access_request', 'leaderboard_live', 'badge_unlocked', 'streak_milestone'
payload   jsonb
sent_at   timestamptz default now()
```

### `notifications` (in-app, optional v1, useful v1.5)
Defer if scope tight. Tarun did not ask for in-app notif center.

---

## 3. User roles & auth

Two roles only: `admin` and `staff`. Tarun is admin.

### Account creation flow
1. Admin opens Admin Panel → "Create User"
2. Fills first name, last name, email, username, temp password
3. Account created with `status = 'approved'`
4. Auto-email to user: "Your Lapiz Blue Quiz account is ready. Login here. Username: X, temp password: Y. Please change after first login."
5. Self-signup is **disabled** in v1. Tarun controls who joins.

### Login
- POST `/api/auth/login` with `{username, password}`
- Server compares bcrypt hash, sets HTTP-only cookie session (signed JWT, 30-day expiry)
- Cookie contains `{userId, role}` only

### Password change (post-launch)
- `/profile/security` page → old password + new password
- bcrypt hash, update `password_hash`

---

## 4. Quiz lifecycle (admin's perspective)

```
DRAFT  →  UNLOCKED  →  attempts pile up  →  +1 day & ≥5 completed  →  LEADERBOARD LIVE
                                                                           ↓
                                                                     emails to all users
```

### Admin creates a quiz
- Admin Panel → "New Quiz" → enters title + week number
- Bulk-add questions: paste CSV or fill in form (30 rows). Each row: question, A, B, C, D, correct letter, optional explanation, optional category.
- Quiz starts as `is_unlocked = false`. No staff can see or attempt it.

### Admin unlocks
- Toggles `is_unlocked = true`
- (Optional v1.5) Auto-email to all approved staff: "🚀 New quiz is live: [Title]. Take it now."
- v1: Tarun manually messages WhatsApp group, no email needed for this event.

### Staff attempts
- See Section 5.

### Leaderboard reveal logic
**Trigger:** A nightly cron at **00:05 UAE time** runs:
```
For each quiz where leaderboard_visible = false AND is_unlocked = true:
  count = COUNT(attempts where quiz_id = X AND is_complete = true)
  IF count >= 5 AND unlocked_at < (now - 24 hours):
    set leaderboard_visible = true
    set leaderboard_revealed_at = now()
    enqueue email "leaderboard_live" to every approved user
```

Run via Vercel Cron (`vercel.json` cron entry pointing to `/api/cron/reveal-leaderboards`). Single endpoint, idempotent.

**Why both conditions?** Tarun said "next day AND at least 5 attempts." Both must be true.

### Re-attempt logic
- Each user gets **2 free attempts** per quiz. Use the highest score for leaderboard.
- After 2nd attempt completed, the "Take Quiz" button is replaced by **"Request another attempt"**
- Clicking creates a row in `access_requests` (status='pending') and emails admin: "[User] is requesting another attempt at [Quiz]. [Approve] [Deny]"
- Approve → bumps user's attempt count cap to 3 for that quiz only. Email user: "Granted, you have one more attempt."
- Deny → status='denied', email user softly: "Request reviewed. You can pick up the next quiz."

### Score that counts
- Highest of all completed attempts for that quiz.
- Incomplete attempts don't count and don't show on leaderboard.

---

## 5. Quiz mechanics (the actual taking)

### Starting an attempt
When user clicks "Start Quiz":
1. Server creates `attempts` row.
2. Server generates `question_order`: shuffled array of 30 question UUIDs (Fisher-Yates).
3. Server generates `option_orders`: for each question, a shuffled array of letters representing display order. E.g. `["C","A","D","B"]` means slot 1 displays original C, slot 2 displays original A, etc.
4. `expires_at = started_at + 30 minutes`. Strict.
5. Returns the first question (with options re-mapped per `option_orders`).

### Per-question UI
- One question + 4 options, displayed using `option_orders[questionId]`
- Top-of-screen decorative bar (drains right→left, green→cyan→amber→red over 60s, **purely visual**)
- Bottom of header: actual countdown `MM:SS` for total quiz time, ticking down from 30:00
- Below options: "Confirm answer" button (disabled until an option selected)
- Bottom-left: "← Previous" (disabled on Q1)
- Bottom-right: "Next →" (only after Confirm)
- Progress dot row: 30 dots, current = filled + glowing, answered = filled, unanswered = outlined

### When user clicks Confirm
1. Optimistic UI: option locks visually (no green/red feedback — Tarun explicitly wants no right/wrong reveal mid-quiz)
2. PATCH `/api/attempts/{id}/answer` with `{questionId, selectedLetter}` — letter is the **original** letter of the option they picked (server translates from display slot using stored `option_orders`)
3. Server updates `answers` jsonb, sets `current_question_index`
4. UI advances to next question

### Going back
- Click "← Previous" → loads previous question
- If they had answered it, their answer is pre-selected (still confirmable to overwrite)
- They can change it. Going back doesn't penalize.
- Per-question decorative bar resets each time they land on a question. **It's purely a vibe element.**

### Resume on tab close (strict & fair)
- User closes tab at minute 12. `expires_at` keeps ticking in DB.
- User logs back in at minute 25 → home page shows: **"You have a quiz in progress. 5:00 left."**
- Click → resumes at `current_question_index`, with their saved answers pre-filled.
- Timer is computed `expires_at - now()` every render. If negative, force-submit.

### Submission paths
1. **User clicks Submit** on Q30 (or any question, via "Submit early" button on summary screen)
2. **Timer expires** with the tab open → auto-submit, current state is final
3. **Timer expires while tab closed** → cron at minute 31 marks `is_incomplete = true` if `submitted_at IS NULL AND expires_at < now()`. Score = sum of correct answers in `answers`. **Not on leaderboard.**

### Scoring
- For each `questionId` in `answers`, compare to `correct_answer`. +1 if match.
- `final_score` = total correct (0–30).
- Stored as integer, recalculated server-side never trust client.

### Post-submit screen
- Big score card: "You got 24 / 30 — 80%"
- XP earned (see Section 7)
- Streak update if applicable
- Badges unlocked (animated reveals if any)
- Two buttons: "Review your answers" + "Back to home"
- Review screen shows all 30 questions with: their answer (✅ or ❌), the correct answer if they got it wrong, the explanation if available

---

## 6. The "Mistakes Review" home section

A persistent section on the home page (below the podium): **"What you got wrong"**

Shows all questions across all quizzes the user has ever attempted *and got wrong*.

### Logic
- Pull from `attempts` for `user_id` where `is_complete = true`
- For each, find questions where their answer ≠ `correct_answer`
- Group by quiz, newest first
- Show: question, their answer (red), correct answer (green), explanation if any
- Cap visible to most recent 20, with "View all" link

### "Hide reviewed" toggle
After looking at a mistake, user can mark "Got it" — adds to a `user_id, question_id` table (`reviewed_mistakes`). Reviewed ones are filtered out unless they toggle "Show all."

This is a small but powerful feature for actual product learning.

---

## 7. XP, levels, titles

### XP earnings
| Action | XP |
|---|---|
| Complete a quiz (any score) | 50 |
| Per correct answer | 5 |
| Perfect score (30/30) | +100 bonus |
| First quiz of the week | +25 first-mover bonus |
| 7-day streak hit | +50 |
| 30-day streak hit | +200 |

So a perfect score on a fresh quiz with active streak = 50 + 150 + 100 + 25 = 325 XP.
A typical 24/30 = 50 + 120 = 170 XP.

### Level table (cached in `users.level` and `users.title`)
Recalc on every XP change. Level = `floor(xp / 1000) + 1` (simple). Title:

| Level | Title |
|---|---|
| 1 | Apprentice |
| 2 | Trainee |
| 3 | Product Scout |
| 5 | Showroom Specialist |
| 8 | Lead Specialist |
| 12 | Sales Sensei |
| 18 | Mapei Maestro |
| 25 | Lapiz Champion |
| 35 | Lapiz Legend |
| 50+ | Lapiz Legend (capped, displays with star ✦) |

Recompute level/title server-side after any XP change. Trigger level-up animation client-side if `new_level > old_level` (returned in API response).

---

## 8. Streaks

### Daily streak rule
A "quiz day" = the user **completed** at least one quiz that calendar day in **UAE time**.

### Update logic (run on quiz submit)
```
today = current UAE date
last = users.last_quiz_date

IF last IS NULL OR today > last + 1 day:
    // streak broken or never started
    IF user has ≥1 streak_freeze AND last == today - 2:  // exactly one day missed
        consume freeze, current_streak += 1, last_quiz_date = today
    ELSE:
        current_streak = 1, last_quiz_date = today
ELSE IF today == last + 1:
    current_streak += 1, last_quiz_date = today
ELSE IF today == last:
    // already counted today, no change
    pass

// freeze earning: every 7 days streak, grant 1 freeze (max 3 stored)
IF current_streak % 7 == 0 AND streak_freezes < 3:
    streak_freezes += 1

// longest tracking
longest_streak = MAX(longest_streak, current_streak)
```

### Display
- 🔥 + number in top-right of every authenticated screen
- Tap opens streak detail modal: current, longest, freezes, "Streak Milestones" badge progress

### Streak emails
- Trigger: streak hits 7 / 30 / 100 / 365 → milestone email + auto-grant streak badge
- Trigger: streak ≥ 5 AND no quiz today AND time is past 6pm UAE → "Streak at risk!" email (max once per day)

---

## 9. Badges (v1 catalog)

Seed these on first DB migration. Eval logic runs after every quiz submit + nightly for date-based ones.

### Skill (hard)
| Code | Name | Condition |
|---|---|---|
| `perfect_score` | Bullseye | First time scoring 30/30 |
| `speed_demon` | Speed Demon | Submit a quiz with ≥27/30 in under 10 min |
| `marathon_10` | Quiz Marathon I | Complete 10 quizzes |
| `marathon_50` | Quiz Marathon II | Complete 50 quizzes |
| `comeback_kid` | Comeback Kid | Move from bottom half to top 3 between two consecutive weekly leaderboards |

### Streak
| Code | Name | Condition |
|---|---|---|
| `streak_7` | Week Warrior | 7-day streak |
| `streak_30` | Month Master | 30-day streak |
| `streak_100` | Quarter Champion | 100-day streak |
| `streak_365` | Year-Long Legend | 365-day streak |

### Discovery (easy, fun)
| Code | Name | Condition |
|---|---|---|
| `first_blood` | First Quiz Done | Complete first quiz ever |
| `early_bird` | Early Bird | Complete a quiz before 8:00 UAE |
| `night_owl` | Night Owl | Complete a quiz after 22:00 UAE |
| `weekender` | Weekender | Complete quizzes on a Saturday AND Sunday in same week |
| `the_climb` | The Climb | Improve score in attempt 2 vs attempt 1 by ≥5 points |

(11 badges. Enough for a full grid screen, not so many that they feel cheap.)

### Profile flair
User can pick **one** badge as their "active" badge, shown next to their name on leaderboard. Default = most recently earned.

---

## 10. Leaderboard

### Two scopes (v1)
1. **This Quiz** (per quiz, defaults to most recent live quiz) — ranked by `final_score` DESC, then `submitted_at` ASC (faster wins ties)
2. **All-Time XP** — ranked by `users.xp` DESC

Show the **This Quiz** by default on home page podium.

### The podium (home page hero)
- Visible at all times once `leaderboard_visible = true` for the latest quiz
- If <5 attempts or <24h since unlock: shows placeholder "Leaderboard reveals once 5 staff have completed this week's quiz"
- Top 3 on stairs (3rd left, 1st center, 2nd right) — see DESIGN_SYSTEM.md for the visual spec
- "View full leaderboard →" button below podium opens the full list

### Full leaderboard page
- Top 10 publicly listed
- Below #10: only the current user + their immediate neighbors (positions ±1) shown — Tarun wants no public last place
- Each row: avatar (with active badge flair), name, title, score, position-change arrow vs last week (↑3 / ↓2 / ▬)
- Current user's row pinned to bottom of viewport when scrolling

### Rival nudge card
On home page, beside the podium: **"Catch [User Above You]"** — shows their avatar, name, "X points ahead — one quiz away." Only renders if user is below #1 and below the podium.

### #1 special treatment
- Crown overlay on avatar (across the whole app, including their profile)
- On their own home page: confetti burst on first load of the day after they reach #1 (use `localStorage` flag `confetti_seen_YYYY-MM-DD` so it only fires once per day)
- Other users see them with crown but no confetti

---

## 11. Email automation

**Provider:** Use existing `ZOHO_EMAIL` + `ZOHO_PASSWORD` env vars via Nodemailer SMTP. If unreliable, swap to Resend (`RESEND_API_KEY` env var).

**Helper:** `lib/email.ts` exports `sendEmail({to, type, payload})`. Internally maps `type` → React Email template → render → send → log to `email_log`.

### Event matrix
| Event | To | Subject | When |
|---|---|---|---|
| `account_created` | New user | "Welcome to Lapiz Blue Quiz" | After admin creates user |
| `access_request_received` | Admin (Tarun) | "[User] is requesting another attempt" | Staff hits "Request another attempt" |
| `access_request_resolved` | Requesting user | "Your request was [granted/denied]" | Admin resolves |
| `leaderboard_live` | All approved users | "🏆 Week X leaderboard is live" | Cron flips visibility |
| `streak_milestone` | User | "🔥 X-day streak! New badge unlocked" | Streak hits 7/30/100/365 |
| `streak_at_risk` | User | "Don't lose your X-day streak!" | After 6pm UAE if no quiz today and streak ≥ 5 |
| `weekly_recap` (v1.5, defer if tight) | All approved users | "Your week in numbers" | Sundays 6pm UAE |

All emails: short, image-friendly, single CTA, unsubscribe link required for non-transactional ones.

---

## 12. Admin panel

`/admin` accessible only to `role = 'admin'`. Three tabs:

### Users
- Table: all users + status, XP, level, last activity
- Action buttons per row: Edit, Reset Password, Suspend, Promote to Admin
- "Create User" button at top → opens form

### Quizzes
- Table: all quizzes + unlock status, # attempts, # completes, leaderboard status
- Per-row actions: Toggle Unlock, View Stats (avg score, hardest question, etc.), Delete
- "New Quiz" button → form (title, week #, then 30 questions: paste-CSV or manual)
- Edit existing quiz: locked once any attempt exists (data integrity)

### Requests
- Table: pending access requests
- Approve / Deny buttons inline
- History tab: resolved requests

### (Optional v1) Analytics
- Daily active users, completion rate per quiz, hardest questions (highest wrong %)
- Skip if scope tight; user can derive most of this from Supabase Studio

---

## 13. API routes (Next.js App Router)

```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/change-password

GET    /api/quizzes                       -- list visible quizzes for user
POST   /api/quizzes/:id/start             -- creates attempt, returns first Q
GET    /api/attempts/:id                  -- resume, returns state
PATCH  /api/attempts/:id/answer           -- save answer for one Q
POST   /api/attempts/:id/submit           -- final submit
POST   /api/quizzes/:id/request-access    -- when both attempts used

GET    /api/leaderboard/quiz/:id
GET    /api/leaderboard/all-time

GET    /api/me/mistakes                   -- cumulative wrong answers
POST   /api/me/mistakes/:questionId/reviewed -- mark reviewed
GET    /api/me/badges
POST   /api/me/active-badge               -- set flair

POST   /api/admin/users                   -- create
PATCH  /api/admin/users/:id
POST   /api/admin/quizzes
PATCH  /api/admin/quizzes/:id/unlock
POST   /api/admin/access-requests/:id/resolve

POST   /api/cron/reveal-leaderboards      -- secured by CRON_SECRET header
POST   /api/cron/incomplete-sweep         -- mark expired attempts incomplete
POST   /api/cron/streak-at-risk           -- email warning
```

All admin routes check session role. All cron routes check `Authorization: Bearer ${CRON_SECRET}`.

---

## 14. Edge cases & handled behaviors

| Scenario | Behavior |
|---|---|
| User starts quiz, network drops mid-question | Latest confirmed answer is in DB. On reconnect, resume from there. |
| Two browser tabs same user same quiz | Both read same `attempts` row; last write wins. UI shows a banner "another tab is taking this quiz" if `current_question_index` from server diverges from local. |
| User finishes Q30 and clicks Submit while timer is at 0 | Server allows submit if `submitted_at IS NULL` regardless of expires_at. Race-safe. |
| Admin changes question text after quiz unlocked | Block in admin UI once any attempt exists. Show warning. |
| User picks an option but doesn't click Confirm, navigates away | Answer NOT saved. Returning shows the question with no selection. (Confirm = commit.) |
| User has streak freeze and misses 3 days in a row | Freeze only saves 1 missed day. Streak resets to 1. |
| Two users tie on score | Earlier `submitted_at` wins. Both shown if for some reason equal to the millisecond (won't happen). |
| Admin deletes a quiz with attempts | Soft delete only (set `deleted_at`). Hard delete blocked in v1. |
| User account is suspended mid-quiz | Their session token is invalidated on next request. Active attempt is preserved but unsubmittable. |
| Daylight saving time | UAE doesn't observe DST. Always +04:00. Hardcode the offset, don't trust server tz. |

---

## 15. Build phasing for Claude Code

### Phase 1 (ship for tomorrow's launch)
1. Migrate plaintext passwords → bcrypt (one-time script + login route update)
2. DB migrations for all tables in Section 2
3. Auth (login/logout/cookies)
4. Admin user creation
5. Admin quiz creation + question bulk-add (CSV paste)
6. Admin unlock toggle
7. Quiz taking flow end-to-end (start, answer, navigate, submit, resume)
8. Shuffling + scoring
9. Strict 30-min timer + auto-submit
10. Post-submit results + mistakes review
11. Home page with podium (placeholder if <5 attempts)
12. Full leaderboard page
13. XP + level recalc
14. Daily streak basic (no freeze yet — set `streak_freezes = 0` and skip freeze logic, add in P2)
15. Seed badges, evaluate on submit
16. Account creation email
17. Leaderboard reveal cron + email
18. Confetti on #1 home (localStorage daily flag)
19. Crown on #1 avatar
20. Animations per `DESIGN_SYSTEM.md`

### Phase 2 (week after)
- Streak freezes + at-risk emails
- Access request flow + emails
- Rival nudge card
- Active badge flair selector
- Mistakes review "Got it" toggle
- Weekly recap emails

### Phase 3 (later)
- Per-category leaderboards
- Most improved board
- Daily Challenge feature
- Head-to-head duels
- Tournament mode
- Admin analytics dashboard

---

## 16. Environment variables (Vercel)

Required:
```
NEXT_PUBLIC_SUPABASE_URL=<existing>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<existing>
SUPABASE_SERVICE_ROLE_KEY=<just added>
SUPABASE_SECRET_KEY=<just added, same value, for forward compat>
ZOHO_EMAIL=<existing>
ZOHO_PASSWORD=<existing — fix "needs attention" warning>
SESSION_SECRET=<32+ char random, for JWT signing>
CRON_SECRET=<32+ char random, for cron auth>
APP_URL=https://mapei-quiz.vercel.app
```

---

## 17. Things explicitly NOT in v1 (do not build)

- Self-signup
- In-app forum / chat
- AI-generated questions
- Voice/video questions
- Public profiles outside the company
- Real-time multiplayer (head-to-head, daily challenge — Phase 3)
- Push notifications (Phase 2+)
- Mobile native app (web-only, but mobile-responsive)
- Points-for-rewards shop
- Social sharing of badges (Phase 2 if requested)

---

## 18. Definition of Done for v1

A staff member can:
1. Receive credentials via email after Tarun creates their account
2. Log in
3. See the home page with podium placeholder ("revealing soon")
4. Click "Start Quiz" → 30 jumbled questions, 30-min timer
5. Close tab, log back in, resume from same question with same time remaining
6. Submit → see score + mistakes review
7. Take it once more (2nd attempt)
8. After at least 5 staff have completed AND it's the next day, see real podium with #1, #2, #3
9. If they're #1, see confetti on first daily login + crown on their avatar everywhere
10. See their cumulative mistakes from this and future quizzes on home

Tarun can:
1. Log in as admin
2. Create new user accounts
3. Create a quiz with 30 questions
4. Toggle quiz unlock
5. Receive email when access requests come in
6. Approve/deny requests

If all of the above work without bugs on Vercel production, v1 ships.

---

*End of architecture spec. Pair with `DESIGN_SYSTEM.md` for visual implementation.*
