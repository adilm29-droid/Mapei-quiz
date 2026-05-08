import { Flame } from 'lucide-react'
import { Avatar } from '@/components/avatar/avatar'

interface User {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  current_streak: number
  title: string
  avatar_url: string | null
}

export function HomeHeader({ user }: { user: User }) {
  return (
    <section className="flex items-center gap-4">
      <Avatar
        size="lg"
        username={user.username}
        first_name={user.first_name}
        last_name={user.last_name}
        src={user.avatar_url}
        isSelf
      />
      <div>
        <p className="text-caption text-whitex-muted">Welcome back</p>
        <h1 className="text-h1 font-semibold text-white">
          {user.first_name || user.username}
        </h1>
        <div className="mt-1 flex items-center gap-3 text-caption text-whitex-muted">
          <span className="inline-flex items-center gap-1.5 text-sunset-from">
            <Flame className="h-3.5 w-3.5 fill-current" />
            <span className="tabular text-whitex-soft">{user.current_streak}</span>
          </span>
          <span className="text-whitex-faint">·</span>
          <span>{user.title}</span>
        </div>
      </div>
    </section>
  )
}
