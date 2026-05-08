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

interface PasswordResetRequestProps {
  identifier: string
  requested_at_iso: string
}

export default function PasswordResetRequest({
  identifier,
  requested_at_iso,
}: PasswordResetRequestProps) {
  const requestedAt = new Date(requested_at_iso).toUTCString()
  return (
    <EmailLayout
      preview={`${identifier} requested a password reset`}
      headerStyle={{ background: EMAIL_GRADIENT.sunset }}
    >
      <HeroHeadline>Password Reset Request</HeroHeadline>
      <P>
        A user has requested a password reset and is waiting for you to issue new credentials.
      </P>

      <Section
        style={{
          background: '#f9fafb',
          borderRadius: 10,
          padding: '4px 0',
          marginBottom: 20,
        }}
      >
        <KeyValueRow label="Username / Email" value={identifier} />
        <KeyValueRow label="Requested at" value={requestedAt} isLast />
      </Section>

      <PMuted>
        <strong>How to reset:</strong>
      </PMuted>
      <ol style={{ color: '#6b7280', fontSize: 13, lineHeight: '20px', margin: '8px 0 16px', paddingLeft: 20 }}>
        <li>Open Supabase SQL editor</li>
        <li>
          Run a one-line UPDATE setting <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>password_hash</code>{' '}
          to a fresh bcrypt hash. The simplest way: use the Reset Password button in the admin panel
          which does this server-side.
        </li>
        <li>Reply to the user with the new password.</li>
      </ol>
    </EmailLayout>
  )
}
