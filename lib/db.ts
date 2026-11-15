import { PrismaClient } from '@prisma/client';

const DEFAULT_POOLER_URL =
  'postgresql://postgres.utkethetueyzglldzhcp:%40Angpogikosobra25@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=15&connect_timeout=15';

const DEFAULT_DIRECT_URL =
  'postgresql://postgres.utkethetueyzglldzhcp:%40Angpogikosobra25@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

function sanitizeDbUrl(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  let s = raw.trim();
  // Strip surrounding quotes if pasted with quotes in Vercel UI
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  // Validate protocol
  if (!s.startsWith('postgresql://') && !s.startsWith('postgres://')) {
    return fallback;
  }
  // Optimize for PgBouncer pooler if port 6543
  if (s.includes(':6543') && !s.includes('connection_limit')) {
    const sep = s.includes('?') ? '&' : '?';
    s = `${s}${sep}connection_limit=5&pool_timeout=10&connect_timeout=10`;
  }
  return s;
}

// Sanitize process.env directly so Prisma's schema.prisma env("DATABASE_URL") is valid
process.env.DATABASE_URL = sanitizeDbUrl(process.env.DATABASE_URL, DEFAULT_POOLER_URL);
process.env.DIRECT_URL = sanitizeDbUrl(process.env.DIRECT_URL, DEFAULT_DIRECT_URL);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
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
 * Retry a Prisma call up to `maxRetries` times with exponential backoff.
 * Handles Supabase cold-start timeouts gracefully.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isTransient =
        err?.code === 'P1001' || // Supabase cold start / timeout
        err?.code === 'P1002' ||
        err?.code === 'P1017' || // Server closed connection
        err?.message?.includes('timeout') ||
        err?.message?.includes('ECONNRESET') ||
        err?.message?.includes('ECONNREFUSED');
      if (!isTransient || attempt === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

const seededUsersCache = new Set<string>();

/**
 * Ensures initial default projects and settings are present for a given user.
 * Cached in-memory to prevent running redundant DB queries on every single request.
 */
export async function seedUserDataIfNeeded(userId: string) {
  if (seededUsersCache.has(userId)) return;
  try {
    // Seed default settings if missing
    const existingSettings = await withRetry(() =>
      db.userSettings.findUnique({ where: { userId } })
    );

    if (!existingSettings) {
      await withRetry(() =>
        db.userSettings.create({
          data: {
            userId,
            logicalCutoffHour: 0,
            dailyTargetHours: 8.0,
            hourlyRate: 0.0,
          },
        })
      );
    }

    // Seed default projects if user has none
    const projectCount = await withRetry(() => db.project.count({ where: { userId } }));
    if (projectCount === 0) {
      for (const name of DEFAULT_PROJECT_NAMES) {
        await withRetry(() =>
          db.project.create({ data: { name, active: true, userId } })
        );
      }
    }
    seededUsersCache.add(userId);
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
