import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { LibraryClient } from './_components/library-client'

export const dynamic = 'force-dynamic'

interface QuestionWithQuiz {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'A' | 'B' | 'C' | 'D'
  explanation: string | null
  category: string | null
  difficulty: 'very_easy' | 'easy' | 'practical' | 'medium'
  points: number
  order_index: number
  quiz_id: string
  quiz_title: string
  quiz_week: number
}

/**
 * /admin/library — every question across every quiz, grouped by difficulty,
 * expandable per quiz. Use this as a "have we asked this before?" reference
 * when uploading the next batch.
 */
export default async function LibraryPage() {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('questions')
    .select(
      'id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, category, difficulty, points, order_index, quiz_id, quizzes!inner(title, week_number)',
    )
    .order('order_index', { ascending: true })

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6 text-caption text-danger">
        Failed to load library: {error.message}
      </div>
    )
  }

  const questions: QuestionWithQuiz[] = (data ?? []).map((row: any) => ({
    id: row.id,
    question_text: row.question_text,
    option_a: row.option_a,
    option_b: row.option_b,
    option_c: row.option_c,
    option_d: row.option_d,
    correct_answer: row.correct_answer,
    explanation: row.explanation,
    category: row.category,
    difficulty: row.difficulty,
    points: row.points,
    order_index: row.order_index,
    quiz_id: row.quiz_id,
    quiz_title: row.quizzes.title,
    quiz_week: row.quizzes.week_number,
  }))

  return <LibraryClient questions={questions} />
}
