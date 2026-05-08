import { uaeToday, dateDiffDays } from './uae-time'

/**
 * Daily streak rules per QUIZ_ARCHITECTURE.md §8.
 *
 * A "quiz day" = the user completed at least one quiz that calendar day in
 * UAE time. applyStreak() is called once per submit; it computes the new
 * state given the user's prior streak fields and "today" (override-able for
 * tests). Caller writes the returned values to users.* in one update.
 *
 * Edge cases handled:
 *  - First quiz ever (last_quiz_date = null) → streak = 1
 *  - Two submissions same day → no change
 *  - Exactly 1-day gap → +1
 *  - Exactly 2-day gap with a freeze available → consume freeze, +1
 *  - Otherwise → reset to 1
 *  - Every 7 days, grant 1 freeze (cap 3)
 *  - Milestones at 7 / 30 / 100 / 365 reported back so XP + email can fire
 */

export interface StreakInputs {
  current_streak: number
  longest_streak: number
  streak_freezes: number
  last_quiz_date: string | null
  /** Override "today" for testing. Defaults to uaeToday(). */
  today?: string
}

export type StreakMilestone = 7 | 30 | 100 | 365 | null

export interface StreakOutcome {
  current_streak: number
  longest_streak: number
  streak_freezes: number
  last_quiz_date: string
  hitMilestone: StreakMilestone
  freezeConsumed: boolean
  freezeGranted: boolean
  /** Was today already counted? Caller can short-circuit downstream effects. */
  alreadyCountedToday: boolean
}

export function applyStreak(input: StreakInputs): StreakOutcome {
  const today = input.today ?? uaeToday()
  const last = input.last_quiz_date

  let current_streak = input.current_streak
  let longest_streak = input.longest_streak
  let streak_freezes = input.streak_freezes
  let freezeConsumed = false
  let freezeGranted = false
  let alreadyCountedToday = false

  if (last == null) {
    current_streak = 1
  } else if (last === today) {
    alreadyCountedToday = true
  } else {
    const gap = dateDiffDays(last, today)
    if (gap === 1) {
      current_streak += 1
    } else if (gap === 2 && streak_freezes >= 1) {
      streak_freezes -= 1
      freezeConsumed = true
      current_streak += 1
    } else {
      current_streak = 1
    }
  }

  // Grant a freeze every 7 days, capped at 3.
  // Only fires when we *just* hit a multiple of 7 (not on every same-day re-submit).
  if (
    !alreadyCountedToday &&
    current_streak > 0 &&
    current_streak % 7 === 0 &&
    streak_freezes < 3
  ) {
    streak_freezes += 1
    freezeGranted = true
  }

  if (current_streak > longest_streak) longest_streak = current_streak

  let hitMilestone: StreakMilestone = null
  if (!alreadyCountedToday) {
    if (current_streak === 7) hitMilestone = 7
    else if (current_streak === 30) hitMilestone = 30
    else if (current_streak === 100) hitMilestone = 100
    else if (current_streak === 365) hitMilestone = 365
  }

  return {
    current_streak,
    longest_streak,
    streak_freezes,
    last_quiz_date: today,
    hitMilestone,
    freezeConsumed,
    freezeGranted,
    alreadyCountedToday,
  }
}
