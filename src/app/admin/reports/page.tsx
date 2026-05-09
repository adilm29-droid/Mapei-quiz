import Link from 'next/link'
import { AlertTriangle, Download } from 'lucide-react'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { formatUaeDateTime } from '@/lib/utils/timezone'

export const dynamic = 'force-dynamic'

/**
 * /admin/reports — top-level reports landing.
 *
 * Per CLAUDE_CODE_PROMPT.md §14:
 *   - Inactivity alerts: staff who haven't completed any quiz in 30
 *     days
 *   - Plus aggregate activity rollups: total Attempt 1s, total
 *     practice attempts, achievements unlocked this week
 *   - Export buttons (CSV / Excel) wired to /api/admin/reports/[type]
 */
export default async function ReportsPage() {
  const supabase = getSupabaseAdmin()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Inactive staff — last LB attempt older than 30 days OR none ever
  const { data: rawStaff } = await supabase
    .from('users')
    .select('id, username, email, first_name, last_name, role, last_active_at, created_at')
    .eq('role', 'staff')
    .eq('status', 'approved')
  const staff = (rawStaff ?? []) as any[]

  const userIds = staff.map(u => u.id)
  const lastAttemptByUser = new Map<string, string | null>()
  if (userIds.length > 0) {
    const { data: lastRows } = await supabase
      .from('attempts')
      .select('user_id, submitted_at')
      .in('user_id', userIds)
      .eq('is_leaderboard_attempt', true)
      .is('deleted_at', null)
      .eq('is_complete', true)
      .order('submitted_at', { ascending: false })
    for (const r of (lastRows ?? []) as any[]) {
      if (!lastAttemptByUser.has(r.user_id)) {
        lastAttemptByUser.set(r.user_id, r.submitted_at)
      }
    }
  }

  const inactive = staff
    .map(u => ({
      ...u,
      last_attempt: lastAttemptByUser.get(u.id) ?? null,
    }))
    .filter(u => !u.last_attempt || u.last_attempt < thirtyDaysAgo)

  // Aggregate counts
  const { count: totalLbAttempts } = await supabase
    .from('attempts')
    .select('id', { count: 'exact', head: true })
    .eq('is_leaderboard_attempt', true)
    .is('deleted_at', null)
    .eq('is_complete', true)

  const { data: practiceRows } = await supabase
    .from('practice_counters')
    .select('attempt_count')
  const totalPractice = (practiceRows ?? []).reduce(
    (s: number, r: any) => s + (r.attempt_count ?? 0),
    0,
  )

  const { count: achievementsThisWeek } = await supabase
    .from('user_achievements')
    .select('user_id', { count: 'exact', head: true })
    .gte('unlocked_at', weekAgo)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 font-bold text-white">Reports</h1>
        <p className="mt-1 text-caption text-whitex-muted">
          Activity rollups and inactivity alerts. Exports are CSV/Excel.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Attempt 1s" value={totalLbAttempts ?? 0} />
        <Stat label="Total practice attempts" value={totalPractice} />
        <Stat label="Achievements this week" value={achievementsThisWeek ?? 0} />
        <Stat label="Inactive staff (30d)" value={inactive.length} />
      </section>

      <section className="flex flex-wrap gap-2">
        <a
          href="/api/admin/reports/users.csv"
          className="inline-flex items-center gap-1.5 rounded-lg border border-midnight-line bg-midnight-elevated px-3 py-2 text-caption text-whitex-soft hover:bg-midnight-line"
        >
          <Download className="h-3.5 w-3.5" /> Users CSV
        </a>
        <a
          href="/api/admin/reports/attempts.csv"
          className="inline-flex items-center gap-1.5 rounded-lg border border-midnight-line bg-midnight-elevated px-3 py-2 text-caption text-whitex-soft hover:bg-midnight-line"
        >
          <Download className="h-3.5 w-3.5" /> Attempts CSV (Attempt 1s)
        </a>
        <a
          href="/api/admin/reports/activity.xlsx"
          className="inline-flex items-center gap-1.5 rounded-lg border border-midnight-line bg-midnight-elevated px-3 py-2 text-caption text-whitex-soft hover:bg-midnight-line"
        >
          <Download className="h-3.5 w-3.5" /> Activity workbook (.xlsx)
        </a>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-h3 font-semibold text-white">
          <AlertTriangle className="h-4 w-4 text-amber-300" />
          Inactivity alerts ({inactive.length})
        </h2>
        {inactive.length === 0 ? (
          <p className="rounded-2xl border border-midnight-line bg-midnight-elevated p-6 text-caption text-whitex-muted">
            All approved staff have completed a quiz in the last 30 days. 🎉
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-midnight-line bg-midnight-elevated">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-midnight-line text-micro uppercase tracking-wider text-whitex-faint">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Last leaderboard attempt</th>
                  <th className="px-4 py-2 font-medium">Member since</th>
                </tr>
              </thead>
              <tbody>
                {inactive.map(u => {
                  const fullName =
                    [u.first_name, u.last_name].filter(Boolean).join(' ') ||
                    `@${u.username}`
                  return (
                    <tr key={u.id} className="border-b border-midnight-line/60 last:border-0">
                      <td className="px-4 py-2 text-caption text-whitex-soft">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="hover:text-white hover:underline"
                        >
                          {fullName}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-caption text-whitex-muted">{u.email}</td>
                      <td className="px-4 py-2 text-caption text-whitex-muted">
                        {u.last_attempt ? formatUaeDateTime(u.last_attempt) : 'Never'}
                      </td>
                      <td className="px-4 py-2 text-caption text-whitex-muted">
                        {u.created_at ? formatUaeDateTime(u.created_at) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-midnight-line bg-midnight-elevated px-4 py-3">
      <div className="text-micro uppercase tracking-[0.18em] text-whitex-faint">{label}</div>
      <div className="mt-1 font-mono text-h2 font-bold text-white tabular-nums">{value}</div>
    </div>
  )
}
