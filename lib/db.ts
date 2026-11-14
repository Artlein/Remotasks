import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export const DEFAULT_PROJECT_NAMES = [
  'FNA1',
  'Crane_Gamer',
  'Ego_VLM',
  'Duck',
  'Aloha_OTS',
  'Cobra',
];

/**
 * Ensures initial default projects and settings are present for a given user.
 */
export async function seedUserDataIfNeeded(userId: string) {
  try {
    // Seed default settings if missing
    const existingSettings = await db.userSettings.findUnique({
      where: { userId },
    });

    if (!existingSettings) {
      await db.userSettings.create({
        data: {
          userId,
          logicalCutoffHour: 0,
          dailyTargetHours: 8.0,
          hourlyRate: 0.0,
        },
      });
    }

    // Seed default projects if user has none
    const projectCount = await db.project.count({ where: { userId } });
    if (projectCount === 0) {
      for (const name of DEFAULT_PROJECT_NAMES) {
        await db.project.create({
          data: { name, active: true, userId },
        });
      }
    }
  } catch (error) {
    console.error('Error during user auto-seeding:', error);
  }
}

/**
 * Legacy global seed — kept for backward compat only.
 */
export async function seedInitialDataIfNeeded() {
  // No-op — seeding is now per-user via seedUserDataIfNeeded
}
