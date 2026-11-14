import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check database for user and if pin is already configured
    const user = await db.user.findUnique({
      where: { username: cleanUsername },
      select: { id: true, username: true, pin: true },
    });

    if (!user || !user.pin) {
      return NextResponse.json({
        exists: !!user,
        hasPin: false,
        isFirstLogin: true,
      });
    }

    return NextResponse.json({
      exists: true,
      hasPin: true,
      isFirstLogin: false,
    });
  } catch (error) {
    console.error('Failed to check user PIN status:', error);
    // If DB check fails or table not yet initialized, allow user to set pin
    return NextResponse.json({
      exists: false,
      hasPin: false,
      isFirstLogin: true,
    });
  }
}
