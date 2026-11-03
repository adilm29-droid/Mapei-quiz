import * as React from 'react'
import { EmailLayout, EMAIL_GRADIENT, GradientButton, HeroHeadline, P } from './_layout'

interface HrSurveySubmittedProps {
  respondent_name: string
  assessed_name: string
  survey_type: 'A' | 'B'
  admin_url: string
}

export default function HrSurveySubmitted({ respondent_name, assessed_name, survey_type, admin_url }: HrSurveySubmittedProps) {
  const role = survey_type === 'A' ? 'their manager / HOD' : 'their team member'
  return (
    <EmailLayout
      preview={`${respondent_name} has rated ${assessed_name}`}
      headerStyle={{ background: EMAIL_GRADIENT.plasma }}
    >
      <HeroHeadline>HR survey submitted</HeroHeadline>
      <P>
        <strong>{respondent_name}</strong> has completed the HR feedback survey and rated {role},{' '}
        <strong>{assessed_name}</strong>.
      </P>
      <GradientButton href={admin_url} gradient="plasma">
        Open HR Survey admin
      </GradientButton>
    </EmailLayout>
  )
}
