import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './survey.css'

// Display: Fraunces (variable: opsz, wght, SOFT, WONK) for a rounded, friendly serif
const fraunces = localFont({
  src: '../../fonts/fraunces.woff2',
  weight: '100 900',
  variable: '--font-fraunces',
  display: 'swap',
})

// UI text
const figtree = localFont({
  src: '../../fonts/figtree.woff2',
  weight: '300 900',
  variable: '--font-figtree',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Colleague Feedback Survey · LapizBlue HR',
  description: 'Digital Colleague Feedback Survey for LapizBlue staff',
}

export const viewport: Viewport = { themeColor: '#FBF3E8' }

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return <div className={`hr ${fraunces.variable} ${figtree.variable}`}>{children}</div>
}
