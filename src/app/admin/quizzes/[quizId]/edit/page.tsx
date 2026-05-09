import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { CoverUploader } from './_components/cover-uploader'

export const dynamic = 'force-dynamic'

/**
 * /admin/quizzes/[quizId]/edit — minimal quiz edit page.
 *
 * Currently only handles cover image upload (per spec §17). Title /
 * questions edit will be added in a follow-up chunk.
 */
export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>
}) {
  const { quizId } = await params
  const supabase = getSupabaseAdmin()

  const { data: rawQuiz } = await supabase
    .from('quizzes')
    .select('id, title, type, week_number, cover_image_url, max_score, is_unlocked, leaderboard_visible')
    .eq('id', quizId)
    .maybeSingle()
  const quiz = rawQuiz as any
  if (!quiz) notFound()

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/quizzes"
          className="inline-flex items-center gap-2 text-caption text-whitex-muted hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Quizzes
        </Link>
        <h1 className="mt-2 text-h1 font-bold text-white">{quiz.title}</h1>
        <p className="text-caption text-whitex-muted">
          {quiz.type === 'practice' ? 'Practice quiz' : 'Actual quiz'}
          {quiz.week_number ? ` · Week ${quiz.week_number}` : ''}
          {' · '}max score {quiz.max_score ?? 0}
        </p>
      </header>

      <CoverUploader quizId={quiz.id} currentUrl={quiz.cover_image_url} />
    </div>
  )
}
