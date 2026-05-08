# Lapiz Blue Quiz — Design System & Visual Spec

> **For Claude Code:** This file is the authoritative source for everything the user sees. Pair with `QUIZ_ARCHITECTURE.md`. When implementing, reach for **21st.dev** components first; only build custom when 21st doesn't have it. All animations use **Framer Motion** with spring physics — never use `linear` or default easings unless specified.

---

## 0. Design philosophy

The quiz must feel like a **premium game**, not a corporate training tool. Three principles:

1. **Magical, not silly.** Confetti, gradients, glow — yes. Cartoon mascots, comic sans, bouncing emojis — no.
2. **Calm dark canvas, electric highlights.** Midnight blue is the resting state; gradients are the dopamine.
3. **Motion confirms, never decorates.** Every animation has a meaning — confirming a tap, revealing progress, celebrating a win. No animation for the sake of animation.

If a screen feels like a corporate dashboard, it's wrong. If it feels like a slot machine, it's also wrong. Aim for the feeling of opening Apple Fitness rings, or Duolingo's daily streak — purposeful joy.

---

## 1. Color system

### Base canvas
```
--midnight-deepest   #060B26   /* deepest, used for cards-on-dark */
--midnight-base      #0B1437   /* the primary background */
--midnight-elevated  #131C4A   /* card surfaces, elevated panels */
--midnight-line      #1F2A5C   /* hairlines, dividers, input borders */

--white              #FFFFFF
--white-soft         #F8FAFC   /* body text on dark */
--white-muted        #94A3B8   /* secondary text, captions */
--white-faint        #475569   /* disabled, placeholder */
```

### Gradient palette (the magic)
Use these for: CTAs, badges, podium, accents, celebration. Never as flat fills on large surfaces — they're for highlight elements only. All defined as Tailwind plugin or CSS vars.

| Name | Stops | Usage |
|---|---|---|
| **Aurora** | `#06B6D4 → #8B5CF6` (cyan→violet) | Primary CTAs, leaderboard #2 |
| **Sunset** | `#EC4899 → #F97316` (magenta→orange) | Secondary CTAs, fire/streak elements |
| **Champion** | `#FCD34D → #F59E0B` (gold→amber) | #1 podium, perfect score, crown |
| **Spring** | `#34D399 → #06B6D4` (emerald→cyan) | Correct answers, success states, leaderboard #3 |
| **Ember** | `#EF4444 → #EC4899` (red→pink) | Wrong answers, urgency, streak-at-risk |
| **Plasma** | `#A855F7 → #EC4899 → #F97316` (3-stop violet→pink→orange) | Special: badge unlocks, level-up, "wow" moments |

### Semantic
```
--success    #34D399
--danger     #EF4444
--warning    #F59E0B
--info       #06B6D4
--glow       #A78BFA  /* electric lavender, used as soft halo on key elements */
```

### Glow / shadow recipes
```
.glow-aurora    { box-shadow: 0 0 40px -8px rgba(139,92,246,0.45), 0 0 80px -20px rgba(6,182,212,0.3); }
.glow-champion  { box-shadow: 0 0 50px -8px rgba(251,191,36,0.55), 0 0 100px -20px rgba(245,158,11,0.4); }
.glow-soft      { box-shadow: 0 0 30px -10px rgba(167,139,250,0.4); }
```

Use sparingly — every element with a glow should be a moment of focus.

---

## 2. Typography

```
Display       Cal Sans / Inter Tight 700, -0.02em tracking
Heading       Inter 600, -0.01em
Body          Inter 400/500, 0 tracking
Numeric       JetBrains Mono 500 (scores, timers, XP — use tabular nums)
```

### Scale
```
text-display-xl   72px / 80px line, for hero scores, "30/30"
text-display-lg   56px / 64px, for podium #1 score
text-display-md   40px / 48px, page titles
text-h1           28px / 36px
text-h2           22px / 30px
text-h3           18px / 26px
text-body         15px / 24px
text-caption      13px / 18px
text-micro        11px / 14px, for badge labels, etc.
```

Numbers in scores, timers, XP, ranks → always `font-variant-numeric: tabular-nums` so they don't jiggle as they update.

---

## 3. Spacing, radii, layout

```
Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 72 / 96
Radius:        sm 8px · md 14px · lg 20px · xl 28px · 2xl 36px · full 9999px
Card padding:  default 24px (mobile) / 32px (desktop)
Page max-width: 1200px (admin) · 720px (quiz, profile, mistakes review)
```

### Background treatment
The whole app sits on `--midnight-base`. Behind everything, a subtle layered effect:
- Soft radial gradient from top-left: `radial-gradient(ellipse 800px 600px at 10% 0%, rgba(139,92,246,0.08), transparent)`
- A second from bottom-right: `radial-gradient(ellipse 600px 600px at 90% 100%, rgba(236,72,153,0.06), transparent)`
- Optional: very faint static noise texture overlay at 3% opacity for depth

This makes the app feel alive without distracting.

---

## 4. Component library — 21st.dev mappings

Browse 21st.dev for these — pick the variant that matches the dark/gradient aesthetic.

| Need | 21st.dev category to browse |
|---|---|
| Primary buttons with gradient | "Buttons" → animated gradient |
| Login form card | "Forms" / "Sign in" |
| Leaderboard rows | "Lists" / "Tables" with avatars |
| Podium / pedestal | "Heroes" — adapt or build custom (rare in libs) |
| Confetti effect | `react-confetti` or `tsparticles-confetti` (not 21st but standard) |
| Progress bars | "Progress" components |
| Avatar circles | "Avatars" — basic |
| Modal / dialog | "Modals" |
| Toast / notification | "Toasts" |
| Badge displays | "Badges" / "Stats cards" |
| Empty states | "Empty states" |
| Confirm dialogs | "Modals" |
| Number ticker (XP counting up) | `framer-motion` `useMotionValue` + `useTransform` (custom, ~15 lines) |

**When 21st.dev has it: use it and theme to our palette. When it doesn't: build it custom following the principles in this doc.**

---

## 5. Avatar spec

### v1 placeholder
- Circle, sized via prop (`sm 32px`, `md 48px`, `lg 80px`, `xl 120px`)
- Default content: initials of `first_name` + `last_name`, white-soft on a deterministic gradient (hash username → pick from gradient palette)
- Border: 2px white-soft at 12% opacity
- When user is **#1**: add crown overlay positioned `-top: 30%, left: 50%, translateX: -50%`, rotating `-8deg`, with a soft champion glow
- When avatar represents the current user: add a subtle pulsing aurora ring (2px, animated with 3s breath cycle)

### Future (when Tarun uploads photos)
- Same circle, replace initials with `<Image>` of the AI-mocked photo
- Same border, crown, glow rules apply unchanged

---

## 6. Screen-by-screen spec

### 6.1 Login screen `/signin`
- Centered card, max-width 400px
- "Lapiz Blue Quiz" wordmark above (display-md, gradient text using Aurora)
- Tagline: "Get sharper. One quiz at a time." (white-muted, body)
- Username field, password field (both with floating labels, focus ring in Aurora)
- "Sign in" button: full-width, Aurora gradient, glow on hover, slight scale-down on press (0.98)
- Background: midnight-base + the radial gradient layers from §3
- On submit error: shake the form (300ms), red toast top-center

### 6.2 Home page `/` (the most important screen)

This is where staff land after login. Must feel **alive** the moment it loads.

**Layout (top to bottom, mobile):**

```
┌──────────────────────────────────────┐
│  [Avatar]   Welcome, Tarun           │  ← header
│             🔥 12  ·  Sales Sensei   │
├──────────────────────────────────────┤
│                                      │
│         🏆  THIS WEEK'S PODIUM       │  ← section title
│                                      │
│           [#1 podium block]          │
│   [#2]              [#3]             │
│                                      │
├──────────────────────────────────────┤
│  ⚡ Take this week's quiz  →         │  ← big CTA
├──────────────────────────────────────┤
│  Catch Priya — 80 XP ahead   →       │  ← rival nudge (if applicable)
├──────────────────────────────────────┤
│  📚 What you got wrong (12)          │  ← mistakes section
│   [Q card] [Q card] [Q card] →       │
├──────────────────────────────────────┤
│  🎖️ Your badges (4 of 11)            │  ← badge grid preview
└──────────────────────────────────────┘
```

#### The podium (centerpiece)

This is the magical moment. Spec:

**Structure:**
- 3D-ish stair shape rendered with CSS or SVG. Three rectangular pedestals, isometric:
  - 3rd place: leftmost, height 80px, width 100px
  - 2nd place: rightmost, height 110px, width 100px
  - 1st place: center, height 140px, width 110px (taller and slightly wider)
- Each pedestal has a number on its front face (`3` / `2` / `1`) in display-md, gold-amber for #1, silver-ish white for #2, bronze for #3
- Each pedestal's top surface holds the avatar (lg or xl size)
- Below the avatar's stair, the user's display name (white-soft, h2) + their score in numeric

**#1 special:**
- Crown sits above the avatar (gold gradient SVG, soft champion glow, gentle 4s bobbing animation)
- Pedestal has a faint champion gradient on its front face
- Subtle gold particle effect rising slowly behind the avatar (use tsparticles, very low density, opacity 30%)

**#2 and #3:**
- Cleaner, no crown
- #2 pedestal front face: silver-ish gradient `#94A3B8 → #CBD5E1`
- #3 pedestal front face: bronze gradient `#D97706 → #92400E`

**Reveal animation (on first paint of the home screen):**
1. Pedestals slide up from below their final position, staggered: 3rd at 0ms, 2nd at 120ms, 1st at 240ms. Spring physics (`stiffness: 200, damping: 18`).
2. Each pedestal lands with a small bounce + a soft dust puff (white particles, 6-8, 400ms fadeout)
3. Avatars fade-and-scale in (from 0.5 to 1) once their pedestal lands. 200ms each.
4. Names and scores fade in last, after avatars — 100ms stagger from bottom up
5. **If the logged-in user is #1**: crown drops from top of viewport with a slight rotation, lands on the avatar with a `tick` — and confetti bursts (full-screen, 3s, multi-color from gradient palette). Triggered only once per UAE-day per user (use localStorage `confetti_seen_YYYY-MM-DD`).

**Placeholder state (if leaderboard not yet revealed):**
- Show the same pedestal shapes but greyed out (50% opacity, no avatars)
- Centered overlay text: "🔒 Leaderboard reveals once 5 staff complete this week's quiz"
- Subtle pulsing animation on the lock icon
- Tarun's view (admin) sees a small "[X / 5 attempts so far]" counter

#### "Take this week's quiz" CTA

- Full-width card, height 80px
- Aurora gradient background, slight noise texture for premium feel
- Bold copy: "⚡ Take this week's quiz" (display-md weight 700)
- Subcopy: "30 questions · 30 minutes" (caption, white at 70%)
- Right-aligned arrow, animated: gently pulses x-axis 4px every 2.5s
- Hover: scale 1.02, brighten glow
- Press: scale 0.98
- If quiz is in progress (resume): copy changes to **"⏳ Resume quiz · 12:34 left"** with Ember gradient instead

#### Rival nudge

- Inline card, midnight-elevated background
- Small avatar of person above + "Catch [Name] — [X] XP ahead" + arrow
- Tap → goes to full leaderboard

#### Mistakes section

- Horizontal scrollable row of question cards (peeking edge of next card visible)
- Each card: question text (clamp 3 lines), red small dot label "You said: B", green label "Correct: D", "Got it ✓" pill on hover
- "View all (12) →" link below row

#### Badges preview

- Grid of 4-6 badges horizontally
- Earned: full color with their badge gradient
- Locked: grayscale at 30% opacity with a small lock icon
- Tap any → opens badge detail modal with description and condition

### 6.3 Quiz screen `/quiz/[id]`

The cleanest, most focused screen in the app. No navigation. No distractions.

**Layout:**
```
┌──────────────────────────────────────┐
│ ████████████████████░░░░░░░░░░░░░░░  │ ← decorative per-Q bar (drains R→L)
├──────────────────────────────────────┤
│  Q 7 of 30                  ⏱ 22:14 │ ← progress + REAL timer
├──────────────────────────────────────┤
│                                      │
│   Which Mapei product is best for    │
│   exterior wall waterproofing in     │
│   coastal climates?                  │
│                                      │
│   [ A.  Mapelastic Smart        ]    │
│   [ B.  Keralastic              ]    │
│   [ C.  Aquaflex Roof           ]    │
│   [ D.  Idrosilex Pronto        ]    │
│                                      │
├──────────────────────────────────────┤
│  ← Previous     [ Confirm answer ]   │
└──────────────────────────────────────┘
                                        ← progress dots row at bottom
```

#### Per-question decorative bar (top of screen)
- Fixed at very top, height 6px, full width
- Drains from right to left over 60s (resets each question)
- Color gradient *along* the bar: green → cyan → amber → red, but the **filled** portion is the leftmost remaining color (so as it shrinks, only red is left at the end)
- This is purely visual urgency. Does not enforce anything.

#### Real timer (top right)
- Format: `MM:SS`, JetBrains Mono, 18px
- Stays white-soft until 5:00 remaining → switches to Sunset gradient text
- Below 1:00 remaining → switches to Ember gradient + gentle pulse animation (1s cycle)
- Below 0:10 → Ember + faster pulse + soft red full-screen vignette

#### Question card
- midnight-elevated background
- Question text: h2, white, generous line-height
- 16px gap between question and options

#### Option buttons
- Stacked, full-width, midnight-elevated background, midnight-line border
- Hover: border becomes Aurora gradient, slight lift (translate-y -2px)
- Selected (before Confirm): border = Aurora solid, soft Aurora glow, letter badge becomes filled
- Letter prefix (A/B/C/D) in a small circle on the left
- Animation when selected: 200ms scale from 1.0 → 1.02 → 1.0 (quick pulse)

#### Confirm button
- Disabled state: 30% opacity, no gradient
- Enabled state: Aurora gradient, glow, slight scale on hover
- On click: button quickly fades to checkmark icon (200ms), question slides left out of view, next question slides in from right (spring, 350ms)

#### Previous button
- Outline style, white-muted text, ghost background
- Disabled on Q1
- Click: same slide animation but reversed direction

#### Progress dots
- Below the action buttons, row of 30 small dots
- Empty: 6px circle, midnight-line border
- Answered: 6px filled, Aurora gradient
- Current: 8px filled, Aurora + soft glow + gentle pulse
- Tappable on desktop hover: tooltip shows "Q7 — answered B" (lets user jump back)

#### When timer hits 0
- Vignette goes Ember
- Modal slides in: "⏰ Time's up — submitting your quiz..."
- 2s delay (so user sees the message), then hard submit
- No way to cancel

### 6.4 Quiz results screen `/quiz/[id]/results`

Reached after submit. The dopamine moment.

**Sequence on load (orchestrated):**
1. **0ms**: Black-out overlay
2. **200ms**: Score number ticks up from 0 to final (1.5s ease-out, JetBrains Mono, display-xl, gradient text — Champion if perfect, Spring if ≥70%, Sunset if 50–69%, Ember if <50%)
3. **At end of tick**: percentage label fades in below score (h2, gradient matching score)
4. **+400ms**: XP earned card slides up — "+170 XP earned" with the XP number tick-counting on its own bar
5. **+400ms**: If level up → full-screen takeover: "LEVEL 8" letters appear one by one with a Plasma gradient, badge spins in. Dismiss tap to continue.
6. **+200ms**: If new badge(s) → modal sequence, one by one. Each badge: spins from back, glow burst, name + description appear. Dismiss to continue.
7. **+400ms**: Streak update card if applicable: "🔥 12-day streak" with the flame growing animation
8. **+400ms**: Action buttons fade in: "Review your answers" (Aurora) + "Back to home" (ghost)

This whole sequence is ~5-7 seconds of pure positive reinforcement. **Do not let users skip past it on the first submit** — they tap to advance through level/badge moments but the score reveal is mandatory.

### 6.5 Answer review screen `/quiz/[id]/review`

Plain, scannable. Educational mode.

- List of 30 questions in their attempted order
- Each question card:
  - Question text + their answer + correct answer (if different)
  - Green check or red X on the left edge
  - Correct: faded green left border, no special highlighting
  - Wrong: red left border, their pick shown crossed out, correct shown highlighted, explanation below if available
- Sticky filter at top: All (30) · Correct (24) · Wrong (6)
- "Mark as reviewed" button on wrong ones (so it disappears from home Mistakes section)

### 6.6 Full leaderboard `/leaderboard`

- Tabs at top: "This Quiz" / "All-Time"
- Top 3 podium (smaller version of home page podium) at top
- Below: rows 4 through 10 visible
- Then a divider
- Then current user's row (if not in top 10) + their direct neighbors (±1)
- Each row: rank badge (golden bg if top 3), avatar, name + title, score (large, right-aligned), position-change arrow
- Position arrow: green ↑3, red ↓2, gray ▬

**Animation on tab switch:**
- Rows reorder with spring physics, each row `layoutId`'d so Framer Motion handles the swap. ~600ms total.

### 6.7 Profile `/profile`

- Big avatar at top (xl), with crown if #1
- Name, title, current XP, current level
- Progress bar: XP toward next level (Aurora gradient fill)
- 🔥 streak block: current, longest, freezes available
- Badge grid: all 11 badges, earned in color, locked greyed out, tap for detail
- "Active flair" picker: tap an earned badge → "Set as flair" → that's the badge shown next to your name on leaderboard

### 6.8 Admin `/admin/*`

Functional, dense, less magical. Still on midnight base but with utility-first UI:
- Side nav: Users · Quizzes · Requests
- Tables with hover row highlight, action buttons inline
- Forms: standard 21st.dev forms
- Charts (if scope allows): use Recharts with our gradient palette

---

## 7. Animations — master list with specs

| Animation | Duration | Easing | Trigger |
|---|---|---|---|
| Page enter | 250ms | spring(300, 30) | Route change — fade + 8px upward translate |
| Card mount | 350ms | spring(220, 22) | Each card on a list page, staggered 60ms |
| Button hover | 150ms | ease-out | Mouse over |
| Button press | 80ms | ease-out | Pointer down — scale 0.98 |
| Option select pulse | 200ms | spring(400, 20) | Quiz option chosen |
| Question slide | 350ms | spring(280, 26) | After Confirm |
| Score tick-up | 1500ms | ease-out | Results screen |
| XP bar fill | 1200ms | ease-out | Results screen |
| Level-up takeover | 2500ms | spring(180, 14) | After level threshold crossed |
| Badge unlock spin | 1000ms | spring(220, 16) | Per badge |
| Podium rise | 600ms each | spring(200, 18) | Home page reveal |
| Confetti | 3000ms | n/a | #1 user's first daily home load |
| Crown bob | 4000ms loop | sine ease | Always on, gentle Y oscillation 4px |
| Streak flame grow | 800ms | spring(260, 18) | After streak update |
| Toast slide | 300ms | spring(300, 28) | Notification fires |
| Modal enter | 250ms | spring(280, 24) | Open — backdrop fade + content scale 0.95→1 |
| Leaderboard row reorder | 600ms | spring(220, 22) | Sort change |

### Confetti spec
- Library: `tsparticles` confetti preset OR `react-confetti`
- Colors: pull 6 from gradient palette (1 per gradient + Plasma extras)
- Particle count: 200
- Duration: 3 seconds
- Spawn point: center-top
- Spread angle: 120deg
- Gravity: 0.8
- Wind: gentle random oscillation
- Sound: subtle "pop" + light cheer (only if user has tab focused — don't startle)

---

## 8. Sound design (tasteful)

Optional in v1 but **highly recommended** for the wow factor. Default mute, with a setting toggle in profile. Use small WAV files, ~50KB each.

| Event | Sound |
|---|---|
| Option select | Soft tick (single note, 200ms) |
| Confirm answer | Hollow click |
| Submit quiz | Brief whoosh |
| Score reveal | Rising chime, gradient up |
| Correct streak combo (future) | Ascending arpeggio |
| Level up | Triumphant rising chord |
| Badge unlock | Sparkle + chime |
| #1 confetti | Cheer + horn |

Keep sounds short. Allow global mute. Honor `prefers-reduced-motion` AND a manual `sound_off` setting.

---

## 9. Haptic feedback (mobile web)

Use `navigator.vibrate()` if available. Patterns:

| Event | Pattern (ms) |
|---|---|
| Option select | `[20]` |
| Confirm | `[40]` |
| Wrong answer (only on review screen, not during quiz) | `[80, 40, 80]` |
| Correct answer (review) | `[30, 20, 60]` |
| Level up | `[100, 50, 100, 50, 200]` |
| Badge unlock | `[80, 30, 80]` |

Honor `prefers-reduced-motion` — if true, disable haptics too.

---

## 10. Loading & empty states

### Loading
**Never** show a blank screen with a spinner. Always:
- For data-heavy screens: skeleton placeholders shaped like the final content (use 21st.dev skeletons)
- For sub-1s loads: subtle shimmer on existing content
- For first-quiz-of-the-day load: a fun 1-line copy fade through (rotate every 800ms):
  - "Mixing the cement..."
  - "Polishing the tiles..."
  - "Counting the bags..."
  - "Reading the spec sheets..."
  - "Sharpening the pencils..."

### Empty
- Mistakes section, no mistakes yet: "🎯 Nothing to review — yet. Take your first quiz."
- No quizzes available: "🛠 The next quiz is being prepared. Check back soon."
- Leaderboard not revealed: see §6.2 placeholder spec
- No badges earned: "🎖 Your trophy shelf is waiting. Take quizzes to earn badges."

Each empty state: centered icon (96px, gradient fill), h2 message, optional CTA below.

---

## 11. Email design

All emails: dark midnight blue body (`#0B1437`), white text, ONE accent gradient per email matched to its mood.

### Layout
- Container: 600px wide, centered
- Header: "Lapiz Blue Quiz" wordmark in Aurora gradient SVG (inline base64) on dark bg
- Hero: bold headline (h1, white) + emoji
- Body: max 3 short paragraphs OR a stats card with numbers
- ONE CTA button: gradient matching mood (Aurora for general, Champion for podium reveal, Sunset for streak alerts, Spring for badge unlocks)
- Footer: small grey text "Lapiz Blue General Trading LLC · Sharjah" + unsubscribe link if non-transactional

### Per-template
- **Account created**: Aurora hero, "Welcome aboard 🎉", credentials inline (use mono font for username/password), "Login →" button
- **Leaderboard live**: Champion hero, "🏆 Week X leaderboard is live", small podium image (top 3 names + scores), "See where you ranked →"
- **Streak at risk**: Sunset hero, "🔥 Don't lose your X-day streak!", current streak number BIG, "Take a quick quiz →"
- **Streak milestone**: Sunset hero, "🔥 X days. Legend.", badge graphic, "See your trophy →"
- **Badge unlocked**: Plasma hero, "✨ New badge unlocked", badge name + description, "View your collection →"
- **Access request received** (to admin): Plain Aurora, "[User] is requesting attempt 3 on [Quiz]", two buttons: "Approve" / "Deny"
- **Access request resolved** (to user): Aurora if granted, Ember if denied, brief copy

Use `react-email` for templating. Render to HTML server-side.

---

## 12. Iconography

- Library: **Lucide React** for system icons (consistent stroke weight)
- Custom icons for: badges (one SVG per badge, in their badge gradient), the crown, the flame
- Icon sizes: 16 / 20 / 24 / 32 / 48
- Always inherit color from parent unless it's a custom badge/crown/flame icon

### Badge icon style
- Filled SVG, 64x64 viewBox
- Each badge has its own gradient (assign on seed)
- Slight inner shadow for depth, 2px outer glow when earned

---

## 13. Accessibility — non-negotiable

- All color combos pass WCAG AA: white-soft on midnight-base = 14.2:1 ✓
- All interactive elements: keyboard navigable, visible focus ring (Aurora 2px)
- All animations: honor `prefers-reduced-motion` — fall back to instant transitions, no parallax, no confetti, no haptic
- All buttons have text labels or `aria-label`
- Quiz screen: `aria-live="polite"` for question changes, timer announces every 5 minutes for screen readers
- Color is never the only signal: correct/wrong always paired with icon + text

---

## 14. Responsive behavior

Breakpoints: `sm 640px · md 768px · lg 1024px · xl 1280px`

- **Mobile (default):** single-column, full-bleed cards, podium scales to fit width (avatars become `lg` size)
- **Tablet:** podium gets more breathing room, mistakes section becomes 2-column grid
- **Desktop:** max-width 1200px (admin) / 720px (consumer screens), centered. Podium has more particle effects.

The whole app must be **fully usable on a 360px-wide phone** — that's the minimum. No horizontal scroll. Test the quiz screen first.

---

## 15. Performance budgets

- Initial JS payload (home page): < 200KB gzipped
- LCP: < 1.8s on 4G mobile
- Confetti and particle effects lazy-loaded only on screens that use them
- Images: Next/Image with proper sizes
- Fonts: subset to Latin-only, `font-display: swap`

---

## 16. Anti-patterns (do not do these)

❌ Bouncing emoji as decoration
❌ Auto-playing background music
❌ Confetti on every action (only #1 + level-up + badge)
❌ Default Tailwind gradients (`from-blue-500 to-pink-500`) — use OUR named gradients
❌ Comic Sans, Papyrus, or any "fun" font
❌ Animated GIF mascots
❌ Tooltips that auto-show on first visit (use them for hover only)
❌ Modals that block the entire screen for non-critical info
❌ Notification dots without a notification center
❌ Long animations that block the user — none over 1.5s except the celebratory sequence
❌ Pure black backgrounds (`#000`) — always use midnight tones
❌ Pure red errors (`#FF0000`) — always use the Ember gradient or `--danger`

---

## 17. Final vibe check

When Claude Code finishes a screen, ask: would this feel out of place if dropped into Apple Music's Discovery tab, or Linear's project view, or Duolingo's home? If yes → too plain or too cartoonish. We want to land in the same tier as those products: dark, confident, premium, with moments of sparkle.

---

*End of design system. When in doubt, choose the option that makes the moment feel earned.*
