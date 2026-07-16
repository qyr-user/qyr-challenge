'use client'
import { useState, useEffect } from 'react'
import { UserX, Search, Users, Plus, Trash2, Pencil, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { getInitials } from '@/app/lib/utils'

interface Athlete {
  id: number; name: string; gender: 'MALE' | 'FEMALE'
  teamMembers: Array<{ team: { id: number; name: string; challenge: { id: number; name: string } } }>
}
interface Team { id: number; name: string; challengeId: number }
interface Challenge { id: number; name: string }
interface AthleteStatus {
  athleteId: number
  completed: boolean
  reasons: string[]
  failedDays: string[]
  failedWeeks: string[]
}

export default function AdminMembersPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [selectedChallenge, setSelectedChallenge] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newGender, setNewGender] = useState<'MALE' | 'FEMALE'>('MALE')
  const [creating, setCreating] = useState(false)
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null)
  const [editForm, setEditForm] = useState({ name: '', gender: 'MALE' as 'MALE' | 'FEMALE' })
  const [showManualModal, setShowManualModal] = useState(false)
  const [statusMap, setStatusMap] = useState<Record<number, AthleteStatus>>({})
  const [statusReason, setStatusReason] = useState<AthleteStatus | null>(null)
  const [manualForm, setManualForm] = useState({
    athleteId: 0,
    athleteName: '',
    challengeId: 0,
    activityDate: new Date().toISOString().slice(0, 10),
    name: '',
    distanceKm: '',
    movingTime: '',
  })

  useEffect(() => {
    fetch('/api/athletes').then(r => r.json()).then(setAthletes)
    fetch('/api/teams').then(r => r.json()).then(setTeams)
    fetch('/api/challenges').then(r => r.json()).then(setChallenges)
  }, [])

  useEffect(() => {
    if (!selectedChallenge) {
      setStatusMap({})
      return
    }

    fetch(`/api/challenges/${selectedChallenge}/athlete-status`)
      .then(r => r.json())
      .then((rows: AthleteStatus[]) => {
        const next: Record<number, AthleteStatus> = {}
        for (const row of rows) next[row.athleteId] = row
        setStatusMap(next)
      })
      .catch(() => setStatusMap({}))
  }, [selectedChallenge, athletes])

  async function refreshAthletes() {
    const updated = await fetch('/api/athletes').then(r => r.json())
    setAthletes(updated)
  }

  async function createAthlete(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), gender: newGender }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || 'Lỗi tạo VĐV')
        return
      }
      toast.success('Đã tạo vận động viên')
      setNewName('')
      setNewGender('MALE')
      await refreshAthletes()
    } finally {
      setCreating(false)
    }
  }

  async function deleteAthlete(id: number, name: string) {
    if (!confirm(`Xóa vận động viên "${name}"?`)) return
    await fetch(`/api/athletes?id=${id}`, { method: 'DELETE' })
    setAthletes(prev => prev.filter(a => a.id !== id))
    toast.success('Đã xóa')
  }

  const filteredAthletes = athletes.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )
  const teamsForChallenge = teams.filter(t =>
    selectedChallenge ? t.challengeId === Number(selectedChallenge) : true
  )

  function getAthleteTeamInChallenge(athlete: Athlete, challengeId: string) {
    return athlete.teamMembers.find(tm => tm.team.challenge.id === Number(challengeId))?.team
  }

  async function assignToTeam(athleteId: number, teamId: number) {
    setLoading(`${athleteId}-${teamId}`)
    try {
      const res = await fetch('/api/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId, teamId }),
      })
      if (!res.ok) throw new Error()
      toast.success('Đã thêm vào nhóm')
      await refreshAthletes()
    } catch {
      toast.error('Lỗi xảy ra')
    } finally {
      setLoading(null)
    }
  }

  async function removeFromTeam(athleteId: number, teamId: number) {
    setLoading(`${athleteId}-${teamId}`)
    try {
      const res = await fetch('/api/team-members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId, teamId }),
      })
      if (!res.ok) throw new Error()
      toast.success('Đã xóa khỏi nhóm')
      await refreshAthletes()
    } catch {
      toast.error('Lỗi xảy ra')
    } finally {
      setLoading(null)
    }
  }

  function openEditAthlete(athlete: Athlete) {
    setEditingAthlete(athlete)
    setEditForm({ name: athlete.name, gender: athlete.gender })
  }

  async function submitEditAthlete(e: React.FormEvent) {
    e.preventDefault()
    if (!editingAthlete) return

    setLoading(`edit-${editingAthlete.id}`)
    try {
      const res = await fetch('/api/athletes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingAthlete.id, name: editForm.name.trim(), gender: editForm.gender }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Không thể cập nhật VĐV')
        return
      }

      toast.success('Đã cập nhật vận động viên')
      setEditingAthlete(null)
      await refreshAthletes()
    } finally {
      setLoading(null)
    }
  }

  function openManualModal(athlete: Athlete) {
    if (!selectedChallenge) {
      toast.error('Vui lòng chọn thử thách trước')
      return
    }

    const currentTeam = getAthleteTeamInChallenge(athlete, selectedChallenge)
    if (!currentTeam) {
      toast.error('VĐV chưa có nhóm trong thử thách này')
      return
    }

    setManualForm({
      athleteId: athlete.id,
      athleteName: athlete.name,
      challengeId: Number(selectedChallenge),
      activityDate: new Date().toISOString().slice(0, 10),
      name: '',
      distanceKm: '',
      movingTime: '',
    })
    setShowManualModal(true)
  }

  async function submitManualActivity(e: React.FormEvent) {
    e.preventDefault()
    if (!manualForm.name.trim() || !manualForm.distanceKm.trim() || !manualForm.movingTime.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin')
      return
    }

    setLoading(`manual-${manualForm.athleteId}`)
    try {
      const res = await fetch('/api/activities/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: manualForm.athleteId,
          challengeId: manualForm.challengeId,
          activityDate: manualForm.activityDate,
          name: manualForm.name.trim(),
          distanceKm: Number(manualForm.distanceKm),
          movingTime: manualForm.movingTime.trim(),
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Không thể lưu hoạt động')
        return
      }

      toast.success('Đã lưu hoạt động thủ công')
      setShowManualModal(false)
      setManualForm({
        athleteId: 0,
        athleteName: '',
        challengeId: 0,
        activityDate: new Date().toISOString().slice(0, 10),
        name: '',
        distanceKm: '',
        movingTime: '',
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quản lý Vận động viên</h1>
        <p className="text-zinc-500 text-sm">Thêm VĐV và phân vào nhóm. Tên phải khớp chính xác với Strava (phân biệt hoa thường, dấu).</p>
      </div>

      {/* Create athlete */}
      <form onSubmit={createAthlete} className="card p-4 flex gap-3">
        <input
          className="input flex-1"
          placeholder="Tên VĐV (VD: Nguyễn Văn A) — phải chính xác với tên trên Strava"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <select className="input w-36" value={newGender} onChange={e => setNewGender(e.target.value as 'MALE' | 'FEMALE')}>
          <option value="MALE">Nam</option>
          <option value="FEMALE">Nữ</option>
        </select>
        <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Thêm VĐV
        </button>
      </form>

      {/* Filters */}
      <div className="card p-4 grid md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input className="input pl-9" placeholder="Tìm kiếm VĐV..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" value={selectedChallenge} onChange={e => setSelectedChallenge(e.target.value)}>
          <option value="">-- Lọc theo thử thách --</option>
          {challenges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <p className="text-sm text-zinc-500">{athletes.length} vận động viên</p>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                <th className="text-left px-4 py-3">Vận động viên</th>
                <th className="text-left px-4 py-3">Giới tính</th>
                <th className="text-left px-4 py-3">{selectedChallenge ? 'Nhóm hiện tại' : 'Nhóm tham gia'}</th>
                {selectedChallenge && <th className="text-left px-4 py-3">Phân nhóm</th>}
                {selectedChallenge && <th className="text-left px-4 py-3">Nhập hđ thủ công</th>}
                {selectedChallenge && <th className="text-left px-4 py-3">Trạng thái</th>}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredAthletes.map(athlete => {
                const initials = getInitials(athlete.name)
                const currentTeam = selectedChallenge ? getAthleteTeamInChallenge(athlete, selectedChallenge) : null

                return (
                  <tr key={athlete.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-400">
                          {initials}
                        </div>
                        <span className="font-medium">{athlete.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-300">
                        {athlete.gender === 'FEMALE' ? 'Nữ' : 'Nam'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {selectedChallenge ? (
                        currentTeam ? (
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-medium">{currentTeam.name}</span>
                            <button
                              onClick={() => removeFromTeam(athlete.id, currentTeam.id)}
                              disabled={loading === `${athlete.id}-${currentTeam.id}`}
                              className="text-red-400 hover:text-red-300"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-xs">Chưa có nhóm</span>
                        )
                      ) : (
                        <div className="text-xs text-zinc-400 space-y-0.5">
                          {athlete.teamMembers.slice(0, 3).map(tm => (
                            <div key={tm.team.id}>
                              <span className="text-zinc-300">{tm.team.name}</span>
                              <span className="text-zinc-600"> · {tm.team.challenge.name}</span>
                            </div>
                          ))}
                          {athlete.teamMembers.length === 0 && <span className="text-zinc-600">Chưa có nhóm</span>}
                        </div>
                      )}
                    </td>
                    {selectedChallenge && (
                      <td className="px-4 py-3">
                        <select
                          className="input text-xs py-1.5 w-40"
                          value={currentTeam?.id || ''}
                          onChange={e => e.target.value && assignToTeam(athlete.id, Number(e.target.value))}
                          disabled={!!loading}
                        >
                          <option value="">-- Chọn nhóm --</option>
                          {teamsForChallenge.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>
                    )}
                    {selectedChallenge && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openManualModal(athlete)}
                          className="btn-secondary text-xs py-1.5"
                          disabled={!!loading}
                        >
                          Nhập hđ
                        </button>
                      </td>
                    )}
                    {selectedChallenge && (
                      <td className="px-4 py-3">
                        {currentTeam ? (
                          (() => {
                            const s = statusMap[athlete.id]
                            if (!s) return <span className="text-xs text-zinc-500">Đang tính...</span>
                            if (s.completed) {
                              return (
                                <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                                  <CheckCircle2 className="w-4 h-4" /> Hoàn thành
                                </span>
                              )
                            }
                            return (
                              <button
                                onClick={() => setStatusReason(s)}
                                className="inline-flex items-center gap-1 text-red-400 text-xs font-medium hover:text-red-300"
                              >
                                <XCircle className="w-4 h-4" /> Chưa hoàn thành
                              </button>
                            )
                          })()
                        ) : (
                          <span className="text-xs text-zinc-600">--</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEditAthlete(athlete)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteAthlete(athlete.id, athlete.name)} className="text-zinc-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredAthletes.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Chưa có vận động viên nào</p>
            </div>
          )}
        </div>
      </div>

      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-1">Nhập hoạt động thủ công</h3>
            <p className="text-sm text-zinc-500 mb-4">VĐV: {manualForm.athleteName}</p>

            <form onSubmit={submitManualActivity} className="space-y-4">
              <div>
                <label className="label">Ngày</label>
                <input
                  className="input"
                  type="date"
                  value={manualForm.activityDate}
                  onChange={e => setManualForm(prev => ({ ...prev, activityDate: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label">Tên hoạt động chạy</label>
                <input
                  className="input"
                  value={manualForm.name}
                  onChange={e => setManualForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="VD: Morning Run"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Khoảng cách (km)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualForm.distanceKm}
                    onChange={e => setManualForm(prev => ({ ...prev, distanceKm: e.target.value }))}
                    placeholder="VD: 5.5"
                    required
                  />
                </div>
                <div>
                  <label className="label">Thời gian</label>
                  <input
                    className="input"
                    value={manualForm.movingTime}
                    onChange={e => setManualForm(prev => ({ ...prev, movingTime: e.target.value }))}
                    placeholder="VD: 45:30 hoặc 2730"
                    required
                  />
                </div>
              </div>

              <p className="text-xs text-zinc-500">
                Định dạng thời gian: giây hoặc mm:ss hoặc hh:mm:ss. Hệ thống sẽ tự tính pace và kiểm tra hợp lệ theo challenge.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowManualModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={!!loading}>
                  {loading === `manual-${manualForm.athleteId}` ? 'Đang lưu...' : 'Lưu hoạt động'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingAthlete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Chỉnh sửa vận động viên</h3>
            <form onSubmit={submitEditAthlete} className="space-y-4">
              <div>
                <label className="label">Tên VĐV</label>
                <input
                  className="input"
                  value={editForm.name}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Giới tính</label>
                <select
                  className="input"
                  value={editForm.gender}
                  onChange={e => setEditForm(prev => ({ ...prev, gender: e.target.value as 'MALE' | 'FEMALE' }))}
                >
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setEditingAthlete(null)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={loading === `edit-${editingAthlete.id}`}>
                  {loading === `edit-${editingAthlete.id}` ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {statusReason && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="card w-full max-w-2xl p-6 max-h-[85vh] overflow-auto">
            <h3 className="text-lg font-semibold mb-3 text-red-400">Lý do chưa hoàn thành</h3>
            <div className="space-y-3 text-sm">
              {statusReason.reasons.length > 0 && (
                <div>
                  <p className="text-zinc-300 font-medium mb-1">Tổng quan</p>
                  <ul className="list-disc ml-5 text-zinc-400 space-y-1">
                    {statusReason.reasons.map((r, idx) => <li key={`${r}-${idx}`}>{r}</li>)}
                  </ul>
                </div>
              )}

              {statusReason.failedDays.length > 0 && (
                <div>
                  <p className="text-zinc-300 font-medium mb-1">Ngày chưa đạt minActivitiesPerDay</p>
                  <ul className="list-disc ml-5 text-zinc-400 space-y-1">
                    {statusReason.failedDays.map((d, idx) => <li key={`${d}-${idx}`}>{d}</li>)}
                  </ul>
                </div>
              )}

              {statusReason.failedWeeks.length > 0 && (
                <div>
                  <p className="text-zinc-300 font-medium mb-1">Tuần chưa đạt số lần chạy tối thiểu</p>
                  <ul className="list-disc ml-5 text-zinc-400 space-y-1">
                    {statusReason.failedWeeks.map((w, idx) => <li key={`${w}-${idx}`}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-5">
              <button className="btn-secondary" onClick={() => setStatusReason(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
