import { prisma } from './prisma'

const STRAVA_API = 'https://www.strava.com/api/v3'

export async function refreshStravaToken(stravaTokenId: string) {
  const token = await prisma.stravaToken.findUnique({ where: { id: stravaTokenId } })
  if (!token) throw new Error('Token not found')

  const now = Math.floor(Date.now() / 1000)
  if (token.expiresAt > now + 300) return token.accessToken

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
    }),
  })
  if (!res.ok) throw new Error('Failed to refresh token')

  const data = await res.json()
  await prisma.stravaToken.update({
    where: { id: stravaTokenId },
    data: { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: data.expires_at },
  })
  return data.access_token as string
}

export async function fetchStravaActivities(stravaTokenId: string, after: number, before: number): Promise<any[]> {
  const accessToken = await refreshStravaToken(stravaTokenId)
  let all: any[] = []
  let page = 1
  const perPage = 100

  while (true) {
    const res = await fetch(
      `${STRAVA_API}/athlete/activities?after=${after}&before=${before}&per_page=${perPage}&page=${page}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) break
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) break
    const runs = data.filter((a: any) => a.type === 'Run' || a.sport_type === 'Run')
    all = all.concat(runs)
    if (data.length < perPage) break
    page++
  }
  return all
}

export function validateActivity(
  activity: any,
  challenge: {
    maxKmPerActivity?: number | null
    minHeartRate?: number | null
    maxHeartRate?: number | null
    minPaceSeconds?: number | null
    maxPaceSeconds?: number | null
  }
): { isValid: boolean; reason?: string } {
  const distanceKm = activity.distance / 1000
  const paceSeconds =
    activity.moving_time > 0 && activity.distance > 0
      ? Math.round(activity.moving_time / (activity.distance / 1000))
      : null

  if (challenge.maxKmPerActivity && distanceKm > challenge.maxKmPerActivity) {
    return { isValid: false, reason: `Vượt quá ${challenge.maxKmPerActivity}km tối đa/hoạt động` }
  }
  if (challenge.minHeartRate && activity.average_heartrate && activity.average_heartrate < challenge.minHeartRate) {
    return { isValid: false, reason: `Nhịp tim trung bình quá thấp (< ${challenge.minHeartRate} bpm)` }
  }
  if (challenge.maxHeartRate && activity.average_heartrate && activity.average_heartrate > challenge.maxHeartRate) {
    return { isValid: false, reason: `Nhịp tim trung bình quá cao (> ${challenge.maxHeartRate} bpm)` }
  }
  if (paceSeconds !== null) {
    if (challenge.minPaceSeconds && paceSeconds < challenge.minPaceSeconds) {
      return { isValid: false, reason: `Tốc độ quá nhanh (nhanh hơn ${formatPace(challenge.minPaceSeconds)}/km)` }
    }
    if (challenge.maxPaceSeconds && paceSeconds > challenge.maxPaceSeconds) {
      return { isValid: false, reason: `Tốc độ quá chậm (chậm hơn ${formatPace(challenge.maxPaceSeconds)}/km)` }
    }
  }
  return { isValid: true }
}

export function formatPace(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export async function syncActivitiesForChallenge(challengeId: string) {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return

  const after = Math.floor(challenge.startDate.getTime() / 1000)
  const before = Math.floor(Math.min(challenge.endDate.getTime(), Date.now()) / 1000)

  const teams = await prisma.team.findMany({
    where: { challengeId },
    include: { members: { include: { user: { include: { stravaToken: true } } } } },
  })

  for (const team of teams) {
    for (const member of team.members) {
      const stravaToken = member.user.stravaToken
      if (!stravaToken) continue

      try {
        const activities = await fetchStravaActivities(stravaToken.id, after, before)
        for (const act of activities) {
          const distanceKm = act.distance / 1000
          const paceSeconds =
            act.moving_time > 0 && act.distance > 0 ? Math.round(act.moving_time / distanceKm) : null
          const { isValid, reason } = validateActivity(act, challenge)

          await prisma.activity.upsert({
            where: { stravaId: act.id.toString() },
            update: { isValid, invalidReason: reason || null },
            create: {
              stravaId: act.id.toString(),
              stravaTokenId: stravaToken.id,
              challengeId,
              name: act.name,
              distance: act.distance,
              movingTime: act.moving_time,
              startDate: new Date(act.start_date),
              averageHeartRate: act.average_heartrate || null,
              maxHeartRate: act.max_heartrate || null,
              averageSpeed: act.average_speed || null,
              distanceKm,
              paceSeconds,
              isValid,
              invalidReason: reason || null,
            },
          })
        }
      } catch (err) {
        console.error(`Sync error for user ${member.userId}:`, err)
      }
    }
  }
}
