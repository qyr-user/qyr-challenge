import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const challengeId = searchParams.get('challengeId')
  try {
    const teams = await prisma.team.findMany({
      where: challengeId ? { challengeId } : undefined,
      include: {
        members: { include: { user: { include: { stravaToken: true } } } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(teams)
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const team = await prisma.team.create({ data: { name: body.name, challengeId: body.challengeId } })
    return NextResponse.json(team)
  } catch {
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('id')
  if (!teamId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  try {
    await prisma.team.delete({ where: { id: teamId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
