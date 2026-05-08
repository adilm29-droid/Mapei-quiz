import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { ResultsClient } from './_components/results-client'

export const dynamic = 'force-dynamic'

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ attempt?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/signin')
  const { id } = await params
  const sp = await searchParams
  if (!sp.attempt) redirect(`/quiz/${id}`)
  return <ResultsClient quizId={id} attemptId={sp.attempt} />
}
