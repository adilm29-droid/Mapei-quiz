import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout, EMAIL_GRADIENT, HeroHeadline, P, PMuted, GradientButton } from './_layout'

interface QuizAssignedProps {
  first_name: string
  level: string
  due_date?: string | null
  login_url?: string
}

export default function QuizAssigned({
  first_name,
  level,
  due_date,
  login_url = '/',
}: QuizAssignedProps) {
  return (
    <EmailLayout
      preview={`A new ${level} quiz is waiting for you`}
      headerStyle={{ background: EMAIL_GRADIENT.aurora }}
    >
      <HeroHeadline>New Quiz Assignment</HeroHeadline>
      <P>
        Hi <strong>{first_name}</strong>,
      </P>
      <P>You have been assigned a new quiz:</P>

      <Section
        style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderLeft: '4px solid #06B6D4',
          borderRadius: 8,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <Text style={{ fontWeight: 700, color: '#111827', fontSize: 16, margin: 0 }}>
          {level} Level Quiz
        </Text>
        {due_date ? (
          <Text style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
            Due by: {due_date}
          </Text>
        ) : null}
      </Section>

      <GradientButton href={login_url} gradient="aurora">
        Take quiz →
      </GradientButton>
      <PMuted>Log in to the platform to complete your assignment.</PMuted>
    </EmailLayout>
  )
}
