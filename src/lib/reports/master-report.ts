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

function medalFor(rank: number): MasterRow['medal'] {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return null
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

    const rows: MasterRow[] = forQuiz.map((a, i) => {
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
        medal: medalFor(rank),
        submittedAt: a.submitted_at ?? null,
      }
    })

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

  const totals: MasterTotalRow[] = Array.from(totalsByUser.values())
    .map(v => ({
      userId: v.user.id,
      userName: displayName(v.user),
      username: v.user.username,
      totalScore: v.total,
      totalMax: v.max,
      quizzesAttempted: v.quizzes.size,
      rank: 0,
      medal: null,
    }))
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
      // tie-breaker: more quizzes attempted ranks higher
      return b.quizzesAttempted - a.quizzesAttempted
    })
    .map((t, i) => ({
      ...t,
      rank: i + 1,
      medal: medalFor(i + 1),
    }))

  return {
    generatedAt: new Date(),
    quizzes: quizSections,
    totals,
  }
}
