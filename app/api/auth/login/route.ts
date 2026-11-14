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
    const { username, pin } = body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    if (!pin || typeof pin !== 'string' || !/^\d{6}$/.test(pin.trim())) {
      return NextResponse.json({ error: 'A 6-digit PIN is required' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPin = pin.trim();

    // Find user
    let user = await db.user.findUnique({ where: { username: cleanUsername } });

    if (!user) {
      // First login! User sets their own PIN here.
      user = await db.user.create({
        data: {
          username: cleanUsername,
          pin: cleanPin,
          avatar: `/avatars/${cleanUsername}.svg`,
        },
      });

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
    } else if (!user.pin) {
      // User was pre-created but has no PIN yet -> First login sets their PIN!
      user = await db.user.update({
        where: { id: user.id },
        data: { pin: cleanPin, avatar: user.avatar || `/avatars/${cleanUsername}.svg` },
      });
    } else {
      // User already has a set PIN -> Verify it!
      if (cleanPin !== user.pin) {
        return NextResponse.json({ error: 'Incorrect 6-digit PIN. Please try again.' }, { status: 401 });
      }
    }

    const response = NextResponse.json({
      success: true,
      username: user.username,
      userId: user.id,
      avatar: user.avatar || `/avatars/${cleanUsername}.svg`,
    });

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
    return NextResponse.json(
      { error: 'Login failed. Please verify database connection.' },
      { status: 500 }
    );
  }
}
