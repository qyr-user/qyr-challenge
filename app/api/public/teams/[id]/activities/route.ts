import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)))
  const filter = searchParams.get('filter') // 'all' | 'valid' | 'invalid'

  const team = await prisma.team.findUnique({
    where: { id: Number(params.id) },
    include: { members: { select: { athleteId: true } } },
  })
  if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const athleteIds = team.members.map(m => m.athleteId)

  const where = {
    athleteId: { in: athleteIds },
    challengeId: team.challengeId,
    ...(filter === 'valid' ? { isValid: true } : filter === 'invalid' ? { isValid: false } : {}),
  }

  const [total, activities] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.findMany({
      where,
      include: { athlete: { select: { name: true } } },
      orderBy: { activityDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({
    teamName: team.name,
    activities,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  })
}
