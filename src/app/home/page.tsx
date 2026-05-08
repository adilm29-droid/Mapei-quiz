import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { FREE_ATTEMPT_CAP } from '@/lib/quiz-engine'
import { HomeHeader } from './_components/home-header'
import { Podium } from './_components/podium'
import { QuizCta } from './_components/quiz-cta'
import { MistakesRow } from './_components/mistakes-row'
import { BadgesPreview } from './_components/badges-preview'
import { SignOutButton } from '@/app/admin/_components/sign-out-button'
import { LogoFull } from '@/components/brand/LogoFull'

export const dynamic = 'force-dynamic'

/**
 * /home — the post-login landing for staff.
 * Server-component data fetch composes all sections at once. Per DESIGN_SYSTEM
 * §6.2 layout: header → podium → CTA → mistakes → badges.
 */
export default async function HomePage() {
  const session = await getSession()
  if (!session) redirect('/signin')

  const supabase = getSupabaseAdmin()

  // ── 1. Current user ────────────────────────────────────────────────
  const { data: me, error: meErr } = await supabase
    .from('users')
    .select(
      'id,username,email,first_name,last_name,role,status,xp,level,title,current_streak,longest_streak,streak_freezes,active_badge_id,last_quiz_date,avatar_url',
    )
    .eq('id', session.userId)
    .maybeSingle()

  if (meErr || !me) redirect('/signin')
  if (me.status !== 'approved') redirect('/signin')

  // ── 2. Latest unlocked quiz (newest) ───────────────────────────────
  const { data: latestQuiz } = await supabase
    .from('quizzes')
    .select('id, title, week_number, max_score, leaderboard_visible, unlocked_at')
    .eq('is_unlocked', true)
    .is('deleted_at', null)
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  // ── 3. Active attempt? + completion count for cap calc ─────────────
  let activeAttempt:
    | { id: string; expires_at: string; current_question_index: number; total: number }
    | null = null
  let completedCount = 0

  if (latestQuiz) {
    const { data: attempts } = await supabase
      .from('attempts')
      .select(
        'id, expires_at, submitted_at, is_complete, is_incomplete, current_question_index, question_order',
      )
      .eq('user_id', session.userId)
      .eq('quiz_id', latestQuiz.id)

    for (const a of attempts ?? []) {
      if (a.is_complete || a.is_incomplete) completedCount++
      if (
        !a.submitted_at &&
        !a.is_incomplete &&
        new Date(a.expires_at).getTime() > Date.now()
      ) {
        activeAttempt = {
          id: a.id,
          expires_at: a.expires_at,
          current_question_index: a.current_question_index ?? 0,
          total: (a.question_order as string[]).length,
        }
      }
    }
  }

  // ── 4. Top 3 podium for the latest leaderboard-visible quiz ────────
  let podiumQuizId: string | null = null
  let podium: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    score: number
    maxScore: number
  }[] = []
  let attemptsSoFar = 0

  if (latestQuiz) {
    if (latestQuiz.leaderboard_visible) {
      podiumQuizId = latestQuiz.id
    } else {
      // Fallback: any older quiz whose leaderboard IS visible
      const { data: prior } = await supabase
        .from('quizzes')
        .select('id, max_score')
        .eq('leaderboard_visible', true)
        .is('deleted_at', null)
        .order('week_number', { ascending: false })
        .limit(1)
        .maybeSingle()
      podiumQuizId = prior?.id ?? null
    }

    // Count completed attempts for the latest quiz (used for placeholder copy)
    const { count: cc } = await supabase
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', latestQuiz.id)
      .eq('is_complete', true)
    attemptsSoFar = cc ?? 0
  }

  if (podiumQuizId) {
    const { data: top3 } = await supabase
      .from('attempts')
      .select(
        'final_score, submitted_at, user_id, users!inner(id, username, first_name, last_name)',
      )
      .eq('quiz_id', podiumQuizId)
      .eq('is_complete', true)
      .order('final_score', { ascending: false })
      .order('submitted_at', { ascending: true })
      .limit(3)

    podium = (top3 ?? []).map((row: any) => ({
      id: row.users.id,
      username: row.users.username,
      first_name: row.users.first_name,
      last_name: row.users.last_name,
      score: row.final_score ?? 0,
      maxScore: latestQuiz?.max_score ?? 57,
    }))
  }

  // ── 5. Recent mistakes (across all completed attempts, cap 20) ─────
  const { data: completedAttempts } = await supabase
    .from('attempts')
    .select('id, quiz_id, answers, submitted_at')
    .eq('user_id', session.userId)
    .eq('is_complete', true)
    .order('submitted_at', { ascending: false })
    .limit(10)

  const mistakeQuestionIds: { qid: string; userLetter: string; submittedAt: string }[] = []
  for (const a of completedAttempts ?? []) {
    const ans = (a.answers ?? {}) as Record<string, string>
    for (const [qid, letter] of Object.entries(ans)) {
      mistakeQuestionIds.push({ qid, userLetter: letter, submittedAt: a.submitted_at as string })
    }
  }

  // Hydrate question rows in one query
  const uniqQids = Array.from(new Set(mistakeQuestionIds.map(m => m.qid)))
  let mistakes: {
    questionId: string
    question_text: string
    yourAnswerText: string
    correctAnswerText: string
    submittedAt: string
  }[] = []
  if (uniqQids.length > 0) {
    const { data: qRows } = await supabase
      .from('questions')
      .select('id, question_text, option_a, option_b, option_c, option_d, correct_answer')
      .in('id', uniqQids)
    const byId = new Map<string, any>((qRows ?? []).map((q: any) => [q.id, q]))
    const lookup = (q: any, letter: string) =>
      letter === 'A' ? q.option_a :
      letter === 'B' ? q.option_b :
      letter === 'C' ? q.option_c :
      q.option_d

    // Filter for mistakes (user letter !== correct letter)
    const seen = new Set<string>()
    for (const m of mistakeQuestionIds) {
      if (seen.has(m.qid)) continue
      const q = byId.get(m.qid)
      if (!q) continue
      if (m.userLetter === q.correct_answer) continue
      seen.add(m.qid)
      mistakes.push({
        questionId: q.id,
        question_text: q.question_text,
        yourAnswerText: lookup(q, m.userLetter),
        correctAnswerText: lookup(q, q.correct_answer),
        submittedAt: m.submittedAt,
      })
      if (mistakes.length >= 20) break
    }
  }

  // ── 6. Badges (full catalog + earned set) ──────────────────────────
  const { data: catalog } = await supabase
    .from('badges')
    .select('id, code, name, description, icon_name, gradient, category')
    .order('category', { ascending: true })

  const { data: earnedRows } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', session.userId)
  const earnedIds = new Set<string>((earnedRows ?? []).map((r: any) => r.badge_id))
  const badges = (catalog ?? []).map((b: any) => ({
    ...b,
    earned: earnedIds.has(b.id),
  }))

  return (
    <div className="min-h-screen text-whitex-soft">
      <header className="border-b border-midnight-line/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-6 px-5 py-4">
          <LogoFull markClassName="h-7 w-7" wordmarkClassName="h-5" />
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 space-y-8">
        <HomeHeader user={me} />

        <Podium
          users={podium}
          maxScore={latestQuiz?.max_score ?? 57}
          revealed={!!podiumQuizId && podium.length > 0}
          attemptsSoFar={attemptsSoFar}
          isAdmin={me.role === 'admin'}
          currentUserId={me.id}
        />

        <QuizCta
          quiz={latestQuiz}
          activeAttempt={activeAttempt}
          completedCount={completedCount}
          freeCap={FREE_ATTEMPT_CAP}
        />

        <MistakesRow mistakes={mistakes} />

        <BadgesPreview badges={badges} />
      </main>
    </div>
  )
}
