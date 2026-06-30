import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin account (admin/admin)
  const hashedPassword = await bcrypt.hash('admin', 10)
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', password: hashedPassword },
  })
  console.log('✅ Admin account created: admin/admin')

  // Create sample challenge
  const challenge = await prisma.challenge.create({
    data: {
      name: 'Thử thách tháng 7/2026',
      description: 'Cùng nhau chinh phục 200km!',
      startDate: new Date('2026-07-01T00:00:00+07:00'),
      endDate: new Date('2026-07-31T23:59:59+07:00'),
      stravaClubId: '2224942',
      maxKmPerActivity: 42,
      minPaceSeconds: 240,
      maxPaceSeconds: 600,
    },
  })
  console.log('✅ Created challenge:', challenge.name)

  // Create teams
  for (const name of ['Team Alpha', 'Team Beta', 'Team Gamma']) {
    await prisma.team.create({ data: { name, challengeId: challenge.id } })
  }
  console.log('✅ Created 3 teams')

  console.log('\n🎉 Seed completed!')
  console.log('\n📋 Next steps:')
  console.log('1. npm run db:push  (push schema to DB)')
  console.log('2. npm run db:seed  (run this file)')
  console.log('3. npm run dev')
  console.log('4. Truy cập /admin/login → đăng nhập admin/admin')
  console.log('5. Vào Admin › Cài đặt → nhập Strava session cookie')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
