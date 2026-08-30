const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial database data...');

  // Seed settings
  const existingSettings = await prisma.systemSettings.findUnique({
    where: { id: 'default' },
  });

  if (!existingSettings) {
    await prisma.systemSettings.create({
      data: {
        id: 'default',
        logicalCutoffHour: 0,
        dailyTargetHours: 8.0,
        hourlyRate: 0.0,
      },
    });
    console.log('Created default system settings.');
  }

  // Seed projects
  const defaultProjects = [
    'FNA1',
    'Crane_Gamer',
    'Ego_VLM',
    'Duck',
    'Aloha_OTS',
    'Cobra',
  ];

  for (const name of defaultProjects) {
    const existing = await prisma.project.findUnique({ where: { name } });
    if (!existing) {
      await prisma.project.create({
        data: {
          name,
          active: true,
        },
      });
      console.log(`Created project: ${name}`);
    }
  }

  console.log('Database seeding completed.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
