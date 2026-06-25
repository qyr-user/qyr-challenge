'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Users, Activity, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import { formatDateTime } from '@/app/lib/utils'

interface Team { id: string; name: string; challengeId: string; _count: { members: number } }
interface Challenge { id: string; name: string }
interface TeamActivities { team: any; activities: any[] }

export default function AdminTeamsPage() {
  const params = useSearchParams()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedChallenge, setSelectedChallenge] = useState(params.get('challengeId') || '')
  const [newTeamName, setNewTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [viewingTeam, setViewingTeam] = useState<string | null>(null)
  const [teamActivities, setTeamActivities] = useState<TeamActivities | null>(null)
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
        body: JSON.stringify({ name: newTeamName, challengeId: selectedChallenge }),
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

  async function deleteTeam(id: string, name: string) {
    if (!confirm(`Xóa nhóm "${name}"? Thao tác này không thể hoàn tác.`)) return
    await fetch(`/api/teams?id=${id}`, { method: 'DELETE' })
    setTeams(t => t.filter(x => x.id !== id))
    toast.success('Đã xóa nhóm')
  }

  async function viewActivities(teamId: string) {
    if (viewingTeam === teamId) { setViewingTeam(null); return }
    setViewingTeam(teamId)
    setActLoading(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/activities`)
      const data = await res.json()
      setTeamActivities(data)
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
                  ) : teamActivities ? (
                    <div>
                      <p className="text-sm text-zinc-500 mb-3">
                        {teamActivities.activities.length} hoạt động
                        ({teamActivities.activities.filter(a => a.isValid).length} hợp lệ,{' '}
                        {teamActivities.activities.filter(a => !a.isValid).length} không hợp lệ)
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                              <th className="text-left pb-2 pr-4">Tên</th>
                              <th className="text-left pb-2 pr-4">VĐV</th>
                              <th className="text-right pb-2 pr-4">Km</th>
                              <th className="text-right pb-2 pr-4">Pace</th>
                              <th className="text-right pb-2 pr-4">HR</th>
                              <th className="text-left pb-2 pr-4">Thời gian</th>
                              <th className="text-left pb-2">Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/50">
                            {teamActivities.activities.map(a => (
                              <tr key={a.id} className={a.isValid ? '' : 'opacity-60'}>
                                <td className="py-2 pr-4 truncate max-w-[140px]">{a.name}</td>
                                <td className="py-2 pr-4 text-zinc-400 text-xs">{a.stravaToken?.athleteName || '—'}</td>
                                <td className="py-2 pr-4 text-right font-mono text-orange-400">{a.distanceKm.toFixed(2)}</td>
                                <td className="py-2 pr-4 text-right font-mono text-zinc-400 text-xs">
                                  {a.paceSeconds ? `${Math.floor(a.paceSeconds / 60)}:${(a.paceSeconds % 60).toString().padStart(2, '0')}` : '--'}
                                </td>
                                <td className="py-2 pr-4 text-right text-zinc-400 text-xs">
                                  {a.averageHeartRate ? Math.round(a.averageHeartRate) : '--'}
                                </td>
                                <td className="py-2 pr-4 text-zinc-500 text-xs">{formatDateTime(a.startDate)}</td>
                                <td className="py-2">
                                  {a.isValid ? (
                                    <span className="badge-valid">✓ Hợp lệ</span>
                                  ) : (
                                    <span className="badge-invalid" title={a.invalidReason || ''}>✗ Không hợp lệ</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
