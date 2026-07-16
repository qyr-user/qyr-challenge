import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import { requireAdminFromRequest } from '@/app/lib/admin-auth'
import { evaluateChallengeCompletion } from '@/app/lib/challenge-rules'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const challengeId = Number(params.id)
  if (!challengeId) return NextResponse.json({ error: 'Invalid challenge id' }, { status: 400 })

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

  const teamMembers = await prisma.teamMember.findMany({
    where: { team: { challengeId } },
    include: {
      athlete: {
        include: {
          activities: {
            where: { challengeId },
            select: { activityDate: true, distanceKm: true, isValid: true },
          },
        },
      },
    },
  })

  const statuses = teamMembers.map(tm => {
    const result = evaluateChallengeCompletion({
      challenge,
      athleteGender: tm.athlete.gender,
      activities: tm.athlete.activities,
    })

    return {
      athleteId: tm.athlete.id,
      completed: result.completed,
      reasons: result.reasons,
      failedDays: result.failedDays,
      failedWeeks: result.failedWeeks,
    }
  })

  return NextResponse.json(statuses)
}
