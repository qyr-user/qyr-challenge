import type { Metadata } from 'next'
import { Bebas_Neue, DM_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { Navbar } from './components/ui/Navbar'
import { StravaSessionBanner } from './components/ui/StravaSessionBanner'

const display = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-display' })
const body = DM_Sans({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'QYR — Thử thách chạy bộ',
  description: 'Theo dõi thử thách chạy bộ cùng cộng đồng QYR.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${body.variable}`}>
      <body className="bg-zinc-950 text-zinc-100 font-body antialiased">
        <StravaSessionBanner />
        <Navbar />
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{ style: { background: '#18181b', border: '1px solid #3f3f46', color: '#f4f4f5' } }}
        />
      </body>
    </html>
  )
}
