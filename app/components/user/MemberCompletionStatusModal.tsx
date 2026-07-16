'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

export interface MemberCompletionStatus {
  athleteId: number
  name: string
  completed: boolean
  reasons: string[]
}

type StatusFilter = 'all' | 'completed' | 'incomplete'

export function MemberCompletionStatusModal({ statuses }: { statuses: MemberCompletionStatus[] }) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    if (filter === 'completed') return statuses.filter(s => s.completed)
    if (filter === 'incomplete') return statuses.filter(s => !s.completed)
    return statuses
  }, [filter, statuses])

  return (
    <>
      <button className="btn-secondary text-xs w-fit mt-1" onClick={() => setOpen(true)}>
        Trạng thái hoàn thành của thành viên
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="card w-full max-w-4xl p-5 max-h-[88vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4 gap-4">
              <h3 className="text-lg font-semibold">Trạng thái hoàn thành của thành viên</h3>
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-500">Lọc trạng thái</label>
                <select
                  className="input text-sm py-1.5 w-44"
                  value={filter}
                  onChange={e => setFilter(e.target.value as StatusFilter)}
                >
                  <option value="all">Tất cả</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="incomplete">Chưa hoàn thành</option>
                </select>
              </div>
            </div>

            <div className="overflow-auto border border-zinc-800 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs bg-zinc-900/50">
                    <th className="text-left px-4 py-3">Tên</th>
                    <th className="text-left px-4 py-3">Trạng thái</th>
                    <th className="text-left px-4 py-3">Lý do không đạt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filtered.map(member => (
                    <tr key={member.athleteId} className="align-top">
                      <td className="px-4 py-3 font-medium">{member.name}</td>
                      <td className="px-4 py-3">
                        {member.completed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" /> Hoàn thành
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400">
                            <XCircle className="w-4 h-4" /> Chưa hoàn thành
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 whitespace-pre-line">
                        {member.completed ? '--' : member.reasons.join('\n') || '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="py-10 text-center text-zinc-500 text-sm">Không có dữ liệu theo bộ lọc hiện tại.</div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button className="btn-secondary" onClick={() => setOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
