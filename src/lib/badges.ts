import type { SupabaseClient } from '@supabase/supabase-js'
import { uaeDate, uaeHour, uaeDayOfWeek } from './uae-time'

/**
 * Badge eval engine per QUIZ_ARCHITECTURE.md §9.
 *
 * Called inside the submit transaction with everything it needs to evaluate
 * all 14 badges in the catalog. Idempotent — UNIQUE (user_id, badge_id) on
 * user_badges keeps duplicate inserts harmless.
 *
 * "comeback_kid" requires comparing two consecutive weekly leaderboards;
 * that one is awarded by a separate path (the leaderboard-reveal cron) and
 * is intentionally skipped here.
 */

export interface BadgeEvalContext {
  supabase: SupabaseClient
  userId: string
  attempt: {
    id: string
    quiz_id: string
    attempt_number: number
    started_at: string                  // ISO
    submitted_at: string                // ISO
    final_score: number
    max_score: number
    correctCount: number
    totalQuestions: number
  }
  streak: {
    current_streak: number
  }
  /** Codes the user has earned BEFORE this submission. */
  alreadyEarnedCodes: Set<string>
  /** Total completed attempts BEFORE this submit (so 0 = this is their first ever). */
  completedAttemptsBefore: number
  /** Same user's prior attempt for the same quiz, if any. */
  previousAttemptForQuiz?: { final_score: number } | null
}

export interface NewBadgeAwarded {
  code: string
  name: string
  description: string
  gradient: string
  icon_name: string
}

export async function evaluateBadges(ctx: BadgeEvalContext): Promise<NewBadgeAwarded[]> {
  const {
    supabase,
    userId,
    attempt,
    streak,
    alreadyEarnedCodes,
    completedAttemptsBefore,
    previousAttemptForQuiz,
  } = ctx

  const earn = (code: string) => {
    if (!alreadyEarnedCodes.has(code)) toEarn.add(code)
  }
  const toEarn = new Set<string>()

  const allCorrect = attempt.correctCount > 0 && attempt.correctCount === attempt.totalQuestions

  // first_blood — first quiz ever
  if (completedAttemptsBefore === 0) earn('first_blood')

  // perfect_score — all questions correct (== final_score == max_score)
  if (allCorrect) earn('perfect_score')

  // speed_demon — ≥ 90% of max in <10 min
  const elapsedMs =
    new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()
  if (attempt.final_score >= attempt.max_score * 0.9 && elapsedMs < 10 * 60 * 1000) {
    earn('speed_demon')
  }

  // marathon_10 / marathon_50 — total completed including this one
  const totalCompleted = completedAttemptsBefore + 1
  if (totalCompleted >= 10) earn('marathon_10')
  if (totalCompleted >= 50) earn('marathon_50')

  // streak milestones
  if (streak.current_streak >= 7) earn('streak_7')
  if (streak.current_streak >= 30) earn('streak_30')
  if (streak.current_streak >= 100) earn('streak_100')
  if (streak.current_streak >= 365) earn('streak_365')

  // early_bird / night_owl
  const submittedHour = uaeHour(attempt.submitted_at)
  if (submittedHour < 8) earn('early_bird')
  if (submittedHour >= 22) earn('night_owl')

  // weekender — completed Sat AND Sun in the same UAE week
  if (!alreadyEarnedCodes.has('weekender')) {
    const todayDow = uaeDayOfWeek(attempt.submitted_at) // 0=Sun .. 6=Sat
    if (todayDow === 0 || todayDow === 6) {
      const otherWeekendDate = computeOtherWeekendDate(attempt.submitted_at, todayDow)
      const earnedToday = uaeDate(attempt.submitted_at)
      const { data: otherDayCompletions } = await supabase
        .from('attempts')
        .select('id, submitted_at')
        .eq('user_id', userId)
        .eq('is_complete', true)
        .neq('id', attempt.id)
      const has =
        otherDayCompletions?.some(
          (a: any) => uaeDate(a.submitted_at) === otherWeekendDate,
        ) ?? false
      if (has) earn('weekender')
      // also, weird edge case: we just got a Sat AND Sun in same call — same date check covers this
      void earnedToday
    }
  }

  // the_climb — improvement of ≥ 5 raw points in attempt 2 vs attempt 1 (same quiz)
  if (attempt.attempt_number >= 2 && previousAttemptForQuiz) {
    const delta = attempt.final_score - previousAttemptForQuiz.final_score
    if (delta >= 5) earn('the_climb')
  }

  if (toEarn.size === 0) return []

  // Look up the badge rows once + bulk insert into user_badges
  const codes = Array.from(toEarn)
  const { data: badgeRows, error: fetchErr } = await supabase
    .from('badges')
    .select('id, code, name, description, gradient, icon_name')
    .in('code', codes)
  if (fetchErr || !badgeRows || badgeRows.length === 0) {
    if (fetchErr) console.error('[badges] catalog fetch error:', fetchErr)
    return []
  }

  const inserts = badgeRows.map((b: any) => ({ user_id: userId, badge_id: b.id }))
  const { error: insertErr } = await supabase.from('user_badges').insert(inserts)
  // Duplicate-key violations are silently expected (idempotency).
  if (insertErr && !/duplicate|unique/i.test(insertErr.message)) {
    console.error('[badges] insert error:', insertErr)
  }

  return badgeRows.map((b: any) => ({
    code: b.code,
    name: b.name,
    description: b.description,
    gradient: b.gradient,
    icon_name: b.icon_name,
  }))
}

/**
 * Given a submission timestamp on a weekend day in UAE, return the OTHER
 * weekend day's UAE-date string for THIS week (Sat→Sun, Sun→Sat).
 *
 * UAE's "week" for this badge = a calendar Sat+Sun pair where they're
 * the same Sat-Sun bookends (i.e. the Sat that precedes the Sun, and the
 * Sun that follows the Sat).
 */
function computeOtherWeekendDate(iso: string, dow: number): string {
  // dow 0=Sunday, 6=Saturday
  const d = new Date(new Date(iso).getTime() + 4 * 60 * 60 * 1000) // shift to UAE
  // dow=0 (Sunday) → other weekend day is the Saturday BEFORE → -1 day
  // dow=6 (Saturday) → other weekend day is the Sunday AFTER  → +1 day
  const offset = dow === 0 ? -1 : 1
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}
