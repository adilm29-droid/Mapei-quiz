import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout, EMAIL_GRADIENT, HeroHeadline, P, PMuted, GradientButton } from './_layout'

interface CertificateEarnedProps {
  first_name: string
  level: string
  score: number
  cert_url?: string
}

export default function CertificateEarned({
  first_name,
  level,
  score,
  cert_url = '/profile',
}: CertificateEarnedProps) {
  return (
    <EmailLayout
      preview={`You earned a ${level} certificate (${score}%)`}
      headerStyle={{ background: EMAIL_GRADIENT.champion }}
    >
      <HeroHeadline emoji="🏆">Certificate Earned</HeroHeadline>
      <P>
        Hi <strong>{first_name}</strong>,
      </P>
      <P>
        Congratulations! You earned a certificate for completing the <strong>{level}</strong> level
        with a score of <strong>{score}%</strong>.
      </P>

      <Section
        style={{
          background: EMAIL_GRADIENT.champion,
          borderRadius: 14,
          padding: 1,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: '#0B1437',
            borderRadius: 13,
            padding: 28,
            textAlign: 'center',
            border: '2px solid rgba(251,191,36,0.4)',
          }}
        >
          <Text style={{ fontSize: 36, margin: '0 0 8px' }}>🏆</Text>
          <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, margin: 0 }}>
            {level} Level Certificate
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '6px 0 0' }}>
            Score: {score}%
          </Text>
        </div>
      </Section>

      <GradientButton href={cert_url} gradient="champion">
        View your trophy →
      </GradientButton>
      <PMuted>Keep up the great work — there's another level waiting.</PMuted>
    </EmailLayout>
  )
}
