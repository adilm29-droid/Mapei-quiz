/**
 * Master report data assembly. Used by:
 *   - /admin/master (web)
 *   - /api/admin/reports/master/pdf
 *
 * Reads every leaderboard attempt (the "real" scores; practice
 * attempts are excluded by spec §4), joins users + quizzes, groups
 * per-quiz with top-3 medals, and rolls up a combined ranking by
 * total score across all quizzes attempted.
 *
 * After migration 009 each question is worth 1 mark, so:
 *   wrong = max_score - score
 * for every attempt. (Skipped questions are counted as wrong here —
 * they had a chance to answer correctly and didn't.)
 */

import type { SupabaseAdmin } from '@/lib/supabase-admin'

export interface MasterRow {
  userId: string
  userName: string
  username: string
  score: number
  maxScore: number
  wrong: number
  rank: number
  medal: 'gold' | 'silver' | 'bronze' | null
  submittedAt: string | null
}

export interface MasterQuizSection {
  quizId: string
  title: string
  weekNumber: number | null
  maxScore: number
  rows: MasterRow[]
}

export interface MasterTotalRow {
  userId: string
  userName: string
  username: string
  totalScore: number
  totalMax: number
  quizzesAttempted: number
  rank: number
  medal: 'gold' | 'silver' | 'bronze' | null
}

export interface MasterReportData {
  generatedAt: Date
  quizzes: MasterQuizSection[]
  totals: MasterTotalRow[]
}

/**
 * Tier-based medal allocation. Per Tarun 2026-05-13: medals are TIERS,
 * not positions — every user at the top distinct score gets gold,
 * every user at the second distinct score gets silver, every user at
 * the third gets bronze. So if seven people tie at the top, all seven
 * are gold and there's no silver until someone scores strictly less.
 *
 * Expects `rows` to be pre-sorted by score descending (any tie-break
 * field already applied for stable display order — the tie-break
 * only affects which rank-number a user gets, not which medal).
 */
export function assignMedalsByScoreTier<
  T extends { score: number; medal: 'gold' | 'silver' | 'bronze' | null },
>(rows: T[]): T[] {
  let lastScore: number | null = null
  let distinctTier = -1
  return rows.map(r => {
    if (lastScore === null || r.score !== lastScore) {
      distinctTier += 1
      lastScore = r.score
    }
    const medal: 'gold' | 'silver' | 'bronze' | null =
      distinctTier === 0
        ? 'gold'
        : distinctTier === 1
        ? 'silver'
        : distinctTier === 2
        ? 'bronze'
        : null
    return { ...r, medal }
  })
}

function displayName(u: {
  first_name: string | null
  last_name: string | null
  username: string
}): string {
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || `@${u.username}`
}

export async function assembleMasterReport(
  supabase: SupabaseAdmin,
): Promise<MasterReportData> {
  // All actual quizzes (practice quizzes have no leaderboard so we skip them).
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, title, week_number, max_score, type, deleted_at')
    .eq('type', 'actual')
    .is('deleted_at', null)
    .order('week_number', { ascending: true })

  const quizIds = (quizzes ?? []).map(q => q.id)
  if (quizIds.length === 0) {
    return { generatedAt: new Date(), quizzes: [], totals: [] }
  }

  // All leaderboard attempts across those quizzes
  const { data: rawAttempts } = await supabase
    .from('attempts')
    .select(
      'id, quiz_id, user_id, final_score, submitted_at, ' +
        'users!inner(id, first_name, last_name, username)',
    )
    .in('quiz_id', quizIds)
    .eq('is_leaderboard_attempt', true)
    .is('deleted_at', null)
    .eq('is_complete', true)
  const attempts = (rawAttempts ?? []) as any[]

  // Per-quiz grouping with medal assignment
  const quizSections: MasterQuizSection[] = (quizzes ?? []).map((q: any) => {
    const forQuiz = attempts
      .filter(a => a.quiz_id === q.id)
      .sort((a, b) => {
        const sa = a.final_score ?? 0
        const sb = b.final_score ?? 0
        if (sb !== sa) return sb - sa
        return (a.submitted_at ?? '').localeCompare(b.submitted_at ?? '')
      })

    const rowsNoMedal: MasterRow[] = forQuiz.map((a, i) => {
      const score = a.final_score ?? 0
      const max = q.max_score ?? 0
      const rank = i + 1
      return {
        userId: a.users.id,
        userName: displayName(a.users),
        username: a.users.username,
        score,
        maxScore: max,
        wrong: Math.max(0, max - score),
        rank,
        medal: null,
        submittedAt: a.submitted_at ?? null,
      }
    })
    const rows = assignMedalsByScoreTier(rowsNoMedal)

    return {
      quizId: q.id,
      title: q.title,
      weekNumber: q.week_number ?? null,
      maxScore: q.max_score ?? 0,
      rows,
    }
  })

  // Combined totals — sum of best leaderboard score per (user, quiz)
  const totalsByUser = new Map<
    string,
    { user: any; total: number; max: number; quizzes: Set<string> }
  >()
  for (const a of attempts) {
    const userId: string = a.users.id
    const quiz = (quizzes ?? []).find((q: any) => q.id === a.quiz_id)
    if (!quiz) continue
    const score: number = a.final_score ?? 0
    const max: number = quiz.max_score ?? 0
    const existing = totalsByUser.get(userId)
    if (!existing) {
      totalsByUser.set(userId, {
        user: a.users,
        total: score,
        max,
        quizzes: new Set([a.quiz_id]),
      })
    } else {
      existing.total += score
      existing.max += max
      existing.quizzes.add(a.quiz_id)
    }
  }

  const totalsSorted = Array.from(totalsByUser.values())
    .map(v => ({
      userId: v.user.id,
      userName: displayName(v.user),
      username: v.user.username,
      totalScore: v.total,
      totalMax: v.max,
      quizzesAttempted: v.quizzes.size,
      rank: 0,
      medal: null as 'gold' | 'silver' | 'bronze' | null,
    }))
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
      // tie-breaker: more quizzes attempted ranks higher (affects rank
      // number only — medal tier is by totalScore equivalence below)
      return b.quizzesAttempted - a.quizzesAttempted
    })
    .map((t, i) => ({ ...t, rank: i + 1 }))

  // Tier-based medals — the helper expects a `score` field, so adapt.
  const totalsWithMedals = assignMedalsByScoreTier(
    totalsSorted.map(t => ({ ...t, score: t.totalScore })),
  )
  const totals: MasterTotalRow[] = totalsWithMedals.map(t => ({
    userId: t.userId,
    userName: t.userName,
    username: t.username,
    totalScore: t.totalScore,
    totalMax: t.totalMax,
    quizzesAttempted: t.quizzesAttempted,
    rank: t.rank,
    medal: t.medal,
  }))

  return {
    generatedAt: new Date(),
    quizzes: quizSections,
    totals,
  }
}
