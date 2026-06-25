import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: params.id },
      include: {
        teams: { include: { members: { include: { user: { include: { stravaToken: true } } } } } },
      },
    })
    if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(challenge)
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const challenge = await prisma.challenge.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description || null,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        isActive: body.isActive,
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
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
