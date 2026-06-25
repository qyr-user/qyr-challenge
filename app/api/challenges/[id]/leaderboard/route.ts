import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const challenge = await prisma.challenge.findUnique({ where: { id: params.id } })
    if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const teams = await prisma.team.findMany({
      where: { challengeId: params.id },
      include: {
        members: {
          include: {
            user: {
              include: {
                stravaToken: {
                  include: { activities: { where: { challengeId: params.id, isValid: true } } },
                },
              },
            },
          },
        },
      },
    })

    const leaderboard = teams
      .map(team => {
        const memberStats = team.members.map(m => {
          const activities = m.user.stravaToken?.activities || []
          const totalKm = activities.reduce((sum, a) => sum + a.distanceKm, 0)
          return {
            userId: m.userId,
            name: m.user.stravaToken?.athleteName || m.user.name || 'Unknown',
            photo: m.user.stravaToken?.athletePhoto || m.user.image,
            totalKm,
            activitiesCount: activities.length,
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
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
