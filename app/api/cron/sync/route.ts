import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import { runScrapeForChallenge } from '@/app/lib/scraper'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const activeChallenges = await prisma.challenge.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  })

  const results = []
  for (const challenge of activeChallenges) {
    const result = await runScrapeForChallenge(challenge.id, 'cron')
    results.push({ challengeId: challenge.id, name: challenge.name, ...result })
  }

  return NextResponse.json({ ok: true, processed: activeChallenges.length, results })
}
