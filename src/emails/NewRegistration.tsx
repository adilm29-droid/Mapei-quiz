import * as React from 'react'
import { Section, Text } from '@react-email/components'
import {
  EmailLayout,
  EMAIL_GRADIENT,
  HeroHeadline,
  P,
  PMuted,
  KeyValueRow,
} from './_layout'

interface NewRegistrationProps {
  first_name: string
  last_name: string
  email: string
  username: string
  approve_url?: string
  reject_url?: string
}

export default function NewRegistration({
  first_name,
  last_name,
  email,
  username,
  approve_url,
  reject_url,
}: NewRegistrationProps) {
  return (
    <EmailLayout
      preview={`New access request from ${first_name} ${last_name}`}
      headerStyle={{ background: EMAIL_GRADIENT.aurora }}
    >
      <HeroHeadline>New Registration Request</HeroHeadline>
      <P>A new user has requested access to the training platform:</P>

      <Section
        style={{
          background: '#f9fafb',
          borderRadius: 10,
          padding: '4px 0',
          marginBottom: 20,
        }}
      >
        <KeyValueRow label="Name" value={`${first_name} ${last_name}`} />
        <KeyValueRow label="Email" value={email} />
        <KeyValueRow label="Username" value={username} isLast />
      </Section>

      {approve_url && reject_url ? (
        <>
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
          <Text style={{ color: '#9ca3af', fontSize: 11, textAlign: 'center', margin: 0 }}>
            One click — no login required. They will get a welcome email automatically if approved.
          </Text>
        </>
      ) : (
        <PMuted>Log in to the admin panel to approve or reject this request.</PMuted>
      )}
    </EmailLayout>
  )
}
