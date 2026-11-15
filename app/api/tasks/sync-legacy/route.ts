import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Legacy sync is permanently completed and authoritative in PostgreSQL.
    // Return early to prevent duplicate row creation.
    return NextResponse.json({ success: true, syncedCount: 0, message: 'Legacy migration already completed.' });
  } catch (error) {
    console.error('Failed to sync legacy tasks:', error);
    return NextResponse.json({ error: 'Failed to sync legacy tasks' }, { status: 500 });
  }
}
