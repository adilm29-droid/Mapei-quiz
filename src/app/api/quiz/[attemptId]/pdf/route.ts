import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { renderUserReport, renderAdminReport } from '@/lib/pdf/render'
import { uploadAttemptPdf, streamAttemptPdf } from '@/lib/storage/pdfs'
import { formatUaeDateTime, formatDuration } from '@/lib/utils/timezone'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/quiz/[attemptId]/pdf?variant=user|admin
 *
 * - Returns the PDF as a stream (Content-Type: application/pdf).
 * - Owner of the attempt can download `?variant=user`.
 * - Admins can download either variant for any attempt.
 * - Non-owners get 403.
 * - If a stored PDF exists at attempts.pdf_url, stream that. Otherwise
 *   render fresh, persist, and stream the freshly-rendered bytes.
 *
 * No `?token=` magic links — the cookie session is the gate. Embed in
 * emails as a permalink; clicking forces login if expired.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { attemptId } = await params
  const url = new URL(req.url)
  const variant = (url.searchParams.get('variant') || 'user').toLowerCase()
  if (variant !== 'user' && variant !== 'admin') {
    return NextResponse.json({ error: 'Invalid variant' }, { status: 400 })
  }
  if (variant === 'admin' && session.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  // Fetch attempt + quiz + user
  const { data: attempt, error: aErr } = await supabaseAdmin
    .from('attempts')
    .select('*')
    .eq('id', attemptId)
    .is('deleted_at', null)
    .maybeSingle()
  if (aErr || !attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  }

  // Authorization: owner OR admin
  if (attempt.user_id !== session.userId && session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // If we have a stored PDF and the variant matches what's stored,
  // stream that. Variant key encoded into filename.
  const storedKey = `${variant}:${attempt.pdf_url ?? ''}`
  void storedKey
  // For simplicity, skip caching and re-render on every request (rare op,
  // small docs). If perf becomes an issue we can add an `attempts.pdf_*_url`
  // column per variant. For now: render-and-stream.

  const [{ data: quiz }, { data: user }, { data: questions }] = await Promise.all([
    supabaseAdmin.from('quizzes').select('id, title, max_score').eq('id', attempt.quiz_id).maybeSingle(),
    supabaseAdmin.from('users').select('first_name, last_name, username, email').eq('id', attempt.user_id).maybeSingle(),
    supabaseAdmin.from('questions').select('*').eq('quiz_id', attempt.quiz_id).order('id'),
  ])

  if (!quiz || !user || !questions) {
    return NextResponse.json({ error: 'Failed to assemble report data' }, { status: 500 })
  }

  // Order the questions per the attempt's question_order (stable per attempt)
  const orderArr: string[] = (attempt.question_order ?? []) as string[]
  const qById = new Map<string, any>(questions.map(q => [q.id, q]))
  const orderedQuestions = orderArr.length
    ? orderArr.map(id => qById.get(id)).filter(Boolean)
    : questions

  // Compute rank-at-completion among leaderboard attempts on this quiz
  let rankAtCompletion: number | null = null
  let totalCompletions = 0
  if (attempt.is_leaderboard_attempt) {
    const { data: betterRows } = await supabaseAdmin
      .from('attempts')
      .select('id, final_score, time_taken_seconds, submitted_at')
      .eq('quiz_id', attempt.quiz_id)
      .eq('is_leaderboard_attempt', true)
      .is('deleted_at', null)
      .eq('is_complete', true)
    totalCompletions = (betterRows ?? []).length
    // Rank = (# rows with strictly better score, or equal score + earlier submit) + 1
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

  const percent = quiz.max_score > 0 ? ((attempt.final_score ?? 0) / quiz.max_score) * 100 : 0
  const timeTaken = formatDuration(attempt.time_taken_seconds ?? 0)
  const dateUae = formatUaeDateTime(attempt.submitted_at ?? attempt.started_at ?? new Date())

  let pdfBytes: Buffer
  if (variant === 'user') {
    pdfBytes = await renderUserReport({
      quizTitle: quiz.title,
      fullName: `${user.first_name} ${user.last_name}`,
      date_uae: dateUae,
      timeTaken,
      finalScore: attempt.final_score ?? 0,
      maxScore: quiz.max_score,
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
  } else {
    const answers = (attempt.answers ?? {}) as Record<string, 'A' | 'B' | 'C' | 'D'>
    pdfBytes = await renderAdminReport({
      quizTitle: quiz.title,
      fullName: `${user.first_name} ${user.last_name}`,
      username: user.username,
      email: user.email,
      date_uae: dateUae,
      timeTaken,
      finalScore: attempt.final_score ?? 0,
      maxScore: quiz.max_score,
      percent,
      xpEarned: attempt.xp_awarded ?? 0,
      rankAtCompletion,
      totalCompletions,
      ip: attempt.ip_address ?? null,
      userAgent: attempt.user_agent ?? null,
      startedAtUae: formatUaeDateTime(attempt.started_at ?? new Date()),
      submittedAtUae: formatUaeDateTime(attempt.submitted_at ?? new Date()),
      questions: orderedQuestions.map((q: any) => ({
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        user_answer: answers[q.id] ?? null,
        explanation: q.explanation ?? null,
        time_taken_seconds: null,
      })),
    })
  }

  // Persist user PDF to storage for first-time renders so the download is
  // a single click in subsequent loads. Best-effort — don't fail the
  // request if upload fails (e.g. bucket not yet created in dev).
  if (variant === 'user' && !attempt.pdf_url) {
    try {
      const { pdf_url } = await uploadAttemptPdf(supabaseAdmin, attempt.user_id, attempt.id, pdfBytes)
      await supabaseAdmin.from('attempts').update({ pdf_url }).eq('id', attempt.id)
    } catch (e) {
      console.warn('[pdf] storage upload failed (non-fatal):', e)
    }
  }
  void streamAttemptPdf // imported for future signed-URL flow

  const filename = variant === 'admin'
    ? `lapizblue-quiz-admin-${attempt.id}.pdf`
    : `lapizblue-quiz-${attempt.id}.pdf`

  return new NextResponse(new Uint8Array(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, max-age=0, no-store',
    },
  })
}
