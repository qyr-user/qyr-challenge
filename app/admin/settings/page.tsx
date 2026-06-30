'use client'
import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminSettingsPage() {
  const [stravaSession, setStravaSession] = useState('')
  const [sessionValid, setSessionValid] = useState<boolean | null>(null)
  const [showSession, setShowSession] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(data => {
      setStravaSession(data.strava_session || '')
      setSessionValid(data.strava_session_valid !== 'false')
    })
  }, [])

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strava_session: stravaSession }),
      })
      if (!res.ok) throw new Error()
      // Mark session as valid after update
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strava_session_valid: 'true' }),
      })
      setSessionValid(true)
      toast.success('Đã lưu cài đặt')
    } catch {
      toast.error('Lỗi lưu cài đặt')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Cài đặt hệ thống</h1>
        <p className="text-zinc-500 text-sm">Cấu hình Strava session để cào dữ liệu</p>
      </div>

      {sessionValid === false && (
        <div className="card p-4 border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-semibold">Strava session đã hết hạn!</p>
            <p className="text-zinc-400 text-sm mt-1">
              Truy cập <strong>strava.com</strong>, mở DevTools (F12), tab Application › Cookies,
              copy giá trị cookie <code className="bg-zinc-800 px-1 rounded text-orange-400">_strava4_session</code> và dán vào đây.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={saveSettings} className="card p-6 space-y-6">
        <div>
          <h2 className="font-semibold mb-4 text-zinc-300">Strava Session Cookie</h2>

          <div>
            <label className="label">Giá trị cookie <code className="text-orange-400">_strava4_session</code></label>
            <div className="relative mt-1">
              <input
                type={showSession ? 'text' : 'password'}
                className="input pr-10"
                placeholder="Dán giá trị cookie vào đây..."
                value={stravaSession}
                onChange={e => setStravaSession(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                onClick={() => setShowSession(!showSession)}
              >
                {showSession ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-zinc-600 mt-1.5">
              Session cookie thường có dạng chuỗi ngẫu nhiên dài. Sẽ hết hạn sau vài ngày/tuần.
            </p>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-5">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Hướng dẫn lấy session cookie</h3>
          <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
            <li>Đăng nhập vào <strong>strava.com</strong> trên trình duyệt</li>
            <li>Mở DevTools (F12 hoặc chuột phải → Inspect)</li>
            <li>Chuyển sang tab <strong>Application</strong> (Chrome) hoặc <strong>Storage</strong> (Firefox)</li>
            <li>Mở <strong>Cookies</strong> → <strong>https://www.strava.com</strong></li>
            <li>Tìm và copy giá trị của cookie <code className="bg-zinc-800 px-1 rounded text-orange-400">_strava4_session</code></li>
            <li>Dán vào ô trên và bấm Lưu</li>
          </ol>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {loading ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </div>
      </form>

      <div className="card p-5">
        <h3 className="font-semibold mb-2">Lưu ý về Strava Club ID</h3>
        <p className="text-zinc-400 text-sm">
          Strava Club ID được cài đặt riêng cho từng thử thách. Truy cập{' '}
          <a href="/admin/challenges" className="text-orange-400 hover:text-orange-300">Admin › Thử thách</a>{' '}
          để thêm hoặc chỉnh sửa Club ID cho từng challenge.
        </p>
      </div>
    </div>
  )
}
