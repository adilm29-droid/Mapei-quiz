import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { RequestsClient } from './_components/requests-client'

export const dynamic = 'force-dynamic'

export default async function RequestsPage() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('access_requests')
    .select(
      'id, status, requested_at, resolved_at, user_id, quiz_id, users!inner(username, first_name, last_name, email), quizzes!inner(title, week_number)',
    )
    .order('requested_at', { ascending: false })

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6 text-caption text-danger">
        Failed to load requests: {error.message}
      </div>
    )
  }

  const rows = (data ?? []).map((r: any) => ({
    id: r.id,
    status: r.status,
    requested_at: r.requested_at,
    resolved_at: r.resolved_at,
    user: {
      id: r.user_id,
      username: r.users.username,
      first_name: r.users.first_name,
      last_name: r.users.last_name,
      email: r.users.email,
    },
    quiz: {
      id: r.quiz_id,
      title: r.quizzes.title,
      week_number: r.quizzes.week_number,
    },
  }))

  return <RequestsClient initial={rows} />
}
