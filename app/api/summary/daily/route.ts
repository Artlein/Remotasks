import { NextResponse } from 'next/server';
import { db, seedInitialDataIfNeeded } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await seedInitialDataIfNeeded();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const settings = await db.systemSettings.findUnique({ where: { id: 'default' } });
    const targetHours = settings?.dailyTargetHours ?? 8.0;

    const projects = await db.project.findMany({
      orderBy: { name: 'asc' },
    });

    const where: any = {};
    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    } else if (startDate) {
      where.date = { gte: startDate };
    } else if (endDate) {
      where.date = { lte: endDate };
    }

    const tasks = await db.task.findMany({
      where,
      include: { project: true },
      orderBy: { date: 'desc' },
    });

    // Group tasks by date
    const dailyMap: Record<string, Record<string, number>> = {};
    const taskCountMap: Record<string, number> = {};

    for (const task of tasks) {
      const d = task.date;
      if (!dailyMap[d]) {
        dailyMap[d] = {};
        taskCountMap[d] = 0;
      }
      
      const projName = task.project?.name || 'Unknown';
      dailyMap[d][projName] = (dailyMap[d][projName] || 0) + task.durationMinutes;
      taskCountMap[d] += 1;
    }

    // Convert daily map into sorted array of daily summary rows
    const dates = Object.keys(dailyMap).sort((a, b) => b.localeCompare(a));
    
    const rows = dates.map((date) => {
      const projectBreakdown = dailyMap[date];
      let totalMinutes = 0;

      for (const pName in projectBreakdown) {
        totalMinutes += projectBreakdown[pName];
      }

      const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
      const targetDiffHours = Math.round((totalHours - targetHours) * 100) / 100;

      return {
        date,
        projectBreakdown, // map of { projectName: minutes }
        totalMinutes,
        totalHours,
        targetHours,
        targetDiffHours,
        taskCount: taskCountMap[date],
      };
    });

    return NextResponse.json({
      targetHours,
      projects: projects.map((p) => ({ id: p.id, name: p.name, active: p.active })),
      rows,
    });
  } catch (error) {
    console.error('Failed to generate daily summary:', error);
    return NextResponse.json({ error: 'Failed to generate daily summary' }, { status: 500 });
  }
}
