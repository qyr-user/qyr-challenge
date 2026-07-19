import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKm(km: number | null | undefined): string {
  if (km == null) return '0.00'
  return km.toFixed(2)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join('')
}

export function formatPace(secondsPerKm: number | null | undefined): string {
  if (!secondsPerKm) return '--:--'
  const min = Math.floor(secondsPerKm / 60)
  const sec = secondsPerKm % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}m`
  return `${m}:${s.toString().padStart(2, '0')}`
}

const VN_TZ = 'Asia/Ho_Chi_Minh'

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: VN_TZ })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: VN_TZ,
  })
}

/** Returns today's date as YYYY-MM-DD string in Vietnam timezone (UTC+7) */
export function todayVN(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: VN_TZ })
}

