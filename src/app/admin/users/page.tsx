import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { UsersClient } from './_components/users-client'

export const dynamic = 'force-dynamic'

interface UserRow {
  id: string
  username: string
  email: string
  first_name: string | null
  last_name: string | null
  role: 'admin' | 'staff'
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  xp: number
  level: number
  title: string
  current_streak: number
  longest_streak: number
  last_quiz_date: string | null
  created_at: string
  updated_at: string
}

export default async function UsersPage() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('users')
    .select(
      'id,username,email,first_name,last_name,role,status,xp,level,title,current_streak,longest_streak,last_quiz_date,created_at,updated_at',
    )
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6 text-caption text-danger">
        Failed to load users: {error.message}
      </div>
    )
  }

  return <UsersClient initialUsers={(data ?? []) as UserRow[]} />
}
