import { NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'

export async function GET() {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: 'strava_session_valid' } })
    return NextResponse.json({ expired: setting?.value === 'false' })
  } catch {
    return NextResponse.json({ expired: false })
  }
}
