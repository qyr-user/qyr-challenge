import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'

export async function GET() {
  try {
    const challenges = await prisma.challenge.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        teams: { include: { _count: { select: { members: true } } } },
        _count: { select: { teams: true } },
      },
    })
    return NextResponse.json(challenges)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const challenge = await prisma.challenge.create({
      data: {
        name: body.name,
        description: body.description || null,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        maxActivitiesPerDay: body.maxActivitiesPerDay ? Number(body.maxActivitiesPerDay) : null,
        minActivitiesPerDay: body.minActivitiesPerDay ? Number(body.minActivitiesPerDay) : null,
        maxActivitiesPerWeek: body.maxActivitiesPerWeek ? Number(body.maxActivitiesPerWeek) : null,
        minActivitiesPerWeek: body.minActivitiesPerWeek ? Number(body.minActivitiesPerWeek) : null,
        maxKmPerActivity: body.maxKmPerActivity ? Number(body.maxKmPerActivity) : null,
        minHeartRate: body.minHeartRate ? Number(body.minHeartRate) : null,
        maxHeartRate: body.maxHeartRate ? Number(body.maxHeartRate) : null,
        minPaceSeconds: body.minPaceSeconds ? Number(body.minPaceSeconds) : null,
        maxPaceSeconds: body.maxPaceSeconds ? Number(body.maxPaceSeconds) : null,
      },
    })
    return NextResponse.json(challenge)
  } catch {
    return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 })
  }
}
