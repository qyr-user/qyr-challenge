import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'
import { signAdminToken, setAdminCookie } from '@/app/lib/admin-auth'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  const admin = await prisma.admin.findUnique({ where: { username } })
  if (!admin) {
    return NextResponse.json({ error: 'Sai tài khoản hoặc mật khẩu' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, admin.password)
  if (!valid) {
    return NextResponse.json({ error: 'Sai tài khoản hoặc mật khẩu' }, { status: 401 })
  }

  const token = await signAdminToken(admin.id)
  const cookie = setAdminCookie(token)

  const res = NextResponse.json({ ok: true })
  res.cookies.set(cookie)
  return res
}
