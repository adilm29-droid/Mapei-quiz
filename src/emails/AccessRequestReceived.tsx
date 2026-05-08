import * as React from 'react'
import { Section } from '@react-email/components'
import {
  EmailLayout,
  EMAIL_GRADIENT,
  HeroHeadline,
  P,
  PMuted,
  KeyValueRow,
} from './_layout'

interface AccessRequestReceivedProps {
  user_name: string
  username: string
  quiz_title: string
  attempts_used: number
  approve_url: string
  reject_url: string
}

export default function AccessRequestReceived({
  user_name,
  username,
  quiz_title,
  attempts_used,
  approve_url,
  reject_url,
}: AccessRequestReceivedProps) {
  return (
    <EmailLayout
      preview={`${user_name} is requesting another attempt`}
      headerStyle={{ background: EMAIL_GRADIENT.aurora }}
    >
      <HeroHeadline>Access request</HeroHeadline>
      <P>
        <strong>{user_name}</strong> has used both attempts on a quiz and is asking for a third.
      </P>

      <Section
        style={{
          background: '#f9fafb',
          borderRadius: 10,
          padding: '4px 0',
          marginBottom: 20,
        }}
      >
        <KeyValueRow label="User" value={`${user_name} (@${username})`} />
        <KeyValueRow label="Quiz" value={quiz_title} />
        <KeyValueRow label="Attempts used" value={`${attempts_used} of 2`} isLast />
      </Section>

      <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 16 }}>
        <tbody>
          <tr>
            <td align="center" style={{ padding: '0 6px 0 0' }}>
              <a
                href={approve_url}
                style={{
                  display: 'block',
                  background: '#16a34a',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 15,
                  padding: '14px 8px',
                  borderRadius: 10,
                  letterSpacing: 0.4,
                }}
              >
                ✓ APPROVE
              </a>
            </td>
            <td align="center" style={{ padding: '0 0 0 6px' }}>
              <a
                href={reject_url}
                style={{
                  display: 'block',
                  background: '#dc2626',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 15,
                  padding: '14px 8px',
                  borderRadius: 10,
                  letterSpacing: 0.4,
                }}
              >
                ✕ DENY
              </a>
            </td>
          </tr>
        </tbody>
      </table>
      <PMuted>One click — they'll be notified by email of your decision automatically.</PMuted>
    </EmailLayout>
  )
}
