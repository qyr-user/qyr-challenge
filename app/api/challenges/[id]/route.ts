import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromRequest } from '@/app/lib/admin-auth'
import prisma from '@/app/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: Number(params.id) },
    include: {
      teams: { include: { members: { include: { athlete: true } } } },
    },
  })
  if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(challenge)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const challenge = await prisma.challenge.update({
    where: { id: Number(params.id) },
    data: {
      name: body.name,
      description: body.description || null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      stravaClubId: body.stravaClubId || null,
      isActive: body.isActive,
      maxActivitiesPerDay: body.maxActivitiesPerDay ? Number(body.maxActivitiesPerDay) : null,
      minActivitiesPerDay: body.minActivitiesPerDay ? Number(body.minActivitiesPerDay) : null,
      maxActivitiesPerWeek: body.maxActivitiesPerWeek ? Number(body.maxActivitiesPerWeek) : null,
      minActivitiesPerWeek: body.minActivitiesPerWeek ? Number(body.minActivitiesPerWeek) : null,
      minKmPerActivity: body.minKmPerActivity ? Number(body.minKmPerActivity) : null,
      maxKmPerActivity: body.maxKmPerActivity ? Number(body.maxKmPerActivity) : null,
      minPaceSeconds: body.minPaceSeconds ? Number(body.minPaceSeconds) : null,
      maxPaceSeconds: body.maxPaceSeconds ? Number(body.maxPaceSeconds) : null,
    },
  })
  return NextResponse.json(challenge)
}
