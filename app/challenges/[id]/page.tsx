import prisma from '@/app/lib/prisma'
import { notFound } from 'next/navigation'
import { LeaderboardList } from '@/app/components/user/LeaderboardList'
import { formatDate } from '@/app/lib/utils'
import { Calendar, Users, Trophy, Medal, Flame, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getLeaderboard(challengeId: number) {
  const teams = await prisma.team.findMany({
    where: { challengeId },
    include: {
      members: {
        include: {
          athlete: {
            include: { activities: { where: { challengeId, isValid: true } } },
          },
        },
      },
    },
  })

  return teams
    .map(team => {
      const members = team.members.map(m => {
        const acts = m.athlete.activities
        const totalKm = acts.reduce((s, a) => s + a.distanceKm, 0)
        return { athleteId: m.athleteId, name: m.athlete.name, totalKm, count: acts.length }
      })
      const totalKm = members.reduce((s, m) => s + m.totalKm, 0)
      return { id: team.id, name: team.name, totalKm, memberCount: members.length, members: members.sort((a, b) => b.totalKm - a.totalKm) }
    })
    .sort((a, b) => b.totalKm - a.totalKm)
    .map((t, i) => ({ ...t, rank: i + 1 }))
}

export default async function ChallengePage({ params }: { params: { id: string } }) {
  const challenge = await prisma.challenge.findUnique({ where: { id: Number(params.id) } })
  if (!challenge) notFound()

  const leaderboard = await getLeaderboard(Number(params.id))
  const now = new Date()
  const isActive = now >= challenge.startDate && now <= challenge.endDate
  const isUpcoming = now < challenge.startDate

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Link>

        <div className="card-glow p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : isUpcoming
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                    : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20'
                }`}>
                  {isActive ? '🟢 Đang diễn ra' : isUpcoming ? '🔵 Sắp diễn ra' : '⚫ Đã kết thúc'}
                </span>
              </div>
              <h1 className="font-display text-4xl tracking-wider text-orange-400 mb-2">{challenge.name}</h1>
              {challenge.description && <p className="text-zinc-400 text-sm max-w-lg whitespace-pre-line">{challenge.description}</p>}
            </div>

            <div className="flex flex-col gap-2 text-sm text-zinc-400 shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-600" />
                <span>{formatDate(challenge.startDate)} → {formatDate(challenge.endDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-600" />
                <span>{leaderboard.length} nhóm</span>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-zinc-600" />
                <span>{leaderboard.reduce((s, t) => s + t.totalKm, 0).toFixed(1)} km tổng cộng</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold">Bảng xếp hạng</h2>
            <span className="text-zinc-500 text-sm ml-2">(bấm vào 1 nhóm để xem chi tiết hoạt động)</span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="card p-16 text-center">
              <Medal className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">Chưa có nhóm nào trong thử thách này.</p>
            </div>
          ) : (
            <LeaderboardList teams={leaderboard} />
          )}
        </div>
      </div>
    </div>
  )
}
