import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { seedUserDataIfNeeded } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  // Ensure user has default projects and settings once on auth verification
  await seedUserDataIfNeeded(user.id);
  return NextResponse.json(user);
}

