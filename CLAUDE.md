# CLAUDE.md

Guidance for Claude Code working in this repo. Keep this current — when something on disk no longer matches a description here, update it.

## Stack

- **Next.js 16.2.4** (App Router) with **Turbopack** for both dev and build
- **React 19.2.5** + **TypeScript** (`strict: false`, `allowJs: true` for legacy)
- **Tailwind v3** with shadcn-style HSL theme tokens, `tailwindcss-animate`
- **Manrope** font loaded via `next/font/google` as the only project font (legacy pages still reference Inter / Rajdhani via the `@import url(...)` in `globals.css`)
- **motion** (the new framer-motion namespace), **gsap** for cloud parallax, **lucide-react** icons, **@radix-ui/react-slot** + **class-variance-authority** for the shadcn Button
- **Supabase** (PostgreSQL) for storage, **Google Gemini** for question generation, **Zoho SMTP** via `nodemailer` for transactional email

Path alias `@/*` resolves to `./src/*`.

## Build & Run

```bash
npm run dev      # next dev --turbopack on port 3000
npm run build    # next build --turbopack
npm start        # next start (production)
```

No test or lint scripts. ESLint isn't wired up.

When `.next/` is locked or stale (Spotlight on macOS occasionally creates a `dist 2/` shadow dir), use:

```bash
until [ ! -d .next ]; do rm -rf .next 2>/dev/null; sleep 1; done && npm run dev
```

## Architecture

All pages are **`'use client'`** — there are no Server Components. Server work happens only inside `src/app/api/**/route.ts`. The browser does no Supabase queries directly anymore (auth was migrated to API routes); pages still talk to Supabase for non-auth reads via the legacy anon-key client.

### Auth flow (server-side, RLS-immune)

1. **Browser → `POST /api/auth/login`** with `{ username, password }`.
   - Server uses `getSupabaseAdmin()` (service-role key, bypasses RLS).
   - Username matched case-insensitively (`.ilike()`), password trimmed.
   - Returns `{ user }` on 200, `{ error }` with status 400/401/403/500 otherwise.
2. **Browser → `POST /api/auth/register`** with `{ firstName, lastName, email, username, password }`.
   - Inserts row with `status: 'pending'`, returns the new `user_id`.
   - Server-side fires `POST /api/send-email` with `type: 'new_registration'`, including `user_id` and `origin`.
3. **Email to admin** contains two HMAC-signed buttons (✓ APPROVE / ✕ DENY).
4. **Admin clicks button → `GET /api/auth/decision?id=…&action=…&sig=…`**.
   - HMAC verified using `SUPABASE_SERVICE_ROLE_KEY` as the signing secret (`src/lib/decision-token.ts`, constant-time compare).
   - Updates user `status` to `approved` or `rejected`. Idempotent.
   - On approve: fires welcome email (`type: 'approved'`) to the user's address.
   - Returns a styled HTML confirmation page (no client JS).
5. **Forgot password**: a dedicated card in `AuthForm` posts `type: 'password_reset_request'` to send-email. The email lands at `ADMIN_EMAIL` with a ready-to-paste SQL `UPDATE` line. Admin runs the SQL in Supabase, contacts the user with the new password.

After login, AuthForm sets `localStorage.user = JSON.stringify(user)` and routes by role/avatar:
- `role === 'admin'` → `/admin`
- `avatar === 0` (never picked) → `/avatar`
- otherwise → `/dashboard`

Legacy pages (`/admin`, `/dashboard`, `/quiz`, etc.) still use the **anon-key client** in `src/lib/supabase.ts` and the auth-guard pattern (read `localStorage.user` in a `useEffect`, redirect to `/` if missing).

### Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | static (client-rendered) | Loading screen + hero + split-screen sign-in |
| `/signin` | static | Standalone deep-link version of the auth form |
| `/admin` | static, auth-guarded | Admin panel (legacy red-Mapei aesthetic) — review questions, manage users, generate via Gemini |
| `/dashboard` | static, auth-guarded | User home — scores, badges, assigned quizzes |
| `/quiz` | static, auth-guarded | Quiz gameplay (`?level=`, `?assignment=`) |
| `/avatar` | static, auth-guarded | First-time avatar picker |
| `/badges` | static, auth-guarded | Badge collection |
| `/leaderboard` | static, auth-guarded | Top 10 scores |
| `/profile` | static, auth-guarded | User profile + settings |
| `/reports` | static, auth-guarded | Reporting screens |
| `/api/auth/login` | dynamic, Node | POST — server-side login |
| `/api/auth/register` | dynamic, Node | POST — server-side registration |
| `/api/auth/decision` | dynamic, Node | GET — one-click approve/deny from email |
| `/api/auth/_debug` | dynamic, Node | GET — diagnostic; reveals env-var shapes (no secrets), reachability probe |
| `/api/generate` | dynamic, Node | POST — Gemini question generation |
| `/api/send-email` | dynamic, Node | POST — Zoho SMTP transactional mail |
| `not-found.tsx` | static | Explicit 404 (workaround for Next's built-in fallback hanging) |

### Brand components

`src/components/brand/`:
- **`LogoMark.tsx`** — circular monogram only. `spin` prop applies the global `lpz-mark-spin` keyframe (defined in `globals.css`, GPU-promoted via `will-change: transform` + `translateZ(0)`).
- **`LogoWordmark.tsx`** — "lapizblue" wordmark only.
- **`LogoFull.tsx`** — both side-by-side with a vertical separator. `spinMark` prop forwards to LogoMark.

The `<img src="/lapizblue-logo.png">` PNG was deleted; **never reintroduce it**. All headers use `<LogoFull />`.

### Loading screen

`src/components/loading-screen.tsx` — plays once per session (gated by `sessionStorage.lpz_intro_seen`). Midnight gradient + GSAP-animated cloud layers (radial gradients, no `filter: blur` because that tanks frame rate) + spinning monogram + "LOADING" label with pulsing dots. ~1300 ms then fades out via `AnimatePresence`.

### Split-screen interaction (landing)

Click *Hop on the Quiz* on `/` → `setSplitMode(true)` → three things in parallel via spring animations:
- CTA fades + scale-shrinks out
- Hero panel `width` animates `100% → 50%` (hugs right edge)
- `motion.aside` form panel slides in from `x: -100%`, renders `<AuthForm />`

The rotating power-words reel (`STRONGER → HARDER → SHARPER → WIN`) only ticks when `reelOn` is true (set on the same click).

### Files with `// @ts-nocheck`

Mechanical-rename casualties from the JS → TS migration. Don't remove the directive without converting the whole file:

- `src/lib/supabase.ts`
- `src/app/api/generate/route.ts`
- `src/app/api/send-email/route.ts`
- `src/app/admin/page.tsx`, `avatar/page.tsx`, `badges/page.tsx`, `dashboard/page.tsx`, `leaderboard/page.tsx`, `profile/page.tsx`, `quiz/page.tsx`, `reports/page.tsx`

New code goes in **properly typed** files (`src/components/auth/AuthForm.tsx`, `src/lib/supabase-admin.ts`, `src/lib/decision-token.ts`, all `src/app/api/auth/**`).

### Database schema

`supabase_setup.sql` + `migration.sql` define seven tables: `users`, `questions`, `attempts`, `scores`, `badges`, `assignments`, `certificates`. **RLS is disabled** on all of them — server code uses the service-role key which bypasses RLS regardless. The browser's anon-key client reads only via the legacy non-auth code paths; if you ever re-enable RLS, those pages need policies.

`users` columns: `id` (uuid), `username`, `password` (**plaintext, intentionally**), `role` (`'user' | 'admin'`), `status` (`'pending' | 'approved' | 'rejected'`), `xp`, `rank`, `avatar`, `first_name`, `last_name`, `email`, `created_at`.

The seed admin row is `username='tarun', password='LapizBlue@2026', role='admin', status='approved'` (created via SQL by the user, not in setup script).

### Email types (`/api/send-email`)

| `type` | To | When |
|---|---|---|
| `new_registration` | `ADMIN_EMAIL` | A user submitted the create-account form. Body contains HMAC-signed approve/deny buttons. |
| `password_reset_request` | `ADMIN_EMAIL` | A user clicked Forgot password. Body contains the SQL UPDATE recipe. |
| `approved` | user's email | Admin clicked APPROVE. Welcome message + their username. |
| `quiz_assigned` | user's email | A quiz was assigned to them. |
| `certificate_earned` | user's email | They passed a level. |

`ADMIN_EMAIL` defaults to `'tarun.s@lapizblue.com'` (hardcoded in `send-email/route.ts`), overridable by `process.env.ADMIN_EMAIL`. **Do not reuse `ZOHO_EMAIL` for the destination** — that env var is the SMTP login user (currently `adil@lapizblue.com`) and serves as the From address only.

## Environment variables

Required (gitignored, in `.env.local` locally and in Vercel Project Settings → Environment Variables for Production + Preview + Development):

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | `https://feztkhsjsfcogbvxhmgk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client (legacy pages) | `sb_publishable_…` (newer Supabase format) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only — auth + decision routes + HMAC signing | `sb_secret_…` (newer format). Bypasses RLS. **Rotate immediately if exposed.** |
| `ZOHO_EMAIL`, `ZOHO_PASSWORD` | server — `/api/send-email` SMTP login | Currently authenticated as `adil@lapizblue.com`. Used only as From address; not as a destination. |
| `GEMINI_API_KEY` | server — `/api/generate` | For AI question generation |
| `ADMIN_EMAIL` (optional) | server — destination override | Defaults to `'tarun.s@lapizblue.com'` if unset |

After changing any Vercel env var: **redeploy with "Use existing Build Cache" UNCHECKED**. Vercel bakes env vars at build time.

## Styling

Dark theme. Two coexisting systems:

1. **New (`src/app/page.tsx`, `/signin`, brand components, AuthForm, LoadingScreen)** — Tailwind utility classes + shadcn HSL tokens, midnight-blue (`#040a1c → #0a1740`) palette, white/icy-blue accents, Manrope font, iOS-curved glassy inputs (`rounded-2xl bg-white/5 backdrop-blur-md`).
2. **Legacy (every other page)** — CSS variables + custom component classes (`.btn`, `.card`, `.navbar`) in `globals.css`, Mapei red `#E30613` accent, inline `style={{...}}` everywhere. The body falls back to a different gradient than the new pages — this is intentional during the migration.

Don't write new code in the legacy style. New screens should consume the Tailwind/shadcn token system.

## Deployment

Vercel auto-deploys every push to `main` (repo: `adilm29-droid/Mapei-quiz`). The live URL is `https://mapei-quiz.vercel.app`. The included `update.py` script does `git add → commit → push` in one shot if you want the legacy quick-push behavior; otherwise standard git is fine.

Vercel's hobby plan is sufficient — env vars + serverless Node functions work the same as paid.

## Operational quirks (learned the hard way)

- **macOS Spotlight breaks `npm install`**. If `node_modules/next/dist/` shows up as `dist 2/` (with a literal space), Spotlight indexed during extraction. Fix: `rm -rf node_modules package-lock.json && npm install` and don't touch the folder for ~30 s after install completes. Adding `node_modules/` to Spotlight's Privacy list prevents this.
- **`.next` write conflicts**. Production build writes `.next/`, dev expects `.next/dev/`. Switching between them without wiping yields `Cannot find module './701.js'` or `routes-manifest.json` ENOENT. Always `rm -rf .next` between `next build` and `next dev`.
- **Turbopack rejects `<style jsx>`** and **`@import` after other CSS rules**. Both already cleaned up; keep them out.
- **`/_debug` and underscore-prefixed routes are private to Next** — useful pattern for diagnostic endpoints we don't want indexed.

## Security notes

- **Passwords are plaintext** in the `users` table. Acceptable for the current internal-only use case. If this ever goes to a wider audience, switch to bcrypt and add a server-side login route that does the hash compare (the route exists; just swap the password check).
- The Supabase service-role key (`SUPABASE_SERVICE_ROLE_KEY`) is full DB admin. Never log it, never return it from a client-reachable endpoint, never paste it in chat. Rotate immediately if exposed.
- HMAC-signed approve/deny URLs are constant-time compared via `crypto.timingSafeEqual`. Random URLs cannot approve/reject anyone.
