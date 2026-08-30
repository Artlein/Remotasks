import { NextResponse } from 'next/server';
import { db, seedInitialDataIfNeeded, DEFAULT_PROJECT_NAMES } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await seedInitialDataIfNeeded();

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('all') === 'true';

    let projects = await db.project.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: { name: 'asc' },
    });

    if (projects.length === 0) {
      for (const name of DEFAULT_PROJECT_NAMES) {
        try {
          await db.project.upsert({
            where: { name },
            update: { active: true },
            create: { name, active: true },
          });
        } catch (e) {
          // ignore in case of read-only mode
        }
      }

      projects = await db.project.findMany({
        where: includeInactive ? {} : { active: true },
        orderBy: { name: 'asc' },
      });
    }

    // If still 0 due to any environment constraint, return fallback array
    if (projects.length === 0) {
      projects = DEFAULT_PROJECT_NAMES.map((name, idx) => ({
        id: `default-${idx + 1}`,
        name,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as any;
    }

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    // Return guaranteed fallback list so UI dropdowns are never blank
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
    await seedInitialDataIfNeeded();
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check if project already exists
    const existing = await db.project.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      if (!existing.active) {
        // Reactivate if existing soft-deleted/retired
        const reactivated = await db.project.update({
          where: { id: existing.id },
          data: { active: true },
        });
        return NextResponse.json(reactivated);
      }
      return NextResponse.json({ error: 'Project already exists' }, { status: 400 });
    }

    const newProject = await db.project.create({
      data: {
        name: trimmedName,
        active: true,
      },
    });

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
