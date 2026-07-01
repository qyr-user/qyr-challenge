'use client'
import { useState, useEffect } from 'react'
import { Clock, AlertTriangle, ExternalLink, Play } from 'lucide-react'

interface Challenge { id: number; name: string; isActive: boolean; startDate: string; endDate: string; stravaClubId?: string }

function isChallengeOngoing(c: Challenge) {
  const now = new Date()
  return new Date(c.startDate) <= now && new Date(c.endDate) >= now
}

// Thay bằng URL GitHub repo của bạn
const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || ''

export default function AdminSyncPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])

  useEffect(() => { fetch('/api/challenges').then(r => r.json()).then(setChallenges) }, [])

  const githubActionsUrl = GITHUB_REPO
    ? `${GITHUB_REPO}/actions/workflows/scrape.yml`
    : 'https://github.com'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cào dữ liệu Strava</h1>
        <p className="text-zinc-500 text-sm">Quản lý việc lấy hoạt động từ Strava Club</p>
      </div>

      <div className="card p-5 border-blue-500/20 bg-blue-500/5">
        <h3 className="font-semibold text-blue-400 mb-2">📌 Cơ chế hoạt động</h3>
        <ul className="text-sm text-zinc-400 space-y-1.5 list-disc list-inside">
          <li>Dữ liệu được cào qua <strong>GitHub Actions</strong> chạy Python + Selenium (cần browser thật)</li>
          <li>Tự động chạy <strong>2 lần/ngày</strong>: 8:00 sáng và 8:00 tối (giờ Việt Nam)</li>
          <li>Chỉ cào hoạt động của <strong>ngày hôm nay</strong></li>
          <li>Để cập nhật Strava session mới: vào <a href="/admin/settings" className="text-orange-400 underline">Admin → Cài đặt</a></li>
        </ul>
      </div>

      <div className="card p-5 border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-emerald-400 mb-1">▶ Chạy thủ công ngay</h3>
            <p className="text-sm text-zinc-400">
              Vào GitHub Actions và bấm <strong>"Run workflow"</strong> để cào dữ liệu ngay lập tức.
            </p>
          </div>
          <a
            href={githubActionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center gap-2 text-sm shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            Mở GitHub Actions
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
        {!GITHUB_REPO && (
          <p className="text-xs text-amber-400 mt-3">
            ⚠ Chưa cấu hình <code className="bg-zinc-800 px-1 rounded">NEXT_PUBLIC_GITHUB_REPO</code> — link trên sẽ dẫn về github.com
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-zinc-300">Danh sách Challenge</h3>
        {challenges.map(c => {
          const ongoing = isChallengeOngoing(c)
          const hasClub = !!c.stravaClubId

          return (
            <div key={c.id} className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${ongoing ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                <div className="flex-1">
                  <p className="font-medium">{c.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {!ongoing && <span className="text-xs text-zinc-500">Không đang diễn ra</span>}
                    {ongoing && !hasClub && (
                      <span className="text-xs text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Chưa có Strava Club ID
                      </span>
                    )}
                    {ongoing && hasClub && (
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> CLB: {c.stravaClubId}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  ongoing ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700 text-zinc-500'
                }`}>
                  {ongoing ? 'Đang diễn ra' : 'Không active'}
                </span>
              </div>
            </div>
          )
        })}
        {challenges.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">Chưa có thử thách nào</p>}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-2">⏱ Lịch tự động (Vercel Cron + GitHub Actions)</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-zinc-400">
          <div>
            <p className="text-zinc-300 font-medium mb-2">GitHub Actions (cào data)</p>
            <pre className="bg-zinc-800 rounded p-3 text-xs text-zinc-300 overflow-x-auto">
{`schedule:
  - cron: '0 1 * * *'   # 8:00 VN
  - cron: '0 13 * * *'  # 20:00 VN`}
            </pre>
          </div>
          <div>
            <p className="text-zinc-300 font-medium mb-2">Vercel Cron (dự phòng)</p>
            <pre className="bg-zinc-800 rounded p-3 text-xs text-zinc-300 overflow-x-auto">
{`"crons": [
  { "schedule": "0 1 * * *" },
  { "schedule": "0 13 * * *" }
]`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
