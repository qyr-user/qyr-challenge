import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.SCRAPE_IMPORT_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ['strava_session', 'strava_session_valid'] } },
  })
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]))

  return NextResponse.json({
    stravaSession: map['strava_session'] || null,
    sessionValid: map['strava_session_valid'] !== 'false',
  })
}
