import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'

interface IncomingActivity {
  athleteName: string
  activityName: string
  distanceKm: number
  movingTime: number
  paceSeconds?: number | null
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.SCRAPE_IMPORT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const challengeId: number = Number(body.challengeId)
  const activities: IncomingActivity[] = body.activities ?? []

  if (!challengeId || !Array.isArray(activities)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
  }

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
      if (!noMatch.includes(act.athleteName)) noMatch.push(act.athleteName)
      continue
    }

    // Validate against challenge rules
    let isValid = true
    const reasons: string[] = []
    if (challenge.minKmPerActivity && act.distanceKm < challenge.minKmPerActivity) {
      isValid = false
      reasons.push(`Dưới ${challenge.minKmPerActivity}km/lần`)
    }
    if (challenge.maxKmPerActivity && act.distanceKm > challenge.maxKmPerActivity) {
      isValid = false
      reasons.push(`Vượt quá ${challenge.maxKmPerActivity}km/lần`)
    }
    if (act.paceSeconds) {
      if (challenge.minPaceSeconds && act.paceSeconds < challenge.minPaceSeconds) {
        isValid = false
        const m = Math.floor(challenge.minPaceSeconds / 60), s = challenge.minPaceSeconds % 60
        reasons.push(`Pace nhanh hơn ${m}:${s.toString().padStart(2, '0')}/km`)
      }
      if (challenge.maxPaceSeconds && act.paceSeconds > challenge.maxPaceSeconds) {
        isValid = false
        const m = Math.floor(challenge.maxPaceSeconds / 60), s = challenge.maxPaceSeconds % 60
        reasons.push(`Pace chậm hơn ${m}:${s.toString().padStart(2, '0')}/km`)
      }
    }

    try {
      await prisma.activity.create({
        data: {
          athleteId: athlete.id,
          challengeId,
          activityDate: today,
          name: act.activityName,
          distanceKm: act.distanceKm,
          movingTime: act.movingTime,
          paceSeconds: act.paceSeconds ?? null,
          isValid,
          invalidReason: reasons.length > 0 ? reasons.join('; ') : null,
        },
      })
      saved++
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'P2002') { skipped++; continue }
      throw err
    }
  }

  // Save scrape log
  await prisma.scrapeLog.create({
    data: {
      challengeId,
      triggeredBy: 'cron',
      success: true,
      newActivities: saved,
      sessionExpired: false,
      debug: JSON.stringify([
        `[import] challenge: ${challenge.name}`,
        `[import] activities received: ${activities.length}`,
        `[import] saved: ${saved}, skipped (dup): ${skipped}`,
        noMatch.length ? `[import] no athlete match: ${noMatch.join(', ')}` : '[import] all athletes matched',
      ]),
    },
  })

  return NextResponse.json({ ok: true, saved, skipped, noMatch })
}
