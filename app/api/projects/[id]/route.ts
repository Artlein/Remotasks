import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { name, active } = body;

    const existingProject = await db.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updateData: { name?: string; active?: boolean } = {};

    if (typeof active === 'boolean') {
      updateData.active = active;
    }

    if (name && typeof name === 'string' && name.trim() !== '') {
      const trimmedName = name.trim();
      if (trimmedName !== existingProject.name) {
        const nameCollision = await db.project.findUnique({
          where: { name_userId: { name: trimmedName, userId: user.id } },
        });
        if (nameCollision) {
          return NextResponse.json(
            { error: `A project named "${trimmedName}" already exists.` },
            { status: 400 }
          );
        }
      }
      updateData.name = trimmedName;
    }

    const updated = await db.project.update({ where: { id }, data: updateData });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;

    const existingProject = await db.project.findFirst({ where: { id, userId: user.id } });
    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const retired = await db.project.update({ where: { id }, data: { active: false } });
    return NextResponse.json(retired);
  } catch (error) {
    console.error('Failed to retire project:', error);
    return NextResponse.json({ error: 'Failed to retire project' }, { status: 500 });
  }
}
