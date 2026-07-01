import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromRequest } from '@/app/lib/admin-auth'
import prisma from '@/app/lib/prisma'

export async function GET(req: NextRequest) {
  const admin = await requireAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const challengeId = searchParams.get('challengeId')

  const logs = await prisma.scrapeLog.findMany({
    where: challengeId ? { challengeId: Number(challengeId) } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { challenge: { select: { name: true } } },
  })

  return NextResponse.json(logs.map(l => ({
    ...l,
    debug: l.debug ? JSON.parse(l.debug) : [],
  })))
}
