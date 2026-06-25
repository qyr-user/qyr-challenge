import { prisma } from '@/app/lib/prisma'
import { notFound } from 'next/navigation'
import { Navbar } from '@/app/components/ui/Navbar'
import { formatDate } from '@/app/lib/utils'
import { Calendar, Users, Trophy, Medal, Flame, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const revalidate = 300

async function getLeaderboard(challengeId: string) {
  const teams = await prisma.team.findMany({
    where: { challengeId },
    include: {
      members: {
        include: {
          user: {
            include: {
              stravaToken: { include: { activities: { where: { challengeId, isValid: true } } } },
            },
          },
        },
      },
    },
  })

  return teams
    .map(team => {
      const members = team.members.map(m => {
        const acts = m.user.stravaToken?.activities || []
        const totalKm = acts.reduce((s, a) => s + a.distanceKm, 0)
        return {
          userId: m.userId,
          name: m.user.stravaToken?.athleteName || m.user.name || 'Unknown',
          photo: m.user.stravaToken?.athletePhoto || m.user.image,
          totalKm,
          count: acts.length,
        }
      })
      const totalKm = members.reduce((s, m) => s + m.totalKm, 0)
      return {
        id: team.id,
        name: team.name,
        totalKm,
        memberCount: members.length,
        members: members.sort((a, b) => b.totalKm - a.totalKm),
      }
    })
    .sort((a, b) => b.totalKm - a.totalKm)
    .map((t, i) => ({ ...t, rank: i + 1 }))
}

export default async function ChallengePage({ params }: { params: { id: string } }) {
  const challenge = await prisma.challenge.findUnique({ where: { id: params.id } })
  if (!challenge) notFound()

  const leaderboard = await getLeaderboard(params.id)
  const now = new Date()
  const isActive = now >= challenge.startDate && now <= challenge.endDate

  const rankIcons = ['🥇', '🥈', '🥉']
  const medalColors = [
    'border-yellow-500/40 bg-yellow-500/5',
    'border-zinc-400/40 bg-zinc-400/5',
    'border-orange-700/40 bg-orange-700/5',
  ]

  return (
    <div className="min-h-screen">
      <Navbar />
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
                    : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20'
                }`}>
                  {isActive ? '🟢 Đang diễn ra' : '⚫ Đã kết thúc'}
                </span>
              </div>
              <h1 className="font-display text-4xl tracking-wider text-orange-400 mb-2">{challenge.name}</h1>
              {challenge.description && <p className="text-zinc-400 text-sm max-w-lg">{challenge.description}</p>}
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
          </div>

          {leaderboard.length === 0 ? (
            <div className="card p-16 text-center">
              <Medal className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">Chưa có nhóm nào trong thử thách này.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leaderboard.map((team, i) => (
                <div key={team.id} className={`card p-5 border transition-all ${i < 3 ? medalColors[i] : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl w-8">{i < 3 ? rankIcons[i] : `#${team.rank}`}</span>
                      <div>
                        <h3 className="font-bold text-lg">{team.name}</h3>
                        <p className="text-zinc-500 text-sm">{team.memberCount} thành viên</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-3xl text-orange-400">{team.totalKm.toFixed(1)}</p>
                      <p className="text-zinc-500 text-sm">km</p>
                    </div>
                  </div>

                  {leaderboard[0].totalKm > 0 && (
                    <div className="mb-4">
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-1000"
                          style={{ width: `${(team.totalKm / leaderboard[0].totalKm) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {team.members.map(m => (
                      <div key={m.userId} className="flex items-center gap-2 py-1">
                        {m.photo ? (
                          <img src={m.photo} alt="" className="w-7 h-7 rounded-full border border-zinc-700" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
                            {m.name[0]}
                          </div>
                        )}
                        <span className="text-sm text-zinc-300 flex-1 truncate">{m.name}</span>
                        <span className="text-sm font-mono text-orange-400">{m.totalKm.toFixed(1)}km</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
