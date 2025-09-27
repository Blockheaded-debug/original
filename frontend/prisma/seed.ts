import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await hash('SuperadminCryptoAnalyzerPro000_', 10);

  const user = await prisma.user.upsert({
    where: { email: 'superadmin@cryptoanalyzerpro.com' },
    update: {},
    create: {
      name: 'Superadmin',
      email: 'superadmin@cryptoanalyzerpro.com',
      password: password,
    },
  });

  console.log('✅ User seeded:', user);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
