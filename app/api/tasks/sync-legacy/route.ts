import { NextResponse } from 'next/server';
import { db, seedUserDataIfNeeded, withRetry } from '@/lib/db';
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
    const existingProjects = await withRetry(() =>
      db.project.findMany({ where: { userId: user.id } })
    );
    const projectMap = new Map<string, string>();
    for (const p of existingProjects) {
      projectMap.set(p.name.toLowerCase(), p.id);
    }

    // Get all existing task IDs for Arvin to avoid duplicates (fast bulk lookup)
    const existingTasks = await withRetry(() =>
      db.task.findMany({
        where: { userId: user.id },
        select: { id: true, date: true, description: true, durationMinutes: true },
      })
    );

    // Build a de-dup set by ID
    const existingIds = new Set(existingTasks.map((t) => t.id));

    // Prepare tasks to insert
    type TaskRow = {
      date: string;
      projectId: string;
      userId: string;
      description: string;
      durationMinutes: number;
      status: string;
      notes: string | null;
    };
    const toInsert: TaskRow[] = [];

    for (const task of tasks) {
      const durationMinutes = Math.round(Number(task.durationMinutes) || 0);
      if (durationMinutes <= 0 || !task.date) continue;

      const description = (task.description && String(task.description).trim()) || 'Audit Task';

      // Skip if already in DB by unique ID
      if (existingIds.has(task.id)) continue;

      const projName = task.project?.name || 'Aloha_OTS';
      let projectId = projectMap.get(projName.toLowerCase());

      if (!projectId) {
        // Create missing project
        const newProj = await withRetry(() =>
          db.project.create({ data: { name: projName, active: true, userId: user.id } })
        );
        projectId = newProj.id;
        projectMap.set(projName.toLowerCase(), newProj.id);
      }

      toInsert.push({
        date: task.date,
        projectId,
        userId: user.id,
        description,
        durationMinutes,
        status: task.status || 'Done',
        notes: task.notes || null,
      });

      // Track ID in batch to avoid intra-batch duplicates
      existingIds.add(task.id);
    }

    if (toInsert.length === 0) {
      return NextResponse.json({ success: true, syncedCount: 0 });
    }

    // Batch insert in chunks of 100 for reliability
    const CHUNK_SIZE = 100;
    let synced = 0;
    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + CHUNK_SIZE);
      const result = await withRetry(() =>
        db.task.createMany({ data: chunk, skipDuplicates: true })
      );
      synced += result.count;
    }

    return NextResponse.json({ success: true, syncedCount: synced });
  } catch (error) {
    console.error('Failed to sync legacy tasks:', error);
    return NextResponse.json({ error: 'Failed to sync legacy tasks' }, { status: 500 });
  }
}
