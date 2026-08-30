import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

let dbUrl: string | undefined = undefined;

// On Vercel Serverless environment, use /tmp which is the only writable directory
if (process.env.VERCEL) {
  const tmpDbPath = '/tmp/dev.db';
  if (!fs.existsSync(tmpDbPath)) {
    const possibleSourcePaths = [
      path.join(process.cwd(), 'prisma', 'dev.db'),
      path.join(process.cwd(), 'dev.db'),
    ];
    for (const src of possibleSourcePaths) {
      if (fs.existsSync(src)) {
        try {
          fs.copyFileSync(src, tmpDbPath);
          break;
        } catch (e) {
          console.error('Error copying sqlite db to /tmp:', e);
        }
      }
    }
  }
  dbUrl = 'file:/tmp/dev.db';
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
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
          logicalCutoffHour: 0,
          dailyTargetHours: 8.0,
          hourlyRate: 0.0,
        },
      });
    }

    // Seed default projects if no projects exist
    const projectCount = await db.project.count();
    if (projectCount === 0) {
      for (const name of DEFAULT_PROJECT_NAMES) {
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
