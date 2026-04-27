import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'הפנקס של אייל',
  description: 'יומן אימוני כושר אישי',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
