import './globals.css'

export const metadata = {
  title: 'Mapei Quiz',
  description: 'Internal training quiz for Mapei staff',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
