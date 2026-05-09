import { NextResponse } from 'next/server'
import { requireCron } from '@/lib/cron-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { uaeToday } from '@/lib/uae-time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/leaderboard-digest
 * Per CLAUDE_CODE_PROMPT.md §13. Runs daily 19:00 UTC = 23:00 UAE.
 *
 * For every quiz that received its FIRST EVER leaderboard completion
 * today (UAE TZ): include its top 10 + the recipient's own rank in the
 * digest. Plus today's top 3 by XP gain across all quizzes.
 *
 * Single email per user per day — idempotency via email_log
 * (type='leaderboard_digest').
 */
export async function GET(request: Request) {
  const guardFail = requireCron(request)
  if (guardFail) return guardFail

  const supabase = getSupabaseAdmin()
  const today = uaeToday()
  const startUtc = new Date(today + 'T00:00:00Z').getTime() - 4 * 60 * 60 * 1000
  const endUtc = startUtc + 24 * 60 * 60 * 1000
  const startIso = new Date(startUtc).toISOString()
  const endIso = new Date(endUtc).toISOString()

  // 1. Find quizzes whose first-ever LB completion happened today.
  //    For each LB attempt today, check if it's the user×quiz's first.
  //    But "first ever" applies to the QUIZ — does it have any prior LB
  //    attempt with submitted_at < startIso? If no, today's submissions
  //    represent the quiz's debut on the leaderboard.
  const { data: lbToday } = await supabase
    .from('attempts')
    .select('id, quiz_id, final_score, submitted_at, user_id')
    .eq('is_leaderboard_attempt', true)
    .is('deleted_at', null)
    .eq('is_complete', true)
    .gte('submitted_at', startIso)
    .lt('submitted_at', endIso)

  const todayQuizIds = Array.from(new Set((lbToday ?? []).map(a => a.quiz_id)))
  const fresh: { quiz_id: string; title: string; max_score: number }[] = []

  for (const quizId of todayQuizIds) {
    const { count: priorCount } = await supabase
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', quizId)
      .eq('is_leaderboard_attempt', true)
      .is('deleted_at', null)
      .eq('is_complete', true)
      .lt('submitted_at', startIso)
    if ((priorCount ?? 0) > 0) continue
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('id, title, max_score')
      .eq('id', quizId)
      .maybeSingle()
    if (quiz) fresh.push({ quiz_id: quiz.id, title: quiz.title, max_score: quiz.max_score ?? 0 })
  }

  // 2. For each fresh quiz, compute its top 10 + per-user ranks
  type LbRow = { user_id: string; final_score: number; rank: number; name: string; max_score: number }
  const perQuiz: Record<string, { title: string; max_score: number; rows: LbRow[] }> = {}
  for (const q of fresh) {
    const { data: rawAttempts } = await supabase
      .from('attempts')
      .select(
        'user_id, final_score, submitted_at, time_taken_seconds, users!inner(id, username, first_name, last_name)',
      )
      .eq('quiz_id', q.quiz_id)
      .eq('is_leaderboard_attempt', true)
      .is('deleted_at', null)
      .eq('is_complete', true)
      .order('final_score', { ascending: false })
      .order('time_taken_seconds', { ascending: true, nullsFirst: false })
      .order('submitted_at', { ascending: true })

    const ranked: LbRow[] = (rawAttempts ?? []).map((row: any, i: number) => ({
      user_id: row.user_id,
      final_score: row.final_score ?? 0,
      rank: i + 1,
      name:
        [row.users.first_name, row.users.last_name].filter(Boolean).join(' ') ||
        `@${row.users.username}`,
      max_score: q.max_score,
    }))
    perQuiz[q.quiz_id] = { title: q.title, max_score: q.max_score, rows: ranked }
  }

  // 3. Today's top XP earners — sum xp_awarded across LB attempts today
  const xpByUser = new Map<string, number>()
  for (const a of lbToday ?? []) {
    // We need xp_awarded for ranking. Fetch in one query.
  }
  const { data: xpRows } = await supabase
    .from('attempts')
    .select('user_id, xp_awarded, users!inner(username, first_name, last_name)')
    .eq('is_leaderboard_attempt', true)
    .is('deleted_at', null)
    .eq('is_complete', true)
    .gte('submitted_at', startIso)
    .lt('submitted_at', endIso)
  const userNames = new Map<string, string>()
  for (const r of (xpRows ?? []) as any[]) {
    xpByUser.set(r.user_id, (xpByUser.get(r.user_id) ?? 0) + (r.xp_awarded ?? 0))
    if (!userNames.has(r.user_id)) {
      userNames.set(
        r.user_id,
        [r.users.first_name, r.users.last_name].filter(Boolean).join(' ') ||
          `@${r.users.username}`,
      )
    }
  }
  const topXpToday = Array.from(xpByUser.entries())
    .map(([id, xp]) => ({ id, name: userNames.get(id) ?? '—', xp }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 3)

  // Bail if there's nothing to report — don't spam empty digests.
  if (fresh.length === 0 && topXpToday.length === 0) {
    return NextResponse.json({ skipped: 'nothing-to-report', date: today })
  }

  // 4. Email every approved user (idempotent via email_log)
  const { data: users } = await supabase
    .from('users')
    .select('id, email, first_name, username')
    .eq('status', 'approved')

  const origin = new URL(request.url).origin
  let emailed = 0
  let skipped = 0

  for (const u of users ?? []) {
    // Skip if we already sent a digest to this user today
    const { count: prior } = await supabase
      .from('email_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', u.id)
      .eq('type', 'leaderboard_digest')
      .gte('sent_at', startIso)
      .lt('sent_at', endIso)
    if ((prior ?? 0) > 0) {
      skipped += 1
      continue
    }

    const quizzes = fresh.map(q => {
      const all = perQuiz[q.quiz_id]?.rows ?? []
      const top10 = all
        .slice(0, 10)
        .map(r => ({ rank: r.rank, name: r.name, score: r.final_score, max_score: r.max_score }))
      const myRow = all.find(r => r.user_id === u.id)
      return {
        quiz_id: q.quiz_id,
        title: q.title,
        top10,
        user_rank: myRow ? myRow.rank : null,
      }
    })

    try {
      const res = await fetch(`${origin}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'leaderboard_digest',
          data: {
            email: u.email,
            first_name: u.first_name || u.username,
            date_uae: today,
            quizzes,
            top_xp_today: topXpToday.map(t => ({ name: t.name, xp: t.xp })),
            leaderboard_url: `${origin}/leaderboard`,
            home_url: `${origin}/home`,
          },
        }),
      })
      if (!res.ok) throw new Error(`send-email ${res.status}`)
      await supabase.from('email_log').insert({
        user_id: u.id,
        type: 'leaderboard_digest',
        payload: {
          quizzes_shown: fresh.map(q => q.quiz_id),
          xp_winners: topXpToday.length,
        },
      })
      emailed += 1
    } catch (e) {
      console.error('[cron/leaderboard-digest] email error:', e)
      try {
        await supabase.from('email_log').insert({
          user_id: u.id,
          type: 'leaderboard_digest',
          payload: { error: String(e) },
          status: 'failed',
        } as any)
      } catch {
        /* never block on log writes */
      }
    }
  }

  return NextResponse.json({
    date: today,
    fresh_quizzes: fresh.map(q => q.quiz_id),
    emailed,
    already_sent_skipped: skipped,
  })
}
