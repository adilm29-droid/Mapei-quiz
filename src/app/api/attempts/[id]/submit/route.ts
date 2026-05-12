import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { computeScore } from '@/lib/scoring'
import { applyStreak } from '@/lib/streaks'
import { computeXpAward } from '@/lib/xp'
import { evaluateBadges } from '@/lib/badges'
import { originalLetterToSlot } from '@/lib/quiz-engine'
import { getLeaderboardAttempt } from '@/lib/quiz/attempt-gate'
import { gatherFacts, grantAchievements, bumpPracticeCounter } from '@/lib/achievements/grant'
import type {
  AnswerLetter,
  AnswersMap,
  AttemptResultForClient,
  OptionOrdersMap,
  QuestionRow,
} from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/attempts/[id]/submit
 *
 * The orchestrator. Single source of truth for everything that happens at
 * quiz completion: scoring, XP award, streak update, badge eval, DB writes.
 * Returns a complete AttemptResultForClient payload that the results screen
 * uses to drive the orchestrated reveal animation.
 *
 * Idempotent — if the attempt is already submitted, returns the previously
 * computed payload without re-applying XP / streak / badges.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireSession()
  if (guard instanceof NextResponse) return guard
  const session = guard
  const { id } = await context.params

  // Optional submit body — currently the only field is `claim`, which the
  // client passes when it believed at start time that this attempt would
  // become the leaderboard attempt. If the gate disagrees at submit time
  // (parallel session got there first), we return 409 so the client can
  // re-route the user to a "this counted as practice" results screen.
  let claim: 'leaderboard' | 'practice' | null = null
  try {
    const body = await _request.clone().json().catch(() => null)
    if (body && (body.claim === 'leaderboard' || body.claim === 'practice')) {
      claim = body.claim
    }
  } catch {
    /* no body — that's fine, claim stays null */
  }

  const supabase = getSupabaseAdmin()

  // 1. Fetch the attempt
  const { data: attempt, error: aErr } = await supabase
    .from('attempts')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.userId)
    .maybeSingle()
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })
  if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })

  // 2. Already submitted? Return the cached result by recomputing the per-question breakdown.
  if (attempt.submitted_at && attempt.is_complete) {
    const cached = await buildCachedResult(supabase, attempt)
    return NextResponse.json(cached)
  }

  if (attempt.is_incomplete) {
    return NextResponse.json({ error: 'This attempt expired and cannot be submitted' }, { status: 410 })
  }

  // ── Attempt-1 / leaderboard gate per CLAUDE_CODE_PROMPT.md §4 ────────
  // Decide whether this submit becomes the user's leaderboard attempt.
  // - No existing leaderboard attempt → this submit becomes it.
  // - Existing LB attempt is THIS attempt → idempotent re-submit (covered above).
  // - Existing LB attempt is a different attempt → this is a practice run.
  const existingLb = await getLeaderboardAttempt(supabase, session.userId, attempt.quiz_id)
  const isLeaderboard = !existingLb || existingLb.id === attempt.id

  // Race detection: client started this expecting to be the leaderboard
  // attempt, but a parallel tab beat them to the slot. Reject before
  // mutating state.
  if (claim === 'leaderboard' && !isLeaderboard) {
    return NextResponse.json(
      { error: 'leaderboard_attempt_exists' },
      { status: 409 },
    )
  }

  // 3. Fetch all questions for the quiz (single round-trip)
  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select(
      'id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, category, difficulty, points, order_index, created_at',
    )
    .eq('quiz_id', attempt.quiz_id)
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })
  if (!questions || questions.length === 0)
    return NextResponse.json({ error: 'No questions for this quiz' }, { status: 500 })

  const questionsById = new Map<string, QuestionRow>(
    (questions as QuestionRow[]).map(q => [q.id, q]),
  )
  const questionsInOrder: QuestionRow[] = (attempt.question_order as string[])
    .map(id => questionsById.get(id))
    .filter((q): q is QuestionRow => !!q)

  // 4. Authoritative server-side scoring
  const answers: AnswersMap = (attempt.answers ?? {}) as AnswersMap
  const breakdown = computeScore(questionsInOrder, answers)

  // 5. Persist final_score + flags. xp_awarded gets backfilled in a
  //    second UPDATE after XP is computed below — kept separate to avoid
  //    re-ordering the rest of the orchestration.
  const submittedAt = new Date().toISOString()
  const startedAtMs = new Date(attempt.started_at).getTime()
  const submittedAtMs = new Date(submittedAt).getTime()
  const timeTakenSeconds = Math.max(0, Math.round((submittedAtMs - startedAtMs) / 1000))

  // Best-effort capture of client IP + UA for the admin audit PDF.
  const fwd = _request.headers.get('x-forwarded-for')
  const ip = fwd ? fwd.split(',')[0]!.trim() : (_request.headers.get('x-real-ip') ?? null)
  const ua = _request.headers.get('user-agent') ?? null

  const { error: updateAttemptErr } = await supabase
    .from('attempts')
    .update({
      final_score: breakdown.finalScore,
      is_complete: true,
      submitted_at: submittedAt,
      is_leaderboard_attempt: isLeaderboard,
      time_taken_seconds: timeTakenSeconds,
      ip_address: ip,
      user_agent: ua,
      // xp_awarded stays 0 for practice; backfilled later for leaderboard
    })
    .eq('id', attempt.id)
  if (updateAttemptErr) {
    console.error('[attempts/submit] update error:', updateAttemptErr)
    return NextResponse.json({ error: updateAttemptErr.message }, { status: 500 })
  }

  // 6. Fetch user — needed by both the leaderboard and practice paths
  //    (practice still surfaces the user's current streak in the result UI).
  const { data: user, error: uErr } = await supabase
    .from('users')
    .select(
      'id, xp, level, title, current_streak, longest_streak, streak_freezes, last_quiz_date, email, first_name, last_name, username',
    )
    .eq('id', session.userId)
    .maybeSingle()
  if (uErr || !user) return NextResponse.json({ error: 'User row missing' }, { status: 500 })

  // Build the per-question breakdown once — both paths need it.
  const optionOrders = attempt.option_orders as OptionOrdersMap
  void optionOrders
  const buildPerQuestion = (): AttemptResultForClient['perQuestion'] =>
    questionsInOrder.map(q => {
      const yourLetter: AnswerLetter | null = (answers[q.id] as AnswerLetter) ?? null
      const lookup = (l: AnswerLetter) =>
        l === 'A' ? q.option_a :
        l === 'B' ? q.option_b :
        l === 'C' ? q.option_c :
        q.option_d
      return {
        questionId: q.id,
        question_text: q.question_text,
        yourAnswer: yourLetter,
        yourAnswerText: yourLetter ? lookup(yourLetter) : null,
        correctAnswer: q.correct_answer,
        correctAnswerText: lookup(q.correct_answer),
        isCorrect: yourLetter === q.correct_answer,
        explanation: q.explanation,
      }
    })

  // ── Practice path — per CLAUDE_CODE_PROMPT.md §4 + §11 ─────────────
  // Practice attempts:
  //   - do NOT touch users.xp / streak / level / title
  //   - do NOT trigger legacy badge eval (kept dormant on this path)
  //   - DO bump practice_counters (counts + UAE date)
  //   - DO re-evaluate practice-count + Daily Driver / Repeat Offender
  //     achievements via gatherFacts(isLeaderboardAttempt=false)
  //   - do NOT fire engagement emails (no completion email, no
  //     score_beaten — those are leaderboard-scoped notifications)
  if (!isLeaderboard) {
    try {
      await bumpPracticeCounter(supabase, session.userId, attempt.quiz_id)
    } catch (e) {
      console.error('[attempts/submit] practice counter bump:', e)
    }
    let practiceAchievements: AttemptResultForClient['newAchievements'] = []
    try {
      const facts = await gatherFacts(supabase, session.userId, attempt.quiz_id, {
        isLeaderboardAttempt: false,
        scorePercent: breakdown.percent,
      })
      const granted = await grantAchievements(supabase, session.userId, facts)
      practiceAchievements = granted.map(g => ({
        id: g.id,
        code: g.code,
        scope: g.scope,
        name: g.name,
        description: g.description,
        icon: g.icon,
        tier_color: g.tier_color,
      }))
    } catch (e) {
      console.error('[attempts/submit] practice achievements:', e)
    }

    const payload: AttemptResultForClient = {
      attemptId: attempt.id,
      totalQuestions: breakdown.totalQuestions,
      finalScore: breakdown.finalScore,
      percent: breakdown.percent,
      perQuestion: buildPerQuestion(),
      xp: {
        delta: 0,
        newXp: user.xp ?? 0,
        leveledUp: false,
        oldLevel: user.level ?? 1,
        newLevel: user.level ?? 1,
        newTitle: user.title ?? '',
      },
      streak: {
        current: user.current_streak ?? 0,
        longest: user.longest_streak ?? 0,
        hitMilestone: null,
        freezeUsed: false,
      },
      newBadges: [],
      newAchievements: practiceAchievements,
      attempt_kind: 'practice',
    }
    return NextResponse.json(payload)
  }

  // 7. Apply streak (UAE-time aware)
  const streakOutcome = applyStreak({
    current_streak: user.current_streak ?? 0,
    longest_streak: user.longest_streak ?? 0,
    streak_freezes: user.streak_freezes ?? 0,
    last_quiz_date: user.last_quiz_date ?? null,
  })

  // 8. First-mover bonus — was this the first LEADERBOARD completion?
  //    Per spec §4: only attempt-1 leaderboard rows count as "completion".
  const { count: priorCompletes } = await supabase
    .from('attempts')
    .select('id', { count: 'exact', head: true })
    .eq('quiz_id', attempt.quiz_id)
    .eq('is_leaderboard_attempt', true)
    .is('deleted_at', null)
    .neq('id', attempt.id)
  const isFirstMover = (priorCompletes ?? 0) === 0

  // 9. Compute XP award
  const xp = computeXpAward({
    oldXp: user.xp ?? 0,
    correctCount: breakdown.correctCount,
    totalQuestions: breakdown.totalQuestions,
    isFirstMover,
    hitStreakMilestone: streakOutcome.hitMilestone,
  })

  // 10. Persist user gamification fields
  const { error: userUpdateErr } = await supabase
    .from('users')
    .update({
      xp: xp.newXp,
      level: xp.newLevel,
      title: xp.newTitle,
      current_streak: streakOutcome.current_streak,
      longest_streak: streakOutcome.longest_streak,
      streak_freezes: streakOutcome.streak_freezes,
      last_quiz_date: streakOutcome.last_quiz_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.userId)
  if (userUpdateErr) console.error('[attempts/submit] user update:', userUpdateErr)

  // 10b. Backfill xp_awarded on the attempt row now that XP delta is known.
  const { error: xpAwardErr } = await supabase
    .from('attempts')
    .update({ xp_awarded: xp.delta })
    .eq('id', attempt.id)
  if (xpAwardErr) console.error('[attempts/submit] xp_awarded backfill:', xpAwardErr)

  // 11. Badge evaluation
  const { data: priorAttempts } = await supabase
    .from('attempts')
    .select('id, final_score, attempt_number, quiz_id')
    .eq('user_id', session.userId)
    .eq('is_complete', true)
    .neq('id', attempt.id)

  const completedAttemptsBefore = (priorAttempts ?? []).length
  const previousAttemptForQuiz =
    (priorAttempts ?? []).find((a: any) => a.quiz_id === attempt.quiz_id) || null

  const { data: existingBadges } = await supabase
    .from('user_badges')
    .select('badges(code)')
    .eq('user_id', session.userId)
  const alreadyEarnedCodes = new Set<string>(
    (existingBadges ?? [])
      .map((row: any) => row.badges?.code)
      .filter(Boolean) as string[],
  )

  const newBadges = await evaluateBadges({
    supabase,
    userId: session.userId,
    attempt: {
      id: attempt.id,
      quiz_id: attempt.quiz_id,
      attempt_number: attempt.attempt_number,
      started_at: attempt.started_at,
      submitted_at: submittedAt,
      final_score: breakdown.finalScore,
      max_score: breakdown.maxScore,
      correctCount: breakdown.correctCount,
      totalQuestions: breakdown.totalQuestions,
    },
    streak: { current_streak: streakOutcome.current_streak },
    alreadyEarnedCodes,
    completedAttemptsBefore,
    previousAttemptForQuiz: previousAttemptForQuiz
      ? { final_score: previousAttemptForQuiz.final_score ?? 0 }
      : null,
  })

  // 11b. New (v2) achievements engine — runs alongside legacy badges.
  //      Pure evaluator + idempotent grant. Errors here do not fail the
  //      submit; the legacy badges payload still ships.
  let newAchievementsForClient: AttemptResultForClient['newAchievements'] = []
  try {
    const facts = await gatherFacts(supabase, session.userId, attempt.quiz_id, {
      isLeaderboardAttempt: isLeaderboard,
      scorePercent: breakdown.percent,
    })
    const granted = await grantAchievements(supabase, session.userId, facts)
    newAchievementsForClient = granted.map(g => ({
      id: g.id,
      code: g.code,
      scope: g.scope,
      name: g.name,
      description: g.description,
      icon: g.icon,
      tier_color: g.tier_color,
    }))
  } catch (e) {
    console.error('[attempts/submit] achievements engine error (non-fatal):', e)
  }

  // 12. Per-question breakdown for the review screen — uses the helper
  //     defined alongside the practice path so both share one mapping.
  const perQuestion = buildPerQuestion()

  const payload: AttemptResultForClient = {
    attemptId: attempt.id,
    totalQuestions: breakdown.totalQuestions,
    finalScore: breakdown.finalScore,
    percent: breakdown.percent,
    perQuestion,
    xp: {
      delta: xp.delta,
      newXp: xp.newXp,
      leveledUp: xp.leveledUp,
      oldLevel: xp.oldLevel,
      newLevel: xp.newLevel,
      newTitle: xp.newTitle,
    },
    streak: {
      current: streakOutcome.current_streak,
      longest: streakOutcome.longest_streak,
      hitMilestone: streakOutcome.hitMilestone,
      freezeUsed: streakOutcome.freezeConsumed,
    },
    newBadges: newBadges.map(b => ({
      code: b.code,
      name: b.name,
      description: b.description,
      gradient: b.gradient,
    })),
    newAchievements: newAchievementsForClient,
    attempt_kind: isLeaderboard ? 'leaderboard' : 'practice',
  }

  // 13. Fire engagement emails (fire-and-forget — don't block the response)
  await fireEngagementEmails({
    supabase,
    request: _request,
    userId: session.userId,
    user,
    attempt,
    finalScore: breakdown.finalScore,
    maxScore: breakdown.maxScore,
    percent: breakdown.percent,
    xpDelta: xp.delta,
    streakCurrent: streakOutcome.current_streak,
    newBadgesCount: newBadges.length,
    questionsTitleQuizId: attempt.quiz_id,
  }).catch(e => console.error('[attempts/submit] engagement emails:', e))

  return NextResponse.json(payload)
}

/**
 * Fires "quiz_completed" to the user themselves and "score_beaten" to anyone
 * whose previous best on this quiz was just surpassed by this attempt.
 * Both are throttled / scoped via email_log so re-submits don't double-send.
 */
async function fireEngagementEmails(args: {
  supabase: any
  request: Request
  userId: string
  user: any
  attempt: any
  finalScore: number
  maxScore: number
  percent: number
  xpDelta: number
  streakCurrent: number
  newBadgesCount: number
  questionsTitleQuizId: string
}) {
  const { supabase, request, userId, user, attempt, finalScore, maxScore, percent, xpDelta, streakCurrent, newBadgesCount } = args
  const origin = new URL(request.url).origin

  // Quiz row for the title in the emails
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, title')
    .eq('id', attempt.quiz_id)
    .maybeSingle()
  if (!quiz) return

  // Idempotency check — if we already sent quiz_completed for this attempt, skip
  const { count: alreadySent } = await supabase
    .from('email_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'quiz_completed')
    .filter('payload->>attempt_id', 'eq', attempt.id)
  if ((alreadySent ?? 0) > 0) return

  // Compute the user's current rank on this quiz (best-score-so-far)
  // — the leaderboard might not be visible yet, but we can show "rank so far"
  // LB-only: practice attempts are not on the leaderboard, so they don't
  // affect rank-so-far or trigger score_beaten notifications.
  const { data: bestScores } = await supabase
    .from('attempts')
    .select('user_id, final_score, submitted_at')
    .eq('quiz_id', attempt.quiz_id)
    .eq('is_leaderboard_attempt', true)
    .is('deleted_at', null)
    .order('final_score', { ascending: false })
    .order('submitted_at', { ascending: true })

  // Group: best score per user
  const bestByUser = new Map<string, { score: number; submitted_at: string }>()
  for (const a of bestScores ?? []) {
    const prev = bestByUser.get(a.user_id)
    if (!prev || a.final_score > prev.score) {
      bestByUser.set(a.user_id, { score: a.final_score ?? 0, submitted_at: a.submitted_at })
    }
  }
  const ranking = Array.from(bestByUser.entries())
    .map(([uid, v]) => ({ uid, ...v }))
    .sort((a, b) => b.score - a.score || (a.submitted_at < b.submitted_at ? -1 : 1))
  const rankSoFar = ranking.findIndex(r => r.uid === userId) + 1
  const totalSoFar = ranking.length

  // ── Email 1: Quiz Completed → user themselves ──────────────────────
  try {
    await fetch(`${origin}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'quiz_completed',
        data: {
          email: user.email ?? null,
          first_name: user.first_name || user.username || '',
          quiz_title: quiz.title,
          final_score: finalScore,
          max_score: maxScore,
          percent,
          rank_so_far: rankSoFar > 0 ? rankSoFar : null,
          total_attempts_so_far: totalSoFar,
          xp_earned: xpDelta,
          new_badges_count: newBadgesCount,
          current_streak: streakCurrent,
          review_url: `${origin}/quiz/${attempt.quiz_id}/review?attempt=${attempt.id}`,
          pdf_url: `${origin}/api/quiz/${attempt.id}/pdf?variant=user`,
          // Passed to send-email which renders + attaches the user PDF.
          attempt_id: attempt.id,
        },
      }),
    }).catch(() => {})
    await supabase.from('email_log').insert({
      user_id: userId,
      type: 'quiz_completed',
      payload: { attempt_id: attempt.id, quiz_id: attempt.quiz_id },
    })
  } catch (e) {
    console.error('[engagement] quiz_completed email error:', e)
  }

  // ── Email 2: Score Beaten → anyone we just leapfrogged ─────────────
  // Find users whose previous best (excluding this attempt) was strictly less
  // than the current user's new score, AND whose previous best was strictly
  // greater than the current user's previous best on this quiz.
  // (i.e. users who had been ahead of the current user.)
  const { data: priorOfThisUser } = await supabase
    .from('attempts')
    .select('final_score')
    .eq('user_id', userId)
    .eq('quiz_id', attempt.quiz_id)
    .eq('is_leaderboard_attempt', true)
    .is('deleted_at', null)
    .neq('id', attempt.id)
  const priorBestOfMine = (priorOfThisUser ?? []).reduce(
    (m: number, a: any) => Math.max(m, a.final_score ?? 0),
    0,
  )

  // Find rivals whose best > priorBestOfMine AND best < finalScore
  const beatenUserIds: string[] = []
  for (const [uid, v] of bestByUser.entries()) {
    if (uid === userId) continue
    if (v.score > priorBestOfMine && v.score < finalScore) {
      beatenUserIds.push(uid)
    }
  }
  if (beatenUserIds.length === 0) return

  const { data: rivals } = await supabase
    .from('users')
    .select('id, email, first_name, username')
    .in('id', beatenUserIds)

  const myDisplayName =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || `@${user.username}`

  for (const rival of rivals ?? []) {
    // Throttle — don't double-send within 12h for the same quiz to the same user
    const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    const { count: recent } = await supabase
      .from('email_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', rival.id)
      .eq('type', 'score_beaten')
      .filter('payload->>quiz_id', 'eq', attempt.quiz_id)
      .gt('sent_at', cutoff)
    if ((recent ?? 0) > 0) continue

    const rivalScore = bestByUser.get(rival.id)?.score ?? 0
    try {
      await fetch(`${origin}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'score_beaten',
          data: {
            email: rival.email,
            first_name: rival.first_name || rival.username || '',
            rival_name: myDisplayName,
            quiz_title: quiz.title,
            your_score: rivalScore,
            rival_score: finalScore,
            max_score: maxScore,
            quiz_url: `${origin}/quiz/${attempt.quiz_id}`,
          },
        }),
      }).catch(() => {})
      await supabase.from('email_log').insert({
        user_id: rival.id,
        type: 'score_beaten',
        payload: { quiz_id: attempt.quiz_id, beaten_by: userId },
      })
    } catch (e) {
      console.error('[engagement] score_beaten email error:', e)
    }
  }
}

/** Recompute the result payload for an already-submitted attempt (idempotent fetch). */
async function buildCachedResult(supabase: any, attempt: any): Promise<AttemptResultForClient> {
  const { data: questions } = await supabase
    .from('questions')
    .select(
      'id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty, points',
    )
    .eq('quiz_id', attempt.quiz_id)

  const order: string[] = attempt.question_order
  const byId = new Map<string, any>((questions ?? []).map((q: any) => [q.id, q]))
  const inOrder = order.map(id => byId.get(id)).filter(Boolean)

  const answers = (attempt.answers ?? {}) as AnswersMap
  const lookup = (q: any, l: AnswerLetter) =>
    l === 'A' ? q.option_a : l === 'B' ? q.option_b : l === 'C' ? q.option_c : q.option_d

  const perQuestion = inOrder.map((q: any) => {
    const yours = (answers[q.id] as AnswerLetter) ?? null
    return {
      questionId: q.id,
      question_text: q.question_text,
      yourAnswer: yours,
      yourAnswerText: yours ? lookup(q, yours) : null,
      correctAnswer: q.correct_answer,
      correctAnswerText: lookup(q, q.correct_answer),
      isCorrect: yours === q.correct_answer,
      explanation: q.explanation,
    }
  })

  const totalQuestions = inOrder.length
  const finalScore = attempt.final_score ?? 0
  const maxScore = inOrder.reduce((s: number, q: any) => s + (q.points ?? 0), 0)
  const percent = maxScore === 0 ? 0 : Math.round((finalScore / maxScore) * 1000) / 10

  return {
    attemptId: attempt.id,
    totalQuestions,
    finalScore,
    percent,
    perQuestion,
    xp: { delta: 0, newXp: 0, leveledUp: false, oldLevel: 1, newLevel: 1, newTitle: '' },
    streak: { current: 0, longest: 0, hitMilestone: null, freezeUsed: false },
    newBadges: [],
    newAchievements: [],
    attempt_kind: attempt.is_leaderboard_attempt ? 'leaderboard' : 'practice',
  }
}

// Use originalLetterToSlot indirectly to avoid an unused import warning if the
// review UI wants to render slot labels rather than original letters later.
void originalLetterToSlot
