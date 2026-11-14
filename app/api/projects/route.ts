import { NextResponse } from 'next/server';
import { db, seedUserDataIfNeeded, DEFAULT_PROJECT_NAMES, withRetry } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    await seedUserDataIfNeeded(user.id);

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('all') === 'true';

    let projects = await withRetry(() =>
      db.project.findMany({
        where: includeInactive ? { userId: user.id } : { userId: user.id, active: true },
        orderBy: { name: 'asc' },
      })
    );

    if (projects.length === 0) {
      for (const name of DEFAULT_PROJECT_NAMES) {
        try {
          await withRetry(() =>
            db.project.create({ data: { name, active: true, userId: user.id } })
          );
        } catch {
          // ignore duplicates
        }
      }
      projects = await withRetry(() =>
        db.project.findMany({
          where: includeInactive ? { userId: user.id } : { userId: user.id, active: true },
          orderBy: { name: 'asc' },
        })
      );
    }

    if (projects.length === 0) {
      projects = DEFAULT_PROJECT_NAMES.map((name, idx) => ({
        id: `default-${idx + 1}`,
        name,
        active: true,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as any;
    }

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    const fallbackProjects = DEFAULT_PROJECT_NAMES.map((name, idx) => ({
      id: `default-${idx + 1}`,
      name,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    return NextResponse.json(fallbackProjects);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    await seedUserDataIfNeeded(user.id);
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    const existing = await withRetry(() =>
      db.project.findUnique({
        where: { name_userId: { name: trimmedName, userId: user.id } },
      })
    );

    if (existing) {
      if (!existing.active) {
        const reactivated = await withRetry(() =>
          db.project.update({
            where: { id: existing.id },
            data: { active: true },
          })
        );
        return NextResponse.json(reactivated);
      }
      return NextResponse.json({ error: 'Project already exists' }, { status: 400 });
    }

    const newProject = await withRetry(() =>
      db.project.create({
        data: { name: trimmedName, active: true, userId: user.id },
      })
    );

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
