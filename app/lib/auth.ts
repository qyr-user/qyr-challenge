import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import StravaProvider from 'next-auth/providers/strava'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    StravaProvider({
      clientId: process.env.STRAVA_CLIENT_ID!,
      clientSecret: process.env.STRAVA_CLIENT_SECRET!,
      authorization: {
        params: { scope: 'read,activity:read_all', approval_prompt: 'auto' },
      },
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: `${profile.firstname || ''} ${profile.lastname || ''}`.trim() || `Athlete ${profile.id}`,
          email: `strava-${profile.id}@qyr-challenge.local`,
          image: profile.profile || profile.profile_medium || null,
        }
      },
    }),
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
    async signIn({ user, account, profile }) {
      if (account?.provider === 'strava') {
        try {
          const existing = await prisma.stravaToken.findUnique({ where: { userId: user.id } })
          const stravaProfile = profile as any
          const athleteId = stravaProfile?.id?.toString() || account.providerAccountId
          const athleteName = stravaProfile?.firstname
            ? `${stravaProfile.firstname} ${stravaProfile.lastname || ''}`.trim()
            : user.name || ''
          const athletePhoto = stravaProfile?.profile || user.image || ''

          if (existing) {
            await prisma.stravaToken.update({
              where: { userId: user.id },
              data: {
                accessToken: account.access_token!,
                refreshToken: account.refresh_token!,
                expiresAt: account.expires_at!,
                stravaAthleteId: athleteId,
                athleteName,
                athletePhoto,
              },
            })
          } else {
            await prisma.stravaToken.create({
              data: {
                userId: user.id,
                stravaAthleteId: athleteId,
                accessToken: account.access_token!,
                refreshToken: account.refresh_token!,
                expiresAt: account.expires_at!,
                athleteName,
                athletePhoto,
              },
            })
          }
        } catch (err) {
          console.error('Error saving Strava token:', err)
        }
      }
      return true
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
