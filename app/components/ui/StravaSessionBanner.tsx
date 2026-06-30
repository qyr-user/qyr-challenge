import prisma from '@/app/lib/prisma'
import { AlertTriangle } from 'lucide-react'

export async function StravaSessionBanner() {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: 'strava_session_valid' } })
    if (!setting || setting.value !== 'false') return null
  } catch {
    return null
  }

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2 text-amber-400 text-sm">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>
        <strong>Strava session đã hết hạn.</strong> Vui lòng vào{' '}
        <a href="/admin/settings" className="underline font-semibold hover:text-amber-300">
          Admin › Cài đặt
        </a>{' '}
        để cập nhật session cookie mới.
      </span>
    </div>
  )
}
