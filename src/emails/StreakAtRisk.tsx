import * as React from 'react'
import { Text } from '@react-email/components'
import { EmailLayout, EMAIL_GRADIENT, HeroHeadline, P, PMuted, GradientButton } from './_layout'

interface StreakAtRiskProps {
  first_name: string
  streak_days: number
  hours_left: number
  has_freeze: boolean
  freeze_count: number
  quiz_url: string
}

export default function StreakAtRisk({
  first_name,
  streak_days,
  hours_left,
  has_freeze,
  freeze_count,
  quiz_url,
}: StreakAtRiskProps) {
  return (
    <EmailLayout
      preview={`Don't lose your ${streak_days}-day streak`}
      headerStyle={{ background: EMAIL_GRADIENT.sunset }}
    >
      <HeroHeadline emoji="🔥">Don't lose your streak</HeroHeadline>
      <P>
        Hi <strong>{first_name}</strong>,
      </P>
      <P>You haven't taken a quiz today. Your streak is at risk.</P>

      <div
        style={{
          background: 'linear-gradient(135deg, rgba(236,72,153,0.08), rgba(249,115,22,0.06))',
          border: '1px solid rgba(236,72,153,0.2)',
          borderRadius: 14,
          padding: '24px 20px',
          textAlign: 'center',
          marginBottom: 22,
        }}
      >
        <Text
          style={{
            margin: 0,
            fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace',
            fontSize: 56,
            fontWeight: 800,
            color: '#EC4899',
            lineHeight: '60px',
          }}
        >
          {streak_days}
        </Text>
        <Text style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>days · {hours_left}h left</Text>
      </div>

      {has_freeze && (
        <Text
          style={{
            margin: '0 0 16px',
            fontSize: 13,
            color: '#6b7280',
            background: '#f3f4f6',
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
          }}
        >
          ❄️ You have <strong>{freeze_count}</strong> streak{' '}
          {freeze_count === 1 ? 'freeze' : 'freezes'} stored — they'll auto-cover one missed day.
        </Text>
      )}

      <GradientButton href={quiz_url} gradient="sunset">
        Take a quick quiz →
      </GradientButton>
      <PMuted>One quiz takes ~10 minutes. Keep the streak alive.</PMuted>
    </EmailLayout>
  )
}
