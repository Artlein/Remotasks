const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial database data...');

  try {
    // Seed default system settings if table exists (backward compatibility)
    if (prisma.systemSettings) {
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
    }
  } catch (err) {
    console.warn('SystemSettings seed skipped or not available:', err.message);
  }

  console.log('Database seeding completed.');
}

main()
  .catch((e) => {
    console.warn('Seeding warning (non-fatal):', e.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
