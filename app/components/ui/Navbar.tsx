'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Settings } from 'lucide-react'
import Image from 'next/image'

export function Navbar() {
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
          <Link href="/admin" className="btn-ghost text-sm flex items-center gap-1.5">
            <Settings className="w-4 h-4" />
            Admin
          </Link>
        </div>

        <button className="md:hidden btn-ghost" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 py-2 text-sm text-zinc-300"
            onClick={() => setOpen(false)}
          >
            <Settings className="w-4 h-4" />
            Admin Dashboard
          </Link>
        </div>
      )}
    </nav>
  )
}
