import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKm(meters: number | null | undefined): string {
  if (meters == null) return '0.00'
  return (meters / 1000).toFixed(2)
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

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim())
  return adminEmails.includes(email)
}
