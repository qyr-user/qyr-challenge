import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { syncActivitiesForChallenge } from '@/app/lib/strava'
import { prisma } from '@/app/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const { challengeId } = body
    if (challengeId) {
      await syncActivitiesForChallenge(challengeId)
    } else {
      const challenges = await prisma.challenge.findMany({ where: { isActive: true } })
      for (const c of challenges) await syncActivitiesForChallenge(c.id)
    }
    return NextResponse.json({ success: true, syncedAt: new Date() })
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const challenges = await prisma.challenge.findMany({ where: { isActive: true } })
    for (const c of challenges) await syncActivitiesForChallenge(c.id)
    return NextResponse.json({ success: true, syncedAt: new Date() })
  } catch {
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
