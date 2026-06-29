'use client'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import { Menu, X, Activity, LogOut, Settings, User } from 'lucide-react'
import Image from 'next/image'

export function Navbar() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Image src="/logo.png" alt="Club Logo" width={32} height={32} className="rounded-lg" />
          <span className="font-display text-xl tracking-wider text-zinc-100">
            QuảngYên<span className="text-orange-500">Runner</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-2">
          {session?.user ? (
            <>
              {session.user.role === 'ADMIN' && (
                <Link href="/admin" className="btn-ghost text-sm">
                  <Settings className="w-4 h-4 inline mr-1" />
                  Admin
                </Link>
              )}
              <div className="flex items-center gap-3 ml-2 pl-2 border-l border-zinc-800">
                {session.user.image ? (
                  <Image src={session.user.image} alt={session.user.name || ''} width={32} height={32} className="rounded-full border border-zinc-700" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                    <User className="w-4 h-4 text-zinc-400" />
                  </div>
                )}
                <span className="text-sm text-zinc-300">{session.user.name}</span>
                <button onClick={() => signOut()} className="btn-ghost text-sm">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <Link href="/login" className="btn-primary text-sm">Đăng nhập</Link>
          )}
        </div>

        <button className="md:hidden btn-ghost" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-4 space-y-2">
          {session?.user ? (
            <>
              <div className="flex items-center gap-3 py-2">
                {session.user.image && (
                  <Image src={session.user.image} alt="" width={36} height={36} className="rounded-full" />
                )}
                <div>
                  <p className="text-sm font-medium">{session.user.name}</p>
                  <p className="text-xs text-zinc-500">{session.user.email}</p>
                </div>
              </div>
              {session.user.role === 'ADMIN' && (
                <Link href="/admin" className="block py-2 text-sm text-zinc-300" onClick={() => setOpen(false)}>
                  ⚙️ Admin Dashboard
                </Link>
              )}
              <button onClick={() => signOut()} className="w-full text-left py-2 text-sm text-red-400">
                Đăng xuất
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-primary w-full text-center block" onClick={() => setOpen(false)}>
              Đăng nhập với Strava
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
