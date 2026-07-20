import { hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash('demo-trackly-2026', {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  const demo = await prisma.user.upsert({
    where: { email: 'demo@trackly.local' },
    update: {},
    create: {
      email: 'demo@trackly.local',
      displayName: 'Démo',
      passwordHash,
    },
  });
  console.log(`Seed OK — utilisateur de démo : ${demo.email} (mot de passe : demo-trackly-2026)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
