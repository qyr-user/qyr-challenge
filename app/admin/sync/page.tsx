'use client'
import { useState, useEffect } from 'react'
import { RefreshCw, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface Challenge { id: number; name: string; isActive: boolean; startDate: string; endDate: string; stravaClubId?: string }

function isChallengeOngoing(c: Challenge) {
  const now = new Date()
  return new Date(c.startDate) <= now && new Date(c.endDate) >= now
}

export default function AdminSyncPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [syncing, setSyncing] = useState<number | null>(null)
  const [lastSync, setLastSync] = useState<Record<number, string>>({})
  const [results, setResults] = useState<Record<number, string>>({})

  useEffect(() => { fetch('/api/challenges').then(r => r.json()).then(setChallenges) }, [])

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
        setResults(p => ({ ...p, [challengeId]: `Lỗi: ${data.error}` }))
        return
      }
      setLastSync(p => ({ ...p, [challengeId]: new Date().toLocaleTimeString('vi-VN') }))
      setResults(p => ({ ...p, [challengeId]: `✓ ${data.newActivities} hoạt động mới` }))
      toast.success(`Cào xong! ${data.newActivities} hoạt động mới`)
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
          <li>Nút cào thủ công bị vô hiệu nếu challenge không đang diễn ra</li>
          <li>Tên VĐV phải khớp chính xác với tên trên Strava để được ghi nhận</li>
        </ul>
      </div>

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
                      {lastSync[c.id] && (
                        <span className="text-zinc-500 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {lastSync[c.id]}
                        </span>
                      )}
                    </div>
                    {results[c.id] && <p className="text-xs text-emerald-400 mt-1">{results[c.id]}</p>}
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
          Chạy lúc 8:00 và 20:00 giờ Việt Nam (UTC+7 → 01:00 và 13:00 UTC).
          Thêm biến <code className="text-orange-400">CRON_SECRET</code> trên Vercel để bảo vệ endpoint.
        </p>
      </div>
    </div>
  )
}
