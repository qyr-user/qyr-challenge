'use client'
import { useState, useEffect } from 'react'
import { Plus, Pencil, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/app/lib/utils'

interface Challenge {
  id: number; name: string; description?: string; startDate: string; endDate: string
  isActive: boolean; stravaClubId?: string
  maxActivitiesPerDay?: number; minActivitiesPerDay?: number
  maxActivitiesPerWeek?: number; minActivitiesPerWeek?: number
  minKmPerActivity?: number; maxKmPerActivity?: number; minPaceSeconds?: number; maxPaceSeconds?: number
  _count?: { teams: number }
}

const defaultForm = {
  name: '', description: '', startDate: '', endDate: '', stravaClubId: '',
  maxActivitiesPerDay: '', minActivitiesPerDay: '',
  maxActivitiesPerWeek: '', minActivitiesPerWeek: '',
  minKmPerActivity: '', maxKmPerActivity: '', minPaceStr: '', maxPaceStr: '',
}

// Convert UTC ISO string → "YYYY-MM-DDTHH:mm" in UTC+7 for datetime-local input
function toVNLocal(isoStr: string): string {
  const d = new Date(isoStr)
  // offset +7h
  const vn = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  return vn.toISOString().slice(0, 16)
}

// Convert datetime-local value (treated as UTC+7) → ISO UTC string for API
function fromVNLocal(localStr: string): string {
  if (!localStr) return ''
  const d = new Date(localStr + ':00+07:00')
  return d.toISOString()
}

function paceToSeconds(pace: string): number | undefined {
  if (!pace) return undefined
  const [m, s] = pace.split(':').map(Number)
  return isNaN(m) ? undefined : m * 60 + (s || 0)
}

function secondsToPace(s?: number | null): string {
  if (!s) return ''
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => { fetchChallenges() }, [])

  async function fetchChallenges() {
    const res = await fetch('/api/challenges')
    const data = await res.json()
    setChallenges(data)
  }

  function startEdit(c: Challenge) {
    setEditId(c.id)
    setForm({
      name: c.name, description: c.description || '',
      startDate: toVNLocal(c.startDate), endDate: toVNLocal(c.endDate),
      stravaClubId: c.stravaClubId || '',
      maxActivitiesPerDay: c.maxActivitiesPerDay?.toString() || '',
      minActivitiesPerDay: c.minActivitiesPerDay?.toString() || '',
      maxActivitiesPerWeek: c.maxActivitiesPerWeek?.toString() || '',
      minActivitiesPerWeek: c.minActivitiesPerWeek?.toString() || '',
      minKmPerActivity: c.minKmPerActivity?.toString() || '',
      maxKmPerActivity: c.maxKmPerActivity?.toString() || '',
      minPaceStr: secondsToPace(c.minPaceSeconds),
      maxPaceStr: secondsToPace(c.maxPaceSeconds),
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      ...form,
      startDate: fromVNLocal(form.startDate),
      endDate: fromVNLocal(form.endDate),
      minPaceSeconds: paceToSeconds(form.minPaceStr),
      maxPaceSeconds: paceToSeconds(form.maxPaceStr),
    }
    try {
      const res = await fetch(editId ? `/api/challenges/${editId}` : '/api/challenges', {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      toast.success(editId ? 'Đã cập nhật thử thách' : 'Đã tạo thử thách mới')
      setShowForm(false); setEditId(null); setForm(defaultForm); fetchChallenges()
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const f = (key: keyof typeof form) => ({
    value: form[key], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [key]: e.target.value })),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Thử thách</h1>
          <p className="text-zinc-500 text-sm">Tạo và chỉnh sửa các challenge</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(defaultForm) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tạo mới
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 space-y-6">
          <h2 className="font-semibold text-lg">{editId ? 'Chỉnh sửa' : 'Tạo'} thử thách</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Tên thử thách *</label>
              <input className="input" required placeholder="VD: Thử thách tháng 8" {...f('name')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Mô tả</label>
              <textarea className="input" rows={2} placeholder="Mô tả ngắn..." {...f('description')} />
            </div>
            <div>
              <label className="label">Ngày giờ bắt đầu *</label>
              <input className="input" type="datetime-local" required {...f('startDate')} />
            </div>
            <div>
              <label className="label">Ngày giờ kết thúc *</label>
              <input className="input" type="datetime-local" required {...f('endDate')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Strava Club ID *</label>
              <input className="input" placeholder="VD: 2224942" {...f('stravaClubId')} />
              <p className="text-xs text-zinc-600 mt-1">ID của CLB Strava dùng để cào dữ liệu cho challenge này</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Quy tắc hợp lệ (để trống = không giới hạn)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">Min hoạt động/ngày</label>
                <input className="input" type="number" min="0" placeholder="--" {...f('minActivitiesPerDay')} />
              </div>
              <div>
                <label className="label">Max hoạt động/ngày</label>
                <input className="input" type="number" min="0" placeholder="--" {...f('maxActivitiesPerDay')} />
              </div>
              <div>
                <label className="label">Min hoạt động/tuần</label>
                <input className="input" type="number" min="0" placeholder="--" {...f('minActivitiesPerWeek')} />
              </div>
              <div>
                <label className="label">Max hoạt động/tuần</label>
                <input className="input" type="number" min="0" placeholder="--" {...f('maxActivitiesPerWeek')} />
              </div>
              <div>
                <label className="label">Min km/hoạt động</label>
                <input className="input" type="number" step="0.1" min="0" placeholder="--" {...f('minKmPerActivity')} />
              </div>
              <div>
                <label className="label">Max km/hoạt động</label>
                <input className="input" type="number" step="0.1" min="0" placeholder="--" {...f('maxKmPerActivity')} />
              </div>
              <div>
                <label className="label">Pace nhanh nhất (m:ss/km)</label>
                <input className="input" placeholder="4:00" pattern="\d+:\d{2}" {...f('minPaceStr')} />
              </div>
              <div>
                <label className="label">Pace chậm nhất (m:ss/km)</label>
                <input className="input" placeholder="8:00" pattern="\d+:\d{2}" {...f('maxPaceStr')} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Đang lưu...' : editId ? 'Cập nhật' : 'Tạo thử thách'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="btn-secondary">Hủy</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {challenges.map(c => (
          <div key={c.id} className="card">
            <div className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{c.name}</h3>
                <p className="text-zinc-500 text-sm flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(c.startDate)} → {formatDate(c.endDate)}
                  {c.stravaClubId && <span className="ml-2 text-orange-400">CLB: {c.stravaClubId}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{c._count?.teams || 0} nhóm</span>
                <button onClick={() => startEdit(c)} className="btn-ghost p-2">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="btn-ghost p-2">
                  {expanded === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {expanded === c.id && (
              <div className="border-t border-zinc-800 p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {[
                  ['Min km/act', c.minKmPerActivity ? `${c.minKmPerActivity} km` : '--'],
                  ['Max km/act', c.maxKmPerActivity ? `${c.maxKmPerActivity} km` : '--'],
                  ['Pace nhanh nhất', c.minPaceSeconds ? `${secondsToPace(c.minPaceSeconds)}/km` : '--'],
                  ['Pace chậm nhất', c.maxPaceSeconds ? `${secondsToPace(c.maxPaceSeconds)}/km` : '--'],
                  ['Act/ngày', c.minActivitiesPerDay || c.maxActivitiesPerDay ? `${c.minActivitiesPerDay || 0}-${c.maxActivitiesPerDay || '∞'}` : '--'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-zinc-600 text-xs mb-0.5">{label}</p>
                    <p className="font-medium">{val}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
