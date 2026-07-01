import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.SCRAPE_IMPORT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [sessionSetting, validSetting] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: 'strava_session' } }),
    prisma.appSetting.findUnique({ where: { key: 'strava_session_valid' } }),
  ])

  const now = new Date()
  const activeChallenges = await prisma.challenge.findMany({
    where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    select: { id: true, name: true, stravaClubId: true },
  })

  return NextResponse.json({
    stravaSession: sessionSetting?.value ?? null,
    sessionValid: validSetting?.value !== 'false',
    challenges: activeChallenges,
  })
}
