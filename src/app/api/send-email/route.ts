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
