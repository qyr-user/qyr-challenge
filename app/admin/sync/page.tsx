'use client'
import { useState, useEffect } from 'react'
import { RefreshCw, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface Challenge { id: string; name: string; isActive: boolean }

export default function AdminSyncPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [syncing, setSyncing] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Record<string, string>>({})

  useEffect(() => { fetch('/api/challenges').then(r => r.json()).then(setChallenges) }, [])

  async function syncChallenge(challengeId?: string) {
    const key = challengeId || 'all'
    setSyncing(key)
    try {
      const res = await fetch('/api/strava/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      })
      if (!res.ok) throw new Error()
      setLastSync(p => ({ ...p, [key]: new Date().toLocaleTimeString('vi-VN') }))
      toast.success(challengeId ? 'Đồng bộ thành công' : 'Đã đồng bộ tất cả thử thách')
    } catch {
      toast.error('Đồng bộ thất bại')
    } finally {
      setSyncing(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Đồng bộ Strava</h1>
        <p className="text-zinc-500 text-sm">Kéo hoạt động mới nhất từ Strava về hệ thống</p>
      </div>

      <div className="card p-5 border-blue-500/20 bg-blue-500/5">
        <h3 className="font-semibold text-blue-400 mb-2">📌 Lưu ý</h3>
        <ul className="text-sm text-zinc-400 space-y-1 list-disc list-inside">
          <li>Hệ thống tự động đồng bộ mỗi 6 giờ qua Vercel Cron (nếu đã cấu hình)</li>
          <li>Bấm "Đồng bộ ngay" để cập nhật thủ công</li>
          <li>Chỉ đồng bộ hoạt động chạy bộ (Run) trong khoảng thời gian của thử thách</li>
          <li>Hoạt động vi phạm quy tắc sẽ được đánh dấu "Không hợp lệ"</li>
        </ul>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Đồng bộ tất cả thử thách đang active</h3>
            {lastSync['all'] && (
              <p className="text-zinc-500 text-sm flex items-center gap-1 mt-1">
                <Clock className="w-3.5 h-3.5" /> Lần cuối: {lastSync['all']}
              </p>
            )}
          </div>
          <button onClick={() => syncChallenge()} disabled={!!syncing} className="btn-primary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${syncing === 'all' ? 'animate-spin' : ''}`} />
            {syncing === 'all' ? 'Đang đồng bộ...' : 'Đồng bộ tất cả'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-zinc-400 text-sm uppercase tracking-wider">Đồng bộ theo thử thách</h2>
        {challenges.map(c => (
          <div key={c.id} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${c.isActive ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
              <div>
                <p className="font-medium">{c.name}</p>
                {lastSync[c.id] && (
                  <p className="text-zinc-500 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Lần cuối: {lastSync[c.id]}
                  </p>
                )}
              </div>
            </div>
            <button onClick={() => syncChallenge(c.id)} disabled={!!syncing} className="btn-secondary flex items-center gap-2 text-sm">
              <RefreshCw className={`w-3.5 h-3.5 ${syncing === c.id ? 'animate-spin' : ''}`} />
              {syncing === c.id ? 'Đang sync...' : 'Sync ngay'}
            </button>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-3">⏱ Cấu hình Auto Sync (Vercel Cron)</h3>
        <p className="text-zinc-400 text-sm mb-3">
          File <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-orange-400 text-xs">vercel.json</code> đã có sẵn ở root project:
        </p>
        <pre className="bg-zinc-800 rounded-lg p-4 text-xs text-zinc-300 overflow-x-auto">
{`{
  "crons": [
    { "path": "/api/strava/sync", "schedule": "0 */6 * * *" }
  ]
}`}
        </pre>
        <p className="text-zinc-500 text-xs mt-2">
          Thêm biến môi trường <code className="text-orange-400">CRON_SECRET</code> trên Vercel để bảo vệ endpoint cron.
        </p>
      </div>
    </div>
  )
}
