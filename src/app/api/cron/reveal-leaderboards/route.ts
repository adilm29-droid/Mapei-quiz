import { NextResponse } from 'next/server'
import { requireCron } from '@/lib/cron-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { incrementAchievement } from '@/lib/achievements/grant'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/reveal-leaderboards
 *
 * Runs nightly at 00:05 UAE (20:05 UTC). For every unlocked quiz with
 * leaderboard_visible=false:
 *   - count completed attempts (>= 5 required)
 *   - require unlocked_at < now() - 24h
 * If both conditions hold:
 *   - flip leaderboard_visible=true
 *   - send the leaderboard_live email to every approved user
 *   - log to email_log
 *
 * Vercel Hobby cron: daily at 20:05 UTC.
 */
export async function GET(request: Request) {
  const guardFail = requireCron(request)
  if (guardFail) return guardFail

  const supabase = getSupabaseAdmin()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: candidates } = await supabase
    .from('quizzes')
    .select('id, title, week_number, max_score, unlocked_at, leaderboard_visible, deleted_at, is_unlocked')
    .eq('is_unlocked', true)
    .eq('leaderboard_visible', false)
    .is('deleted_at', null)
    .lt('unlocked_at', oneDayAgo)

  let revealed = 0
  let emailedTotal = 0

  for (const q of candidates ?? []) {
    const { count } = await supabase
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', q.id)
      .eq('is_leaderboard_attempt', true)
      .is('deleted_at', null)

    if ((count ?? 0) < 5) continue

    // Flip the flag
    await supabase
      .from('quizzes')
      .update({
        leaderboard_visible: true,
        leaderboard_revealed_at: new Date().toISOString(),
      })
      .eq('id', q.id)

    revealed += 1

    // Build the top-3 podium for the email
    const { data: top3 } = await supabase
      .from('attempts')
      .select('final_score, user_id, users!inner(username, first_name, last_name)')
      .eq('quiz_id', q.id)
      .eq('is_leaderboard_attempt', true)
      .is('deleted_at', null)
      .order('final_score', { ascending: false })
      .order('submitted_at', { ascending: true })
      .limit(3)

    const podium = (top3 ?? []).map((row: any, i: number) => ({
      rank: (i + 1) as 1 | 2 | 3,
      name:
        [row.users.first_name, row.users.last_name].filter(Boolean).join(' ') ||
        `@${row.users.username}`,
      score: row.final_score ?? 0,
    }))

    // Weekly Leaderboard Topper — grant +1 to the #1 finisher for this
    // quiz. The reveal cron runs once per quiz×reveal so this is
    // idempotent without extra tracking.
    const topper = (top3 ?? [])[0]
    if (topper) {
      try {
        await incrementAchievement(
          supabase,
          topper.user_id,
          'global:leaderboard_topper',
        )
      } catch (e) {
        console.error('[cron/reveal-leaderboards] topper grant error:', e)
      }
    }

    // Get full per-user ranks for the user_rank field
    const { data: allCompletes } = await supabase
      .from('attempts')
      .select('user_id, final_score, submitted_at')
      .eq('quiz_id', q.id)
      .eq('is_leaderboard_attempt', true)
      .is('deleted_at', null)
      .order('final_score', { ascending: false })
      .order('submitted_at', { ascending: true })
    const rankByUser: Record<string, number> = {}
    ;(allCompletes ?? []).forEach((a: any, i: number) => {
      rankByUser[a.user_id] ??= i + 1
    })

    // Email every approved user
    const { data: users } = await supabase
      .from('users')
      .select('id, email, first_name, username')
      .eq('status', 'approved')

    const origin = new URL(request.url).origin
    const leaderboard_url = `${origin}/leaderboard?scope=quiz`

    // Map user_id → top-3 rank (1/2/3) for the special top3_finisher email
    const top3Lookup = new Map<string, 1 | 2 | 3>()
    ;(top3 ?? []).forEach((row: any, i: number) => {
      if (i < 3) top3Lookup.set(row.user_id, (i + 1) as 1 | 2 | 3)
    })

    for (const u of users ?? []) {
      const rank = top3Lookup.get(u.id)
      try {
        if (rank) {
          // Top-3 finishers get the special celebratory email
          const myScore = (top3 ?? []).find((r: any) => r.user_id === u.id)?.final_score ?? 0
          await fetch(`${origin}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'top3_finisher',
              data: {
                email: u.email,
                first_name: u.first_name || u.username,
                quiz_title: q.title,
                rank,
                final_score: myScore,
                max_score: q.max_score ?? 0,
                leaderboard_url,
              },
            }),
          })
          await supabase.from('email_log').insert({
            user_id: u.id,
            type: 'top3_finisher',
            payload: { quiz_id: q.id, rank },
          })
        } else {
          // Everyone else gets the standard leaderboard-live recap
          await fetch(`${origin}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'leaderboard_live',
              data: {
                email: u.email,
                first_name: u.first_name || u.username,
                quiz_title: q.title,
                week_number: q.week_number,
                podium,
                user_rank: rankByUser[u.id] ?? null,
                leaderboard_url,
              },
            }),
          })
          await supabase.from('email_log').insert({
            user_id: u.id,
            type: 'leaderboard_live',
            payload: { quiz_id: q.id },
          })
        }
        emailedTotal += 1
      } catch (e) {
        console.error('[cron/reveal-leaderboards] email error:', e)
      }
    }
  }

  return NextResponse.json({ revealed, emailed: emailedTotal })
}
