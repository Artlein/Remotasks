import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEFAULT_PROJECT_NAMES = [
  'FNA1',
  'Crane_Gamer',
  'Ego_VLM',
  'Duck',
  'Aloha_OTS',
  'Cobra',
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Find or create user
    let user = await db.user.findUnique({ where: { username: cleanUsername } });

    if (!user) {
      // Create user + seed their default projects + settings
      user = await db.user.create({ data: { username: cleanUsername } });

      // Seed default projects for new user
      for (const name of DEFAULT_PROJECT_NAMES) {
        await db.project.create({ data: { name, active: true, userId: user.id } });
      }

      // Seed default settings
      await db.userSettings.create({
        data: {
          userId: user.id,
          logicalCutoffHour: 0,
          dailyTargetHours: 8.0,
          hourlyRate: 0.0,
        },
      });
    }

    const response = NextResponse.json({ success: true, username: user.username, userId: user.id });

    response.cookies.set(SESSION_COOKIE_NAME, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login failed:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

