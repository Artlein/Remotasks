import { NextResponse } from 'next/server';
import { db, seedInitialDataIfNeeded } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await seedInitialDataIfNeeded();

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('all') === 'true';

    const projects = await db.project.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
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
