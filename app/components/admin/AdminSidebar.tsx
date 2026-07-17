'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Trophy, Users, UserCheck, BarChart2, RefreshCw, LogOut, Home, Settings } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import Image from 'next/image'
import { toast } from 'sonner'

const navItems = [
  { href: '/admin', label: 'Tổng quan', icon: BarChart2, exact: true },
  { href: '/admin/challenges', label: 'Thử thách', icon: Trophy },
  { href: '/admin/teams', label: 'Nhóm', icon: Users },
  { href: '/admin/members', label: 'Vận động viên', icon: UserCheck },
  { href: '/admin/sync', label: 'Cào dữ liệu', icon: RefreshCw },
  { href: '/admin/settings', label: 'Cài đặt', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    toast.success('Đã đăng xuất')
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <aside className="w-60 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col min-h-screen sticky top-0">
      <div className="p-5 border-b border-zinc-800">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Club Logo" width={32} height={32} className="rounded-lg" />
          <span className="font-display text-lg tracking-wider">
            QuangYen<span className="text-orange-500">Runner</span>
          </span>
        </Link>
        <p className="text-xs text-zinc-600 mt-1 ml-9">Admin Panel</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                active ? 'bg-orange-500/15 text-orange-400 font-medium' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-zinc-800 space-y-1">
        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all">
          <Home className="w-4 h-4" />
          Trang chủ
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  )
}
