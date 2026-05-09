import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { Difficulty } from '@/lib/types'
import { DIFFICULTY_POINTS } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/quizzes/import-practice
 *
 * Per CLAUDE_CODE_PROMPT.md §16. Imports a practice quiz from JSON.
 * Forgiving on unknown fields (warn but accept), strict on missing
 * required. Practice quizzes:
 *   - quizzes.type = 'practice'
 *   - quizzes.is_unlocked = true (always available)
 *   - quizzes.practice_for_quiz_id optional
 *   - never affect leaderboard, never award score badges (per §11/§16)
 *
 * TODO: confirm with Tarun the actual JSON shape — schema below
 *       matches the spec's draft. Tweak when real data lands.
 */

// Per spec §16:
// {
//   "title": "string",
//   "practice_for_quiz_id": "uuid or null",
//   "questions": [
//     { "text": "string", "type": "single_choice", "difficulty": "easy",
//       "points": 1, "options": [{"text": "string", "is_correct": false}, ...],
//       "explanation": "string (optional)" }
//   ]
// }
const QuestionSchema = z
  .object({
    text: z.string().min(1, 'question text required'),
    type: z.string().optional(), // currently only 'single_choice' supported
    difficulty: z
      .enum(['very_easy', 'easy', 'practical', 'medium'])
      .default('easy'),
    points: z.number().int().min(0).optional(),
    options: z
      .array(
        z.object({
          text: z.string().min(1),
          is_correct: z.boolean(),
        }),
      )
      .length(4, 'exactly 4 options required'),
    explanation: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
  })
  .passthrough()

const ImportSchema = z
  .object({
    title: z.string().min(1, 'title required'),
    practice_for_quiz_id: z.string().uuid().nullable().optional(),
    week_number: z.number().int().min(1).optional(),
    questions: z.array(QuestionSchema).min(1).max(60),
  })
  .passthrough()

type ImportPayload = z.infer<typeof ImportSchema>

export async function POST(request: Request) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ImportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        issues: parsed.error.issues.map(i => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 },
    )
  }
  const payload: ImportPayload = parsed.data

  // Surface unknown top-level keys as warnings (forgiving on unknown)
  const knownTop = new Set(['title', 'practice_for_quiz_id', 'week_number', 'questions'])
  const warnings: string[] = []
  if (body && typeof body === 'object') {
    for (const k of Object.keys(body as object)) {
      if (!knownTop.has(k)) warnings.push(`unknown top-level field "${k}" ignored`)
    }
  }

  const supabase = getSupabaseAdmin()

  // Validate practice_for_quiz_id points to an `actual` quiz
  if (payload.practice_for_quiz_id) {
    const { data: parent } = await supabase
      .from('quizzes')
      .select('id, type')
      .eq('id', payload.practice_for_quiz_id)
      .maybeSingle()
    if (!parent) {
      return NextResponse.json(
        { error: `practice_for_quiz_id ${payload.practice_for_quiz_id} not found` },
        { status: 400 },
      )
    }
    if ((parent as any).type === 'practice') {
      return NextResponse.json(
        { error: 'practice_for_quiz_id must point to an actual quiz, not another practice quiz' },
        { status: 400 },
      )
    }
  }

  // Validate every question has exactly one is_correct option
  for (let i = 0; i < payload.questions.length; i++) {
    const q = payload.questions[i]
    const correctCount = q.options.filter(o => o.is_correct).length
    if (correctCount !== 1) {
      return NextResponse.json(
        { error: `Q${i + 1}: exactly one option must have is_correct=true (found ${correctCount})` },
        { status: 400 },
      )
    }
  }

  // Compute max_score
  const maxScore = payload.questions.reduce((s, q) => {
    const pts = q.points ?? DIFFICULTY_POINTS[(q.difficulty as Difficulty) ?? 'easy']
    return s + pts
  }, 0)

  // Insert quiz
  const { data: createdQuiz, error: qErr } = await supabase
    .from('quizzes')
    .insert({
      title: payload.title,
      week_number: payload.week_number ?? null,
      type: 'practice',
      practice_for_quiz_id: payload.practice_for_quiz_id ?? null,
      is_unlocked: true,
      max_score: maxScore,
    })
    .select('id')
    .maybeSingle()
  if (qErr || !createdQuiz) {
    return NextResponse.json(
      { error: qErr?.message ?? 'Could not create quiz' },
      { status: 500 },
    )
  }
  const newQuizId = (createdQuiz as any).id

  // Insert questions — translate {options[].is_correct} into A/B/C/D + correct_answer
  const letters = ['A', 'B', 'C', 'D'] as const
  const rows = payload.questions.map((q, i) => {
    const correctIdx = q.options.findIndex(o => o.is_correct)
    const points = q.points ?? DIFFICULTY_POINTS[(q.difficulty as Difficulty) ?? 'easy']
    return {
      quiz_id: newQuizId,
      question_text: q.text,
      option_a: q.options[0].text,
      option_b: q.options[1].text,
      option_c: q.options[2].text,
      option_d: q.options[3].text,
      correct_answer: letters[correctIdx],
      explanation: q.explanation ?? null,
      category: q.category ?? null,
      difficulty: (q.difficulty ?? 'easy') as Difficulty,
      points,
      order_index: i + 1,
    }
  })
  const { error: qsErr } = await supabase.from('questions').insert(rows)
  if (qsErr) {
    // Best-effort cleanup; if this fails the quiz row is orphan-empty
    await supabase.from('quizzes').delete().eq('id', newQuizId)
    return NextResponse.json({ error: qsErr.message }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      quiz_id: newQuizId,
      max_score: maxScore,
      question_count: rows.length,
      practice_for_quiz_id: payload.practice_for_quiz_id ?? null,
    },
    warnings,
    error: null,
  })
}
