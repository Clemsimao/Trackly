import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.user.upsert({
    where: { email: 'demo@trackly.local' },
    update: {},
    create: {
      email: 'demo@trackly.local',
      displayName: 'Démo',
    },
  });
  console.log(`Seed OK — utilisateur de démo : ${demo.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
