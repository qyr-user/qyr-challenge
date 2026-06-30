import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromRequest } from '@/app/lib/admin-auth'
import prisma from '@/app/lib/prisma'

export async function POST(req: NextRequest) {
  const admin = await requireAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { athleteId, teamId } = await req.json()

  const team = await prisma.team.findUnique({ where: { id: Number(teamId) } })
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  // Remove athlete from other teams in same challenge
  const otherTeams = await prisma.team.findMany({
    where: { challengeId: team.challengeId, id: { not: Number(teamId) } },
  })
  await prisma.teamMember.deleteMany({
    where: { athleteId: Number(athleteId), teamId: { in: otherTeams.map(t => t.id) } },
  })

  const member = await prisma.teamMember.upsert({
    where: { teamId_athleteId: { teamId: Number(teamId), athleteId: Number(athleteId) } },
    update: {},
    create: { teamId: Number(teamId), athleteId: Number(athleteId) },
  })
  return NextResponse.json(member)
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { athleteId, teamId } = await req.json()
  await prisma.teamMember.delete({
    where: { teamId_athleteId: { teamId: Number(teamId), athleteId: Number(athleteId) } },
  })
  return NextResponse.json({ ok: true })
}
