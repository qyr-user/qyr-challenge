import prisma from './prisma'
import type { AthleteGender, Challenge, Prisma } from '@prisma/client'

type ChallengeRules = Pick<
  Challenge,
  | 'id'
  | 'maxActivitiesPerDay'
  | 'maxActivitiesPerWeek'
  | 'minActivitiesPerDay'
  | 'minActivitiesPerWeek'
  | 'minTotalKmMale'
  | 'minTotalKmFemale'
  | 'minKmPerActivity'
  | 'maxKmPerActivity'
  | 'minPaceSeconds'
  | 'maxPaceSeconds'
  | 'startDate'
  | 'endDate'
>

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const day = x.getDay()
  const diff = day === 0 ? 6 : day - 1
  x.setDate(x.getDate() - diff)
  return x
}

function endOfWeek(d: Date): Date {
  const x = startOfWeek(d)
  x.setDate(x.getDate() + 6)
  x.setHours(23, 59, 59, 999)
  return x
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })
}

export function calculatePaceSeconds(distanceKm: number, movingTimeSeconds: number): number | null {
  if (!distanceKm || !movingTimeSeconds) return null
  return Math.round(movingTimeSeconds / distanceKm)
}

export async function validateActivityWithChallengeRules(params: {
  athleteId: number
  challenge: ChallengeRules
  distanceKm: number
  paceSeconds: number | null
  activityDate: Date
  prismaClient?: Prisma.TransactionClient | typeof prisma
}): Promise<{ isValid: boolean; invalidReason: string | null }> {
  const {
    athleteId,
    challenge,
    distanceKm,
    paceSeconds,
    activityDate,
    prismaClient = prisma,
  } = params

  const reasons: string[] = []

  if (challenge.minKmPerActivity && distanceKm < challenge.minKmPerActivity) {
    reasons.push(`Dưới ${challenge.minKmPerActivity}km/lần`)
  }
  if (challenge.maxKmPerActivity && distanceKm > challenge.maxKmPerActivity) {
    reasons.push(`Vượt quá ${challenge.maxKmPerActivity}km/lần`)
  }

  if (paceSeconds) {
    if (challenge.minPaceSeconds && paceSeconds < challenge.minPaceSeconds) {
      const m = Math.floor(challenge.minPaceSeconds / 60)
      const s = challenge.minPaceSeconds % 60
      reasons.push(`Pace nhanh hơn tối thiểu ${m}:${s.toString().padStart(2, '0')}/km`)
    }
    if (challenge.maxPaceSeconds && paceSeconds > challenge.maxPaceSeconds) {
      const m = Math.floor(challenge.maxPaceSeconds / 60)
      const s = challenge.maxPaceSeconds % 60
      reasons.push(`Pace chậm hơn tối đa ${m}:${s.toString().padStart(2, '0')}/km`)
    }
  }

  if (challenge.maxActivitiesPerDay) {
    const dayCount = await prismaClient.activity.count({
      where: {
        athleteId,
        challengeId: challenge.id,
        activityDate: { gte: startOfDay(activityDate), lte: endOfDay(activityDate) },
      },
    })
    if (dayCount >= challenge.maxActivitiesPerDay) {
      reasons.push(`Vượt quá ${challenge.maxActivitiesPerDay} hoạt động/ngày`)
    }
  }

  if (challenge.maxActivitiesPerWeek) {
    const weekCount = await prismaClient.activity.count({
      where: {
        athleteId,
        challengeId: challenge.id,
        activityDate: { gte: startOfWeek(activityDate), lte: endOfWeek(activityDate) },
      },
    })
    if (weekCount >= challenge.maxActivitiesPerWeek) {
      reasons.push(`Vượt quá ${challenge.maxActivitiesPerWeek} hoạt động/tuần`)
    }
  }

  return {
    isValid: reasons.length === 0,
    invalidReason: reasons.length ? reasons.join('; ') : null,
  }
}

export function evaluateChallengeCompletion(params: {
  challenge: ChallengeRules
  athleteGender: AthleteGender
  activities: Array<{ activityDate: Date; distanceKm: number; isValid: boolean }>
}): {
  completed: boolean
  reasons: string[]
  failedDays: string[]
  failedWeeks: string[]
} {
  const { challenge, athleteGender, activities } = params
  const reasons: string[] = []
  const failedDays: string[] = []
  const failedWeeks: string[] = []

  const now = new Date()
  const periodStart = startOfDay(challenge.startDate)
  const periodEnd = endOfDay(now < challenge.endDate ? now : challenge.endDate)

  const validActivities = activities.filter(a => a.isValid)

  if (challenge.minActivitiesPerDay && periodEnd >= periodStart) {
    for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
      const dayStart = startOfDay(d)
      const dayEnd = endOfDay(d)
      const count = validActivities.filter(a => a.activityDate >= dayStart && a.activityDate <= dayEnd).length
      if (count < challenge.minActivitiesPerDay) {
        failedDays.push(`${fmtDate(d)} (${count}/${challenge.minActivitiesPerDay})`)
      }
    }
    if (failedDays.length) {
      reasons.push(`Không đạt số lần chạy tối thiểu trên ngày ở ${failedDays.length} ngày`)
    }
  }

  if (challenge.minActivitiesPerWeek && periodEnd >= periodStart) {
    for (let ws = startOfWeek(periodStart); ws <= periodEnd; ws.setDate(ws.getDate() + 7)) {
      const weekStart = new Date(ws)
      const weekEnd = endOfWeek(weekStart)
      const clipStart = weekStart < periodStart ? periodStart : weekStart
      const clipEnd = weekEnd > periodEnd ? periodEnd : weekEnd
      if (clipEnd < clipStart) continue

      const count = validActivities.filter(a => a.activityDate >= clipStart && a.activityDate <= clipEnd).length
      if (count < challenge.minActivitiesPerWeek) {
        failedWeeks.push(`${fmtDate(clipStart)} -> ${fmtDate(clipEnd)} (${count}/${challenge.minActivitiesPerWeek})`)
      }
    }
    if (failedWeeks.length) {
      reasons.push(`Không đạt số lần chạy tối thiểu trên tuần ở ${failedWeeks.length} tuần`)
    }
  }

  const totalKm = validActivities.reduce((sum, a) => sum + a.distanceKm, 0)
  const minTotalKm = athleteGender === 'FEMALE' ? challenge.minTotalKmFemale : challenge.minTotalKmMale
  if (minTotalKm && totalKm < minTotalKm) {
    reasons.push(`Tổng km chưa đạt: ${totalKm.toFixed(1)}/${minTotalKm} km`)
  }

  return {
    completed: reasons.length === 0,
    reasons,
    failedDays,
    failedWeeks,
  }
}
