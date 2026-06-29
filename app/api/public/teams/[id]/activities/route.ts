import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)))
    const filter = searchParams.get('filter') // 'all' | 'valid' | 'invalid'

    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: { user: { include: { stravaToken: true } } },
        },
      },
    })
    if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const stravaTokenIds = team.members.map(m => m.user.stravaToken?.id).filter(Boolean) as string[]

    const where: any = {
      stravaTokenId: { in: stravaTokenIds },
      challengeId: team.challengeId,
    }
    if (filter === 'valid') where.isValid = true
    if (filter === 'invalid') where.isValid = false

    const [total, activities] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.findMany({
        where,
        include: {
          stravaToken: { select: { athleteName: true, athletePhoto: true, userId: true } },
        },
        orderBy: { startDate: 'desc' },
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
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}