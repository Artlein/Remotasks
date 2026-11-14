import { NextResponse } from 'next/server';
import { db, seedUserDataIfNeeded } from '@/lib/db';
import { parseDurationToMinutes, getLogicalDate } from '@/lib/logical-day';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    await seedUserDataIfNeeded(user.id);

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = { userId: user.id };

    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    } else if (startDate) {
      where.date = { gte: startDate };
    } else if (endDate) {
      where.date = { lte: endDate };
    }

    if (projectId && projectId !== 'ALL') {
      where.projectId = projectId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && search.trim()) {
      const query = search.trim();
      where.OR = [
        { description: { contains: query } },
        { notes: { contains: query } },
      ];
    }

    const tasks = await db.task.findMany({
      where,
      include: { project: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    await seedUserDataIfNeeded(user.id);
    const body = await request.json();
    const { date, projectId, description, durationStr, durationMinutes, status, notes } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project is required' }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    let computedMinutes = 0;
    if (typeof durationMinutes === 'number' && durationMinutes > 0) {
      computedMinutes = Math.round(durationMinutes);
    } else if (durationStr) {
      computedMinutes = parseDurationToMinutes(durationStr);
    }

    if (computedMinutes <= 0) {
      return NextResponse.json(
        { error: 'Valid duration (H:MM or minutes > 0) is required' },
        { status: 400 }
      );
    }

    let taskDate = date;
    if (!taskDate) {
      const settings = await db.userSettings.findUnique({ where: { userId: user.id } });
      const cutoff = settings?.logicalCutoffHour ?? 0;
      taskDate = getLogicalDate(new Date(), cutoff);
    }

    // Validate project belongs to this user
    let validProjectId = projectId;
    const projectExists = await db.project.findFirst({ where: { id: validProjectId, userId: user.id } });
    if (!projectExists) {
      const fallback = await db.project.findFirst({ where: { userId: user.id, active: true } });
      if (fallback) {
        validProjectId = fallback.id;
      } else {
        const created = await db.project.create({ data: { name: 'FNA1', active: true, userId: user.id } });
        validProjectId = created.id;
      }
    }

    const newTask = await db.task.create({
      data: {
        date: taskDate,
        projectId: validProjectId,
        userId: user.id,
        description: description.trim(),
        durationMinutes: computedMinutes,
        status: status || 'Done',
        notes: notes ? notes.trim() : null,
      },
      include: { project: true },
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
