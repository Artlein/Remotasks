import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { db, seedUserDataIfNeeded, withRetry } from '@/lib/db';
import { DashboardClient } from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  await seedUserDataIfNeeded(user.id);

  const [dbTasks, dbSettings, dbProjects] = await Promise.all([
    withRetry(() =>
      db.task.findMany({
        where: { userId: user.id },
        include: { project: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      })
    ),
    withRetry(() => db.userSettings.findUnique({ where: { userId: user.id } })),
    withRetry(() =>
      db.project.findMany({
        where: { userId: user.id, active: true },
        orderBy: { name: 'asc' },
      })
    ),
  ]);

  const initialTasks = dbTasks.map((t) => ({
    id: t.id,
    date: t.date,
    projectId: t.projectId,
    project: {
      id: t.project.id,
      name: t.project.name,
    },
    description: t.description,
    durationMinutes: t.durationMinutes,
    status: t.status,
    notes: t.notes,
  }));

  const initialProjects = dbProjects.map((p) => ({
    id: p.id,
    name: p.name,
    active: p.active,
  }));

  const initialSettings = {
    logicalCutoffHour: dbSettings?.logicalCutoffHour ?? 0,
    dailyTargetHours: dbSettings?.dailyTargetHours ?? 8.0,
    hourlyRate: dbSettings?.hourlyRate ?? 0.0,
  };

  return (
    <DashboardClient
      initialUser={user}
      initialTasks={initialTasks}
      initialProjects={initialProjects}
      initialSettings={initialSettings}
    />
  );
}
