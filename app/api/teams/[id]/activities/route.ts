import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: { members: { include: { user: { include: { stravaToken: true } } } }, challenge: true },
    })
    if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const stravaTokenIds = team.members.map(m => m.user.stravaToken?.id).filter(Boolean) as string[]

    const activities = await prisma.activity.findMany({
      where: { stravaTokenId: { in: stravaTokenIds }, challengeId: team.challengeId },
      include: { stravaToken: { select: { athleteName: true, athletePhoto: true, userId: true } } },
      orderBy: { startDate: 'desc' },
    })

    return NextResponse.json({ team, activities })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
