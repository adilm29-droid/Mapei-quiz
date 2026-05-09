import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Award, BookOpen, BookMarked, CheckCircle, Crown, Compass, Footprints, GraduationCap, Medal, Repeat, Trophy, CalendarCheck, Target } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { GLOBAL_CATALOG, PER_QUIZ_CATALOG, globalId, perQuizId } from '@/lib/achievements/catalog'
import { formatUaeDateTime } from '@/lib/utils/timezone'

export const dynamic = 'force-dynamic'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Footprints,
  Compass,
  Medal,
  Crown,
  GraduationCap,
  CalendarCheck,
  Repeat,
  CheckCircle,
  Award,
  Trophy,
  BookOpen,
  BookMarked,
  Target,
}

const TIER_BG: Record<string, string> = {
  slate: 'from-slate-500 to-slate-700',
  bronze: 'from-amber-700 to-amber-900',
  silver: 'from-slate-300 to-slate-500',
  champion: 'from-amber-300 to-yellow-500',
  spring: 'from-emerald-400 to-cyan-500',
  aurora: 'from-blue-500 to-violet-500',
  plasma: 'from-fuchsia-500 to-pink-500',
  sunset: 'from-pink-500 to-orange-500',
  ember: 'from-red-500 to-orange-500',
}

/**
 * /profile/achievements — full unlocked catalog.
 *
 * Per CLAUDE_CODE_PROMPT.md §7. Reads catalog + user_achievements,
 * displays stacked: globals on top; per-quiz section per actual quiz
 * with Gold/Silver/Bronze/Completed/Master/Practitioner/Trainee in
 * that order. Locked = grayscale + outline; unlocked = full color +
 * glow.
 */
export default async function MyAchievementsPage() {
  const session = await getSession()
  if (!session) redirect('/signin')

  const supabase = getSupabaseAdmin()

  // Load every actual quiz so per-quiz sections render even when the
  // user hasn't unlocked anything yet.
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, title, week_number')
    .eq('type', 'actual')
    .is('deleted_at', null)
    .order('week_number', { ascending: true })

  const { data: rawUa } = await supabase
    .from('user_achievements')
    .select('achievement_id, unlocked_at')
    .eq('user_id', session.userId)
  const unlocked = new Map<string, string>(
    (rawUa ?? []).map((r: any) => [r.achievement_id, r.unlocked_at]),
  )

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-30 border-b border-midnight-line bg-midnight-base/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-caption text-whitex-muted hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Profile
          </Link>
          <span className="text-micro uppercase tracking-[0.3em] text-whitex-faint">
            Achievements
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-5 py-8">
        <section>
          <h2 className="mb-3 text-h3 font-semibold text-white">Lifetime</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {GLOBAL_CATALOG.map(entry => {
              const id = globalId(entry.code)
              const at = unlocked.get(id)
              return (
                <Tile
                  key={id}
                  iconName={entry.icon}
                  name={entry.name}
                  description={entry.description}
                  tier={entry.tier}
                  unlockedAt={at ?? null}
                />
              )
            })}
          </div>
        </section>

        {(quizzes ?? []).map((q: any) => {
          // Render per-quiz tiles in spec §7 order: Gold → Silver → Bronze →
          // Completed → Master → Practitioner → Trainee
          const order = ['gold', 'silver', 'bronze', 'completed', 'master', 'practitioner', 'trainee']
          const sorted = [...PER_QUIZ_CATALOG].sort(
            (a, b) => order.indexOf(a.code) - order.indexOf(b.code),
          )
          return (
            <section key={q.id}>
              <h2 className="mb-3 text-h3 font-semibold text-white">{q.title}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {sorted.map(entry => {
                  const id = perQuizId(q.id, entry.code)
                  const at = unlocked.get(id)
                  return (
                    <Tile
                      key={id}
                      iconName={entry.icon}
                      name={entry.name}
                      description={entry.description}
                      tier={entry.tier}
                      unlockedAt={at ?? null}
                    />
                  )
                })}
              </div>
            </section>
          )
        })}
      </main>
    </div>
  )
}

function Tile({
  iconName,
  name,
  description,
  tier,
  unlockedAt,
}: {
  iconName: string
  name: string
  description: string
  tier: string
  unlockedAt: string | null
}) {
  const Icon = ICON_MAP[iconName] ?? Award
  const tierGradient = TIER_BG[tier] ?? TIER_BG.aurora
  const isUnlocked = !!unlockedAt
  return (
    <div
      title={`${name} — ${description}`}
      className={
        isUnlocked
          ? `flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br ${tierGradient} p-4 text-center text-white shadow-glow-soft ring-1 ring-white/15`
          : 'flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-midnight-line bg-midnight-elevated/30 p-4 text-center opacity-40 grayscale'
      }
    >
      <Icon className="h-7 w-7 drop-shadow" />
      <p className="line-clamp-2 text-micro font-bold uppercase tracking-wider">{name}</p>
      {isUnlocked ? (
        <p className="text-micro font-mono text-white/80">
          {formatUaeDateTime(unlockedAt!).split(' · ')[0]}
        </p>
      ) : null}
    </div>
  )
}
