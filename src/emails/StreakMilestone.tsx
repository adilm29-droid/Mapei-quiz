import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout, EMAIL_GRADIENT, HeroHeadline, P, PMuted, GradientButton } from './_layout'

interface StreakMilestoneProps {
  first_name: string
  streak_days: number
  badge_name: string
  profile_url: string
}

export default function StreakMilestone({
  first_name,
  streak_days,
  badge_name,
  profile_url,
}: StreakMilestoneProps) {
  return (
    <EmailLayout
      preview={`${streak_days}-day streak — legend`}
      headerStyle={{ background: EMAIL_GRADIENT.sunset }}
    >
      <HeroHeadline emoji="🔥">{streak_days} days. Legend.</HeroHeadline>
      <P>
        Hi <strong>{first_name}</strong>,
      </P>
      <P>
        You just hit a <strong>{streak_days}-day streak</strong>. That's serious dedication. A new
        badge is now sitting on your trophy shelf:
      </P>

      <Section
        style={{
          background: EMAIL_GRADIENT.sunset,
          borderRadius: 14,
          padding: 1,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            background: '#0B1437',
            borderRadius: 13,
            padding: 28,
            textAlign: 'center',
          }}
        >
          <Text style={{ fontSize: 36, margin: '0 0 8px' }}>🏆</Text>
          <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, margin: 0 }}>
            {badge_name}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '6px 0 0' }}>
            {streak_days} consecutive days
          </Text>
        </div>
      </Section>

      <GradientButton href={profile_url} gradient="sunset">
        See your trophy →
      </GradientButton>
      <PMuted>Keep showing up. The streak grows from here.</PMuted>
    </EmailLayout>
  )
}
