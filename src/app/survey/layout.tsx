import type { Metadata, Viewport } from 'next'
import { Fraunces } from 'next/font/google'
import './survey.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Colleague Feedback Survey · LapizBlue HR',
  description: 'Digital Colleague Feedback Survey for LapizBlue staff',
}

export const viewport: Viewport = { themeColor: '#FBF6F9' }

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return <div className={`hr ${fraunces.variable}`}>{children}</div>
}
