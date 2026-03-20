import './globals.css'

export const metadata = {
  title: 'LapizBlue Staff Quiz',
  description: 'Staff training quiz - Mapei Product Knowledge Assessment',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
