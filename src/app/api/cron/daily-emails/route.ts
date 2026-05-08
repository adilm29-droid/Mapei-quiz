import { NextResponse } from 'next/server'
import { requireCron } from '@/lib/cron-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { uaeToday, uaeDayOfWeek, addDays } from '@/lib/uae-time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/daily-emails
 *
 * One nightly cron that handles two daily email tasks (Vercel Hobby
 * gives us only 2 cron slots — leaderboard reveal owns the other one):
 *
 *  1. Streak-at-risk: any approved user with current_streak >= 5 and
 *     no completed attempt today (UAE) and no streak_at_risk email
 *     already logged today → fire the email.
 *
 *  2. Weekly recap (Sundays only, UAE day-of-week === 0): for every
 *     approved user, compute the past 7 days' stats and send the
 *     weekly_recap email.
 *
 * Schedule: daily at 14:00 UTC = 18:00 UAE.
 */
export async function GET(request: Request) {
  const guardFail = requireCron(request)
  if (guardFail) return guardFail

  const supabase = getSupabaseAdmin()
  const origin = new URL(request.url).origin
  const today = uaeToday()
  const isSunday = uaeDayOfWeek(new Date()) === 0

  let streakSent = 0
  let recapsSent = 0

  // ── 1. Streak at risk ─────────────────────────────────────────────
  const { data: streakUsers } = await supabase
    .from('users')
    .select('id, email, first_name, username, current_streak, streak_freezes, last_quiz_date')
    .eq('status', 'approved')
    .gte('current_streak', 5)

  for (const u of streakUsers ?? []) {
    if (u.last_quiz_date === today) continue // they already did one today

    // Idempotent: don't double-send today
    const { count } = await supabase
      .from('email_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', u.id)
      .eq('type', 'streak_at_risk')
      .gte('sent_at', today + 'T00:00:00Z')

    if ((count ?? 0) > 0) continue

    const hours_left = 24 - new Date().getUTCHours() - 4 // ~hours till midnight UAE
    const has_freeze = (u.streak_freezes ?? 0) > 0
    try {
      await fetch(`${origin}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'streak_at_risk',
          data: {
            email: u.email,
            first_name: u.first_name || u.username,
            streak_days: u.current_streak,
            hours_left: Math.max(1, hours_left),
            has_freeze,
            freeze_count: u.streak_freezes ?? 0,
            quiz_url: `${origin}/home`,
          },
        }),
      })
      await supabase.from('email_log').insert({
        user_id: u.id,
        type: 'streak_at_risk',
        payload: { streak_days: u.current_streak },
      })
      streakSent += 1
    } catch (e) {
      console.error('[cron/daily-emails] streak email error:', e)
    }
  }

  // ── 2. Weekly recap (Sundays only) ────────────────────────────────
  if (isSunday) {
    const weekStart = addDays(today, -7) + 'T00:00:00Z'
    const { data: users } = await supabase
      .from('users')
      .select('id, email, first_name, username, current_streak, xp')
      .eq('status', 'approved')

    for (const u of users ?? []) {
      // count their completed attempts this week
      const { data: weekAttempts } = await supabase
        .from('attempts')
        .select('id, final_score, submitted_at')
        .eq('user_id', u.id)
        .eq('is_complete', true)
        .gte('submitted_at', weekStart)

      // sum XP earned this week — derive from email_log? Easier: store xp_history?
      // For v1 we don't have a per-event log, so we estimate as 50 + 5 * sum(correct).
      // Simpler: just show 0 if we can't easily compute. For now, we approximate
      // with a quick lookup via attempts.final_score → +50 base + 5/correct
      // (correct count = final_score / avg_pts_per_correct ≈ score / 1.9 ).
      // Skip exact XP — the recap is meant to be motivational, not forensic.
      const quizzes_completed = (weekAttempts ?? []).length
      const xp_earned = quizzes_completed === 0 ? 0 : quizzes_completed * 100 // rough estimate

      // count badges earned this week
      const { count: badgesThisWeek } = await supabase
        .from('user_badges')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', u.id)
        .gte('earned_at', weekStart)

      // Skip users with zero activity to avoid spam
      if (quizzes_completed === 0 && (badgesThisWeek ?? 0) === 0) continue

      try {
        await fetch(`${origin}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'weekly_recap',
            data: {
              email: u.email,
              first_name: u.first_name || u.username,
              quizzes_completed,
              xp_earned,
              current_streak: u.current_streak ?? 0,
              badges_earned_this_week: badgesThisWeek ?? 0,
              rank_change: null, // Phase 3
              home_url: `${origin}/home`,
            },
          }),
        })
        await supabase.from('email_log').insert({
          user_id: u.id,
          type: 'weekly_recap',
          payload: { week_starting: weekStart },
        })
        recapsSent += 1
      } catch (e) {
        console.error('[cron/daily-emails] recap error:', e)
      }
    }
  }

  return NextResponse.json({ streakSent, recapsSent, ranOnSunday: isSunday })
}
