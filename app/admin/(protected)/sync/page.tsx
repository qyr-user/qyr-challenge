'use client'
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

interface Challenge { id: number; name: string; isActive: boolean; startDate: string; endDate: string; stravaClubId?: string }

interface ScrapeLog {
  id: number
  challengeId: number
  triggeredBy: string
  success: boolean
  newActivities: number
  sessionExpired: boolean
  error: string | null
  debug: string[]
  createdAt: string
  challenge: { name: string }
}

function isChallengeOngoing(c: Challenge) {
  const now = new Date()
  return new Date(c.startDate) <= now && new Date(c.endDate) >= now
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })
}

export default function AdminSyncPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [syncing, setSyncing] = useState<number | null>(null)
  const [logs, setLogs] = useState<ScrapeLog[]>([])
  const [expandedLog, setExpandedLog] = useState<number | null>(null)
  const [loadingLogs, setLoadingLogs] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch('/api/scrape-logs')
      if (res.ok) setLogs(await res.json())
    } finally {
      setLoadingLogs(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/challenges').then(r => r.json()).then(setChallenges)
    fetchLogs()
  }, [fetchLogs])

  async function scrapeChallenge(challengeId: number) {
    setSyncing(challengeId)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Cào dữ liệu thất bại')
      } else {
        toast.success(`Cào xong! ${data.newActivities} hoạt động mới`)
      }
      await fetchLogs()
    } catch {
      toast.error('Cào dữ liệu thất bại')
    } finally {
      setSyncing(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cào dữ liệu Strava</h1>
        <p className="text-zinc-500 text-sm">Lấy hoạt động hôm nay từ Strava Club feed</p>
      </div>

      <div className="card p-5 border-blue-500/20 bg-blue-500/5">
        <h3 className="font-semibold text-blue-400 mb-2">📌 Thông tin</h3>
        <ul className="text-sm text-zinc-400 space-y-1 list-disc list-inside">
          <li>Hệ thống tự động cào dữ liệu <strong>2 lần/ngày</strong>: 8:00 sáng và 8:00 tối (múi giờ Việt Nam)</li>
          <li>Chỉ cào hoạt động của <strong>ngày hôm nay</strong></li>
          <li>Dữ liệu trùng lặp sẽ tự động bỏ qua</li>
          <li>Tên VĐV phải khớp chính xác với tên trên Strava để được ghi nhận</li>
        </ul>
      </div>

      {/* Challenge list + scrape buttons */}
      <div className="space-y-3">
        {challenges.map(c => {
          const ongoing = isChallengeOngoing(c)
          const hasClub = !!c.stravaClubId
          const canScrape = ongoing && hasClub
          const isSyncing = syncing === c.id

          return (
            <div key={c.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${ongoing ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {!ongoing && <span className="text-xs text-zinc-500">Không đang diễn ra</span>}
                      {ongoing && !hasClub && (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Chưa có Strava Club ID
                        </span>
                      )}
                      {ongoing && hasClub && <span className="text-xs text-zinc-500">CLB: {c.stravaClubId}</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => scrapeChallenge(c.id)}
                  disabled={!canScrape || isSyncing}
                  title={!ongoing ? 'Challenge không đang diễn ra' : !hasClub ? 'Chưa cấu hình Club ID' : ''}
                  className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Đang cào...' : 'Cào ngay'}
                </button>
              </div>
            </div>
          )
        })}
        {challenges.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">Chưa có thử thách nào</p>}
      </div>

      {/* Scrape history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-zinc-300">Lịch sử cào (5 lần gần nhất)</h3>
          <button onClick={fetchLogs} disabled={loadingLogs} className="btn-ghost p-1.5 text-zinc-500 hover:text-zinc-300">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="card p-8 text-center text-zinc-500 text-sm">Chưa có lịch sử cào</div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="card overflow-hidden">
                <button
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${log.success ? 'bg-emerald-500' : log.sessionExpired ? 'bg-amber-500' : 'bg-red-500'}`} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{log.challenge.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${log.triggeredBy === 'cron' ? 'bg-blue-500/15 text-blue-400' : 'bg-zinc-700 text-zinc-400'}`}>
                          {log.triggeredBy === 'cron' ? '⏱ Tự động' : '👤 Thủ công'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{fmtTime(log.createdAt)}
                        </span>
                        {log.success
                          ? <span className="text-xs text-emerald-400">✓ {log.newActivities} hoạt động mới</span>
                          : log.sessionExpired
                          ? <span className="text-xs text-amber-400">⚠ Session hết hạn</span>
                          : <span className="text-xs text-red-400">✗ {log.error}</span>
                        }
                      </div>
                    </div>
                  </div>
                  {expandedLog === log.id ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
                </button>

                {expandedLog === log.id && (
                  <div className="border-t border-zinc-800 p-4">
                    <p className="text-xs text-zinc-500 mb-2 font-mono">Debug log:</p>
                    <pre className="bg-zinc-900 rounded p-3 text-xs font-mono text-zinc-400 overflow-x-auto max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {log.debug.length > 0 ? log.debug.join('\n') : '(Không có log)'}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-2">⏱ Auto Cào (Vercel Cron)</h3>
        <p className="text-zinc-400 text-sm mb-3">
          File <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-orange-400 text-xs">vercel.json</code> đã cấu hình 2 cron job:
        </p>
        <pre className="bg-zinc-800 rounded-lg p-4 text-xs text-zinc-300 overflow-x-auto">
{`{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "0 1 * * *" },
    { "path": "/api/cron/sync", "schedule": "0 13 * * *" }
  ]
}`}
        </pre>
        <p className="text-zinc-500 text-xs mt-2">
          Chạy lúc 8:00 và 20:00 giờ Việt Nam. Thêm biến <code className="text-orange-400">CRON_SECRET</code> trên Vercel để bảo vệ endpoint.
        </p>
      </div>
    </div>
  )
}
