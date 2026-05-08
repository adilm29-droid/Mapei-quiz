// @ts-nocheck
/**
 * /api/send-email — single transactional-mail entry point.
 *
 * Templates live in src/emails/*.tsx as React Email components. We render
 * them to HTML server-side via @react-email/render and ship via Zoho SMTP.
 *
 * Admin notifications go to ADMIN_EMAIL (defaults to tarun.s@lapizblue.com,
 * overridable via process.env.ADMIN_EMAIL). ZOHO_EMAIL is only the SMTP
 * login user (currently adil@…) and serves as the From address.
 */
import nodemailer from 'nodemailer'
import { render } from '@react-email/render'
import { buildDecisionUrl } from '@/lib/decision-token'

import AccountCreated from '@/emails/AccountCreated'
import NewRegistration from '@/emails/NewRegistration'
import PasswordResetRequest from '@/emails/PasswordResetRequest'
import Approved from '@/emails/Approved'
import QuizAssigned from '@/emails/QuizAssigned'
import CertificateEarned from '@/emails/CertificateEarned'
import LeaderboardLive from '@/emails/LeaderboardLive'
import StreakMilestone from '@/emails/StreakMilestone'
import StreakAtRisk from '@/emails/StreakAtRisk'
import WeeklyRecap from '@/emails/WeeklyRecap'
import AccessRequestReceived from '@/emails/AccessRequestReceived'
import AccessRequestResolved from '@/emails/AccessRequestResolved'
import QuizCompleted from '@/emails/QuizCompleted'
import Top3Finisher from '@/emails/Top3Finisher'
import ScoreBeaten from '@/emails/ScoreBeaten'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'tarun.s@lapizblue.com'

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASSWORD,
  },
})

export async function POST(request) {
  try {
    const { type, data } = await request.json()

    let to
    let subject
    let html

    switch (type) {
      case 'account_created': {
        to = data.email
        subject = 'Welcome to Lapiz Blue Quiz'
        html = await render(
          AccountCreated({
            first_name: data.first_name,
            username: data.username,
            temp_password: data.temp_password,
            login_url: data.login_url,
          }),
        )
        break
      }

      case 'new_registration': {
        to = ADMIN_EMAIL
        subject = `New Registration Request: ${data.first_name} ${data.last_name}`
        let approve_url
        let reject_url
        if (data.user_id && data.origin) {
          approve_url = buildDecisionUrl(data.origin, data.user_id, 'approve')
          reject_url = buildDecisionUrl(data.origin, data.user_id, 'reject')
        }
        html = await render(
          NewRegistration({
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            username: data.username,
            approve_url,
            reject_url,
          }),
        )
        break
      }

      case 'password_reset_request': {
        to = ADMIN_EMAIL
        subject = `Password Reset Request: ${data.identifier}`
        html = await render(
          PasswordResetRequest({
            identifier: data.identifier,
            requested_at_iso: new Date().toISOString(),
          }),
        )
        break
      }

      case 'approved': {
        to = data.email
        subject = 'Welcome to Lapiz Blue Quiz Platform!'
        html = await render(
          Approved({
            first_name: data.first_name,
            username: data.username,
            login_url: data.login_url,
          }),
        )
        break
      }

      case 'quiz_assigned': {
        to = data.email
        subject = `Quiz Assigned: ${data.level} Level`
        html = await render(
          QuizAssigned({
            first_name: data.first_name,
            level: data.level,
            due_date: data.due_date,
            login_url: data.login_url,
          }),
        )
        break
      }

      case 'certificate_earned': {
        to = data.email
        subject = `Congratulations! Certificate Earned: ${data.level}`
        html = await render(
          CertificateEarned({
            first_name: data.first_name,
            level: data.level,
            score: data.score,
            cert_url: data.cert_url,
          }),
        )
        break
      }

      case 'leaderboard_live': {
        to = data.email
        subject = `🏆 Week ${data.week_number} leaderboard is live`
        html = await render(
          LeaderboardLive({
            first_name: data.first_name,
            quiz_title: data.quiz_title,
            week_number: data.week_number,
            podium: data.podium,
            user_rank: data.user_rank,
            leaderboard_url: data.leaderboard_url,
          }),
        )
        break
      }

      case 'streak_milestone': {
        to = data.email
        subject = `🔥 ${data.streak_days}-day streak — new badge unlocked`
        html = await render(
          StreakMilestone({
            first_name: data.first_name,
            streak_days: data.streak_days,
            badge_name: data.badge_name,
            profile_url: data.profile_url,
          }),
        )
        break
      }

      case 'streak_at_risk': {
        to = data.email
        subject = `🔥 Don't lose your ${data.streak_days}-day streak`
        html = await render(
          StreakAtRisk({
            first_name: data.first_name,
            streak_days: data.streak_days,
            hours_left: data.hours_left,
            has_freeze: data.has_freeze,
            freeze_count: data.freeze_count,
            quiz_url: data.quiz_url,
          }),
        )
        break
      }

      case 'weekly_recap': {
        to = data.email
        subject = 'Your week in numbers'
        html = await render(
          WeeklyRecap({
            first_name: data.first_name,
            quizzes_completed: data.quizzes_completed,
            xp_earned: data.xp_earned,
            current_streak: data.current_streak,
            badges_earned_this_week: data.badges_earned_this_week,
            rank_change: data.rank_change,
            home_url: data.home_url,
          }),
        )
        break
      }

      case 'access_request_received': {
        to = ADMIN_EMAIL
        subject = `Access request: ${data.user_name}`
        html = await render(
          AccessRequestReceived({
            user_name: data.user_name,
            username: data.username,
            quiz_title: data.quiz_title,
            attempts_used: data.attempts_used,
            approve_url: data.approve_url,
            reject_url: data.reject_url,
          }),
        )
        break
      }

      case 'access_request_resolved': {
        to = data.email
        subject = data.granted ? 'Your request was approved' : 'Your request was reviewed'
        html = await render(
          AccessRequestResolved({
            first_name: data.first_name,
            quiz_title: data.quiz_title,
            granted: !!data.granted,
            quiz_url: data.quiz_url,
          }),
        )
        break
      }

      case 'quiz_completed': {
        to = data.email
        subject = `${data.percent}% on ${data.quiz_title}`
        html = await render(
          QuizCompleted({
            first_name: data.first_name,
            quiz_title: data.quiz_title,
            final_score: data.final_score,
            max_score: data.max_score,
            percent: data.percent,
            rank_so_far: data.rank_so_far,
            total_attempts_so_far: data.total_attempts_so_far,
            xp_earned: data.xp_earned,
            new_badges_count: data.new_badges_count,
            current_streak: data.current_streak,
            review_url: data.review_url,
          }),
        )
        break
      }

      case 'top3_finisher': {
        to = data.email
        subject = `🏆 You placed #${data.rank} on ${data.quiz_title}`
        html = await render(
          Top3Finisher({
            first_name: data.first_name,
            quiz_title: data.quiz_title,
            rank: data.rank,
            final_score: data.final_score,
            max_score: data.max_score,
            leaderboard_url: data.leaderboard_url,
          }),
        )
        break
      }

      case 'score_beaten': {
        to = data.email
        subject = `⚡ ${data.rival_name} just beat your score`
        html = await render(
          ScoreBeaten({
            first_name: data.first_name,
            rival_name: data.rival_name,
            quiz_title: data.quiz_title,
            your_score: data.your_score,
            rival_score: data.rival_score,
            max_score: data.max_score,
            quiz_url: data.quiz_url,
          }),
        )
        break
      }

      default:
        return Response.json({ error: 'Unknown email type' }, { status: 400 })
    }

    await transporter.sendMail({
      from: `"Lapiz Blue Quiz" <${process.env.ZOHO_EMAIL}>`,
      to,
      subject,
      html,
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('[send-email] error:', error)
    return Response.json({ error: error?.message || 'Email failed' }, { status: 500 })
  }
}
