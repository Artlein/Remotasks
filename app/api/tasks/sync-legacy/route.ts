import { NextResponse } from 'next/server';
import { db, seedUserDataIfNeeded } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Only Arvin should import legacy pre-multiuser logs
    if (user.username !== 'arvin') {
      return NextResponse.json({ success: true, syncedCount: 0, message: 'Legacy sync only applies to Arvin' });
    }

    await seedUserDataIfNeeded(user.id);

    const body = await request.json();
    const { tasks } = body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ success: true, syncedCount: 0 });
    }

    // Map existing projects for Arvin
    const existingProjects = await db.project.findMany({ where: { userId: user.id } });
    const projectMap = new Map<string, string>();
    for (const p of existingProjects) {
      projectMap.set(p.name.toLowerCase(), p.id);
    }

    let synced = 0;
    for (const task of tasks) {
      if (!task.description || !task.durationMinutes) continue;

      const projName = task.project?.name || 'FNA1';
      let projectId = projectMap.get(projName.toLowerCase());

      if (!projectId) {
        const newProj = await db.project.create({
          data: { name: projName, active: true, userId: user.id },
        });
        projectId = newProj.id;
        projectMap.set(projName.toLowerCase(), newProj.id);
      }

      // Check if task already exists (by ID or date + description + duration)
      const existing = await db.task.findFirst({
        where: {
          userId: user.id,
          OR: [
            { id: task.id },
            {
              date: task.date,
              description: task.description,
              durationMinutes: Number(task.durationMinutes),
            },
          ],
        },
      });

      if (!existing) {
        await db.task.create({
          data: {
            date: task.date,
            projectId,
            userId: user.id,
            description: task.description,
            durationMinutes: Number(task.durationMinutes),
            status: task.status || 'Done',
            notes: task.notes || null,
          },
        });
        synced++;
      }
    }

    return NextResponse.json({ success: true, syncedCount: synced });
  } catch (error) {
    console.error('Failed to sync legacy tasks:', error);
    return NextResponse.json({ error: 'Failed to sync legacy tasks' }, { status: 500 });
  }
}
