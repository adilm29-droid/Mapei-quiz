import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout, EMAIL_GRADIENT, HeroHeadline, P, PMuted, GradientButton } from './_layout'

interface ApprovedProps {
  first_name: string
  username: string
  login_url?: string
}

export default function Approved({ first_name, username, login_url = '/' }: ApprovedProps) {
  return (
    <EmailLayout
      preview="Your account has been approved"
      headerStyle={{ background: EMAIL_GRADIENT.spring }}
    >
      <HeroHeadline emoji="🎉">Welcome aboard</HeroHeadline>
      <P>
        Hi <strong>{first_name}</strong>,
      </P>
      <P>
        Great news — your account has been approved. You can now sign in and start your training
        journey.
      </P>

      <Section
        style={{
          background: EMAIL_GRADIENT.aurora,
          borderRadius: 12,
          padding: 20,
          textAlign: 'center',
          marginBottom: 20,
        }}
      >
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0 }}>
          Your Username
        </Text>
        <Text
          style={{
            color: '#ffffff',
            fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace',
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 1,
            margin: '4px 0 0',
          }}
        >
          {username}
        </Text>
      </Section>

      <P>
        <strong>What you can do:</strong>
      </P>
      <ul style={{ color: '#374151', fontSize: 14, lineHeight: '24px', margin: '0 0 20px', paddingLeft: 20 }}>
        <li>Take product knowledge quizzes</li>
        <li>Earn XP and climb the leaderboard</li>
        <li>Earn badges and certificates</li>
        <li>Track your progress with detailed reports</li>
      </ul>

      <GradientButton href={login_url} gradient="spring">
        Sign in →
      </GradientButton>

      <PMuted>Good luck with your training!</PMuted>
    </EmailLayout>
  )
}
