'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { TeamActivitiesPanel } from './TeamActivitiesPanel'

interface Member {
  userId: string
  name: string
  photo: string | null
  totalKm: number
}

interface TeamData {
  id: string
  name: string
  totalKm: number
  memberCount: number
  members: Member[]
  rank: number
}

const rankIcons = ['🥇', '🥈', '🥉']
const medalColors = [
  'border-yellow-500/40 bg-yellow-500/5',
  'border-zinc-400/40 bg-zinc-400/5',
  'border-orange-700/40 bg-orange-700/5',
]

export function LeaderboardList({ teams }: { teams: TeamData[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const maxKm = teams[0]?.totalKm || 0

  return (
    <div className="space-y-4">
      {teams.map((team, i) => {
        const isExpanded = expanded === team.id
        return (
          <div key={team.id} className={`card border transition-all ${i < 3 ? medalColors[i] : ''}`}>
            <button
              onClick={() => setExpanded(isExpanded ? null : team.id)}
              className="w-full p-5 text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-8">{i < 3 ? rankIcons[i] : `#${team.rank}`}</span>
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      {team.name}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-zinc-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-500" />
                      )}
                    </h3>
                    <p className="text-zinc-500 text-sm">{team.memberCount} thành viên · bấm để xem hoạt động</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl text-orange-400">{team.totalKm.toFixed(1)}</p>
                  <p className="text-zinc-500 text-sm">km</p>
                </div>
              </div>

              {maxKm > 0 && (
                <div className="mb-4">
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-1000"
                      style={{ width: `${(team.totalKm / maxKm) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {team.members.map(m => (
                  <div key={m.userId} className="flex items-center gap-2 py-1">
                    {m.photo ? (
                      <img src={m.photo} alt="" className="w-7 h-7 rounded-full border border-zinc-700" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
                        {m.name[0]}
                      </div>
                    )}
                    <span className="text-sm text-zinc-300 flex-1 truncate text-left">{m.name}</span>
                    <span className="text-sm font-mono text-orange-400">{m.totalKm.toFixed(1)}km</span>
                  </div>
                ))}
              </div>
            </button>

            {isExpanded && <TeamActivitiesPanel teamId={team.id} />}
          </div>
        )
      })}
    </div>
  )
}