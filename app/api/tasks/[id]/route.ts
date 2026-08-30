import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseDurationToMinutes } from '@/lib/logical-day';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { date, projectId, description, durationStr, durationMinutes, status, notes } = body;

    const existingTask = await db.task.findUnique({ where: { id } });
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (date) updateData.date = date;
    if (projectId) updateData.projectId = projectId;
    if (description && description.trim()) updateData.description = description.trim();
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;

    if (typeof durationMinutes === 'number' && durationMinutes > 0) {
      updateData.durationMinutes = Math.round(durationMinutes);
    } else if (durationStr) {
      const parsed = parseDurationToMinutes(durationStr);
      if (parsed > 0) {
        updateData.durationMinutes = parsed;
      }
    }

    const updatedTask = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        project: true,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.task.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
