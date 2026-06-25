import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const { userId, teamId } = body

    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

    const otherTeams = await prisma.team.findMany({
      where: { challengeId: team.challengeId, id: { not: teamId } },
    })
    await prisma.teamMember.deleteMany({
      where: { userId, teamId: { in: otherTeams.map(t => t.id) } },
    })

    const member = await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId } },
      update: {},
      create: { teamId, userId },
    })
    return NextResponse.json(member)
  } catch {
    return NextResponse.json({ error: 'Failed to assign member' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const { userId, teamId } = body
    await prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
