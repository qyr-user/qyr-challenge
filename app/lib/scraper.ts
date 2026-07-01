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

function parseCookiesFromHeader(header: string): string {
  return header
    .split(',')
    .map(c => c.split(';')[0].trim())
    .filter(c => c.includes('='))
    .join('; ')
}

const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
}

export async function scrapeStravaClubToday(
  sessionCookie: string,
  clubId: string
): Promise<{ activities: ScrapedActivity[]; sessionExpired: boolean; debug: string[] }> {
  const logs: string[] = []

  // Step 1: Visit homepage first (like Selenium does) to collect base cookies
  let baseCookies = ''
  try {
    logs.push('[scrape] Step 1: Fetching homepage to collect base cookies...')
    const homeRes = await fetch('https://www.strava.com/', {
      headers: {
        ...COMMON_HEADERS,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    })
    const homeSetCookie = homeRes.headers.get('set-cookie') || ''
    baseCookies = parseCookiesFromHeader(homeSetCookie)
    logs.push(`[scrape] Homepage HTTP ${homeRes.status}, base cookies: ${baseCookies || '(none)'}`)
  } catch (err) {
    logs.push(`[scrape] Homepage fetch failed (non-fatal): ${err}`)
  }

  const cookieHeader = baseCookies
    ? `_strava4_session=${sessionCookie}; ${baseCookies}`
    : `_strava4_session=${sessionCookie}`

  const url = `https://www.strava.com/clubs/${clubId}/recent_activity`
  let html: string

  logs.push(`[scrape] Step 2: Fetching club page: ${url}`)

  try {
    const res = await fetch(url, {
      headers: {
        ...COMMON_HEADERS,
        Cookie: cookieHeader,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        Referer: 'https://www.strava.com/',
      },
      redirect: 'follow',
    })

    logs.push(`[scrape] HTTP ${res.status}, final URL: ${res.url}`)

    const finalUrl = res.url
    if (finalUrl.includes('/login') || finalUrl.includes('athletes/login')) {
      logs.push('[scrape] Redirected to login → session expired')
      return { activities: [], sessionExpired: true, debug: logs }
    }

    // Collect cookies from club page response too
    const clubSetCookie = res.headers.get('set-cookie') || ''
    const clubCookies = parseCookiesFromHeader(clubSetCookie)
    if (clubCookies) {
      baseCookies = baseCookies ? `${baseCookies}; ${clubCookies}` : clubCookies
      logs.push(`[scrape] Club page also set cookies: ${clubCookies}`)
    }

    html = await res.text()
    logs.push(`[scrape] HTML length: ${html.length} chars`)

    if (
      (html.includes('Log In') && html.includes("Don't have an account")) ||
      html.includes('login-btn') ||
      html.includes('/athletes/login')
    ) {
      logs.push('[scrape] Login page detected in HTML → session expired')
      return { activities: [], sessionExpired: true, debug: logs }
    }

    // Extract athlete ID — required for feed endpoint
    const athleteIdMatch = html.match(/"athleteId"\s*:\s*(\d+)/)
      || html.match(/athlete_id['":\s]+(\d+)/)
      || html.match(/currentAthlete[^}]*"id"\s*:\s*(\d+)/)
      || html.match(/"id"\s*:\s*(\d+)[^}]*"isCurrentAthlete"\s*:\s*true/)
      || html.match(/data-athlete-id=["'](\d+)["']/)
      || html.match(/\/athletes\/(\d+)\/edit/)
    const athleteId = athleteIdMatch?.[1] || ''
    logs.push(`[scrape] Athlete ID from HTML: ${athleteId || '(not found)'}`)

    // Kiểm tra xem HTML có chứa feed data không
    const hasTestId = html.includes('data-testid="entry-header"')
    const hasFeedEntry = html.includes('web-feed-entry') || html.includes('feed-entry-')
    logs.push(`[scrape] Has data-testid="entry-header": ${hasTestId}`)
    logs.push(`[scrape] Has feed-entry: ${hasFeedEntry}`)

    if (!hasTestId && !hasFeedEntry) {
      // Strava renders feed via JS — static fetch gets empty shell
      // Try the JSON feed endpoint with CSRF token + response cookies
      logs.push('[scrape] No feed HTML found — trying JSON feed endpoint...')
      return await scrapeViaJsonFeed(sessionCookie, clubId, logs, html, baseCookies, athleteId)
    }
  } catch (err) {
    logs.push(`[scrape] Fetch error: ${err}`)
    return { activities: [], sessionExpired: false, debug: logs }
  }

  const $ = cheerio.load(html)
  const activities: ScrapedActivity[] = []

  const entryHeaders = $('[data-testid="entry-header"]')
  logs.push(`[scrape] Found ${entryHeaders.length} entry-header elements`)

  entryHeaders.each((_, headerEl) => {
    try {
      const parentEntry = $(headerEl).closest('[data-testid="web-feed-entry"], [id^="feed-entry-"]')
      if (!parentEntry.length) return

      const timeEl = parentEntry.find('time[data-testid="date_at_time"]')
      if (!timeEl.length) return
      const timeText = timeEl.text().trim().toLowerCase()
      logs.push(`[scrape] Entry time text: "${timeText}"`)
      if (!timeText.includes('hôm nay') && !timeText.includes('today')) return

      const athleteName = $(headerEl).find('[data-testid="owners-name"]').text().trim()
      logs.push(`[scrape] Athlete name: "${athleteName}"`)
      if (!athleteName || athleteName.toLowerCase() === 'hồ sơ') return

      let statsContainer = $(headerEl).closest('li')
      if (!statsContainer.length) statsContainer = parentEntry

      let activityName = statsContainer.find('[data-testid="activity_name"]').text().trim()
      if (!activityName) activityName = parentEntry.find('[data-testid="activity_name"]').text().trim()
      if (!activityName) activityName = 'Running'

      let distanceStr = '0 km'
      statsContainer.find('span').each((_, el) => {
        const text = $(el).text().trim()
        if (text === 'Quãng đường' || text === 'Distance') {
          const val = $(el).next('div').text().trim() || $(el).siblings('div').first().text().trim()
          if (val) distanceStr = val
        }
      })

      let durationStr = ''
      statsContainer.find('span').each((_, el) => {
        const text = $(el).text().trim()
        if (text === 'Thời gian' || text === 'Time' || text === 'Elapsed Time' || text === 'Moving Time') {
          const val = $(el).next('div').text().trim() || $(el).siblings('div').first().text().trim()
          if (val) durationStr = val
        }
      })

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

      logs.push(`[scrape] ✓ Activity: ${athleteName} | ${activityName} | ${distanceKm}km`)

      activities.push({
        athleteName,
        activityName,
        distanceKm,
        movingTime,
        paceSeconds,
        activityDate: new Date(),
      })
    } catch (err) {
      logs.push(`[scrape] Entry parse error: ${err}`)
    }
  })

  logs.push(`[scrape] Total activities parsed: ${activities.length}`)
  return { activities, sessionExpired: false, debug: logs }
}

async function scrapeViaJsonFeed(
  sessionCookie: string,
  clubId: string,
  logs: string[],
  mainHtml?: string,
  responseCookies?: string,
  athleteId?: string
): Promise<{ activities: ScrapedActivity[]; sessionExpired: boolean; debug: string[] }> {
  // Extract CSRF token from main page HTML
  let csrfToken = ''
  const htmlToParse = mainHtml || ''
  const csrfMatch = htmlToParse.match(/<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/)
    || htmlToParse.match(/content=["']([^"']+)["'][^>]+name=["']csrf-token["']/)
    || htmlToParse.match(/"csrfToken"\s*:\s*"([^"]+)"/)
    || htmlToParse.match(/csrf.token['"]\s*[,:]\s*['"]([^'"]+)['"]/)
  if (csrfMatch) {
    csrfToken = csrfMatch[1]
    logs.push(`[json-feed] Found CSRF token: ${csrfToken.slice(0, 20)}...`)
  } else {
    logs.push('[json-feed] No CSRF token found in HTML')
  }

  const before = Math.floor(Date.now() / 1000)
  const feedUrl = `https://www.strava.com/clubs/${clubId}/feed?feed_type=club&athlete_id=${athleteId || ''}&before=${before}&cursor=`
  logs.push(`[json-feed] Trying: ${feedUrl}`)
  logs.push(`[json-feed] CSRF token present: ${!!csrfToken}, athleteId: ${athleteId || '(none)'}`)

  try {
    const cookieStr = responseCookies
      ? `_strava4_session=${sessionCookie}; ${responseCookies}`
      : `_strava4_session=${sessionCookie}`
    const feedHeaders: Record<string, string> = {
      Cookie: cookieStr,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `https://www.strava.com/clubs/${clubId}/recent_activity`,
    }
    if (csrfToken) {
      feedHeaders['X-CSRF-Token'] = csrfToken
    }
    const res = await fetch(feedUrl, { headers: feedHeaders })

    logs.push(`[json-feed] HTTP ${res.status}`)

    if (res.status === 401 || res.status === 302) {
      return { activities: [], sessionExpired: true, debug: logs }
    }

    const text = await res.text()
    logs.push(`[json-feed] Response length: ${text.length} chars`)
    logs.push(`[json-feed] First 500 chars: ${text.slice(0, 500)}`)

    // Response có thể là JSON (entries array) hoặc HTML partial
    let json: { entries?: unknown[]; pagination?: unknown } | null = null
    try {
      json = JSON.parse(text)
      logs.push(`[json-feed] Parsed as JSON, keys: ${Object.keys(json!).join(', ')}`)
    } catch {
      // Not JSON
    }

    const activities: ScrapedActivity[] = []

    if (json && Array.isArray(json.entries)) {
      logs.push(`[json-feed] entries count: ${json.entries.length}`)
      if (json.entries.length === 0) {
        logs.push('[json-feed] No entries — possibly need page scroll or different before timestamp')
        return { activities: [], sessionExpired: false, debug: logs }
      }

      // Mỗi entry là HTML string cần parse bằng cheerio
      for (const entry of json.entries) {
        try {
          const entryHtml = typeof entry === 'string' ? entry : (entry as { html?: string })?.html || ''
          if (!entryHtml) {
            logs.push(`[json-feed] entry type: ${typeof entry}, keys: ${typeof entry === 'object' ? Object.keys(entry as object).join(',') : 'n/a'}`)
            continue
          }
          const $e = cheerio.load(entryHtml)

          const timeText = $e('time[data-testid="date_at_time"]').text().trim().toLowerCase()
          logs.push(`[json-feed] entry time: "${timeText}"`)
          if (!timeText.includes('hôm nay') && !timeText.includes('today')) continue

          const athleteName = $e('[data-testid="owners-name"]').first().text().trim()
          if (!athleteName) continue

          const activityName = $e('[data-testid="activity_name"]').first().text().trim() || 'Running'

          let distanceStr = '0 km'
          $e('span').each((_, el) => {
            const t = $e(el).text().trim()
            if (t === 'Quãng đường' || t === 'Distance') {
              const v = $e(el).next('div').text().trim()
              if (v) distanceStr = v
            }
          })

          let durationStr = ''
          $e('span').each((_, el) => {
            const t = $e(el).text().trim()
            if (['Thời gian', 'Time', 'Moving Time', 'Elapsed Time'].includes(t)) {
              const v = $e(el).next('div').text().trim()
              if (v) durationStr = v
            }
          })

          const distanceKm = parseDistanceKm(distanceStr)
          const movingTime = parseDurationToSeconds(durationStr)
          const paceSeconds = distanceKm > 0 && movingTime > 0 ? calculatePaceSeconds(distanceKm, movingTime) : null

          logs.push(`[json-feed] ✓ ${athleteName} | ${activityName} | ${distanceKm}km`)
          activities.push({ athleteName, activityName, distanceKm, movingTime, paceSeconds, activityDate: new Date() })
        } catch (err) {
          logs.push(`[json-feed] entry parse error: ${err}`)
        }
      }

      logs.push(`[json-feed] Total: ${activities.length}`)
      return { activities, sessionExpired: false, debug: logs }
    }

    // Fallback: parse as HTML partial
    const $ = cheerio.load(text)
    const entryHeaders = $('[data-testid="entry-header"]')
    logs.push(`[json-feed] Fallback HTML parse: ${entryHeaders.length} entry-headers found`)
    logs.push('[json-feed] Feed likely requires full JS rendering (Selenium/Puppeteer needed)')
    return { activities: [], sessionExpired: false, debug: logs }
  } catch (err) {
    logs.push(`[json-feed] Error: ${err}`)
    return { activities: [], sessionExpired: false, debug: logs }
  }
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
  debug?: string[]
}> {
  const runLogs: string[] = []
  try {
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
    if (!challenge) return { success: false, newActivities: 0, sessionExpired: false, error: 'Không tìm thấy challenge' }

    runLogs.push(`[run] Challenge: "${challenge.name}", startDate: ${challenge.startDate}, endDate: ${challenge.endDate}`)

    const now = new Date()
    runLogs.push(`[run] Now: ${now.toISOString()}`)

    if (now < challenge.startDate || now > challenge.endDate) {
      return { success: false, newActivities: 0, sessionExpired: false, error: 'Challenge không đang diễn ra', debug: runLogs }
    }

    if (!challenge.stravaClubId) {
      return { success: false, newActivities: 0, sessionExpired: false, error: 'Chưa cấu hình Strava Club ID', debug: runLogs }
    }

    const sessionSetting = await prisma.appSetting.findUnique({ where: { key: 'strava_session' } })
    if (!sessionSetting?.value) {
      return { success: false, newActivities: 0, sessionExpired: false, error: 'Chưa cấu hình Strava Session Cookie', debug: runLogs }
    }
    runLogs.push(`[run] Session cookie present (length: ${sessionSetting.value.length})`)

    const { activities, sessionExpired, debug: scrapeLogs } = await scrapeStravaClubToday(
      sessionSetting.value,
      challenge.stravaClubId
    )
    const allLogs = [...runLogs, ...scrapeLogs]

    await prisma.appSetting.upsert({
      where: { key: 'strava_session_valid' },
      update: { value: sessionExpired ? 'false' : 'true' },
      create: { key: 'strava_session_valid', value: sessionExpired ? 'false' : 'true' },
    })

    if (sessionExpired) {
      return { success: false, newActivities: 0, sessionExpired: true, error: 'Strava session đã hết hạn', debug: allLogs }
    }

    allLogs.push(`[run] Scraped ${activities.length} activities from Strava`)

    const teamMembers = await prisma.teamMember.findMany({
      where: { team: { challengeId } },
      include: { athlete: true },
    })
    const athleteMap = new Map(teamMembers.map((tm) => [tm.athlete.name, tm.athlete]))
    allLogs.push(`[run] Athletes in challenge: [${Array.from(athleteMap.keys()).join(', ')}]`)

    let newCount = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const act of activities) {
      const athlete = athleteMap.get(act.athleteName)
      if (!athlete) {
        allLogs.push(`[run] ✗ No match for scraped name: "${act.athleteName}"`)
        continue
      }

      const { isValid, invalidReason } = validateActivityAgainstChallenge(act, challenge)
      allLogs.push(`[run] ✓ Matched "${act.athleteName}" → saving (valid=${isValid})`)

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
        if ((err as { code?: string })?.code === 'P2002') {
          allLogs.push(`[run] Duplicate skipped: "${act.athleteName}"`)
          continue
        }
        throw err
      }
    }

    allLogs.push(`[run] Done. newActivities=${newCount}`)
    return { success: true, newActivities: newCount, sessionExpired: false, debug: allLogs }
  } catch (err) {
    runLogs.push(`[run] Exception: ${err}`)
    return { success: false, newActivities: 0, sessionExpired: false, error: String(err), debug: runLogs }
  }
}
