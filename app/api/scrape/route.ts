import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromRequest } from '@/app/lib/admin-auth'
import { runScrapeForChallenge } from '@/app/lib/scraper'

export async function POST(req: NextRequest) {
  const admin = await requireAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { challengeId } = await req.json()
  if (!challengeId) return NextResponse.json({ error: 'Thiếu challengeId' }, { status: 400 })

  const result = await runScrapeForChallenge(Number(challengeId))

  if (!result.success) {
    return NextResponse.json({ error: result.error, sessionExpired: result.sessionExpired }, { status: 400 })
  }

  return NextResponse.json({ ok: true, newActivities: result.newActivities })
}
