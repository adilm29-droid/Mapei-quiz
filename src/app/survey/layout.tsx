import type { Metadata, Viewport } from 'next'
import { Fraunces, Figtree } from 'next/font/google'
import './survey.css'

// Display: Fraunces with its SOFT / WONK axes for a rounded, friendly serif
const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--font-fraunces',
  display: 'swap',
})

// UI text
const figtree = Figtree({
  subsets: ['latin'],
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
