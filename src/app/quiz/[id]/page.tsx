import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { QuizClient } from './_components/quiz-client'

export const dynamic = 'force-dynamic'

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/signin')
  const { id } = await params
  return <QuizClient quizId={id} />
}
