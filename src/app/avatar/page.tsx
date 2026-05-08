import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { AvatarPicker } from './_components/avatar-picker'

export const dynamic = 'force-dynamic'

/**
 * /avatar — first-login avatar picker. Auto-redirects approved users here
 * after sign-in if they don't have an avatar yet. Once picked, route home.
 */
export default async function AvatarPage() {
  const session = await getSession()
  if (!session) redirect('/signin')

  const supabase = getSupabaseAdmin()
  const { data: me } = await supabase
    .from('users')
    .select('id, username, first_name, last_name, avatar_url, status, role')
    .eq('id', session.userId)
    .maybeSingle()
  if (!me) redirect('/signin')
  if (me.status !== 'approved') redirect('/signin')
  if (me.role === 'admin') redirect('/admin')
  // If they already have an avatar, no need to pick — go home
  if (me.avatar_url) redirect('/home')

  return (
    <AvatarPicker
      username={me.username}
      firstName={me.first_name}
      lastName={me.last_name}
    />
  )
}
