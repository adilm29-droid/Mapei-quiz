# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
npm run dev      # Dev server at http://localhost:3000
npm run build    # Production build
npm start        # Production server
```

No test runner or lint scripts are configured. ESLint is installed as a devDependency but has no script entry.

## Architecture

This is a **Next.js 14 App Router** quiz application written in JavaScript (not TypeScript). All pages use `'use client'` (fully client-rendered). The backend is **Supabase** (PostgreSQL) with an AI question generation endpoint powered by **Google Gemini**.

### Key Architectural Decisions

- **No shared state management** — each page manages its own state via `useState`. Authentication is stored in `localStorage` as a JSON user object.
- **Auth guard pattern** — every protected page reads `localStorage.getItem('user')` in a `useEffect` and redirects to `/` if absent. Admin pages additionally check `user.role === 'admin'`.
- **Direct Supabase calls** — pages query Supabase directly via the client in `src/lib/supabase.js`. No API abstraction layer, no react-query/SWR.
- **Single API route** — `src/app/api/generate/route.js` is the only server-side endpoint (POST), calling Gemini to generate quiz questions.

### Routes

| Route | Purpose |
|-------|---------|
| `/` | Login and registration |
| `/dashboard` | User home — scores, badges, assigned quizzes |
| `/quiz` | Quiz gameplay (accepts `?level=` and `?assignment=` params) |
| `/admin` | Admin panel — question review, AI generation, user/assignment management |
| `/leaderboard` | Top 10 scores |
| `/badges` | Badge collection display |
| `/reports` | Referenced in dashboard but **not yet implemented** |

### Database Schema (Supabase)

Defined in `supabase_setup.sql`. Key tables: `users`, `questions`, `attempts`, `scores`, `badges`, `assignments`, `certificates`. RLS is disabled.

### Styling

Dark theme using CSS variables and custom component classes in `src/app/globals.css` (Mapei red `#E30613` as primary). Tailwind CSS is configured but inline styles dominate in practice.

### Environment Variables

Defined in `.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`.

### Deployment

Hosted on Vercel with auto-deploy on push. `update.py` is a helper script that commits and pushes to trigger deployment.
