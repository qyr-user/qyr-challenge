'use client'
import { useState, useEffect, Suspense } from 'react'
import { Plus, Trash2, Users, Activity, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import { formatDate, formatPace } from '@/app/lib/utils'
import { Tooltip } from '@/app/components/ui/Tooltip'

interface Team { id: number; name: string; challengeId: number; _count: { members: number } }
interface Challenge { id: number; name: string }
interface TeamActivity {
  id: number; name: string; distanceKm: number; paceSeconds?: number | null
  activityDate: string; isValid: boolean; invalidReason?: string | null
  athlete: { name: string }
}

function AdminTeamsContent() {
  const params = useSearchParams()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedChallenge, setSelectedChallenge] = useState(params.get('challengeId') || '')
  const [newTeamName, setNewTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [viewingTeam, setViewingTeam] = useState<number | null>(null)
  const [teamActivities, setTeamActivities] = useState<TeamActivity[]>([])
  const [actLoading, setActLoading] = useState(false)

  useEffect(() => { fetch('/api/challenges').then(r => r.json()).then(setChallenges) }, [])

  useEffect(() => {
    const url = selectedChallenge ? `/api/teams?challengeId=${selectedChallenge}` : '/api/teams'
    fetch(url).then(r => r.json()).then(setTeams)
  }, [selectedChallenge])

  async function createTeam() {
    if (!newTeamName.trim() || !selectedChallenge) {
      toast.error('Nhập tên nhóm và chọn thử thách')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName, challengeId: Number(selectedChallenge) }),
      })
      if (!res.ok) throw new Error()
      toast.success('Tạo nhóm thành công')
      setNewTeamName('')
      fetch(`/api/teams?challengeId=${selectedChallenge}`).then(r => r.json()).then(setTeams)
    } catch {
      toast.error('Lỗi tạo nhóm')
    } finally {
      setLoading(false)
    }
  }

  async function deleteTeam(id: number, name: string) {
    if (!confirm(`Xóa nhóm "${name}"?`)) return
    await fetch(`/api/teams?id=${id}`, { method: 'DELETE' })
    setTeams(t => t.filter(x => x.id !== id))
    toast.success('Đã xóa nhóm')
  }

  async function viewActivities(teamId: number) {
    if (viewingTeam === teamId) { setViewingTeam(null); return }
    setViewingTeam(teamId)
    setActLoading(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/activities`)
      const data = await res.json()
      setTeamActivities(data.activities || [])
    } catch {
      toast.error('Không thể tải hoạt động')
    } finally {
      setActLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quản lý Nhóm</h1>
        <p className="text-zinc-500 text-sm">Tạo nhóm và xem hoạt động thành viên</p>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-4">Tạo nhóm mới</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="label">Chọn thử thách *</label>
            <select className="input" value={selectedChallenge} onChange={e => setSelectedChallenge(e.target.value)}>
              <option value="">-- Tất cả --</option>
              {challenges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tên nhóm *</label>
            <input
              className="input"
              placeholder="VD: Team Alpha"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createTeam()}
            />
          </div>
          <div className="flex items-end">
            <button onClick={createTeam} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Tạo nhóm
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold">{teams.length} nhóm{selectedChallenge ? '' : ' (tất cả)'}</h2>

        {teams.map(team => {
          const challengeName = challenges.find(c => c.id === team.challengeId)?.name
          const isViewing = viewingTeam === team.id

          return (
            <div key={team.id} className="card">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{team.name}</h3>
                  <p className="text-zinc-500 text-sm flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    {team._count.members} thành viên
                    {challengeName && <span className="text-zinc-600">· {challengeName}</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => viewActivities(team.id)} className="btn-ghost text-sm flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    {isViewing ? 'Ẩn' : 'Hoạt động'}
                    {isViewing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <button onClick={() => deleteTeam(team.id, team.name)} className="btn-ghost text-red-400 p-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isViewing && (
                <div className="border-t border-zinc-800 p-4">
                  {actLoading ? (
                    <p className="text-zinc-500 text-sm text-center py-4">Đang tải...</p>
                  ) : (
                    <div>
                      <p className="text-sm text-zinc-500 mb-3">
                        {teamActivities.length} hoạt động
                        ({teamActivities.filter(a => a.isValid).length} hợp lệ,{' '}
                        {teamActivities.filter(a => !a.isValid).length} không hợp lệ)
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                              <th className="text-left pb-2 pr-4">Tên</th>
                              <th className="text-left pb-2 pr-4">VĐV</th>
                              <th className="text-right pb-2 pr-4">Km</th>
                              <th className="text-right pb-2 pr-4">Pace</th>
                              <th className="text-left pb-2 pr-4">Ngày</th>
                              <th className="text-left pb-2">Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/50">
                            {teamActivities.map(a => (
                              <tr key={a.id} className={a.isValid ? '' : 'opacity-60'}>
                                <td className="py-2 pr-4 truncate max-w-[140px]">{a.name}</td>
                                <td className="py-2 pr-4 text-zinc-400 text-xs">{a.athlete.name}</td>
                                <td className="py-2 pr-4 text-right font-mono text-orange-400">{a.distanceKm.toFixed(2)}</td>
                                <td className="py-2 pr-4 text-right font-mono text-zinc-400 text-xs">{formatPace(a.paceSeconds)}</td>
                                <td className="py-2 pr-4 text-zinc-500 text-xs">{formatDate(a.activityDate)}</td>
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
                        {teamActivities.length === 0 && <p className="text-center text-zinc-600 text-sm py-8">Chưa có hoạt động nào</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminTeamsPage() {
  return (
    <Suspense>
      <AdminTeamsContent />
    </Suspense>
  )
}
