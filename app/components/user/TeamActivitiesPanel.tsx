'use client'
import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { formatDate, formatPace } from '@/app/lib/utils'
import { Tooltip } from '@/app/components/ui/Tooltip'

interface Activity {
  id: number
  name: string
  distanceKm: number
  paceSeconds: number | null
  activityDate: string
  isValid: boolean
  invalidReason: string | null
  athlete: { name: string }
}

interface ApiResponse {
  teamName: string
  activities: Activity[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

export function TeamActivitiesPanel({ teamId }: { teamId: number }) {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<'all' | 'valid' | 'invalid'>('all')
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/public/teams/${teamId}/activities?page=${page}&pageSize=10&filter=${filter}`)
      setData(await res.json())
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
      <div className="flex items-center gap-2 mb-4">
        {([['all', 'Tất cả'], ['valid', '✓ Hợp lệ'], ['invalid', '✗ Không hợp lệ']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => changeFilter(key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              filter === key ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {label}
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
                  <th className="text-left pb-2 pr-4">Ngày</th>
                  <th className="text-left pb-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {data.activities.map(a => (
                  <tr key={a.id} className={a.isValid ? '' : 'opacity-60'}>
                    <td className="py-2 pr-4 truncate max-w-[160px]">{a.name}</td>
                    <td className="py-2 pr-4 text-zinc-400 text-xs whitespace-nowrap">{a.athlete.name}</td>
                    <td className="py-2 pr-4 text-right font-mono text-orange-400">{a.distanceKm.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-right font-mono text-zinc-400 text-xs">{formatPace(a.paceSeconds)}</td>
                    <td className="py-2 pr-4 text-zinc-500 text-xs whitespace-nowrap">{formatDate(a.activityDate)}</td>
                    <td className="py-2">
                      {a.isValid ? (
                        <span className="badge-valid">✓ Hợp lệ</span>
                      ) : (
                        <Tooltip content={a.invalidReason || ''}>
                          <span className="badge-invalid cursor-help">✗ Không hợp lệ</span>
                        </Tooltip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/50">
            <p className="text-zinc-500 text-xs">
              {data.pagination.total} hoạt động · Trang {data.pagination.page}/{data.pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost p-1.5 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))} disabled={page >= data.pagination.totalPages} className="btn-ghost p-1.5 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
