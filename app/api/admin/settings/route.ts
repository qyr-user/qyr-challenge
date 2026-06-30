import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import { requireAdminFromRequest } from '@/app/lib/admin-auth'

const ALLOWED_KEYS = ['strava_session', 'strava_session_valid']

export async function GET(req: NextRequest) {
  const admin = await requireAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ALLOWED_KEYS } },
  })

  const result: Record<string, string> = {}
  for (const s of settings) result[s.key] = s.value
  return NextResponse.json(result)
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const updates: Promise<unknown>[] = []

  for (const key of ALLOWED_KEYS) {
    if (body[key] !== undefined) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key },
          update: { value: body[key] },
          create: { key, value: body[key] },
        })
      )
    }
  }

  await Promise.all(updates)
  return NextResponse.json({ ok: true })
}
