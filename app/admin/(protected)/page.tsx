import prisma from '@/app/lib/prisma'
import { Trophy, Users, Activity } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/app/lib/utils'

export const revalidate = 60

export default async function AdminDashboard() {
  const [challengeCount, teamCount, athleteCount, activityCount, recentChallenges] = await Promise.all([
    prisma.challenge.count(),
    prisma.team.count(),
    prisma.athlete.count(),
    prisma.activity.count(),
    prisma.challenge.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { teams: true } },
        teams: {
          include: {
            _count: { select: { members: true } },
            members: {
              include: {
                athlete: {
                  include: { activities: { where: { isValid: true } } },
                },
              },
            },
          },
        },
      },
    }),
  ])

  const stats = [
    { label: 'Thử thách', value: challengeCount, icon: Trophy, color: 'text-yellow-400' },
    { label: 'Nhóm', value: teamCount, icon: Users, color: 'text-blue-400' },
    { label: 'Vận động viên', value: athleteCount, icon: Users, color: 'text-purple-400' },
    { label: 'Hoạt động', value: activityCount, icon: Activity, color: 'text-orange-400' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-wider">TỔNG QUAN</h1>
        <p className="text-zinc-500 text-sm mt-1">Thống kê hệ thống QYR Challenge</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-500 text-sm">{s.label}</span>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className={`font-display text-4xl ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Thử thách gần đây</h2>
          <Link href="/admin/challenges" className="text-sm text-orange-400 hover:text-orange-300">Xem tất cả →</Link>
        </div>

        <div className="space-y-4">
          {recentChallenges.map(challenge => {
            const teamStats = challenge.teams
              .map(t => {
                const totalKm = t.members.reduce((s, m) => {
                  return s + m.athlete.activities.reduce((sum, a) => sum + a.distanceKm, 0)
                }, 0)
                return { id: t.id, name: t.name, memberCount: t._count.members, totalKm }
              })
              .sort((a, b) => b.totalKm - a.totalKm)

            return (
              <div key={challenge.id} className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{challenge.name}</h3>
                    <p className="text-zinc-500 text-sm">
                      {formatDate(challenge.startDate)} → {formatDate(challenge.endDate)} · {challenge._count.teams} nhóm
                    </p>
                  </div>
                  <Link href={`/admin/teams?challengeId=${challenge.id}`} className="text-xs text-orange-400 hover:text-orange-300">
                    Chi tiết →
                  </Link>
                </div>

                {teamStats.length > 0 ? (
                  <div className="space-y-2">
                    {teamStats.map((t, i) => (
                      <div key={t.id} className="flex items-center gap-3">
                        <span className="text-sm text-zinc-500 w-4">#{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium">{t.name}</span>
                            <span className="text-orange-400 font-mono">{t.totalKm.toFixed(1)} km</span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full">
                            <div
                              className="h-full bg-orange-500/60 rounded-full"
                              style={{ width: teamStats[0].totalKm > 0 ? `${(t.totalKm / teamStats[0].totalKm) * 100}%` : '0%' }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-600 text-sm">Chưa có nhóm nào</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
