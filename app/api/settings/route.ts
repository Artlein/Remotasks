import { NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    let settings = await withRetry(() =>
      db.userSettings.findUnique({ where: { userId: user.id } })
    );

    if (!settings) {
      settings = await withRetry(() =>
        db.userSettings.create({
          data: { userId: user.id, logicalCutoffHour: 0, dailyTargetHours: 8.0, hourlyRate: 0.0 },
        })
      );
    }

    return NextResponse.json({
      logicalCutoffHour: settings.logicalCutoffHour,
      dailyTargetHours: settings.dailyTargetHours,
      hourlyRate: settings.hourlyRate,
    });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { logicalCutoffHour, dailyTargetHours, hourlyRate } = body;

    const updateData: { logicalCutoffHour?: number; dailyTargetHours?: number; hourlyRate?: number } = {};

    if (typeof logicalCutoffHour === 'number' && logicalCutoffHour >= 0 && logicalCutoffHour <= 23) {
      updateData.logicalCutoffHour = Math.floor(logicalCutoffHour);
    }
    if (typeof dailyTargetHours === 'number' && dailyTargetHours > 0) {
      updateData.dailyTargetHours = parseFloat(dailyTargetHours.toFixed(2));
    }
    if (typeof hourlyRate === 'number' && hourlyRate >= 0) {
      updateData.hourlyRate = parseFloat(hourlyRate.toFixed(2));
    }

    const updated = await withRetry(() =>
      db.userSettings.upsert({
        where: { userId: user.id },
        update: updateData,
        create: {
          userId: user.id,
          logicalCutoffHour: updateData.logicalCutoffHour ?? 0,
          dailyTargetHours: updateData.dailyTargetHours ?? 8.0,
          hourlyRate: updateData.hourlyRate ?? 0.0,
        },
      })
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
