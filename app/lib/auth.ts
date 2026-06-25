import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'

const STRAVA_AUTHORIZATION_URL = 'https://www.strava.com/oauth/authorize?response_type=code'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    {
      id: 'strava',
      name: 'Strava',
      type: 'oauth',
      authorization: {
        url: STRAVA_AUTHORIZATION_URL,
        params: { scope: 'read,activity:read_all', approval_prompt: 'auto' },
      },
      token: {
        async request(context: any) {
          const res = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: process.env.STRAVA_CLIENT_ID,
              client_secret: process.env.STRAVA_CLIENT_SECRET,
              code: context.params.code,
              grant_type: 'authorization_code',
            }),
          })
          const data = await res.json()
          // QUAN TRỌNG: KHÔNG đưa "athlete" vào object tokens này, vì NextAuth
          // sẽ ghi toàn bộ object tokens vào bảng Account -> athlete gây lỗi
          // "Unknown argument athlete". Athlete profile lấy riêng ở userinfo
          // bên dưới bằng access_token.
          return {
            tokens: {
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              expires_at: data.expires_at,
              token_type: data.token_type || 'Bearer',
            },
          }
        },
      },
      userinfo: {
        async request(context: any) {
          const res = await fetch('https://www.strava.com/api/v3/athlete', {
            headers: { Authorization: `Bearer ${context.tokens.access_token}` },
          })
          return res.json()
        },
      },
      clientId: process.env.STRAVA_CLIENT_ID!,
      clientSecret: process.env.STRAVA_CLIENT_SECRET!,
      profile(profile: any) {
        return {
          id: profile.id.toString(),
          name: `${profile.firstname || ''} ${profile.lastname || ''}`.trim() || `Athlete ${profile.id}`,
          email: `strava-${profile.id}@qyr-challenge.local`,
          image: profile.profile || profile.profile_medium || null,
        }
      },
    },
    ...(process.env.GOOGLE_CLIENT_ID
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        })]
      : []),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim())
        session.user.role = adminEmails.includes(user.email || '') ? 'ADMIN' : 'USER'
      }
      return session
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'strava') return
      try {
        const stravaProfile = profile as any
        const athleteId = stravaProfile?.id?.toString() || account.providerAccountId
        const athleteName = stravaProfile?.firstname
          ? `${stravaProfile.firstname} ${stravaProfile.lastname || ''}`.trim()
          : user.name || ''
        const athletePhoto = stravaProfile?.profile || user.image || ''

        await prisma.stravaToken.upsert({
          where: { userId: user.id },
          update: {
            accessToken: account.access_token!,
            refreshToken: account.refresh_token!,
            expiresAt: account.expires_at!,
            stravaAthleteId: athleteId,
            athleteName,
            athletePhoto,
          },
          create: {
            userId: user.id,
            stravaAthleteId: athleteId,
            accessToken: account.access_token!,
            refreshToken: account.refresh_token!,
            expiresAt: account.expires_at!,
            athleteName,
            athletePhoto,
          },
        })
      } catch (err) {
        console.error('Error saving Strava token:', err)
      }
    },
  },
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'database' },
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
    }
  }
}