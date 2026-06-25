import type { Metadata } from 'next'
import { Bebas_Neue, DM_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'sonner'

const display = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-display' })
const body = DM_Sans({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'RunChallenge — Thử thách chạy bộ',
  description: 'Tham gia thử thách chạy bộ cộng đồng, kết nối Strava và theo dõi tiến trình của nhóm bạn.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${body.variable}`}>
      <body className="bg-zinc-950 text-zinc-100 font-body antialiased">
        <Providers>
          {children}
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{ style: { background: '#18181b', border: '1px solid #3f3f46', color: '#f4f4f5' } }}
          />
        </Providers>
      </body>
    </html>
  )
}
