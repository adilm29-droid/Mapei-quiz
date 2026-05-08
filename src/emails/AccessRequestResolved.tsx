import * as React from 'react'
import { EmailLayout, EMAIL_GRADIENT, HeroHeadline, P, PMuted, GradientButton } from './_layout'

interface AccessRequestResolvedProps {
  first_name: string
  quiz_title: string
  granted: boolean
  quiz_url: string
}

export default function AccessRequestResolved({
  first_name,
  quiz_title,
  granted,
  quiz_url,
}: AccessRequestResolvedProps) {
  if (granted) {
    return (
      <EmailLayout
        preview="Your request was approved"
        headerStyle={{ background: EMAIL_GRADIENT.aurora }}
      >
        <HeroHeadline emoji="✅">Granted</HeroHeadline>
        <P>
          Hi <strong>{first_name}</strong>,
        </P>
        <P>
          Your request for another attempt on <strong>{quiz_title}</strong> has been approved. You
          have one more shot — make it count.
        </P>
        <GradientButton href={quiz_url} gradient="aurora">
          Take the quiz →
        </GradientButton>
        <PMuted>Good luck.</PMuted>
      </EmailLayout>
    )
  }
  return (
    <EmailLayout
      preview="Your request was reviewed"
      headerStyle={{ background: EMAIL_GRADIENT.ember }}
    >
      <HeroHeadline>Request reviewed</HeroHeadline>
      <P>
        Hi <strong>{first_name}</strong>,
      </P>
      <P>
        Your request for another attempt on <strong>{quiz_title}</strong> wasn't approved this
        time. Don't worry — pick up the next quiz when it goes live.
      </P>
      <PMuted>Questions? Email tarun.s@lapizblue.com</PMuted>
    </EmailLayout>
  )
}
