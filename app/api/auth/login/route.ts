import { NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
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
  let cleanUsername = '';
  let cleanPin = '';

  try {
    const body = await request.json();
    const { username, pin } = body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    if (!pin || typeof pin !== 'string' || !/^\d{6}$/.test(pin.trim())) {
      return NextResponse.json({ error: 'A 6-digit PIN is required' }, { status: 400 });
    }

    cleanUsername = username.trim().toLowerCase();
    cleanPin = pin.trim();

    // Find user — with retry for Supabase cold starts
    let user = await withRetry(() =>
      db.user.findUnique({ where: { username: cleanUsername } })
    );

    if (!user) {
      // First login — user sets their own PIN here.
      user = await withRetry(() =>
        db.user.create({
          data: {
            username: cleanUsername,
            pin: cleanPin,
            avatar: `/avatars/${cleanUsername}.png`,
          },
        })
      );

      // Seed default projects for new user
      for (const name of DEFAULT_PROJECT_NAMES) {
        await withRetry(() =>
          db.project.create({ data: { name, active: true, userId: user!.id } })
        );
      }

      // Seed default settings
      await withRetry(() =>
        db.userSettings.create({
          data: {
            userId: user!.id,
            logicalCutoffHour: 0,
            dailyTargetHours: 8.0,
            hourlyRate: 0.0,
          },
        })
      );
    } else if (!user.pin) {
      // User was pre-created but has no PIN yet — first login sets their PIN
      user = await withRetry(() =>
        db.user.update({
          where: { id: user!.id },
          data: { pin: cleanPin, avatar: user!.avatar || `/avatars/${cleanUsername}.png` },
        })
      );
    } else {
      // User already has a set PIN — verify it
      if (cleanPin !== user.pin) {
        return NextResponse.json({ error: 'Incorrect 6-digit PIN. Please try again.' }, { status: 401 });
      }
    }

    const response = NextResponse.json({
      success: true,
      username: user.username,
      userId: user.id,
      avatar: user.avatar || `/avatars/${cleanUsername}.png`,
    });

    response.cookies.set(SESSION_COOKIE_NAME, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Database login error (after retries):', error);

    // Fallback: If DB is temporarily paused/unreachable, allow Arvin to log in so work is never blocked
    if (cleanUsername === 'arvin' && cleanPin === '032504') {
      const fallbackUserId = '8e117503-2d6d-41ac-aebe-1876bae8f02b';
      const fallbackResponse = NextResponse.json({
        success: true,
        username: 'arvin',
        userId: fallbackUserId,
        avatar: '/avatars/arvin.png',
        offlineFallback: true,
      });

      fallbackResponse.cookies.set(SESSION_COOKIE_NAME, fallbackUserId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });

      return fallbackResponse;
    }

    return NextResponse.json(
      { error: 'Login failed. Database is temporarily unavailable — please try again in a few seconds.' },
      { status: 500 }
    );
  }
}
