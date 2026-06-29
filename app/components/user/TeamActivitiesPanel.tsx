'use client'
import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { formatDateTime } from '@/app/lib/utils'

interface Activity {
  id: string
  name: string
  distanceKm: number
  paceSeconds: number | null
  averageHeartRate: number | null
  startDate: string
  isValid: boolean
  invalidReason: string | null
  stravaToken: { athleteName: string | null; athletePhoto: string | null } | null
}

interface ApiResponse {
  teamName: string
  activities: Activity[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

export function TeamActivitiesPanel({ teamId }: { teamId: string }) {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<'all' | 'valid' | 'invalid'>('all')
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/public/teams/${teamId}/activities?page=${page}&pageSize=10&filter=${filter}`)
      const json = await res.json()
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [teamId, page, filter])

  useEffect(() => { fetchData() }, [fetchData])

  function changeFilter(f: 'all' | 'valid' | 'invalid') {
    setFilter(f)
    setPage(1)
  }

  return (
    <div className="border-t border-zinc-800 p-4 bg-zinc-950/40">
      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'valid', label: '✓ Hợp lệ' },
          { key: 'invalid', label: '✗ Không hợp lệ' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => changeFilter(t.key as any)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              filter === t.key
                ? 'bg-orange-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-zinc-500 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Đang tải hoạt động...
        </div>
      ) : !data || data.activities.length === 0 ? (
        <p className="text-zinc-500 text-sm text-center py-8">Không có hoạt động nào</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                  <th className="text-left pb-2 pr-4">Tên hoạt động</th>
                  <th className="text-left pb-2 pr-4">VĐV</th>
                  <th className="text-right pb-2 pr-4">Km</th>
                  <th className="text-right pb-2 pr-4">Pace</th>
                  <th className="text-right pb-2 pr-4">HR</th>
                  <th className="text-left pb-2 pr-4">Thời gian</th>
                  <th className="text-left pb-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {data.activities.map(a => (
                  <tr key={a.id} className={a.isValid ? '' : 'opacity-60'}>
                    <td className="py-2 pr-4 truncate max-w-[160px]">{a.name}</td>
                    <td className="py-2 pr-4 text-zinc-400 text-xs whitespace-nowrap">
                      {a.stravaToken?.athleteName || '—'}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-orange-400">
                      {a.distanceKm.toFixed(2)}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-zinc-400 text-xs">
                      {a.paceSeconds
                        ? `${Math.floor(a.paceSeconds / 60)}:${(a.paceSeconds % 60).toString().padStart(2, '0')}`
                        : '--'}
                    </td>
                    <td className="py-2 pr-4 text-right text-zinc-400 text-xs">
                      {a.averageHeartRate ? Math.round(a.averageHeartRate) : '--'}
                    </td>
                    <td className="py-2 pr-4 text-zinc-500 text-xs whitespace-nowrap">
                      {formatDateTime(a.startDate)}
                    </td>
                    <td className="py-2">
                      {a.isValid ? (
                        <span className="badge-valid">✓ Hợp lệ</span>
                      ) : (
                        <span className="badge-invalid" title={a.invalidReason || ''}>
                          ✗ Không hợp lệ
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/50">
            <p className="text-zinc-500 text-xs">
              {data.pagination.total} hoạt động · Trang {data.pagination.page}/{data.pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-ghost p-1.5 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page >= data.pagination.totalPages}
                className="btn-ghost p-1.5 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}