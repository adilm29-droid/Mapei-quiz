import { NextResponse } from 'next/server'
import Papa from 'papaparse'
import ExcelJS from 'exceljs'
import { requireAdmin } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { formatUaeDateTime } from '@/lib/utils/timezone'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/reports/[type]
 *
 * Per CLAUDE_CODE_PROMPT.md §14. Supports:
 *   users.csv         — every user with stats
 *   attempts.csv      — Attempt 1s only with full audit fields
 *   activity.xlsx     — multi-sheet workbook (Users, Attempts, Practice,
 *                       Achievements, AdminActions)
 *
 * Auth: requireAdmin().
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ type: string }> },
) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard

  const { type } = await context.params
  const supabase = getSupabaseAdmin()

  if (type === 'users.csv') {
    const { data: rows } = await supabase
      .from('users')
      .select(
        'id, username, email, first_name, last_name, role, status, xp, total_xp, level, title, current_streak, longest_streak, completed_quizzes_count, last_quiz_date, last_active_at, created_at',
      )
      .order('created_at', { ascending: true })
    const csv = Papa.unparse(rows ?? [])
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="users-${dateStamp()}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  if (type === 'attempts.csv') {
    const { data: rawAttempts } = await supabase
      .from('attempts')
      .select(
        'id, user_id, quiz_id, attempt_number, started_at, submitted_at, time_taken_seconds, ' +
          'final_score, xp_awarded, ip_address, user_agent, is_leaderboard_attempt, deleted_at, ' +
          'users!inner(username, email, first_name, last_name), quizzes!inner(title, max_score)',
      )
      .eq('is_leaderboard_attempt', true)
      .is('deleted_at', null)
      .eq('is_complete', true)
      .order('submitted_at', { ascending: false })
    const flat = ((rawAttempts ?? []) as any[]).map(a => ({
      attempt_id: a.id,
      user_id: a.user_id,
      username: a.users.username,
      email: a.users.email,
      full_name: [a.users.first_name, a.users.last_name].filter(Boolean).join(' '),
      quiz_id: a.quiz_id,
      quiz_title: a.quizzes.title,
      max_score: a.quizzes.max_score,
      final_score: a.final_score,
      percent: a.quizzes.max_score
        ? Math.round(((a.final_score ?? 0) / a.quizzes.max_score) * 1000) / 10
        : 0,
      time_taken_seconds: a.time_taken_seconds,
      xp_awarded: a.xp_awarded,
      ip_address: a.ip_address,
      user_agent: a.user_agent,
      started_at_uae: a.started_at ? formatUaeDateTime(a.started_at) : '',
      submitted_at_uae: a.submitted_at ? formatUaeDateTime(a.submitted_at) : '',
    }))
    const csv = Papa.unparse(flat)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="attempts-${dateStamp()}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  if (type === 'activity.xlsx') {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Lapiz Blue Quiz'
    wb.created = new Date()

    // Users sheet
    const { data: users } = await supabase
      .from('users')
      .select(
        'id, username, email, first_name, last_name, role, status, xp, total_xp, level, current_streak, longest_streak, completed_quizzes_count, created_at, last_quiz_date',
      )
      .order('created_at', { ascending: true })
    const sUsers = wb.addWorksheet('Users')
    sUsers.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Username', key: 'username', width: 18 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'First name', key: 'first_name', width: 16 },
      { header: 'Last name', key: 'last_name', width: 16 },
      { header: 'Role', key: 'role', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'XP (legacy)', key: 'xp', width: 12 },
      { header: 'Total XP', key: 'total_xp', width: 12 },
      { header: 'Level', key: 'level', width: 8 },
      { header: 'Current streak', key: 'current_streak', width: 14 },
      { header: 'Longest streak', key: 'longest_streak', width: 14 },
      { header: 'Quizzes completed', key: 'completed_quizzes_count', width: 18 },
      { header: 'Created', key: 'created_at', width: 22 },
      { header: 'Last quiz', key: 'last_quiz_date', width: 14 },
    ]
    for (const u of users ?? []) sUsers.addRow(u)
    sUsers.getRow(1).font = { bold: true }

    // Attempts sheet (Attempt 1s)
    const { data: attempts } = await supabase
      .from('attempts')
      .select(
        'id, user_id, quiz_id, started_at, submitted_at, time_taken_seconds, final_score, xp_awarded, ip_address, ' +
          'users!inner(username, email), quizzes!inner(title, max_score)',
      )
      .eq('is_leaderboard_attempt', true)
      .is('deleted_at', null)
      .eq('is_complete', true)
      .order('submitted_at', { ascending: false })
    const sAttempts = wb.addWorksheet('Attempts (LB)')
    sAttempts.columns = [
      { header: 'Attempt ID', key: 'id', width: 36 },
      { header: 'Username', key: 'username', width: 18 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Quiz', key: 'quiz_title', width: 28 },
      { header: 'Score', key: 'final_score', width: 8 },
      { header: 'Max', key: 'max_score', width: 8 },
      { header: 'Percent', key: 'percent', width: 9 },
      { header: 'Time (s)', key: 'time_taken_seconds', width: 9 },
      { header: 'XP', key: 'xp_awarded', width: 7 },
      { header: 'IP', key: 'ip_address', width: 16 },
      { header: 'Submitted (UAE)', key: 'submitted_at_uae', width: 26 },
    ]
    for (const a of (attempts ?? []) as any[]) {
      sAttempts.addRow({
        id: a.id,
        username: a.users.username,
        email: a.users.email,
        quiz_title: a.quizzes.title,
        final_score: a.final_score,
        max_score: a.quizzes.max_score,
        percent:
          a.quizzes.max_score
            ? Math.round(((a.final_score ?? 0) / a.quizzes.max_score) * 1000) / 10
            : 0,
        time_taken_seconds: a.time_taken_seconds,
        xp_awarded: a.xp_awarded,
        ip_address: a.ip_address,
        submitted_at_uae: a.submitted_at ? formatUaeDateTime(a.submitted_at) : '',
      })
    }
    sAttempts.getRow(1).font = { bold: true }

    // Practice sheet
    const { data: practice } = await supabase
      .from('practice_counters')
      .select(
        'user_id, quiz_id, attempt_count, last_practiced_at, users!inner(username, email), quizzes!inner(title)',
      )
      .order('last_practiced_at', { ascending: false })
    const sPractice = wb.addWorksheet('Practice')
    sPractice.columns = [
      { header: 'Username', key: 'username', width: 18 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Quiz', key: 'quiz_title', width: 28 },
      { header: 'Practice count', key: 'attempt_count', width: 14 },
      { header: 'Last practiced (UAE)', key: 'last_practiced_uae', width: 26 },
    ]
    for (const p of (practice ?? []) as any[]) {
      sPractice.addRow({
        username: p.users.username,
        email: p.users.email,
        quiz_title: p.quizzes.title,
        attempt_count: p.attempt_count,
        last_practiced_uae: p.last_practiced_at ? formatUaeDateTime(p.last_practiced_at) : '',
      })
    }
    sPractice.getRow(1).font = { bold: true }

    // Achievements sheet
    const { data: ach } = await supabase
      .from('user_achievements')
      .select(
        'user_id, achievement_id, unlocked_at, users!inner(username), achievements!inner(name, scope)',
      )
      .order('unlocked_at', { ascending: false })
    const sAch = wb.addWorksheet('Achievements')
    sAch.columns = [
      { header: 'Username', key: 'username', width: 18 },
      { header: 'Achievement', key: 'name', width: 28 },
      { header: 'Scope', key: 'scope', width: 12 },
      { header: 'ID', key: 'achievement_id', width: 38 },
      { header: 'Unlocked (UAE)', key: 'unlocked_uae', width: 26 },
    ]
    for (const a of (ach ?? []) as any[]) {
      sAch.addRow({
        username: a.users.username,
        name: a.achievements.name,
        scope: a.achievements.scope,
        achievement_id: a.achievement_id,
        unlocked_uae: a.unlocked_at ? formatUaeDateTime(a.unlocked_at) : '',
      })
    }
    sAch.getRow(1).font = { bold: true }

    // Admin actions sheet
    const { data: actions } = await supabase
      .from('admin_actions')
      .select(
        'id, action_type, payload, reason, created_at, ' +
          'admin:users!admin_actions_admin_user_id_fkey(username), ' +
          'affected:users!admin_actions_affected_user_id_fkey(username)',
      )
      .order('created_at', { ascending: false })
      .limit(2000)
    const sAdmin = wb.addWorksheet('AdminActions')
    sAdmin.columns = [
      { header: 'When (UAE)', key: 'when_uae', width: 26 },
      { header: 'Action', key: 'action_type', width: 18 },
      { header: 'Admin', key: 'admin_username', width: 18 },
      { header: 'Affected user', key: 'affected_username', width: 18 },
      { header: 'Reason', key: 'reason', width: 40 },
      { header: 'Payload', key: 'payload', width: 60 },
    ]
    for (const a of (actions ?? []) as any[]) {
      sAdmin.addRow({
        when_uae: a.created_at ? formatUaeDateTime(a.created_at) : '',
        action_type: a.action_type,
        admin_username: a.admin?.username ?? '',
        affected_username: a.affected?.username ?? '',
        reason: a.reason ?? '',
        payload: JSON.stringify(a.payload ?? {}),
      })
    }
    sAdmin.getRow(1).font = { bold: true }

    const arr = await wb.xlsx.writeBuffer()
    return new NextResponse(new Uint8Array(arr as ArrayBuffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="lapizblue-activity-${dateStamp()}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  return NextResponse.json({ error: `Unknown report type: ${type}` }, { status: 400 })
}

function dateStamp(): string {
  const d = new Date()
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}
