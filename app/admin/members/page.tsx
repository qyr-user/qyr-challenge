'use client'
import { useState, useEffect } from 'react'
import { UserX, Search, Users } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string; name?: string; email?: string; image?: string
  stravaToken?: { athleteName?: string; athletePhoto?: string; stravaAthleteId: string }
  teamMembers: Array<{ team: { id: string; name: string; challenge: { id: string; name: string } } }>
}
interface Team { id: string; name: string; challengeId: string }
interface Challenge { id: string; name: string }

export default function AdminMembersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [selectedChallenge, setSelectedChallenge] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers)
    fetch('/api/teams').then(r => r.json()).then(setTeams)
    fetch('/api/challenges').then(r => r.json()).then(setChallenges)
  }, [])

  const filteredUsers = users.filter(u => {
    const name = u.stravaToken?.athleteName || u.name || ''
    return name.toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase())
  })

  const teamsForChallenge = teams.filter(t => (selectedChallenge ? t.challengeId === selectedChallenge : true))

  function getUserTeamInChallenge(user: User, challengeId: string) {
    return user.teamMembers.find(tm => tm.team.challenge.id === challengeId)?.team
  }

  async function refreshUsers() {
    const updated = await fetch('/api/users').then(r => r.json())
    setUsers(updated)
  }

  async function assignToTeam(userId: string, teamId: string) {
    setLoading(userId + teamId)
    try {
      const res = await fetch('/api/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, teamId }),
      })
      if (!res.ok) throw new Error()
      toast.success('Đã thêm vào nhóm')
      await refreshUsers()
    } catch {
      toast.error('Lỗi xảy ra')
    } finally {
      setLoading(null)
    }
  }

  async function removeFromTeam(userId: string, teamId: string) {
    setLoading(userId + teamId)
    try {
      const res = await fetch('/api/team-members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, teamId }),
      })
      if (!res.ok) throw new Error()
      toast.success('Đã xóa khỏi nhóm')
      await refreshUsers()
    } catch {
      toast.error('Lỗi xảy ra')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quản lý Thành viên</h1>
        <p className="text-zinc-500 text-sm">Assign người dùng vào nhóm của từng thử thách</p>
      </div>

      <div className="card p-4 grid md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input className="input pl-9" placeholder="Tìm kiếm người dùng..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div>
          <select className="input" value={selectedChallenge} onChange={e => setSelectedChallenge(e.target.value)}>
            <option value="">-- Chọn thử thách --</option>
            {challenges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-4 text-sm text-zinc-400">
        <span>{users.length} người dùng</span>
        <span>·</span>
        <span>{users.filter(u => u.stravaToken).length} đã kết nối Strava</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                <th className="text-left px-4 py-3">Người dùng</th>
                <th className="text-left px-4 py-3">Strava</th>
                <th className="text-left px-4 py-3">{selectedChallenge ? 'Nhóm hiện tại' : 'Nhóm tham gia'}</th>
                {selectedChallenge && <th className="text-left px-4 py-3">Phân nhóm</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredUsers.map(user => {
                const displayName = user.stravaToken?.athleteName || user.name || 'Unknown'
                const photo = user.stravaToken?.athletePhoto || user.image
                const currentTeam = selectedChallenge ? getUserTeamInChallenge(user, selectedChallenge) : null

                return (
                  <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {photo ? (
                          <img src={photo} alt="" className="w-8 h-8 rounded-full border border-zinc-700" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs">{displayName[0]}</div>
                        )}
                        <div>
                          <p className="font-medium">{displayName}</p>
                          <p className="text-zinc-600 text-xs">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.stravaToken ? <span className="badge-valid">✓ Kết nối</span> : <span className="badge-invalid">✗ Chưa kết nối</span>}
                    </td>
                    <td className="px-4 py-3">
                      {selectedChallenge ? (
                        currentTeam ? (
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-medium">{currentTeam.name}</span>
                            <button onClick={() => removeFromTeam(user.id, currentTeam.id)} disabled={loading === user.id + currentTeam.id} className="text-red-400 hover:text-red-300 text-xs">
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-xs">Chưa có nhóm</span>
                        )
                      ) : (
                        <div className="text-xs text-zinc-400 space-y-0.5">
                          {user.teamMembers.slice(0, 3).map(tm => (
                            <div key={tm.team.id}>
                              <span className="text-zinc-300">{tm.team.name}</span>
                              <span className="text-zinc-600"> · {tm.team.challenge.name}</span>
                            </div>
                          ))}
                          {user.teamMembers.length === 0 && <span className="text-zinc-600">Chưa có nhóm</span>}
                        </div>
                      )}
                    </td>
                    {selectedChallenge && (
                      <td className="px-4 py-3">
                        <select
                          className="input text-xs py-1.5 w-40"
                          value={currentTeam?.id || ''}
                          onChange={e => e.target.value && assignToTeam(user.id, e.target.value)}
                          disabled={!!loading}
                        >
                          <option value="">-- Chọn nhóm --</option>
                          {teamsForChallenge.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Không tìm thấy người dùng nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
