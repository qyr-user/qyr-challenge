import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromRequest } from '@/app/lib/admin-auth'
import prisma from '@/app/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teamId = Number(params.id)
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: { select: { athleteId: true } } },
  })
  if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const athleteIds = team.members.map(m => m.athleteId)
  const activities = await prisma.activity.findMany({
    where: { athleteId: { in: athleteIds }, challengeId: team.challengeId },
    include: { athlete: { select: { name: true } } },
    orderBy: { activityDate: 'desc' },
  })

  return NextResponse.json({ team, activities })
}
