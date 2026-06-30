import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'admin-jwt-secret-change-in-production'
)
const COOKIE_NAME = 'admin-session'

export async function signAdminToken(adminId: number): Promise<string> {
  return new SignJWT({ adminId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyAdminToken(token: string): Promise<{ adminId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { adminId: number }
  } catch {
    return null
  }
}

export async function getAdminSession(): Promise<{ adminId: number } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyAdminToken(token)
}

export async function requireAdminFromRequest(request: NextRequest): Promise<{ adminId: number } | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyAdminToken(token)
}

export function setAdminCookie(token: string): { name: string; value: string; httpOnly: boolean; secure: boolean; sameSite: 'lax'; maxAge: number; path: string } {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  }
}

export function clearAdminCookie() {
  return {
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
    path: '/',
  }
}
