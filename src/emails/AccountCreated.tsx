import * as React from 'react'
import {
  EmailLayout,
  EMAIL_GRADIENT,
  HeroHeadline,
  P,
  PMuted,
  CredentialsBlock,
  GradientButton,
} from './_layout'

interface AccountCreatedProps {
  first_name: string
  username: string
  temp_password: string
  login_url: string
}

export default function AccountCreated({
  first_name,
  username,
  temp_password,
  login_url,
}: AccountCreatedProps) {
  return (
    <EmailLayout
      preview="Your Lapiz Blue Quiz account is ready"
      headerStyle={{ background: EMAIL_GRADIENT.aurora }}
    >
      <HeroHeadline emoji="🎉">Welcome aboard</HeroHeadline>
      <P>
        Hi <strong>{first_name}</strong>,
      </P>
      <P>
        Your Lapiz Blue Quiz account is ready. Use the credentials below to sign in. We strongly
        recommend changing your password after your first login.
      </P>
      <CredentialsBlock username={username} password={temp_password} />
      <GradientButton href={login_url} gradient="aurora">
        Sign in →
      </GradientButton>
      <PMuted>
        If the button doesn't work, paste this link into your browser:
        <br />
        <span style={{ color: '#6b7280', wordBreak: 'break-all' }}>{login_url}</span>
      </PMuted>
    </EmailLayout>
  )
}
