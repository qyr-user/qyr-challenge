'use client'
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Clock, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Github } from 'lucide-react'

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

const GITHUB_REPO = 'qyr-user/qyr-challenge'
const GITHUB_ACTIONS_URL = `https://github.com/${GITHUB_REPO}/actions/workflows/scrape.yml`

export default function AdminSyncPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
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

  const ongoingChallenges = challenges.filter(isChallengeOngoing)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cào dữ liệu Strava</h1>
        <p className="text-zinc-500 text-sm">Dữ liệu được cào tự động qua GitHub Actions</p>
      </div>

      {/* Status card */}
      <div className="card p-5 border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-emerald-400 mb-1">⏱ Lịch cào tự động</h3>
            <ul className="text-sm text-zinc-400 space-y-1">
              <li>• <strong>8:00 sáng</strong> giờ Việt Nam (hàng ngày)</li>
              <li>• <strong>8:00 tối</strong> giờ Việt Nam (hàng ngày)</li>
              <li>• <strong>11:50 tối</strong> giờ Việt Nam (hàng ngày)</li>
              <li className="text-zinc-500 text-xs mt-2">Dùng Selenium + Chrome thật → lấy được dữ liệu từ Strava</li>
            </ul>
          </div>
          <a
            href={GITHUB_ACTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2 text-sm shrink-0"
          >
            <Github className="w-4 h-4" />
            Xem trên GitHub
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Manual trigger guide */}
      <div className="card p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Github className="w-4 h-4 text-zinc-400" />
          Cào thủ công qua GitHub Actions
        </h3>
        <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside mb-4">
          <li>Truy cập trang <a href={GITHUB_ACTIONS_URL} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-1">GitHub Actions — Strava Scraper <ExternalLink className="w-3 h-3" /></a></li>
          <li>Nhấn nút <strong className="text-zinc-300">Run workflow</strong> (góc phải)</li>
          <li>Chọn branch <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-orange-400">main</code> → nhấn <strong className="text-zinc-300">Run workflow</strong></li>
          <li>Đợi ~2 phút, kết quả sẽ xuất hiện trong lịch sử bên dưới</li>
        </ol>
        <div className="bg-zinc-900 rounded p-3 text-xs text-zinc-500 border border-zinc-800">
          <strong className="text-zinc-400">Lý do không dùng nút thủ công trực tiếp:</strong> Strava render feed bằng JavaScript,
          server-side <code>fetch()</code> không lấy được dữ liệu. Chỉ trình duyệt thật (Selenium) mới hoạt động,
          và Selenium cần chạy trên GitHub Actions runner — không thể chạy trên Vercel.
        </div>
      </div>

      {/* Active challenges status */}
      {challenges.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-zinc-300 text-sm uppercase tracking-wide">Challenge đang diễn ra</h3>
          {ongoingChallenges.length === 0 ? (
            <p className="text-zinc-500 text-sm">Không có challenge nào đang diễn ra</p>
          ) : (
            ongoingChallenges.map(c => (
              <div key={c.id} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <p className="font-medium">{c.name}</p>
                    {c.stravaClubId ? (
                      <p className="text-xs text-zinc-500">Club ID: {c.stravaClubId}</p>
                    ) : (
                      <p className="text-xs text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Chưa có Strava Club ID — vào <a href="/admin/challenges" className="underline">Thử thách</a> để cấu hình
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

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

      {/* Secrets guide */}
      <div className="card p-5 border-zinc-700">
        <h3 className="font-semibold mb-3">🔑 GitHub Secrets cần cấu hình</h3>
        <p className="text-zinc-400 text-sm mb-3">
          Vào <strong>GitHub repo → Settings → Secrets and variables → Actions</strong> và thêm:
        </p>
        <div className="space-y-2">
          {[
            { name: 'APP_BASE_URL', desc: 'URL Vercel app, ví dụ: https://your-app.vercel.app' },
            { name: 'SCRAPE_IMPORT_SECRET', desc: 'Chuỗi bí mật tự đặt, khớp với biến trong Vercel' },
          ].map(s => (
            <div key={s.name} className="flex items-start gap-3 bg-zinc-800/50 rounded p-3">
              <code className="text-orange-400 text-sm font-mono shrink-0">{s.name}</code>
              <span className="text-zinc-400 text-sm">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
