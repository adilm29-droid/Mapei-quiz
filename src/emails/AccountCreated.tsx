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
  /**
   * `true` when this email is fired after a self-signup (status='pending').
   * The copy adjusts to say the account is awaiting admin approval and
   * suppresses the sign-in CTA until activation.
   */
  is_pending?: boolean
}

export default function AccountCreated({
  first_name,
  username,
  temp_password,
  login_url,
  is_pending = false,
}: AccountCreatedProps) {
  return (
    <EmailLayout
      preview={
        is_pending
          ? 'Your Lapiz Blue Quiz registration — pending approval'
          : 'Your Lapiz Blue Quiz account is ready'
      }
      headerStyle={{ background: EMAIL_GRADIENT.aurora }}
    >
      <HeroHeadline emoji={is_pending ? '⏳' : '🎉'}>
        {is_pending ? 'Registration received' : 'Welcome aboard'}
      </HeroHeadline>
      <P>
        Hi <strong>{first_name}</strong>,
      </P>
      {is_pending ? (
        <>
          <P>
            Thanks for signing up to Lapiz Blue Quiz. Your account has been created with the
            credentials below — keep them safe.
          </P>
          <CredentialsBlock username={username} password={temp_password} />
          <P>
            Your account is <strong>pending admin approval</strong>. You&apos;ll get a second
            email confirming activation, after which you can sign in with the credentials above.
          </P>
          <PMuted>
            Save these credentials. The password will not be sent again. After activation we
            recommend changing it on your first sign-in.
          </PMuted>
        </>
      ) : (
        <>
          <P>
            Your Lapiz Blue Quiz account is ready. Use the credentials below to sign in. We
            strongly recommend changing your password after your first login.
          </P>
          <CredentialsBlock username={username} password={temp_password} />
          <GradientButton href={login_url} gradient="aurora">
            Sign in →
          </GradientButton>
          <PMuted>
            If the button doesn&apos;t work, paste this link into your browser:
            <br />
            <span style={{ color: '#6b7280', wordBreak: 'break-all' }}>{login_url}</span>
          </PMuted>
        </>
      )}
    </EmailLayout>
  )
}
