import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { DIFFICULTY_POINTS, type Difficulty, type QuizImportPayload } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_DIFF = new Set<Difficulty>(['very_easy', 'easy', 'practical', 'medium'])

/**
 * Some JSON exports (e.g. mapei_quiz_2_beginner.json) put a single difficulty
 * descriptor at the top level instead of repeating it on every question.
 * Tolerate things like "all very_easy", "all easy", "very_easy", etc.
 */
function inferTopLevelDifficulty(raw: unknown): Difficulty | null {
  if (typeof raw !== 'string') return null
  const s = raw.toLowerCase()
  if (s.includes('very_easy') || s.includes('very easy')) return 'very_easy'
  if (s.includes('practical')) return 'practical'
  if (s.includes('medium')) return 'medium'
  if (s.includes('easy')) return 'easy'
  return null
}

/**
 * POST /api/admin/quizzes
 *
 * Imports a full quiz from JSON in the shape of mapei_quiz_1.json.
 * Validates every question; returns a list of errors if anything is off.
 * On success: creates the quiz row, inserts all questions, returns a tiny
 * summary { id, title, questions, max_score }.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard

  let body: QuizImportPayload & { week_number?: number }
  try {
    body = (await request.json()) as any
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const errors: string[] = []
  const title = (body as any).quiz_title || (body as any).title
  if (typeof title !== 'string' || !title.trim()) errors.push('Missing quiz_title')
  if (!Array.isArray((body as any).questions)) errors.push('Missing questions array')
  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 })

  const questions = (body as any).questions as QuizImportPayload['questions']

  // If the JSON declares an overall difficulty (top-level), use it as the
  // default when individual questions don't carry their own. The first batch
  // ("mapei_quiz_1.json") had per-question difficulty; the beginner batch
  // says "all very_easy" at the top with no per-question field.
  const topLevelDiff = inferTopLevelDifficulty((body as any).difficulty)

  // Validate every question
  const cleaned: {
    question_text: string
    option_a: string
    option_b: string
    option_c: string
    option_d: string
    correct_answer: 'A' | 'B' | 'C' | 'D'
    explanation: string | null
    category: string | null
    difficulty: Difficulty
    points: number
    order_index: number
  }[] = []

  questions.forEach((q, i) => {
    const id = q.id ?? i + 1
    if (!q.question || typeof q.question !== 'string') {
      errors.push(`Q${id}: missing question text`)
      return
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      errors.push(`Q${id}: needs exactly 4 options`)
      return
    }
    if (q.options.some((o: any) => typeof o !== 'string' || !o.trim())) {
      errors.push(`Q${id}: option strings must be non-empty`)
      return
    }
    const ci = q.options.indexOf(q.correct_answer)
    if (ci < 0) {
      errors.push(`Q${id}: correct_answer must be one of options`)
      return
    }
    const effectiveDiff: Difficulty | undefined = q.difficulty ?? topLevelDiff ?? undefined
    if (!effectiveDiff || !VALID_DIFF.has(effectiveDiff)) {
      errors.push(
        `Q${id}: difficulty must be very_easy / easy / practical / medium (and either set per-question or implied by a top-level "difficulty" field)`,
      )
      return
    }
    const letter = (['A', 'B', 'C', 'D'] as const)[ci]
    cleaned.push({
      question_text: q.question,
      option_a: q.options[0],
      option_b: q.options[1],
      option_c: q.options[2],
      option_d: q.options[3],
      correct_answer: letter,
      explanation: q.explanation ?? null,
      category: (q as any).source_sheet ?? (q as any).category ?? null,
      difficulty: effectiveDiff,
      points: DIFFICULTY_POINTS[effectiveDiff],
      order_index: i,
    })
  })

  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 })

  const max_score = cleaned.reduce((s, q) => s + q.points, 0)
  const week_number = (body as any).week_number ?? 1

  const supabase = getSupabaseAdmin()

  // Replace any quiz with the same title (idempotent re-imports)
  await supabase.from('quizzes').delete().eq('title', title)

  const { data: quiz, error: insertErr } = await supabase
    .from('quizzes')
    .insert([{ title, week_number, is_unlocked: false, max_score }])
    .select('id')
    .maybeSingle()

  if (insertErr || !quiz) {
    return NextResponse.json({ error: insertErr?.message || 'Insert failed' }, { status: 500 })
  }

  const rows = cleaned.map(c => ({ ...c, quiz_id: quiz.id }))
  const { error: qErr } = await supabase.from('questions').insert(rows)
  if (qErr) {
    // Rollback the quiz row so the import is atomic-ish
    await supabase.from('quizzes').delete().eq('id', quiz.id)
    return NextResponse.json({ error: `Question insert failed: ${qErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ id: quiz.id, title, questions: rows.length, max_score })
}
