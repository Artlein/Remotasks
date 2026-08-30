import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

/**
 * Ensures initial default projects and settings are present in the database.
 */
export async function seedInitialDataIfNeeded() {
  try {
    // Seed default settings if missing
    const existingSettings = await db.systemSettings.findUnique({
      where: { id: 'default' },
    });

    if (!existingSettings) {
      await db.systemSettings.create({
        data: {
          id: 'default',
          logicalCutoffHour: 0, // 12:00 AM reset by default
          dailyTargetHours: 8.0,
        },
      });
    }

    // Seed default projects if no projects exist
    const projectCount = await db.project.count();
    if (projectCount === 0) {
      const defaultProjects = [
        'FNA1',
        'Crane_Gamer',
        'Ego_VLM',
        'Duck',
        'Aloha_OTS',
        'Cobra',
      ];

      for (const name of defaultProjects) {
        await db.project.create({
          data: {
            name,
            active: true,
          },
        });
      }
    }
  } catch (error) {
    console.error('Error during auto-seeding:', error);
  }
}
