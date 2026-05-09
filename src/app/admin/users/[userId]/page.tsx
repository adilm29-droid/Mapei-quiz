import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Trophy } from 'lucide-react'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { Avatar } from '@/components/avatar/avatar'
import { Badge } from '@/components/ui/badge'
import { formatUaeDateTime, formatDuration } from '@/lib/utils/timezone'
import { AvatarUploader } from './_components/avatar-uploader'

export const dynamic = 'force-dynamic'

/**
 * /admin/users/[userId] — per-user admin overview.
 *
 * Per CLAUDE_CODE_PROMPT.md §14:
 *   1. Header: avatar + name + email + role + joined + last_active
 *   2. Stats cards: total Attempt 1s, avg score, total XP, current
 *      global rank, total practice attempts, achievements count
 *   3. Attempt history (Attempt 1s) — quiz, date, score, XP, time,
 *      IP, [view][PDF][reset]
 *   4. Practice activity — quiz, total practice count, last practiced
 *   5. Achievements — full unlocked list with dates
 *   6. Admin action log filtered to this user
 *
 * Auth handled at /admin/layout.
 */
export default async function AdminUserOverview({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const supabase = getSupabaseAdmin()

  const { data: rawUser } = await supabase
    .from('users')
    .select(
      'id, username, email, first_name, last_name, role, status, avatar_url, ' +
        'xp, total_xp, level, title, current_streak, longest_streak, completed_quizzes_count, ' +
        'created_at, last_quiz_date, last_active_at',
    )
    .eq('id', userId)
    .maybeSingle()
  const user = rawUser as any
  if (!user) notFound()

  // Attempt 1s for this user (LB only, not soft-deleted)
  const { data: rawAttempts } = await supabase
    .from('attempts')
    .select(
      'id, quiz_id, final_score, submitted_at, time_taken_seconds, xp_awarded, ip_address, deleted_at, ' +
        'quizzes!inner(id, title, max_score, week_number)',
    )
    .eq('user_id', userId)
    .eq('is_leaderboard_attempt', true)
    .is('deleted_at', null)
    .eq('is_complete', true)
    .order('submitted_at', { ascending: false })
  const attempts = (rawAttempts ?? []) as any[]

  // Practice counters for this user
  const { data: rawPractice } = await supabase
    .from('practice_counters')
    .select('quiz_id, attempt_count, last_practiced_at, quizzes!inner(id, title)')
    .eq('user_id', userId)
    .order('last_practiced_at', { ascending: false })
  const practice = (rawPractice ?? []) as any[]

  // Achievements
  const { data: rawAch } = await supabase
    .from('user_achievements')
    .select('achievement_id, unlocked_at, achievements!inner(id, code, scope, name, tier_color)')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })
  const achievements = (rawAch ?? []) as any[]

  // Admin actions affecting this user
  const { data: rawActions } = await supabase
    .from('admin_actions')
    .select('id, action_type, payload, reason, created_at, admin_user_id, users!admin_actions_admin_user_id_fkey(username)')
    .eq('affected_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  const actions = (rawActions ?? []) as any[]

  // Stats
  const totalAttempts = attempts.length
  const avgScore =
    totalAttempts === 0
      ? 0
      : Math.round(
          (attempts.reduce(
            (s, a) =>
              s +
              (a.quizzes.max_score
                ? ((a.final_score ?? 0) / a.quizzes.max_score) * 100
                : 0),
            0,
          ) /
            totalAttempts) *
            10,
        ) / 10
  const totalPractice = practice.reduce((s, p) => s + (p.attempt_count ?? 0), 0)

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || `@${user.username}`

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-caption text-whitex-muted hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> All users
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar
            size="lg"
            username={user.username}
            first_name={user.first_name}
            last_name={user.last_name}
            src={user.avatar_url}
          />
          <div>
            <h1 className="text-h1 font-bold text-white">{fullName}</h1>
            <p className="text-caption text-whitex-muted">
              @{user.username} · {user.email}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge tone={user.role === 'admin' ? 'glow' : 'neutral'}>{user.role}</Badge>
              <Badge tone={user.status === 'approved' ? 'success' : 'warning'}>
                {user.status}
              </Badge>
              <span className="text-micro uppercase tracking-wider text-whitex-faint">
                Joined {user.created_at ? formatUaeDateTime(user.created_at) : '—'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Attempt 1s" value={totalAttempts} />
        <Stat label="Avg Score" value={`${avgScore}%`} />
        <Stat label="Total XP" value={(user.total_xp ?? user.xp ?? 0).toLocaleString()} />
        <Stat label="Level" value={user.level ?? 1} />
        <Stat label="Practice Attempts" value={totalPractice} />
        <Stat label="Achievements" value={achievements.length} />
      </section>

      <AvatarUploader userId={user.id} currentUrl={user.avatar_url} />

      <section>
        <h2 className="mb-3 text-h3 font-semibold text-white">
          Attempt history ({attempts.length})
        </h2>
        {attempts.length === 0 ? (
          <p className="rounded-2xl border border-midnight-line bg-midnight-elevated p-6 text-caption text-whitex-muted">
            No leaderboard attempts yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-midnight-line bg-midnight-elevated">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-midnight-line text-micro uppercase tracking-wider text-whitex-faint">
                  <th className="px-4 py-2 font-medium">Quiz</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 text-right font-medium">Score</th>
                  <th className="px-4 py-2 text-right font-medium">Time</th>
                  <th className="px-4 py-2 text-right font-medium">XP</th>
                  <th className="px-4 py-2 font-medium">IP</th>
                  <th className="px-4 py-2 text-right font-medium">{''}</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map(a => {
                  const max = a.quizzes.max_score ?? 0
                  const pct = max > 0 ? Math.round(((a.final_score ?? 0) / max) * 100) : 0
                  return (
                    <tr key={a.id} className="border-b border-midnight-line/60 last:border-b-0">
                      <td className="px-4 py-2 text-caption text-whitex-soft">
                        <Link
                          href={`/admin/users/${userId}/attempts/${a.id}`}
                          className="hover:text-white hover:underline"
                        >
                          <Trophy className="mr-1 inline h-3 w-3 text-amber-300" />
                          {a.quizzes.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-caption text-whitex-muted">
                        {a.submitted_at ? formatUaeDateTime(a.submitted_at) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-caption text-whitex-soft">
                        {a.final_score ?? 0}/{max} <span className="text-whitex-muted">({pct}%)</span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-caption text-whitex-muted">
                        {formatDuration(a.time_taken_seconds ?? 0)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-caption text-emerald-300">
                        +{a.xp_awarded ?? 0}
                      </td>
                      <td className="px-4 py-2 font-mono text-micro text-whitex-faint">
                        {a.ip_address ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <a
                          href={`/api/quiz/${a.id}/pdf?variant=admin`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-midnight-line bg-midnight-base px-2 py-1 text-micro text-whitex-soft hover:bg-midnight-line"
                        >
                          <Download className="h-3 w-3" /> PDF
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-h3 font-semibold text-white">Practice activity</h2>
        {practice.length === 0 ? (
          <p className="rounded-2xl border border-midnight-line bg-midnight-elevated p-6 text-caption text-whitex-muted">
            No practice attempts.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-midnight-line bg-midnight-elevated">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-midnight-line text-micro uppercase tracking-wider text-whitex-faint">
                  <th className="px-4 py-2 font-medium">Quiz</th>
                  <th className="px-4 py-2 text-right font-medium">Practice count</th>
                  <th className="px-4 py-2 font-medium">Last practiced</th>
                </tr>
              </thead>
              <tbody>
                {practice.map(p => (
                  <tr key={p.quiz_id} className="border-b border-midnight-line/60 last:border-b-0">
                    <td className="px-4 py-2 text-caption text-whitex-soft">{p.quizzes.title}</td>
                    <td className="px-4 py-2 text-right font-mono text-caption text-whitex-soft">
                      {p.attempt_count ?? 0}
                    </td>
                    <td className="px-4 py-2 text-caption text-whitex-muted">
                      {p.last_practiced_at ? formatUaeDateTime(p.last_practiced_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-h3 font-semibold text-white">
          Achievements ({achievements.length})
        </h2>
        {achievements.length === 0 ? (
          <p className="rounded-2xl border border-midnight-line bg-midnight-elevated p-6 text-caption text-whitex-muted">
            None yet.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {achievements.map(a => (
              <li
                key={a.achievement_id}
                className="flex items-start justify-between rounded-xl border border-midnight-line bg-midnight-elevated px-4 py-3"
              >
                <div>
                  <div className="text-caption font-semibold text-white">
                    {a.achievements.name}
                  </div>
                  <div className="text-micro uppercase tracking-wider text-whitex-faint">
                    {a.achievements.scope.replace('_', ' ')} · {a.achievements.code}
                  </div>
                </div>
                <div className="text-micro text-whitex-muted">
                  {formatUaeDateTime(a.unlocked_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-h3 font-semibold text-white">
          Admin actions log ({actions.length})
        </h2>
        {actions.length === 0 ? (
          <p className="rounded-2xl border border-midnight-line bg-midnight-elevated p-6 text-caption text-whitex-muted">
            No admin actions on this user.
          </p>
        ) : (
          <ul className="space-y-2">
            {actions.map(act => (
              <li
                key={act.id}
                className="rounded-xl border border-midnight-line bg-midnight-elevated p-4 text-caption text-whitex-soft"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-midnight-base px-2 py-0.5 text-micro uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
                    {act.action_type}
                  </span>
                  <span className="text-micro text-whitex-faint">
                    {formatUaeDateTime(act.created_at)}
                  </span>
                </div>
                {act.reason ? <p className="mt-2 italic text-whitex-muted">"{act.reason}"</p> : null}
                {act.payload && Object.keys(act.payload).length > 0 ? (
                  <pre className="mt-2 overflow-x-auto rounded bg-midnight-base px-2 py-1 text-micro text-whitex-faint">
                    {JSON.stringify(act.payload, null, 2)}
                  </pre>
                ) : null}
                <p className="mt-1 text-micro text-whitex-faint">
                  by @{act.users?.username ?? 'unknown'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-midnight-line bg-midnight-elevated px-4 py-3">
      <div className="text-micro uppercase tracking-[0.18em] text-whitex-faint">{label}</div>
      <div className="mt-1 font-mono text-h3 font-bold text-white tabular-nums">{value}</div>
    </div>
  )
}
