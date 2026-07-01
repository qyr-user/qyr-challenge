import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import { validateActivityAgainstChallenge } from '@/app/lib/scraper'

// Secret key để bảo vệ endpoint (set SCRAPE_IMPORT_SECRET trong env)
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.SCRAPE_IMPORT_SECRET
  if (!secret) return false
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

interface IncomingActivity {
  athleteName: string
  activityName: string
  distanceKm: number
  movingTime: number
  paceSeconds?: number | null
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { challengeId, activities } = await req.json() as {
    challengeId: number
    activities: IncomingActivity[]
  }

  if (!challengeId || !Array.isArray(activities)) {
    return NextResponse.json({ error: 'Thiếu challengeId hoặc activities' }, { status: 400 })
  }

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return NextResponse.json({ error: 'Không tìm thấy challenge' }, { status: 404 })

  const teamMembers = await prisma.teamMember.findMany({
    where: { team: { challengeId } },
    include: { athlete: true },
  })
  const athleteMap = new Map(teamMembers.map(tm => [tm.athlete.name, tm.athlete]))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let saved = 0
  let skipped = 0
  const noMatch: string[] = []

  for (const act of activities) {
    const athlete = athleteMap.get(act.athleteName)
    if (!athlete) {
      noMatch.push(act.athleteName)
      continue
    }

    const { isValid, invalidReason } = validateActivityAgainstChallenge(act, challenge)

    try {
      await prisma.activity.create({
        data: {
          athleteId: athlete.id,
          challengeId,
          activityDate: today,
          name: act.activityName || 'Running',
          distanceKm: act.distanceKm,
          movingTime: act.movingTime,
          paceSeconds: act.paceSeconds ?? null,
          isValid,
          invalidReason,
        },
      })
      saved++
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'P2002') { skipped++; continue }
      throw err
    }
  }

  return NextResponse.json({
    ok: true,
    saved,
    skipped,
    noMatch: [...new Set(noMatch)],
  })
}
