import { NextResponse } from 'next/server';
import { db, seedInitialDataIfNeeded } from '@/lib/db';

export async function GET() {
  try {
    await seedInitialDataIfNeeded();

    let settings = await db.systemSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await db.systemSettings.create({
        data: {
          id: 'default',
          logicalCutoffHour: 0, // default 12:00 AM reset
          dailyTargetHours: 8.0,
          hourlyRate: 0.0,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await seedInitialDataIfNeeded();
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

    const updated = await db.systemSettings.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        logicalCutoffHour: updateData.logicalCutoffHour ?? 0,
        dailyTargetHours: updateData.dailyTargetHours ?? 8.0,
        hourlyRate: updateData.hourlyRate ?? 0.0,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
