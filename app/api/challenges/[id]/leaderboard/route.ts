import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const challengeId = Number(params.id)
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const teams = await prisma.team.findMany({
    where: { challengeId },
    include: {
      members: {
        include: {
          athlete: {
            include: {
              activities: { where: { challengeId, isValid: true } },
            },
          },
        },
      },
    },
  })

  const leaderboard = teams
    .map(team => {
      const memberStats = team.members.map(m => {
        const acts = m.athlete.activities
        const totalKm = acts.reduce((sum, a) => sum + a.distanceKm, 0)
        return {
          athleteId: m.athleteId,
          name: m.athlete.name,
          totalKm,
          activitiesCount: acts.length,
        }
      })
      const totalKm = memberStats.reduce((sum, m) => sum + m.totalKm, 0)
      return {
        id: team.id,
        name: team.name,
        totalKm,
        memberCount: team.members.length,
        members: memberStats.sort((a, b) => b.totalKm - a.totalKm),
      }
    })
    .sort((a, b) => b.totalKm - a.totalKm)
    .map((t, i) => ({ ...t, rank: i + 1 }))

  return NextResponse.json(leaderboard)
}
