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
): Promise<{ activities: ScrapedActivity[]; sessionExpired: boolean; debug: string[] }> {
  const logs: string[] = []
  const pageUrl = `https://www.strava.com/clubs/${clubId}/recent_activity`
  const baseHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
  }

  // ── STEP 1: Tải trang HTML để lấy CSRF token và cookies ──
  logs.push(`[step1] GET ${pageUrl}`)
  let html: string
  let responseCookies = ''
  let csrfToken = ''

  try {
    const res = await fetch(pageUrl, {
      headers: {
        ...baseHeaders,
        Cookie: `_strava4_session=${sessionCookie}`,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      redirect: 'follow',
    })

    logs.push(`[step1] HTTP ${res.status} | final URL: ${res.url}`)

    if (res.url.includes('/login') || res.url.includes('athletes/login')) {
      logs.push('[step1] ✗ Redirect to login → session expired')
      return { activities: [], sessionExpired: true, debug: logs }
    }

    // Thu thập cookies từ response để dùng cho bước 2
    const setCookieHeaders = res.headers.getSetCookie?.() ?? []
    logs.push(`[step1] Set-Cookie headers count: ${setCookieHeaders.length}`)
    const cookieParts: string[] = [`_strava4_session=${sessionCookie}`]
    for (const c of setCookieHeaders) {
      const part = c.split(';')[0]
      logs.push(`[step1]   cookie: ${part.slice(0, 80)}`)
      cookieParts.push(part)
    }
    responseCookies = cookieParts.join('; ')

    html = await res.text()
    logs.push(`[step1] HTML size: ${html.length} chars`)

    if (html.includes('/athletes/login') && !html.includes('logged-in')) {
      logs.push('[step1] ✗ Login page content → session expired')
      return { activities: [], sessionExpired: true, debug: logs }
    }

    const isLoggedIn = html.includes('logged-in')
    logs.push(`[step1] logged-in class present: ${isLoggedIn}`)

    // Tìm CSRF token
    const csrfMatch = html.match(/content="([^"]+)"\s+name="csrf-token"/) ||
      html.match(/name="csrf-token"\s+content="([^"]+)"/) ||
      html.match(/<meta[^>]+csrf-token[^>]+content="([^"]+)"/)
    if (csrfMatch) {
      csrfToken = csrfMatch[1]
      logs.push(`[step1] CSRF token: ${csrfToken.slice(0, 20)}...`)
    } else {
      logs.push('[step1] ✗ Không tìm thấy CSRF token trong HTML')
    }

    // Tìm athlete ID từ HTML
    const athleteIdMatch = html.match(/currentAthlete[^}]*"id"\s*:\s*(\d+)/) ||
      html.match(/athlete_id["\s:]+(\d+)/) ||
      html.match(/"athleteId"\s*:\s*(\d+)/) ||
      html.match(/\/athletes\/(\d+)\/settings/)
    if (athleteIdMatch) {
      logs.push(`[step1] Athlete ID: ${athleteIdMatch[1]}`)
    } else {
      logs.push('[step1] Không tìm được athlete ID (không bắt buộc)')
    }
  } catch (err) {
    logs.push(`[step1] ✗ Network error: ${err}`)
    return { activities: [], sessionExpired: false, debug: logs }
  }

  // ── STEP 2: Gọi feed JSON endpoint ──
  const before = Math.floor(Date.now() / 1000) + 3600
  const feedUrl = `https://www.strava.com/clubs/${clubId}/feed?before=${before}&cursor=&limit=60&activity_preference=default`
  logs.push(`[step2] GET ${feedUrl}`)
  logs.push(`[step2] before timestamp: ${before} (${new Date(before * 1000).toISOString()})`)

  let feedData: { entries?: unknown[]; pagination?: unknown } = {}
  try {
    const feedRes = await fetch(feedUrl, {
      headers: {
        ...baseHeaders,
        Cookie: responseCookies,
        Accept: 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrfToken,
        Referer: pageUrl,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
    })

    logs.push(`[step2] HTTP ${feedRes.status} | Content-Type: ${feedRes.headers.get('content-type') ?? 'n/a'}`)

    const rawText = await feedRes.text()
    logs.push(`[step2] Response size: ${rawText.length} chars`)
    logs.push(`[step2] Response snippet: ${rawText.slice(0, 200).replace(/\s+/g, ' ')}`)

    if (feedRes.status === 401 || feedRes.status === 302) {
      logs.push('[step2] ✗ Auth error → session expired')
      return { activities: [], sessionExpired: true, debug: logs }
    }

    try {
      feedData = JSON.parse(rawText)
      const entryCount = Array.isArray(feedData.entries) ? feedData.entries.length : 'n/a'
      logs.push(`[step2] JSON parsed OK | entries: ${entryCount} | pagination: ${JSON.stringify(feedData.pagination)}`)
    } catch {
      logs.push(`[step2] ✗ Response không phải JSON — thử parse HTML feed`)
      // Nếu không phải JSON thì fallback sang parse HTML từ bước 1
      feedData = {}
    }
  } catch (err) {
    logs.push(`[step2] ✗ Network error: ${err}`)
    feedData = {}
  }

  // ── STEP 3: Parse JSON entries nếu có ──
  const entries = Array.isArray(feedData.entries) ? feedData.entries : []
  logs.push(`[step3] Số entries từ feed JSON: ${entries.length}`)

  if (entries.length > 0) {
    logs.push('[step3] → Có dữ liệu JSON, bắt đầu parse từng entry')
    const activities = parseJsonFeedEntries(entries, logs)
    logs.push(`[step3] Parse xong. Hoạt động hôm nay: ${activities.length}`)
    return { activities, sessionExpired: false, debug: logs }
  }

  // ── STEP 4: Fallback — parse HTML từ step 1 ──
  logs.push('[step4] Feed JSON trống, thử parse HTML (fallback)')
  const $ = cheerio.load(html)

  const entryHeaders = $('[data-testid="entry-header"]')
  const feedEntries = $('[data-testid="web-feed-entry"]')
  const feedById = $('[id^="feed-entry-"]')
  const timeEls = $('time[data-testid="date_at_time"]')

  logs.push(`[step4] data-testid="entry-header": ${entryHeaders.length}`)
  logs.push(`[step4] data-testid="web-feed-entry": ${feedEntries.length}`)
  logs.push(`[step4] id^="feed-entry-": ${feedById.length}`)
  logs.push(`[step4] time[date_at_time]: ${timeEls.length}`)

  if (entryHeaders.length === 0) {
    logs.push('[step4] ✗ HTML cũng không có data — Strava render 100% bằng JavaScript')
    logs.push('[step4] → Cần Selenium/Playwright để chạy JS trên trình duyệt thật')
    return { activities: [], sessionExpired: false, debug: logs }
  }

  // Log tất cả time elements để biết format ngày
  timeEls.each((i, el) => {
    logs.push(`[parse] time[${i}]: "${$(el).text().trim()}"`)
  })

  const activities: ScrapedActivity[] = []

  entryHeaders.each((_, headerEl) => {
    try {
      const parentEntry = $(headerEl).closest('[data-testid="web-feed-entry"], [id^="feed-entry-"]')
      if (!parentEntry.length) {
        logs.push('[entry] ✗ Không tìm được parent entry')
        return
      }

      const timeEl = parentEntry.find('time[data-testid="date_at_time"]')
      if (!timeEl.length) {
        logs.push('[entry] ✗ Không có time element')
        return
      }

      const timeText = timeEl.text().trim().toLowerCase()
      if (!timeText.includes('hôm nay') && !timeText.includes('today')) {
        logs.push(`[entry] skip — time: "${timeText}" (không phải hôm nay)`)
        return
      }

      const athleteName = $(headerEl).find('[data-testid="owners-name"]').text().trim()
      if (!athleteName || athleteName.toLowerCase() === 'hồ sơ') {
        logs.push(`[entry] skip — tên VĐV trống hoặc "hồ sơ"`)
        return
      }

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

      logs.push(`[entry] ✓ ${athleteName} | ${activityName} | ${distanceKm}km | ${durationStr}`)

      activities.push({
        athleteName,
        activityName,
        distanceKm,
        movingTime,
        paceSeconds,
        activityDate: new Date(),
      })
    } catch (err) {
      logs.push(`[entry] ✗ Parse error: ${err}`)
    }
  })

  logs.push(`[step4] Tổng hoạt động tìm được: ${activities.length}`)
  return { activities, sessionExpired: false, debug: logs }
}

// Parse entries từ Strava feed JSON endpoint
function parseJsonFeedEntries(entries: unknown[], logs: string[]): ScrapedActivity[] {
  const activities: ScrapedActivity[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTs = today.getTime()

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i] as Record<string, unknown>
    logs.push(`[json][${i}] type: ${entry.type ?? '?'} | keys: ${Object.keys(entry).join(', ')}`)

    // Strava feed entry có dạng: { type: 'Activity', activity: {...}, athlete: {...} }
    // hoặc { entity: 'Activity', ... }
    const act = (entry.activity ?? entry) as Record<string, unknown>
    const athlete = (entry.athlete ?? entry.owner ?? {}) as Record<string, unknown>

    const rawDate = (act.start_date ?? act.startDate ?? act.start_date_local ?? '') as string
    if (rawDate) {
      const entryTs = new Date(rawDate).getTime()
      const isToday = entryTs >= todayTs && entryTs < todayTs + 86400000
      logs.push(`[json][${i}] date: ${rawDate} | isToday: ${isToday}`)
      if (!isToday) continue
    } else {
      logs.push(`[json][${i}] ⚠ Không có date field, thử tiếp`)
    }

    const athleteName = String(
      athlete.name ?? athlete.full_name ?? athlete.firstname
        ? `${athlete.firstname ?? ''} ${athlete.lastname ?? ''}`.trim()
        : act.athlete_name ?? ''
    )
    const activityName = String(act.name ?? act.activity_name ?? 'Running')
    const distanceM = Number(act.distance ?? 0)
    const distanceKm = Math.round(distanceM / 100) / 10
    const movingTime = Number(act.moving_time ?? act.elapsed_time ?? 0)
    const paceSeconds = distanceKm > 0 && movingTime > 0 ? calculatePaceSeconds(distanceKm, movingTime) : null

    logs.push(`[json][${i}] ✓ athlete="${athleteName}" | name="${activityName}" | dist=${distanceKm}km | time=${movingTime}s`)

    if (!athleteName) {
      logs.push(`[json][${i}] skip — tên VĐV trống`)
      continue
    }

    activities.push({ athleteName, activityName, distanceKm, movingTime, paceSeconds, activityDate: new Date() })
  }
  return activities
}

export function validateActivityAgainstChallenge(
  activity: ScrapedActivity,
  challenge: {
    minKmPerActivity?: number | null
    maxKmPerActivity?: number | null
    minPaceSeconds?: number | null
    maxPaceSeconds?: number | null
  }
): { isValid: boolean; invalidReason: string | null } {
  const reasons: string[] = []

  if (challenge.minKmPerActivity && activity.distanceKm < challenge.minKmPerActivity) {
    reasons.push(`Dưới ${challenge.minKmPerActivity}km/lần`)
  }

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

export async function runScrapeForChallenge(
  challengeId: number,
  triggeredBy: 'manual' | 'cron' = 'manual'
): Promise<{
  success: boolean
  newActivities: number
  sessionExpired: boolean
  error?: string
  debug: string[]
}> {
  const logs: string[] = []

  try {
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
    if (!challenge) {
      await saveLog(challengeId, triggeredBy, false, 0, false, 'Không tìm thấy challenge', logs)
      return { success: false, newActivities: 0, sessionExpired: false, error: 'Không tìm thấy challenge', debug: logs }
    }

    logs.push(`[run] Challenge: "${challenge.name}"`)
    logs.push(`[run] Thời gian: ${new Date().toISOString()} (UTC+7: ${toVN(new Date())})`)

    const now = new Date()
    if (now < challenge.startDate || now > challenge.endDate) {
      const err = 'Challenge không đang diễn ra'
      logs.push(`[run] ✗ ${err} (start: ${toVN(challenge.startDate)}, end: ${toVN(challenge.endDate)})`)
      await saveLog(challengeId, triggeredBy, false, 0, false, err, logs)
      return { success: false, newActivities: 0, sessionExpired: false, error: err, debug: logs }
    }

    if (!challenge.stravaClubId) {
      const err = 'Chưa cấu hình Strava Club ID'
      logs.push(`[run] ✗ ${err}`)
      await saveLog(challengeId, triggeredBy, false, 0, false, err, logs)
      return { success: false, newActivities: 0, sessionExpired: false, error: err, debug: logs }
    }

    const sessionSetting = await prisma.appSetting.findUnique({ where: { key: 'strava_session' } })
    if (!sessionSetting?.value) {
      const err = 'Chưa cấu hình Strava Session Cookie'
      logs.push(`[run] ✗ ${err}`)
      await saveLog(challengeId, triggeredBy, false, 0, false, err, logs)
      return { success: false, newActivities: 0, sessionExpired: false, error: err, debug: logs }
    }
    logs.push(`[run] Session cookie có (length: ${sessionSetting.value.length})`)
    logs.push(`[run] Strava Club ID: ${challenge.stravaClubId}`)

    const { activities, sessionExpired, debug: scrapeLogs } = await scrapeStravaClubToday(
      sessionSetting.value,
      challenge.stravaClubId
    )
    logs.push(...scrapeLogs)

    await prisma.appSetting.upsert({
      where: { key: 'strava_session_valid' },
      update: { value: sessionExpired ? 'false' : 'true' },
      create: { key: 'strava_session_valid', value: sessionExpired ? 'false' : 'true' },
    })

    if (sessionExpired) {
      const err = 'Strava session đã hết hạn'
      await saveLog(challengeId, triggeredBy, false, 0, true, err, logs)
      return { success: false, newActivities: 0, sessionExpired: true, error: err, debug: logs }
    }

    logs.push(`[run] Cào được ${activities.length} hoạt động từ Strava`)

    const teamMembers = await prisma.teamMember.findMany({
      where: { team: { challengeId } },
      include: { athlete: true },
    })
    const athleteMap = new Map(teamMembers.map(tm => [tm.athlete.name, tm.athlete]))
    logs.push(`[run] VĐV trong challenge: [${Array.from(athleteMap.keys()).join(', ')}]`)

    let newCount = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const act of activities) {
      const athlete = athleteMap.get(act.athleteName)
      if (!athlete) {
        logs.push(`[run] ✗ Không khớp tên: "${act.athleteName}"`)
        continue
      }

      const { isValid, invalidReason } = validateActivityAgainstChallenge(act, challenge)
      logs.push(`[run] ✓ Lưu: "${act.athleteName}" | ${act.distanceKm}km | valid=${isValid}`)

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
          logs.push(`[run] skip trùng: "${act.athleteName}"`)
          continue
        }
        throw err
      }
    }

    logs.push(`[run] Hoàn tất. Lưu mới: ${newCount}`)
    await saveLog(challengeId, triggeredBy, true, newCount, false, undefined, logs)
    return { success: true, newActivities: newCount, sessionExpired: false, debug: logs }
  } catch (err) {
    logs.push(`[run] ✗ Exception: ${err}`)
    await saveLog(challengeId, triggeredBy, false, 0, false, String(err), logs)
    return { success: false, newActivities: 0, sessionExpired: false, error: String(err), debug: logs }
  }
}

async function saveLog(
  challengeId: number,
  triggeredBy: string,
  success: boolean,
  newActivities: number,
  sessionExpired: boolean,
  error: string | undefined,
  debug: string[]
) {
  try {
    await prisma.scrapeLog.create({
      data: { challengeId, triggeredBy, success, newActivities, sessionExpired, error, debug: JSON.stringify(debug) },
    })
    // Giữ tối đa 50 logs mỗi challenge, xóa cũ hơn
    const old = await prisma.scrapeLog.findMany({
      where: { challengeId },
      orderBy: { createdAt: 'desc' },
      skip: 50,
      select: { id: true },
    })
    if (old.length > 0) {
      await prisma.scrapeLog.deleteMany({ where: { id: { in: old.map(l => l.id) } } })
    }
  } catch {
    // non-fatal
  }
}

function toVN(d: Date): string {
  return new Date(d.getTime() + 7 * 3600000).toISOString().replace('T', ' ').slice(0, 19) + ' VN'
}
