import { NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await withRetry(() => db.$queryRaw`SELECT 1`);
    return NextResponse.json({ ok: true, timestamp: Date.now() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
