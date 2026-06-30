import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromRequest } from '@/app/lib/admin-auth'
import prisma from '@/app/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const challengeId = searchParams.get('challengeId')

  const teams = await prisma.team.findMany({
    where: challengeId ? { challengeId: Number(challengeId) } : undefined,
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(teams)
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, challengeId } = await req.json()
  const team = await prisma.team.create({
    data: { name, challengeId: Number(challengeId) },
  })
  return NextResponse.json(team, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.team.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
