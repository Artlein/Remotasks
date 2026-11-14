import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const POOLER_DATABASE_URL =
  'postgresql://postgres.utkethetueyzglldzhcp:%40Angpogikosobra25@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const dbUrl = process.env.DATABASE_URL || POOLER_DATABASE_URL;

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
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
