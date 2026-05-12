import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { renderMistakesReport } from '@/lib/pdf/render'
import { formatUaeDateTime } from '@/lib/utils/timezone'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Letter = 'A' | 'B' | 'C' | 'D'
const LETTERS: ReadonlyArray<Letter> = ['A', 'B', 'C', 'D']

/**
 * GET /api/me/mistakes/pdf
 *
 * Walks every leaderboard attempt belonging to the current user, finds
 * the questions they answered wrong (or skipped), and renders a
 * "study companion" PDF — quiz title, question, their pick, the
 * correct answer, and the explanation if present. One row per distinct
 * (question, attempt). Owner-only — no admin variant here (admins
 * already have the admin PDF for any attempt).
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  const { data: user } = await supabase
    .from('users')
    .select('first_name, last_name, username')
    .eq('id', session.userId)
    .maybeSingle()
  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    `@${user?.username ?? 'user'}`

  const { data: rawAttempts } = await supabase
    .from('attempts')
    .select('id, quiz_id, answers, question_order, submitted_at')
    .eq('user_id', session.userId)
    .eq('is_leaderboard_attempt', true)
    .is('deleted_at', null)
    .eq('is_complete', true)
    .order('submitted_at', { ascending: false })
  const attempts = (rawAttempts ?? []) as any[]

  const quizIds = Array.from(new Set(attempts.map(a => a.quiz_id)))
  const titleByQuiz = new Map<string, string>()
  const questionsByQuiz = new Map<string, Map<string, any>>()
  if (quizIds.length > 0) {
    const [{ data: quizzes }, { data: questions }] = await Promise.all([
      supabase.from('quizzes').select('id, title').in('id', quizIds),
      supabase
        .from('questions')
        .select('id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation')
        .in('quiz_id', quizIds),
    ])
    for (const q of quizzes ?? []) titleByQuiz.set(q.id, q.title)
    for (const q of questions ?? []) {
      const m = questionsByQuiz.get(q.quiz_id) ?? new Map()
      m.set(q.id, q)
      questionsByQuiz.set(q.quiz_id, m)
    }
  }

  const lookupText = (q: any, letter: Letter | null): string | null => {
    if (!letter) return null
    return q[`option_${letter.toLowerCase()}`] ?? null
  }

  const mistakes: MistakeRow[] = []
  const seenQuestion = new Set<string>()
  for (const a of attempts) {
    const answers = (a.answers ?? {}) as Record<string, Letter>
    const orderArr: string[] = (a.question_order ?? []) as string[]
    const qMap = questionsByQuiz.get(a.quiz_id)
    if (!qMap) continue
    const ordered = orderArr.length
      ? orderArr.map(id => qMap.get(id)).filter(Boolean)
      : Array.from(qMap.values())
    for (const q of ordered) {
      if (seenQuestion.has(q.id)) continue
      const pick: Letter | null = LETTERS.includes(answers[q.id] as Letter)
        ? (answers[q.id] as Letter)
        : null
      if (pick === q.correct_answer) continue
      seenQuestion.add(q.id)
      const correctText = lookupText(q, q.correct_answer as Letter) ?? '—'
      mistakes.push({
        quiz_title: titleByQuiz.get(a.quiz_id) ?? 'Quiz',
        question_text: q.question_text,
        your_answer: lookupText(q, pick),
        correct_answer: correctText,
        explanation: q.explanation ?? null,
      })
    }
  }

  const pdf = await renderMistakesReport({
    fullName,
    date_uae: formatUaeDateTime(new Date()),
    totalMistakes: mistakes.length,
    mistakes,
  })

  return new NextResponse(pdf as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="lapizblue-my-mistakes.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

interface MistakeRow {
  quiz_title: string
  question_text: string
  your_answer: string | null
  correct_answer: string
  explanation: string | null
}
