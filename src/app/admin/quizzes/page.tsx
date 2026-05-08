import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { QuizzesClient } from './_components/quizzes-client'

export const dynamic = 'force-dynamic'

export default async function QuizzesPage() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, week_number, is_unlocked, leaderboard_visible, max_score, unlocked_at, created_at')
    .is('deleted_at', null)
    .order('week_number', { ascending: false })

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6 text-caption text-danger">
        Failed to load quizzes: {error.message}
      </div>
    )
  }

  // Question counts per quiz (for the table)
  const ids = (data ?? []).map((q: any) => q.id)
  const counts: Record<string, number> = {}
  if (ids.length > 0) {
    const { data: qRows } = await supabase
      .from('questions')
      .select('quiz_id')
      .in('quiz_id', ids)
    for (const r of qRows ?? []) counts[r.quiz_id] = (counts[r.quiz_id] ?? 0) + 1
  }

  return <QuizzesClient initial={(data ?? []).map((q: any) => ({ ...q, question_count: counts[q.id] ?? 0 }))} />
}
