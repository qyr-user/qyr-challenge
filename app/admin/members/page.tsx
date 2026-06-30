'use client'
import { useState, useEffect } from 'react'
import { UserX, Search, Users, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getInitials } from '@/app/lib/utils'

interface Athlete {
  id: number; name: string
  teamMembers: Array<{ team: { id: number; name: string; challenge: { id: number; name: string } } }>
}
interface Team { id: number; name: string; challengeId: number }
interface Challenge { id: number; name: string }

export default function AdminMembersPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [selectedChallenge, setSelectedChallenge] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/athletes').then(r => r.json()).then(setAthletes)
    fetch('/api/teams').then(r => r.json()).then(setTeams)
    fetch('/api/challenges').then(r => r.json()).then(setChallenges)
  }, [])

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
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || 'Lỗi tạo VĐV')
        return
      }
      toast.success('Đã tạo vận động viên')
      setNewName('')
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
                <th className="text-left px-4 py-3">{selectedChallenge ? 'Nhóm hiện tại' : 'Nhóm tham gia'}</th>
                {selectedChallenge && <th className="text-left px-4 py-3">Phân nhóm</th>}
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
                    <td className="px-4 py-3">
                      <button onClick={() => deleteAthlete(athlete.id, athlete.name)} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
    </div>
  )
}
