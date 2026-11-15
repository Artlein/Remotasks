import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseISO, startOfWeek, endOfWeek, format } from 'date-fns';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const settings = await db.userSettings.findUnique({ where: { userId: user.id } });
    const dailyTarget = settings?.dailyTargetHours ?? 8.0;
    const weeklyTarget = dailyTarget * 5;

    const projects = await db.project.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
    });

    const tasks = await db.task.findMany({
      where: { userId: user.id },
      include: { project: true },
      orderBy: { date: 'desc' },
    });

    const weeklyMap: Record<string, { weekLabel: string; startDate: string; endDate: string; breakdown: Record<string, number>; totalMinutes: number; taskCount: number }> = {};

    for (const task of tasks) {
      const taskDate = parseISO(task.date);
      if (isNaN(taskDate.getTime())) continue;

      const weekStart = startOfWeek(taskDate, { weekStartsOn: 2 });
      const weekEnd = endOfWeek(taskDate, { weekStartsOn: 2 });
      const weekStartKey = format(weekStart, 'yyyy-MM-dd');
      const weekEndKey = format(weekEnd, 'yyyy-MM-dd');
      const label = `${format(weekStart, 'EEE, MMM d')} - ${format(weekEnd, 'EEE, MMM d, yyyy')}`;

      if (!weeklyMap[weekStartKey]) {
        weeklyMap[weekStartKey] = { weekLabel: label, startDate: weekStartKey, endDate: weekEndKey, breakdown: {}, totalMinutes: 0, taskCount: 0 };
      }

      const projName = task.project?.name || 'Unknown';
      weeklyMap[weekStartKey].breakdown[projName] = (weeklyMap[weekStartKey].breakdown[projName] || 0) + task.durationMinutes;
      weeklyMap[weekStartKey].totalMinutes += task.durationMinutes;
      weeklyMap[weekStartKey].taskCount += 1;
    }

    const weekKeys = Object.keys(weeklyMap).sort((a, b) => b.localeCompare(a));

    const rows = weekKeys.map((weekKey) => {
      const item = weeklyMap[weekKey];
      const totalHours = Math.round((item.totalMinutes / 60) * 100) / 100;
      return {
        weekStartKey: weekKey,
        weekLabel: item.weekLabel,
        startDate: item.startDate,
        endDate: item.endDate,
        projectBreakdown: item.breakdown,
        totalMinutes: item.totalMinutes,
        totalHours,
        weeklyTargetHours: weeklyTarget,
        taskCount: item.taskCount,
      };
    });

    return NextResponse.json({
      weeklyTargetHours: weeklyTarget,
      projects: projects.map((p) => ({ id: p.id, name: p.name, active: p.active })),
      rows,
    });
  } catch (error) {
    console.error('Failed to generate weekly summary:', error);
    return NextResponse.json({ error: 'Failed to generate weekly summary' }, { status: 500 });
  }
}
