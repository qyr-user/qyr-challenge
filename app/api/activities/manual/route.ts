import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromRequest } from '@/app/lib/admin-auth'
import prisma from '@/app/lib/prisma'
import { calculatePaceSeconds, validateActivityWithChallengeRules } from '@/app/lib/challenge-rules'

function parseDurationToSeconds(value: string): number {
  const v = value.trim()
  if (!v) return 0

  if (/^\d+$/.test(v)) return Number(v)

  const parts = v.split(':').map(Number)
  if (parts.some(Number.isNaN)) return 0

  if (parts.length === 2) {
    const [mm, ss] = parts
    return mm * 60 + ss
  }

  if (parts.length === 3) {
    const [hh, mm, ss] = parts
    return hh * 3600 + mm * 60 + ss
  }

  return 0
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const athleteId = Number(body.athleteId)
  const challengeId = Number(body.challengeId)
  const activityDateRaw = String(body.activityDate || '')
  const activityName = String(body.name || '').trim()
  const distanceKm = Number(body.distanceKm)
  const movingTime = parseDurationToSeconds(String(body.movingTime || ''))

  if (!athleteId || !challengeId || !activityDateRaw || !activityName || !distanceKm || !movingTime) {
    return NextResponse.json({ error: 'Thiếu hoặc sai dữ liệu đầu vào' }, { status: 400 })
  }

  const [athlete, challenge, membership] = await Promise.all([
    prisma.athlete.findUnique({ where: { id: athleteId } }),
    prisma.challenge.findUnique({ where: { id: challengeId } }),
    prisma.teamMember.findFirst({
      where: {
        athleteId,
        team: { challengeId },
      },
    }),
  ])

  if (!athlete) return NextResponse.json({ error: 'Athlete không tồn tại' }, { status: 404 })
  if (!challenge) return NextResponse.json({ error: 'Challenge không tồn tại' }, { status: 404 })
  if (!membership) {
    return NextResponse.json({ error: 'Athlete chưa thuộc nhóm nào trong challenge này' }, { status: 400 })
  }

  const activityDate = new Date(`${activityDateRaw}T00:00:00`)
  if (Number.isNaN(activityDate.getTime())) {
    return NextResponse.json({ error: 'Ngày hoạt động không hợp lệ' }, { status: 400 })
  }

  const paceSeconds = calculatePaceSeconds(distanceKm, movingTime)
  const { isValid, invalidReason } = await validateActivityWithChallengeRules({
    athleteId,
    challenge,
    distanceKm,
    paceSeconds,
    activityDate,
  })

  try {
    const activity = await prisma.activity.create({
      data: {
        athleteId,
        challengeId,
        activityDate,
        name: activityName,
        distanceKm,
        movingTime,
        paceSeconds,
        isValid,
        invalidReason,
      },
    })

    return NextResponse.json({ ok: true, activity }, { status: 201 })
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2002') {
      return NextResponse.json({ error: 'Hoạt động đã tồn tại (trùng ngày + tên)' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Không thể lưu hoạt động' }, { status: 500 })
  }
}
