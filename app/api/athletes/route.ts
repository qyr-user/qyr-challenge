import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import { requireAdminFromRequest } from '@/app/lib/admin-auth'

export async function GET(req: NextRequest) {
  const admin = await requireAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const athletes = await prisma.athlete.findMany({
    orderBy: { name: 'asc' },
    include: {
      teamMembers: {
        include: { team: { include: { challenge: { select: { id: true, name: true } } } } },
      },
    },
  })
  return NextResponse.json(athletes)
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Tên không được để trống' }, { status: 400 })
  }

  try {
    const athlete = await prisma.athlete.create({ data: { name: name.trim() } })
    return NextResponse.json(athlete, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Tên VĐV đã tồn tại' }, { status: 409 })
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.athlete.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
