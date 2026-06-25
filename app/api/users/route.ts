import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const users = await prisma.user.findMany({
      include: {
        stravaToken: { select: { athleteName: true, athletePhoto: true, stravaAthleteId: true } },
        teamMembers: { include: { team: { include: { challenge: { select: { id: true, name: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(users)
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
