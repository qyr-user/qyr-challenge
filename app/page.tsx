import { getServerSession } from 'next-auth'
import { authOptions } from './lib/auth'
import { prisma } from './lib/prisma'
import { Navbar } from './components/ui/Navbar'
import Link from 'next/link'
import { Calendar, Users, Trophy, ArrowRight, Activity, Zap } from 'lucide-react'
import { formatDate } from './lib/utils'

export const revalidate = 60

export default async function Home() {
  const session = await getServerSession(authOptions)

  const challenges = await prisma.challenge.findMany({
    where: { isActive: true },
    orderBy: { startDate: 'desc' },
    include: {
      _count: { select: { teams: true } },
      teams: { include: { _count: { select: { members: true } } } },
    },
  })

  const now = new Date()

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="relative overflow-hidden py-32 px-4">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-zinc-950/75" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 text-orange-400 text-sm font-medium mb-6">
            <Zap className="w-3.5 h-3.5" />
            Thử thách chạy bộ cộng đồng
          </div>
          <h1 className="font-display text-6xl md:text-8xl tracking-wider mb-4">
            <span className="text-zinc-100">CHẠY CÙNG</span>
            <br />
            <span className="text-orange-500">NHAU NÀO</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-8">
            Kết nối Strava, tham gia nhóm và cùng chinh phục những cột mốc chạy bộ với cộng đồng QYR.
          </p>
          {!session && (
            <Link href="/login" className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2">
              Bắt đầu ngay
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Thử thách đang diễn ra</h2>
            <p className="text-zinc-500 text-sm mt-1">Chọn thử thách để xem bảng xếp hạng</p>
          </div>
          <div className="flex items-center gap-1 text-zinc-500 text-sm">
            <Activity className="w-4 h-4" />
            {challenges.length} thử thách
          </div>
        </div>

        {challenges.length === 0 ? (
          <div className="card p-16 text-center">
            <Trophy className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">Chưa có thử thách nào. Quay lại sau nhé!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {challenges.map((c, i) => {
              const totalMembers = c.teams.reduce((s, t) => s + t._count.members, 0)
              const isActive = now >= c.startDate && now <= c.endDate
              const isUpcoming = now < c.startDate

              return (
                <Link
                  key={c.id}
                  href={`/challenges/${c.id}`}
                  className="card-glow p-6 hover:border-zinc-600 transition-all duration-300 hover:-translate-y-1 group block animate-fade-up"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                        : isUpcoming
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                        : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20'
                    }`}>
                      {isActive ? '🟢 Đang diễn ra' : isUpcoming ? '🔵 Sắp diễn ra' : '⚫ Đã kết thúc'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                  </div>

                  <h3 className="text-lg font-bold mb-1 group-hover:text-orange-400 transition-colors">{c.name}</h3>
                  {c.description && <p className="text-zinc-500 text-sm mb-4 line-clamp-2">{c.description}</p>}

                  <div className="space-y-2 text-sm text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-600" />
                      <span>{formatDate(c.startDate)} → {formatDate(c.endDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-zinc-600" />
                      <span>{c._count.teams} nhóm · {totalMembers} thành viên</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
      <footer className="border-t border-zinc-800 py-6 text-center">
        <Link href="/privacy" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          Chính sách bảo mật
        </Link>
      </footer>
    </div>
  )
}
