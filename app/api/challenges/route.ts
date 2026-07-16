import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromRequest } from '@/app/lib/admin-auth'
import prisma from '@/app/lib/prisma'

export async function GET() {
  const challenges = await prisma.challenge.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      teams: { include: { _count: { select: { members: true } } } },
      _count: { select: { teams: true } },
    },
  })
  return NextResponse.json(challenges)
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const challenge = await prisma.challenge.create({
    data: {
      name: body.name,
      description: body.description || null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      stravaClubId: body.stravaClubId || null,
      maxActivitiesPerDay: body.maxActivitiesPerDay ? Number(body.maxActivitiesPerDay) : null,
      minActivitiesPerDay: body.minActivitiesPerDay ? Number(body.minActivitiesPerDay) : null,
      maxActivitiesPerWeek: body.maxActivitiesPerWeek ? Number(body.maxActivitiesPerWeek) : null,
      minActivitiesPerWeek: body.minActivitiesPerWeek ? Number(body.minActivitiesPerWeek) : null,
      minTotalKmMale: body.minTotalKmMale ? Number(body.minTotalKmMale) : null,
      minTotalKmFemale: body.minTotalKmFemale ? Number(body.minTotalKmFemale) : null,
      minKmPerActivity: body.minKmPerActivity ? Number(body.minKmPerActivity) : null,
      maxKmPerActivity: body.maxKmPerActivity ? Number(body.maxKmPerActivity) : null,
      minPaceSeconds: body.minPaceSeconds ? Number(body.minPaceSeconds) : null,
      maxPaceSeconds: body.maxPaceSeconds ? Number(body.maxPaceSeconds) : null,
    },
  })
  return NextResponse.json(challenge, { status: 201 })
}
