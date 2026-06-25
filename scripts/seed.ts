import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const challenge = await prisma.challenge.upsert({
    where: { id: 'sample-challenge-1' },
    update: {},
    create: {
      id: 'sample-challenge-1',
      name: 'Thử thách tháng 8/2024',
      description: 'Cùng nhau chinh phục 200km trong tháng 8!',
      startDate: new Date('2024-08-01T00:00:00Z'),
      endDate: new Date('2024-08-31T23:59:59Z'),
      maxKmPerActivity: 42,
      minHeartRate: 100,
      maxHeartRate: 180,
      minPaceSeconds: 240,
      maxPaceSeconds: 600,
    },
  })

  console.log('✅ Created challenge:', challenge.name)

  const teamNames = ['Team Alpha', 'Team Beta', 'Team Gamma']
  for (const name of teamNames) {
    await prisma.team.upsert({
      where: { id: `team-${name.toLowerCase().replace(' ', '-')}` },
      update: {},
      create: { id: `team-${name.toLowerCase().replace(' ', '-')}`, name, challengeId: challenge.id },
    })
  }

  console.log('✅ Created teams:', teamNames.join(', '))
  console.log('\n🎉 Seed completed!')
  console.log('\n📋 Next steps:')
  console.log('1. Run: npm run db:push')
  console.log('2. Start app: npm run dev')
  console.log('3. Login with Strava')
  console.log('4. Set your email in ADMIN_EMAILS env var')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
