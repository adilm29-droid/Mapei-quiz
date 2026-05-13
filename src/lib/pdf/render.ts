import { renderToBuffer } from '@react-pdf/renderer'
import * as React from 'react'
import { UserReport, type UserReportProps } from './UserReport'
import { AdminReport, type AdminReportProps } from './AdminReport'
import { MistakesReport, type MistakesReportProps } from './MistakesReport'
import { MasterReport, type MasterReportPdfProps } from './MasterReport'
import { formatUaeDateTime, formatDuration } from '@/lib/utils/timezone'
import type { SupabaseAdmin } from '@/lib/supabase-admin'

/** Renders the user PDF and returns the raw PDF bytes as a Buffer. */
export async function renderUserReport(props: UserReportProps): Promise<Buffer> {
  return await renderToBuffer(React.createElement(UserReport, props) as any)
}

/** Renders the admin PDF and returns the raw PDF bytes as a Buffer. */
export async function renderAdminReport(props: AdminReportProps): Promise<Buffer> {
  return await renderToBuffer(React.createElement(AdminReport, props) as any)
}

/** Renders the user mistakes / study-companion PDF. */
export async function renderMistakesReport(props: MistakesReportProps): Promise<Buffer> {
  return await renderToBuffer(React.createElement(MistakesReport, props) as any)
}

/** Renders the admin Master Report PDF (every staff member × every quiz). */
export async function renderMasterReport(props: MasterReportPdfProps): Promise<Buffer> {
  return await renderToBuffer(React.createElement(MasterReport, props) as any)
}

/**
 * Load everything needed to render a user-facing PDF for `attemptId`,
 * then render it. Used by both /api/quiz/[attemptId]/pdf and
 * /api/send-email (so the completion email can attach the PDF).
 *
 * Returns null if any of the data joins fail — callers should treat
 * that as "skip attachment, ship email anyway."
 */
export async function assembleUserReportPdf(
  supabase: SupabaseAdmin,
  attemptId: string,
): Promise<{ pdf: Buffer; filename: string } | null> {
  const { data: rawAttempt } = await supabase
    .from('attempts')
    .select(
      'id, user_id, quiz_id, final_score, started_at, submitted_at, ' +
        'time_taken_seconds, xp_awarded, is_leaderboard_attempt, question_order',
    )
    .eq('id', attemptId)
    .maybeSingle()
  const attempt = rawAttempt as any
  if (!attempt) return null

  const [{ data: quiz }, { data: user }, { data: questions }] = await Promise.all([
    supabase.from('quizzes').select('id, title, max_score').eq('id', attempt.quiz_id).maybeSingle(),
    supabase
      .from('users')
      .select('first_name, last_name, username')
      .eq('id', attempt.user_id)
      .maybeSingle(),
    supabase.from('questions').select('*').eq('quiz_id', attempt.quiz_id).order('id'),
  ])
  if (!quiz || !user || !questions) return null

  const orderArr = (attempt.question_order ?? []) as string[]
  const qById = new Map<string, any>(questions.map(q => [q.id, q]))
  const orderedQuestions = orderArr.length
    ? orderArr.map(id => qById.get(id)).filter(Boolean)
    : questions

  let rankAtCompletion: number | null = null
  let totalCompletions = 0
  if (attempt.is_leaderboard_attempt) {
    const { data: betterRows } = await supabase
      .from('attempts')
      .select('id, final_score, time_taken_seconds')
      .eq('quiz_id', attempt.quiz_id)
      .eq('is_leaderboard_attempt', true)
      .is('deleted_at', null)
      .eq('is_complete', true)
    totalCompletions = (betterRows ?? []).length
    const myScore = attempt.final_score ?? 0
    const myTime = attempt.time_taken_seconds ?? Number.MAX_SAFE_INTEGER
    let better = 0
    for (const r of betterRows ?? []) {
      const rs = r.final_score ?? 0
      const rt = r.time_taken_seconds ?? Number.MAX_SAFE_INTEGER
      if (rs > myScore) better += 1
      else if (rs === myScore && rt < myTime) better += 1
    }
    rankAtCompletion = better + 1
  }

  const max = quiz.max_score ?? 0
  const percent = max > 0 ? ((attempt.final_score ?? 0) / max) * 100 : 0
  const timeTaken = formatDuration(attempt.time_taken_seconds ?? 0)
  const dateUae = formatUaeDateTime(attempt.submitted_at ?? attempt.started_at ?? new Date())

  const pdf = await renderUserReport({
    quizTitle: quiz.title,
    fullName: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.username,
    date_uae: dateUae,
    timeTaken,
    finalScore: attempt.final_score ?? 0,
    maxScore: max,
    percent,
    xpEarned: attempt.xp_awarded ?? 0,
    rankAtCompletion,
    totalCompletions,
    questions: orderedQuestions.map((q: any) => ({
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation ?? null,
    })),
  })

  const slug = (quiz.title ?? 'quiz')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
  const filename = `lapizblue-${slug || 'quiz'}-report.pdf`
  return { pdf, filename }
}
