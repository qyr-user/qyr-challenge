import * as cheerio from 'cheerio'
import prisma from './prisma'

export interface ScrapedActivity {
  athleteName: string
  activityName: string
  distanceKm: number
  movingTime: number
  paceSeconds: number | null
  activityDate: Date
}

function parsePaceToSeconds(paceStr: string): number | null {
  const match = paceStr.match(/(\d+):(\d{2})/)
  if (!match) return null
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

function parseDistanceKm(distStr: string): number {
  const match = distStr.match(/([0-9.,]+)/)
  if (!match) return 0
  return parseFloat(match[1].replace(',', '.'))
}

function parseDurationToSeconds(durationStr: string): number {
  let total = 0
  const hr = durationStr.match(/(\d+)\s*(?:giờ|h(?!r))/i)
  const min = durationStr.match(/(\d+)\s*(?:phút|min|m(?!\s*[0-9]))/i)
  const sec = durationStr.match(/(\d+)\s*(?:giây|sec|s(?!\w))/i)
  if (hr) total += parseInt(hr[1]) * 3600
  if (min) total += parseInt(min[1]) * 60
  if (sec) total += parseInt(sec[1])
  if (total === 0) {
    const colonParts = durationStr.match(/^(\d+):(\d{2})$/)
    if (colonParts) total = parseInt(colonParts[1]) * 60 + parseInt(colonParts[2])
  }
  return total
}

function calculatePaceSeconds(distanceKm: number, durationSeconds: number): number | null {
  if (distanceKm === 0 || durationSeconds === 0) return null
  return Math.round(durationSeconds / distanceKm)
}

export async function scrapeStravaClubToday(
  sessionCookie: string,
  clubId: string
): Promise<{ activities: ScrapedActivity[]; sessionExpired: boolean }> {
  const url = `https://www.strava.com/clubs/${clubId}/recent_activity`
  let html: string

  try {
    const res = await fetch(url, {
      headers: {
        Cookie: `_strava4_session=${sessionCookie}`,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    })

    const finalUrl = res.url
    if (finalUrl.includes('/login') || finalUrl.includes('athletes/login')) {
      return { activities: [], sessionExpired: true }
    }

    html = await res.text()

    if (
      (html.includes('Log In') && html.includes("Don't have an account")) ||
      html.includes('login-btn') ||
      html.includes('/athletes/login')
    ) {
      return { activities: [], sessionExpired: true }
    }
  } catch {
    return { activities: [], sessionExpired: false }
  }

  const $ = cheerio.load(html)
  const activities: ScrapedActivity[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  $('[data-testid="entry-header"]').each((_, headerEl) => {
    try {
      const parentEntry = $(headerEl).closest('[data-testid="web-feed-entry"], [id^="feed-entry-"]')
      if (!parentEntry.length) return

      const timeEl = parentEntry.find('time[data-testid="date_at_time"]')
      if (!timeEl.length) return
      const timeText = timeEl.text().trim().toLowerCase()
      if (!timeText.includes('hôm nay') && !timeText.includes('today')) return

      const athleteName = $(headerEl).find('[data-testid="owners-name"]').text().trim()
      if (!athleteName || athleteName.toLowerCase() === 'hồ sơ') return

      let statsContainer = $(headerEl).closest('li')
      if (!statsContainer.length) statsContainer = parentEntry

      let activityName = statsContainer.find('[data-testid="activity_name"]').text().trim()
      if (!activityName) activityName = parentEntry.find('[data-testid="activity_name"]').text().trim()
      if (!activityName) activityName = 'Running'

      // Distance
      let distanceStr = '0 km'
      statsContainer.find('span').each((_, el) => {
        const text = $(el).text().trim()
        if (text === 'Quãng đường' || text === 'Distance') {
          const val = $(el).next('div').text().trim() || $(el).siblings('div').first().text().trim()
          if (val) distanceStr = val
        }
      })

      // Duration
      let durationStr = ''
      statsContainer.find('span').each((_, el) => {
        const text = $(el).text().trim()
        if (text === 'Thời gian' || text === 'Time' || text === 'Elapsed Time' || text === 'Moving Time') {
          const val = $(el).next('div').text().trim() || $(el).siblings('div').first().text().trim()
          if (val) durationStr = val
        }
      })

      // Pace
      let paceStr = ''
      statsContainer.find('span').each((_, el) => {
        const text = $(el).text().trim()
        if (text === 'Nhịp độ' || text === 'Pace') {
          const val = $(el).next('div').text().trim() || $(el).siblings('div').first().text().trim()
          if (val) paceStr = val
        }
      })

      const distanceKm = parseDistanceKm(distanceStr)
      const movingTime = parseDurationToSeconds(durationStr)
      let paceSeconds = parsePaceToSeconds(paceStr)
      if (!paceSeconds && distanceKm > 0 && movingTime > 0) {
        paceSeconds = calculatePaceSeconds(distanceKm, movingTime)
      }

      activities.push({
        athleteName,
        activityName,
        distanceKm,
        movingTime,
        paceSeconds,
        activityDate: new Date(),
      })
    } catch {
      // skip bad entries
    }
  })

  return { activities, sessionExpired: false }
}

export function validateActivityAgainstChallenge(
  activity: ScrapedActivity,
  challenge: {
    maxKmPerActivity?: number | null
    minPaceSeconds?: number | null
    maxPaceSeconds?: number | null
  }
): { isValid: boolean; invalidReason: string | null } {
  const reasons: string[] = []

  if (challenge.maxKmPerActivity && activity.distanceKm > challenge.maxKmPerActivity) {
    reasons.push(`Vượt quá ${challenge.maxKmPerActivity}km/lần`)
  }

  if (activity.paceSeconds) {
    if (challenge.minPaceSeconds && activity.paceSeconds < challenge.minPaceSeconds) {
      const min = Math.floor(challenge.minPaceSeconds / 60)
      const sec = challenge.minPaceSeconds % 60
      reasons.push(`Pace nhanh hơn tối thiểu ${min}:${sec.toString().padStart(2, '0')}/km`)
    }
    if (challenge.maxPaceSeconds && activity.paceSeconds > challenge.maxPaceSeconds) {
      const min = Math.floor(challenge.maxPaceSeconds / 60)
      const sec = challenge.maxPaceSeconds % 60
      reasons.push(`Pace chậm hơn tối đa ${min}:${sec.toString().padStart(2, '0')}/km`)
    }
  }

  return {
    isValid: reasons.length === 0,
    invalidReason: reasons.length > 0 ? reasons.join('; ') : null,
  }
}

export async function runScrapeForChallenge(challengeId: number): Promise<{
  success: boolean
  newActivities: number
  sessionExpired: boolean
  error?: string
}> {
  try {
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
    if (!challenge) return { success: false, newActivities: 0, sessionExpired: false, error: 'Không tìm thấy challenge' }

    const now = new Date()
    if (now < challenge.startDate || now > challenge.endDate) {
      return { success: false, newActivities: 0, sessionExpired: false, error: 'Challenge không đang diễn ra' }
    }

    if (!challenge.stravaClubId) {
      return { success: false, newActivities: 0, sessionExpired: false, error: 'Chưa cấu hình Strava Club ID' }
    }

    const sessionSetting = await prisma.appSetting.findUnique({ where: { key: 'strava_session' } })
    if (!sessionSetting?.value) {
      return { success: false, newActivities: 0, sessionExpired: false, error: 'Chưa cấu hình Strava Session Cookie' }
    }

    const { activities, sessionExpired } = await scrapeStravaClubToday(
      sessionSetting.value,
      challenge.stravaClubId
    )

    // Update session validity
    await prisma.appSetting.upsert({
      where: { key: 'strava_session_valid' },
      update: { value: sessionExpired ? 'false' : 'true' },
      create: { key: 'strava_session_valid', value: sessionExpired ? 'false' : 'true' },
    })

    if (sessionExpired) {
      return { success: false, newActivities: 0, sessionExpired: true, error: 'Strava session đã hết hạn' }
    }

    // Fetch all athletes from teams in this challenge
    const teamMembers = await prisma.teamMember.findMany({
      where: { team: { challengeId } },
      include: { athlete: true },
    })
    const athleteMap = new Map(teamMembers.map((tm) => [tm.athlete.name, tm.athlete]))

    let newCount = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const act of activities) {
      const athlete = athleteMap.get(act.athleteName)
      if (!athlete) continue // only save for athletes in this challenge

      const { isValid, invalidReason } = validateActivityAgainstChallenge(act, challenge)

      try {
        await prisma.activity.create({
          data: {
            athleteId: athlete.id,
            challengeId,
            activityDate: today,
            name: act.activityName,
            distanceKm: act.distanceKm,
            movingTime: act.movingTime,
            paceSeconds: act.paceSeconds,
            isValid,
            invalidReason,
          },
        })
        newCount++
      } catch (err: unknown) {
        // Unique constraint violation = duplicate, skip
        if ((err as { code?: string })?.code === 'P2002') continue
        throw err
      }
    }

    return { success: true, newActivities: newCount, sessionExpired: false }
  } catch (err) {
    return { success: false, newActivities: 0, sessionExpired: false, error: String(err) }
  }
}
